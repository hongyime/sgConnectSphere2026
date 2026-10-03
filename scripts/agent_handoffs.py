#!/usr/bin/env python3
"""List the per-task handoff files, newest first, with each one's goal.

Replaces the per-PR entry that used to be prepended to `.agents/STATE.md`
(decision 0014). Run it at the start of a task to see what is in flight:

    python scripts/agent_handoffs.py          # newest 15
    python scripts/agent_handoffs.py --all
    python scripts/agent_handoffs.py --branch docs/week7-changes

Read-only. Exits 0 unless the handoffs directory is missing.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
HANDOFFS = REPO_ROOT / ".agents" / "handoffs"
NAME = re.compile(r"^(?P<date>\d{8})-(?P<slug>.+)\.md$")


@dataclass(frozen=True)
class Handoff:
    path: Path
    date: str
    slug: str
    goal: str

    @property
    def branch_guess(self) -> str:
        # The slug is the branch with "/" replaced by "-"; the first segment is
        # the prefix, so put one "/" back there. Good enough for a listing.
        prefix, _, rest = self.slug.partition("-")
        return f"{prefix}/{rest}" if rest else self.slug


def first_goal_line(text: str) -> str:
    """The first paragraph after the title, flattened to one line."""
    lines = text.splitlines()
    body: list[str] = []
    for line in lines[1:] if lines and lines[0].startswith("#") else lines:
        if not line.strip():
            if body:
                break
            continue
        body.append(line.strip())
    goal = " ".join(body)
    goal = re.sub(r"^Goal:\s*", "", goal)
    return goal


def load(directory: Path = HANDOFFS) -> list[Handoff]:
    items: list[Handoff] = []
    for path in directory.glob("*.md"):
        match = NAME.match(path.name)
        if not match:
            continue
        items.append(Handoff(path, match["date"], match["slug"], first_goal_line(path.read_text(encoding="utf-8"))))
    return sorted(items, key=lambda h: (h.date, h.slug), reverse=True)


def slug_for_branch(branch: str) -> str:
    return branch.replace("/", "-")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--all", action="store_true", help="show every handoff, not just the newest 15")
    parser.add_argument("--branch", help="show only the handoff(s) for this branch name")
    parser.add_argument("--width", type=int, default=110, help="truncate goals to this many characters")
    args = parser.parse_args(argv)

    if not HANDOFFS.is_dir():
        print(f"ERROR: {HANDOFFS} missing.", file=sys.stderr)
        return 1
    items = load()
    if args.branch:
        wanted = slug_for_branch(args.branch)
        items = [h for h in items if h.slug == wanted]
        if not items:
            print(f"No handoff for branch {args.branch} (expected .agents/handoffs/YYYYMMDD-{wanted}.md).")
            return 0
    elif not args.all:
        items = items[:15]
    for h in items:
        goal = h.goal if len(h.goal) <= args.width else h.goal[: args.width - 3] + "..."
        print(f"{h.date}  {h.branch_guess}")
        print(f"          {goal}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
