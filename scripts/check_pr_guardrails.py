"""Enforce small pull requests and immutable customer source documents.

Professor-provided Word, Excel, PDF, and PowerPoint files under
``docs/bdr/customer-sources/`` are context inputs. A pull request may add a new
source file, but it must not modify, delete, or rename an existing one. Generated
exports elsewhere under ``docs/`` remain writable through their generators. The
PR size and open-PR limits are grandfathered for pull requests opened before the
policy date so adoption does not strand the current backlog.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
POLICY_PATH = ROOT / ".github" / "settings" / "pr-guardrails.json"
REFERENCE_SUFFIXES = {".docx", ".pdf", ".pptx", ".xlsx"}
REFERENCE_ROOT = "docs/bdr/customer-sources/"
AUTOMATION_AUTHORS = {"dependabot[bot]"}


def load_policy() -> dict[str, Any]:
    return json.loads(POLICY_PATH.read_text(encoding="utf-8"))


def parse_changed_files(output: str) -> list[tuple[str, list[str]]]:
    """Parse ``git diff --name-status --find-renames`` output."""

    changes: list[tuple[str, list[str]]] = []
    for raw_line in output.splitlines():
        if not raw_line.strip():
            continue
        fields = raw_line.split("\t")
        changes.append((fields[0], fields[1:]))
    return changes


def is_reference_artifact(path: str) -> bool:
    normalized = path.replace("\\", "/").lower()
    return normalized.startswith(REFERENCE_ROOT) and Path(normalized).suffix in REFERENCE_SUFFIXES


def reference_artifact_errors(changes: Iterable[tuple[str, list[str]]]) -> list[str]:
    errors: list[str] = []
    for status, paths in changes:
        if status == "A":
            continue
        affected = [path for path in paths if is_reference_artifact(path)]
        if affected:
            errors.append(
                f"{status} {', '.join(affected)}: existing reference binaries are read-only; "
                "add a new uniquely named source file instead"
            )
    return errors


def parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def policy_is_active(created_at: str, policy: dict[str, Any]) -> bool:
    return parse_timestamp(created_at) >= parse_timestamp(policy["effective_after"])


def counted_open_prs(
    *,
    current: dict[str, Any],
    open_prs: list[dict[str, Any]],
    policy: dict[str, Any],
) -> list[dict[str, Any]]:
    """Count active-policy PRs that existed when the current PR opened."""

    current_created = parse_timestamp(current["createdAt"])
    return [
        pr
        for pr in open_prs
        if policy_is_active(pr["createdAt"], policy)
        and parse_timestamp(pr["createdAt"]) <= current_created
        and pr.get("author", {}).get("login") not in AUTOMATION_AUTHORS
    ]


def pr_limit_errors(
    *,
    current: dict[str, Any],
    open_prs: list[dict[str, Any]],
    policy: dict[str, Any],
) -> list[str]:
    if not policy_is_active(current["createdAt"], policy):
        return []

    if current["author"]["login"] in AUTOMATION_AUTHORS:
        return []

    counted_prs = counted_open_prs(current=current, open_prs=open_prs, policy=policy)
    errors: list[str] = []
    max_open = int(policy["max_open_prs"])
    if len(counted_prs) > max_open:
        errors.append(
            f"{len(counted_prs)} policy-counted open PRs exceeds the limit of {max_open}; "
            "close or split an existing PR before opening another"
        )

    author = current["author"]["login"]
    author_count = sum(1 for pr in counted_prs if pr.get("author", {}).get("login") == author)
    max_per_author = int(policy["max_open_prs_per_author"])
    if author_count > max_per_author:
        errors.append(
            f"{author} has {author_count} open PRs, exceeding the per-author limit "
            f"of {max_per_author}"
        )
    return errors


def pr_size_errors(current: dict[str, Any], policy: dict[str, Any]) -> list[str]:
    if not policy_is_active(current["createdAt"], policy):
        return []

    errors: list[str] = []
    limits = (
        ("changedFiles", "changed files", int(policy["max_changed_files"])),
        ("additions", "additions", int(policy["max_additions"])),
        ("deletions", "deletions", int(policy["max_deletions"])),
    )
    for key, label, limit in limits:
        value = int(current.get(key, 0))
        if value > limit:
            errors.append(f"PR #{current['number']} has {value} {label}; limit is {limit}")
    return errors


def run(command: list[str]) -> str:
    return subprocess.check_output(command, cwd=ROOT, text=True).strip()


def comparison_base(base: str, head: str) -> str:
    """Return the common ancestor used for a pull-request file comparison."""

    return run(["git", "merge-base", base, head])


def git_changes(base: str, head: str) -> list[tuple[str, list[str]]]:
    merge_base = comparison_base(base, head)
    output = run(["git", "diff", "--name-status", "--find-renames", merge_base, head, "--", "docs"])
    return parse_changed_files(output)


def current_pr(number: str) -> dict[str, Any]:
    repository = os.environ["GITHUB_REPOSITORY"]
    return json.loads(
        run([
            "gh",
            "api",
            f"repos/{repository}/pulls/{number}",
            "--jq",
            "{number,createdAt:.created_at,author:{login:.user.login},changedFiles:.changed_files,additions:.additions,deletions:.deletions}",
        ])
    )


def open_prs() -> list[dict[str, Any]]:
    repository = os.environ["GITHUB_REPOSITORY"]
    return json.loads(
        run([
            "gh",
            "api",
            f"repos/{repository}/pulls?state=open&per_page=100",
            "--jq",
            "[.[] | {number,createdAt:.created_at,author:{login:.user.login}}]",
        ])
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True)
    parser.add_argument("--head", required=True)
    parser.add_argument("--pr-number")
    parser.add_argument("--merge-group", action="store_true")
    args = parser.parse_args()

    policy = load_policy()
    errors = reference_artifact_errors(git_changes(args.base, args.head))

    if args.merge_group:
        print("PR guardrails: merge-group checks already passed on each queued PR")
    elif args.pr_number:
        current = current_pr(args.pr_number)
        open_pull_requests = open_prs()
        errors.extend(pr_limit_errors(current=current, open_prs=open_pull_requests, policy=policy))
        errors.extend(pr_size_errors(current, policy))
        if not policy_is_active(current["createdAt"], policy):
            print(f"PR #{args.pr_number}: grandfathered because it predates the guardrail policy")

    if errors:
        for error in errors:
            print(f"::error::{error}", file=sys.stderr)
        return 1

    print("PR guardrails passed: reference binaries are unchanged and limits are satisfied")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
