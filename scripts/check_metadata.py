"""Validate the team's branch and title conventions locally and in CI."""

import argparse
import json
import os
import re
import subprocess
from pathlib import Path

TYPES = "feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert"
TITLE = re.compile(rf"(?:{TYPES})(?:\([a-z0-9][a-z0-9-]*\))?!?: \S.*")
BRANCH = re.compile(
    r"(?:feature|fix|chore|docs|test|refactor|ci)/"
    r"(?:[a-z0-9]+(?:-[a-z0-9]+)*|[A-Z][A-Z0-9]*-\d+(?:-[a-z0-9]+)*)"
)

# Sections required in a human-authored PR body, in the order the template
# lists them. See .github/pull_request_template.md. Bot PRs are exempt.
REQUIRED_BODY_SECTIONS = (
    "## What and why",
    "## Verification",
    "## Checklist",
    "## Follow-ups",
)

# Files no ordinary pull request may touch (decision 0014). Every branch used
# to prepend an entry to these two, so any two open PRs conflicted on every
# merge and approvals were dismissed by the resolving push. Per-task notes live
# in .agents/handoffs/; the repository owner consolidates these two files in a
# PR whose title starts with CONSOLIDATION_PREFIX.
PROTECTED_FILES = (".agents/STATE.md", ".agents/JOURNAL.md")
CONSOLIDATION_PREFIX = "chore(agents):"
LOCAL_CONSOLIDATION_BRANCH_PREFIX = "chore/agents-consolidate-"


def check_title(title: str) -> bool:
    return bool(TITLE.fullmatch(title)) and len(title) <= 100 and title == title.strip()


def check_branch(branch: str, *, automated: bool = False) -> bool:
    if automated and branch.startswith("dependabot/"):
        return True
    return bool(BRANCH.fullmatch(branch))


def check_changed_files(files: list[str], title: str) -> tuple[bool, list[str]]:
    """Return (ok, offending). A PR may touch PROTECTED_FILES only when its title
    marks it as the owner's consolidation PR (decision 0014)."""
    if title.startswith(CONSOLIDATION_PREFIX):
        return True, []
    offending = [f for f in files if f in PROTECTED_FILES]
    return not offending, offending


def check_local_changed_files(files: list[str], branch: str) -> tuple[bool, list[str]]:
    """Use the consolidation branch prefix as a local proxy for the PR title.

    CI remains authoritative because only GitHub knows the actual PR title.
    """
    if branch.startswith(LOCAL_CONSOLIDATION_BRANCH_PREFIX):
        return True, []
    return check_changed_files(files, "")


def check_staged_files() -> int:
    """Block staged edits to protected continuity files on ordinary branches.

    During a merge (MERGE_HEAD exists), allow protected files that are being
    brought in from the merge source unchanged (staged content matches MERGE_HEAD).
    Only block when the branch itself edited the protected files.
    """
    try:
        staged = subprocess.check_output(
            ["git", "diff", "--cached", "--no-renames", "--name-only", "-z"]
        )
    except subprocess.CalledProcessError:
        print("Could not read staged paths for the protected-file check.")
        return 1

    files = [os.fsdecode(path) for path in staged.split(b"\0") if path]
    if not any(path in PROTECTED_FILES for path in files):
        return 0

    try:
        branch = subprocess.check_output(
            ["git", "symbolic-ref", "--short", "HEAD"],
            text=True,
            encoding="utf-8",
            stderr=subprocess.DEVNULL,
        ).strip()
    except subprocess.CalledProcessError:
        print("Protected continuity files cannot be committed from a detached HEAD.")
        return 1

    # Check if we're in a merge. If so, filter out protected files that are
    # just being brought in from the merge source (no edit by current branch).
    try:
        subprocess.check_call(
            ["git", "rev-parse", "--verify", "-q", "MERGE_HEAD"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        merge_in_progress = True
    except subprocess.CalledProcessError:
        merge_in_progress = False

    if merge_in_progress:
        # During a merge, git diff --cached compares index with HEAD, so
        # MERGE_HEAD changes show as staged. Only flag files that differ
        # from MERGE_HEAD (meaning the branch edited them).
        actually_offending = []
        for path in files:
            if path not in PROTECTED_FILES:
                continue
            # If staged content differs from MERGE_HEAD, the branch edited it.
            try:
                staged_sha = subprocess.check_output(
                    ["git", "rev-parse", f":{path}"],
                    stderr=subprocess.DEVNULL,
                ).strip()
                merge_sha = subprocess.check_output(
                    ["git", "rev-parse", f"MERGE_HEAD:{path}"],
                    stderr=subprocess.DEVNULL,
                ).strip()
                if staged_sha != merge_sha:
                    actually_offending.append(path)
            except subprocess.CalledProcessError:
                # If we can't compare, be conservative and flag it
                actually_offending.append(path)

        if not actually_offending:
            return 0

        print("Only the owner-consolidation branch may stage these continuity files:")
        for path in actually_offending:
            print(f"  {path}")
        print(f"Use a branch beginning `{LOCAL_CONSOLIDATION_BRANCH_PREFIX}` for local consolidation work.")
        print(f"CI still checks the pull request title for `{CONSOLIDATION_PREFIX}`.")
        return 1

    ok, offending = check_local_changed_files(files, branch)
    if ok:
        return 0

    print("Only the owner-consolidation branch may stage these continuity files:")
    for path in offending:
        print(f"  {path}")
    print(f"Use a branch beginning `{LOCAL_CONSOLIDATION_BRANCH_PREFIX}` for local consolidation work.")
    print(f"CI still checks the pull request title for `{CONSOLIDATION_PREFIX}`.")
    return 1


def check_body(body: str, *, automated: bool = False) -> tuple[bool, list[str]]:
    """Return (ok, problems). Bot PRs pass unconditionally.

    A PR body is accepted when every header in REQUIRED_BODY_SECTIONS appears
    as a whole-line match, and no checked checkbox still contains the blank
    evidence placeholder ``____``.  The placeholder check catches boxes that
    were ticked without filling in the required evidence pointer.
    """
    if automated:
        return True, []
    text = body or ""
    lines_set = {line.strip() for line in text.splitlines()}
    problems: list[str] = []
    for header in REQUIRED_BODY_SECTIONS:
        if header not in lines_set:
            problems.append(header)
    # Reject checked boxes whose evidence placeholder is still blank.
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("- [x]") or stripped.startswith("- [X]"):
            if "____" in stripped:
                label = stripped[6:stripped.index("\u2014")].strip() if "\u2014" in stripped else stripped[6:50]
                problems.append(f"Checked box with blank evidence: {label}")
    return not problems, problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["commit-msg", "branch", "pr", "staged-files"])
    parser.add_argument("value", nargs="?")
    args = parser.parse_args()

    if args.mode == "commit-msg":
        if not args.value:
            parser.error("commit-msg requires a message file")
        lines = Path(args.value).read_text(encoding="utf-8-sig").splitlines()
        title = lines[0] if lines else ""
        # Git-generated merge/revert messages stay usable on feature branches.
        if title.startswith(("Merge ", 'Revert "')) or check_title(title):
            return 0
        print("Use type(scope): description, at most 100 characters.")
        print("Example: feat(frontend): add profile form")
        return 1

    if args.mode == "branch":
        branch = args.value
        if branch is None:
            branch = subprocess.check_output(
                ["git", "symbolic-ref", "--short", "HEAD"], text=True
            ).strip()
        if branch == "main":
            print("Direct main push: repository checks run in CI; use a PR after bootstrap.")
            return 0
        if check_branch(branch):
            return 0
        print("Use feature/SCRUM-123-description, fix/57-description, or chore/setup-ci.")
        return 1

    if args.mode == "staged-files":
        return check_staged_files()

    event_path = args.value or os.environ.get("GITHUB_EVENT_PATH")
    if not event_path:
        parser.error("pr requires an event JSON file or GITHUB_EVENT_PATH")
    event = json.loads(Path(event_path).read_text(encoding="utf-8"))
    pr = event["pull_request"]
    author = pr["user"]
    automated = author["login"] == "dependabot[bot]" and author["type"] == "Bot"
    valid = True
    if not check_title(pr["title"]):
        print("PR title must use type(scope): description, at most 100 characters.")
        valid = False
    if not check_branch(pr["head"]["ref"], automated=automated):
        print("PR branch must use the naming convention in CONTRIBUTING.md.")
        valid = False
    ok, missing = check_body(pr.get("body") or "", automated=automated)
    if not ok:
        print("PR body must use the repository template. Missing sections:")
        for header in missing:
            print(f"  {header}")
        print("See .github/pull_request_template.md for the required layout.")
        valid = False
    # Newline-separated list supplied by the workflow (git diff --name-only).
    changed = os.environ.get("PR_CHANGED_FILES")
    if changed is not None:
        ok, offending = check_changed_files(changed.split(), pr["title"])
        if not ok:
            print("PR edits continuity files that only the owner's consolidation PR may touch (decision 0014):")
            for path in offending:
                print(f"  {path}")
            print("Put the notes in .agents/handoffs/<YYYYMMDD>-<branch-slug>.md instead and revert these files to main.")
            valid = False
    return 0 if valid else 1


if __name__ == "__main__":
    raise SystemExit(main())
