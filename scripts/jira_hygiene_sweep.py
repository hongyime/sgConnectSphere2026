"""Fill a missing Jira Team and a missing assignee.

Jira automation rules cannot do this on the free plan, so a scheduled GitHub
Action runs this script instead. Dry-run is the default. ``--yes`` writes.

Rules:

- Team is ``customfield_10001``. An empty Team on a non-subtask is set to the
  IS212 team id. A Team that is already set is left alone, even if it is not
  IS212.
- Subtasks inherit Team from their parent. Jira rejects a direct write
  ("Issue is a subtask, and inherits the team assignment from its parent"),
  so this script never sends a Team field for a subtask.
- An empty assignee is set to the reporter. An issue with no reporter account
  id is reported and skipped.

The first apply assigns every currently unassigned issue to whoever reported
it. That is intentional, and it is also why dry-run is the default locally.

    python scripts/jira_hygiene_sweep.py
    python scripts/jira_hygiene_sweep.py --yes

Secrets are read from the environment; nothing is written to disk.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass

# Atlassian Team field. The id is the IS212 team, not a secret.
TEAM_FIELD = "customfield_10001"
IS212_TEAM_ID = "541aa40d-4d18-443d-b10c-d0e0ebc3edc9"
SUBTASK_TYPES = {"sub-task", "subtask"}


@dataclass(frozen=True)
class SweepIssue:
    key: str
    issue_type: str
    team_id: str | None
    assignee_account_id: str | None
    reporter_account_id: str | None


def load_jira_config() -> dict:
    missing = [name for name in ("JIRA_SITE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN")
               if not os.environ.get(name)]
    if missing:
        raise SystemExit(f"Missing Jira env vars: {', '.join(missing)}. See .env.template.")
    return {
        "site_url": os.environ["JIRA_SITE_URL"].rstrip("/"),
        "email": os.environ["JIRA_EMAIL"],
        "api_token": os.environ["JIRA_API_TOKEN"],
        "project_key": os.environ.get("JIRA_PROJECT_KEY", "SCRUM"),
    }


def _jira_headers(config: dict) -> dict[str, str]:
    token = base64.b64encode(
        f"{config['email']}:{config['api_token']}".encode("utf-8")
    ).decode("ascii")
    return {
        "Authorization": f"Basic {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def jira_get(config: dict, path: str) -> dict:
    url = f"{config['site_url']}{path}"
    request = urllib.request.Request(url, method="GET", headers=_jira_headers(config))
    with urllib.request.urlopen(request) as response:
        raw = response.read()
    return json.loads(raw.decode("utf-8")) if raw else {}


def jira_put(config: dict, path: str, payload: dict) -> dict:
    url = f"{config['site_url']}{path}"
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url, data=data, method="PUT", headers=_jira_headers(config),
    )
    with urllib.request.urlopen(request) as response:
        raw = response.read()
    return json.loads(raw.decode("utf-8")) if raw else {}


def _account_id(value: object) -> str | None:
    if isinstance(value, dict):
        account_id = value.get("accountId")
        if isinstance(account_id, str) and account_id.strip():
            return account_id
    return None


def _team_id(value: object) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    if isinstance(value, dict):
        team_id = value.get("id")
        if isinstance(team_id, str) and team_id.strip():
            return team_id.strip()
    return None


def is_subtask(issue: SweepIssue) -> bool:
    return issue.issue_type.strip().lower() in SUBTASK_TYPES


def parse_issue(raw: dict) -> SweepIssue:
    fields = raw.get("fields") or {}
    issue_type = fields.get("issuetype") or {}
    name = issue_type.get("name") if isinstance(issue_type, dict) else ""
    return SweepIssue(
        key=str(raw.get("key") or ""),
        issue_type=str(name or ""),
        team_id=_team_id(fields.get(TEAM_FIELD)),
        assignee_account_id=_account_id(fields.get("assignee")),
        reporter_account_id=_account_id(fields.get("reporter")),
    )


def plan_update(issue: SweepIssue, team_id: str = IS212_TEAM_ID) -> dict | None:
    """Return the PUT body for one issue, or None when nothing is missing."""
    fields: dict = {}
    if not is_subtask(issue) and not issue.team_id:
        fields[TEAM_FIELD] = team_id
    if not issue.assignee_account_id and issue.reporter_account_id:
        fields["assignee"] = {"accountId": issue.reporter_account_id}
    if not fields:
        return None
    return {"fields": fields}


def describe(payload: dict) -> str:
    fields = payload.get("fields") or {}
    parts: list[str] = []
    if TEAM_FIELD in fields:
        parts.append("team")
    if "assignee" in fields:
        parts.append("assignee")
    return ", ".join(parts)


def search_issues(config: dict) -> list[SweepIssue]:
    """Page through every issue in the project. Filtering happens locally."""
    found: list[SweepIssue] = []
    token: str | None = None
    jql = f"project = {config['project_key']} ORDER BY key ASC"
    while True:
        params = {
            "jql": jql,
            "maxResults": "100",
            "fields": f"issuetype,assignee,reporter,{TEAM_FIELD}",
        }
        if token:
            params["nextPageToken"] = token
        page = jira_get(config, "/rest/api/3/search/jql?" + urllib.parse.urlencode(params))
        for raw in page.get("issues") or []:
            found.append(parse_issue(raw))
        token = page.get("nextPageToken") or None
        if page.get("isLast", True) or not token:
            break
    return found


def sweep(issues: list[SweepIssue], config: dict, *, apply: bool, stream=sys.stdout) -> int:
    """Return non-zero when at least one write failed. Dry-run never fails on drift."""
    exit_code = 0
    planned = 0
    for issue in issues:
        payload = plan_update(issue)
        if payload is None:
            if not issue.assignee_account_id and not issue.reporter_account_id:
                print(f"{issue.key}: assignee empty and reporter has no account id; skipping.",
                      file=stream)
            continue
        change = describe(payload)
        planned += 1
        if not apply:
            print(f"{issue.key}: would set {change} (rerun with --yes to apply).", file=stream)
            continue
        try:
            jira_put(config, f"/rest/api/3/issue/{issue.key}", payload)
        except urllib.error.HTTPError as error:
            print(f"{issue.key}: update failed ({error.code}); skipping.", file=stream)
            exit_code = 1
            continue
        print(f"{issue.key}: set {change}.", file=stream)
    print(f"{planned} issue(s) {'updated' if apply else 'would change'}.", file=stream)
    return exit_code


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--yes", action="store_true",
                        help="Write Team and assignee. Without this, only print the plan.")
    args = parser.parse_args(argv)
    config = load_jira_config()
    return sweep(search_issues(config), config, apply=args.yes)


if __name__ == "__main__":
    raise SystemExit(main())
