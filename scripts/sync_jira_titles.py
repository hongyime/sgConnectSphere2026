"""Sync Jira issue titles with the canonical backlog story titles.

Reads the SCRUM-key-to-story-ID mapping from docs/backlog/sprint-1-delivery.md
and the canonical story titles from docs/backlog/release-1/*.md, then compares
each mapped Jira issue's summary against the expected title.

Two modes:
- Dry-run (default): prints drift without changing Jira.
- Apply (--yes): renames drifted Jira summaries to match the backlog.

Only touches issues that have a backlog story mapping. Tasks, bugs, enablers,
and any SCRUM issue without a corresponding story file are completely ignored.

    python scripts/sync_jira_titles.py              # dry-run
    python scripts/sync_jira_titles.py --yes        # apply renames

Secrets are read from the environment; nothing is written to disk.
"""
from __future__ import annotations

import base64
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DELIVERY_LEDGER = REPO_ROOT / "docs" / "backlog" / "sprint-1-delivery.md"
BACKLOG_DIR = REPO_ROOT / "docs" / "backlog" / "release-1"

# Match "E01-S01 / SCRUM-16" in the delivery ledger table rows.
MAPPING_RE = re.compile(r"(E\d{2}-S\d{2})\s*/\s*(SCRUM-\d+)")

# Match "## E01-S01 — <title>" in backlog markdown files.
STORY_HEADING_RE = re.compile(r"^##\s+(E\d{2}-S\d{2})\s+[—–-]\s+(.+)$")


def load_jira_config() -> dict:
    """Return Jira connection config from environment variables."""
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
    req = urllib.request.Request(url, method="GET", headers=_jira_headers(config))
    with urllib.request.urlopen(req) as resp:
        raw = resp.read()
    return json.loads(raw.decode("utf-8")) if raw else {}


def jira_put(config: dict, path: str, payload: dict) -> dict:
    url = f"{config['site_url']}{path}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="PUT", headers=_jira_headers(config))
    with urllib.request.urlopen(req) as resp:
        raw = resp.read()
    return json.loads(raw.decode("utf-8")) if raw else {}


def load_story_key_mapping() -> dict[str, str]:
    """Return {story_id: scrum_key} from the delivery ledger."""
    if not DELIVERY_LEDGER.is_file():
        raise SystemExit(f"Delivery ledger not found: {DELIVERY_LEDGER}")
    text = DELIVERY_LEDGER.read_text(encoding="utf-8")
    mapping: dict[str, str] = {}
    for match in MAPPING_RE.finditer(text):
        story_id = match.group(1)
        scrum_key = match.group(2)
        if story_id not in mapping:
            mapping[story_id] = scrum_key
    return mapping


def load_backlog_titles() -> dict[str, str]:
    """Return {story_id: title} from backlog markdown files."""
    titles: dict[str, str] = {}
    for path in sorted(BACKLOG_DIR.glob("*.md")):
        for line in path.read_text(encoding="utf-8").splitlines():
            m = STORY_HEADING_RE.match(line.strip())
            if m:
                titles[m.group(1)] = m.group(2).strip()
    return titles


def build_expected_summaries(
    mapping: dict[str, str], titles: dict[str, str]
) -> dict[str, str]:
    """Return {scrum_key: expected_jira_summary} for all mapped stories."""
    expected: dict[str, str] = {}
    for story_id, scrum_key in mapping.items():
        title = titles.get(story_id)
        if title:
            expected[scrum_key] = f"{story_id} {title}"
    return expected


def main() -> int:
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--yes", action="store_true",
                        help="Apply renames. Without this, only prints drift.")
    args = parser.parse_args()

    config = load_jira_config()
    mapping = load_story_key_mapping()
    titles = load_backlog_titles()
    expected = build_expected_summaries(mapping, titles)

    print(f"Mapped {len(expected)} stories from backlog → Jira keys.")
    print()

    drifted = 0
    matched = 0
    errors = 0

    for scrum_key, want_summary in sorted(expected.items()):
        try:
            data = jira_get(config, f"/rest/api/3/issue/{scrum_key}?fields=summary")
            have_summary = data["fields"]["summary"]
        except (urllib.error.HTTPError, KeyError) as e:
            print(f"  {scrum_key}: fetch failed ({e}); skipping.")
            errors += 1
            continue

        if have_summary.strip() == want_summary.strip():
            matched += 1
            continue

        drifted += 1
        print(f"  {scrum_key}:")
        print(f"    Jira:    {have_summary}")
        print(f"    Backlog: {want_summary}")

        if args.yes:
            try:
                jira_put(config, f"/rest/api/3/issue/{scrum_key}",
                         {"fields": {"summary": want_summary}})
                print(f"    → Renamed.")
            except urllib.error.HTTPError as e:
                print(f"    → Rename failed ({e.code}).")
                errors += 1
        else:
            print(f"    → Would rename (rerun with --yes to apply).")

    print()
    print(f"Summary: {matched} matched, {drifted} drifted, {errors} errors.")
    if drifted > 0 and not args.yes:
        print("Rerun with --yes to apply renames.")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
"""
Ongoing CI integration: add this to .github/workflows/jira-sync.yml
as a post-merge advisory step that checks for title drift.
Unmapped SCRUM issues (tasks, bugs, enablers) are completely ignored.
"""
