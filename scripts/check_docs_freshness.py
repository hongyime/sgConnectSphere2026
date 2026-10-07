"""Verify that every file referenced in docs/source-of-truth.md exists on disk.

Run from the repository root:

    python scripts/check_docs_freshness.py

Exits non-zero when a referenced file is missing, which means
source-of-truth.md is stale and needs updating.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SOT = REPO_ROOT / "docs" / "source-of-truth.md"

# Match backtick-quoted file paths in the source-of-truth table.
# Examples: `docs/backlog/`, `docs/CONNECTSPHERE BACKLOGS CAA 160926.xlsx`
FILE_REF_RE = re.compile(r"`(docs/[^`]+)`")


def check() -> int:
    if not SOT.is_file():
        print(f"ERROR: {SOT.relative_to(REPO_ROOT)} not found.", file=sys.stderr)
        return 1

    text = SOT.read_text(encoding="utf-8")
    missing: list[str] = []

    for match in FILE_REF_RE.finditer(text):
        ref = match.group(1)
        target = REPO_ROOT / ref
        # Directory references end with /; check directory existence.
        if ref.endswith("/"):
            if not target.is_dir():
                missing.append(ref)
        else:
            if not target.is_file():
                missing.append(ref)

    if missing:
        print("docs/source-of-truth.md references files that do not exist:")
        for path in missing:
            print(f"  {path}")
        print("Update the table in docs/source-of-truth.md or add the missing files.")
        return 1

    print(f"docs/source-of-truth.md: all {len(list(FILE_REF_RE.finditer(text)))} file references exist.")
    return 0


if __name__ == "__main__":
    raise SystemExit(check())
