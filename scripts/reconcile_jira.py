"""Reconcile Jira issue status against merged pull requests.

Reads Jira credentials from four environment variables documented in
`.env.template`: ``JIRA_SITE_URL``, ``JIRA_EMAIL``, ``JIRA_API_TOKEN``, and
``JIRA_PROJECT_KEY``. When a merged PR references a Jira issue (via the branch
name or the PR title), verifies the issue is in the ``Done`` state and offers
to transition it if not.

Two invocation modes:

- Locally, after your own PR merged::

      python scripts/reconcile_jira.py --pr 94
      python scripts/reconcile_jira.py --pr 94 --yes         # apply changes

- From CI, on ``pull_request: closed`` with ``merged == true``::

      python scripts/reconcile_jira.py --event-path "$GITHUB_EVENT_PATH" --yes

Dry-run is the default. ``--yes`` performs the transition and posts a short
Jira comment linking back to the PR. Only issues whose key appears in the
branch name or the PR title are touched — body-only mentions ("follow-up to
SCRUM-42") are ignored to avoid false positives.

Secrets are read from the environment; nothing is written to disk.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

# Match `SCRUM-123` etc. — uppercase project key + digits. Case sensitive.
KEY_RE = re.compile(r"\b([A-Z][A-Z0-9]+-\d+)\b")

# Body mentions are only trusted when preceded by a GitHub-style closing verb.
# This matches the way GitHub itself decides whether to auto-close an issue.
# See: https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue
CLOSING_KEYWORDS = (
    "close", "closes", "closed", "closing",
    "fix", "fixes", "fixed", "fixing",
    "resolve", "resolves", "resolved", "resolving",
)
BODY_CLOSE_RE = re.compile(
    rf"\b(?:{'|'.join(CLOSING_KEYWORDS)})\s+([A-Z][A-Z0-9]+-\d+)\b",
    re.IGNORECASE,
)

# Statuses that should not be transitioned. Any status not in this set is
# treated as "needs to move to Done" when the referenced PR merged. Kept
# permissive so a workflow rename doesn't silently break the check.
TERMINAL_STATUSES = {"Done", "Closed", "Cancelled", "Won't Do", "Rejected"}


@dataclass(frozen=True)
class PullRequest:
    number: int
    title: str
    body: str
    head_ref: str
    merged: bool
    author_login: str
    author_is_bot: bool


@dataclass(frozen=True)
class IssueInfo:
    """Minimal snapshot of a Jira issue for reconciliation decisions."""
    key: str
    status: str
    assignee_account_id: str | None
    assignee_display: str | None


@dataclass(frozen=True)
class JiraConfig:
    site_url: str
    email: str
    api_token: str
    project_key: str


def load_jira_config() -> JiraConfig:
    missing = [name for name in ("JIRA_SITE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN", "JIRA_PROJECT_KEY")
               if not os.environ.get(name)]
    if missing:
        raise SystemExit(f"Missing Jira env vars: {', '.join(missing)}. See .env.template.")
    return JiraConfig(
        site_url=os.environ["JIRA_SITE_URL"].rstrip("/"),
        email=os.environ["JIRA_EMAIL"],
        api_token=os.environ["JIRA_API_TOKEN"],
        project_key=os.environ["JIRA_PROJECT_KEY"],
    )


def _jira_headers(config: JiraConfig) -> dict[str, str]:
    token = base64.b64encode(f"{config.email}:{config.api_token}".encode("utf-8")).decode("ascii")
    return {
        "Authorization": f"Basic {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def _jira_call(config: JiraConfig, method: str, path: str, payload: dict | None = None) -> dict:
    url = f"{config.site_url}{path}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(url, data=data, method=method, headers=_jira_headers(config))
    with urllib.request.urlopen(request) as response:
        raw = response.read()
    if not raw:
        return {}
    return json.loads(raw.decode("utf-8"))


def extract_keys(pr: PullRequest, project_key: str) -> list[str]:
    """Return SCRUM keys mentioned in the branch, title, or as an explicit
    ``Closes SCRUM-42`` / ``Fixes SCRUM-42`` clause in the body. Bare body
    mentions ("follow-up to SCRUM-42") are ignored to avoid false positives.
    """
    keys: list[str] = []

    def _add(key: str) -> None:
        if key.startswith(f"{project_key}-") and key not in keys:
            keys.append(key)

    for haystack in (pr.head_ref or "", pr.title or ""):
        for match in KEY_RE.finditer(haystack):
            _add(match.group(1))
    for match in BODY_CLOSE_RE.finditer(pr.body or ""):
        _add(match.group(1).upper())
    return keys


def load_pr_from_event(path: Path) -> PullRequest:
    event = json.loads(path.read_text(encoding="utf-8"))
    pr = event["pull_request"]
    return PullRequest(
        number=int(pr["number"]),
        title=pr.get("title") or "",
        body=pr.get("body") or "",
        head_ref=pr.get("head", {}).get("ref") or "",
        merged=bool(pr.get("merged")),
        author_login=pr.get("user", {}).get("login") or "",
        author_is_bot=(pr.get("user", {}).get("type") == "Bot"),
    )


def load_pr_from_gh(number: int) -> PullRequest:
    """Fetch a PR via the `gh` CLI. Requires `gh auth`."""
    result = subprocess.run(
        [
            "gh", "pr", "view", str(number),
            "--json", "number,title,body,headRefName,mergedAt,state,author",
        ],
        capture_output=True, text=True, check=False,
    )
    if result.returncode:
        raise SystemExit(f"gh pr view {number} failed: {result.stderr.strip()}")
    data = json.loads(result.stdout)
    author = data.get("author") or {}
    return PullRequest(
        number=int(data["number"]),
        title=data.get("title") or "",
        body=data.get("body") or "",
        head_ref=data.get("headRefName") or "",
        merged=bool(data.get("mergedAt")),
        author_login=author.get("login") or "",
        author_is_bot=bool(author.get("is_bot")),
    )


def get_status(config: JiraConfig, key: str) -> str:
    return get_issue(config, key).status


def get_issue(config: JiraConfig, key: str) -> IssueInfo:
    """Fetch the minimal issue snapshot used by reconcile()."""
    data = _jira_call(config, "GET", f"/rest/api/3/issue/{key}?fields=status,assignee")
    fields = data["fields"]
    assignee = fields.get("assignee") or {}
    return IssueInfo(
        key=key,
        status=fields["status"]["name"],
        assignee_account_id=assignee.get("accountId"),
        assignee_display=assignee.get("displayName"),
    )


def find_done_transition(config: JiraConfig, key: str) -> str | None:
    data = _jira_call(config, "GET", f"/rest/api/3/issue/{key}/transitions")
    for transition in data.get("transitions", []):
        if transition.get("to", {}).get("name") == "Done":
            return transition["id"]
    return None


def transition_to_done(config: JiraConfig, key: str, transition_id: str) -> None:
    _jira_call(
        config, "POST", f"/rest/api/3/issue/{key}/transitions",
        {"transition": {"id": transition_id}},
    )


def post_reconciliation_comment(
    config: JiraConfig, key: str, pr_number: int, repo: str,
    assignee_account_id: str | None = None,
) -> None:
    """Post a Jira comment linking the PR. @mentions the assignee when known."""
    paragraph: list[dict] = [
        {"type": "text", "text": "Transitioned to Done after PR "},
        {"type": "text", "text": f"{repo}#{pr_number}", "marks": [{"type": "code"}]},
        {"type": "text", "text": " merged. Auto-reconciled by scripts/reconcile_jira.py."},
    ]
    if assignee_account_id:
        paragraph.extend([
            {"type": "text", "text": " Heads-up "},
            {"type": "mention", "attrs": {"id": assignee_account_id}},
            {"type": "text", "text": " — please confirm this matches your intent."},
        ])
    body = {
        "body": {
            "type": "doc", "version": 1,
            "content": [{"type": "paragraph", "content": paragraph}],
        }
    }
    _jira_call(config, "POST", f"/rest/api/3/issue/{key}/comment", body)


def reconcile(prs: Iterable[PullRequest], config: JiraConfig, *, apply: bool, repo: str,
              stream=sys.stdout) -> int:
    """Return non-zero when at least one required transition failed. Drift the script
    finds is treated as an informational finding, not a hard failure, so CI runs
    on ``pull_request: closed`` don't red-fail a merged PR retroactively."""
    exit_code = 0
    for pr in prs:
        if not pr.merged:
            print(f"PR #{pr.number}: not merged; skipping.", file=stream)
            continue
        if pr.author_is_bot:
            print(f"PR #{pr.number}: bot author; skipping.", file=stream)
            continue
        keys = extract_keys(pr, config.project_key)
        if not keys:
            print(f"PR #{pr.number}: no {config.project_key} key in branch or title; skipping.",
                  file=stream)
            continue
        for key in keys:
            try:
                issue = get_issue(config, key)
            except urllib.error.HTTPError as error:
                print(f"PR #{pr.number}: {key}: fetch failed ({error.code}); skipping.",
                      file=stream)
                exit_code = max(exit_code, 1)
                continue
            if issue.assignee_display is None:
                print(f"PR #{pr.number}: {key}: no assignee — cannot tie the ticket back to a "
                      f"teammate. Consider assigning it before merging.", file=stream)
            elif issue.assignee_display.lower() != (pr.author_login or "").lower():
                print(f"PR #{pr.number}: {key}: assignee '{issue.assignee_display}' does not "
                      f"match PR author '@{pr.author_login}'. Verify ownership.", file=stream)
            if issue.status in TERMINAL_STATUSES:
                print(f"PR #{pr.number}: {key} already {issue.status}; nothing to do.",
                      file=stream)
                continue
            if not apply:
                print(f"PR #{pr.number}: {key} is {issue.status}; would transition to Done "
                      f"(rerun with --yes to apply).", file=stream)
                continue
            transition_id = find_done_transition(config, key)
            if not transition_id:
                print(f"PR #{pr.number}: {key}: no Done transition available from "
                      f"{issue.status}; skipping.", file=stream)
                exit_code = max(exit_code, 1)
                continue
            try:
                transition_to_done(config, key, transition_id)
                post_reconciliation_comment(
                    config, key, pr.number, repo,
                    assignee_account_id=issue.assignee_account_id,
                )
                print(f"PR #{pr.number}: {key}: transitioned {issue.status} -> Done.",
                      file=stream)
            except urllib.error.HTTPError as error:
                print(f"PR #{pr.number}: {key}: transition failed ({error.code}); skipping.",
                      file=stream)
                exit_code = max(exit_code, 1)
    return exit_code


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--pr", type=int, nargs="+", metavar="N",
                        help="PR number(s) to reconcile. Fetched via the gh CLI.")
    source.add_argument("--event-path", type=Path,
                        help="Path to a GitHub pull_request event JSON (e.g. $GITHUB_EVENT_PATH).")
    parser.add_argument("--yes", action="store_true",
                        help="Apply transitions. Without this, only prints what would change.")
    parser.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY", ""),
                        help="owner/repo string used in Jira comments. Defaults to $GITHUB_REPOSITORY.")
    args = parser.parse_args(argv)

    config = load_jira_config()
    prs: list[PullRequest] = []
    if args.event_path:
        prs.append(load_pr_from_event(args.event_path))
    else:
        for number in args.pr:
            prs.append(load_pr_from_gh(number))
    return reconcile(prs, config, apply=args.yes, repo=args.repo or "unknown/repo")


if __name__ == "__main__":
    raise SystemExit(main())
