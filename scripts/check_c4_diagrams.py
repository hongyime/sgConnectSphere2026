"""Assert docs/c4-diagrams.md keeps the C1 role and C2 container inventory.

The inventories are hardcoded on purpose (no YAML/JSON parsing at runtime).
Provenance for what must appear in the Containers diagram:
- vercel.json crons: outbox-relay, hold-expiry
- .github/workflows/application-checks.yml service containers: postgres:17,
  redis:7-alpine
- backend/src/providers/: brevo.ts (Email Provider), durableRedis.ts (Redis)

Run from the repository root:

    python scripts/check_c4_diagrams.py

Exits non-zero when a Mermaid block or a required node label is missing.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DIAGRAM = REPO_ROOT / "docs" / "c4-diagrams.md"

MERMAID_BLOCK_RE = re.compile(r"```mermaid\r?\n(.*?)```", re.DOTALL)

C1_MARKER = "%% C1 SystemContext"
C2_MARKER = "%% C2 Containers"

C1_TOKENS = (
    "Event Organiser",
    "Attendee",
    "Event Coordinator",
    "Venue Staff",
    "Technical Support Staff",
    "Event Coordinator Lead",
    "Safety Officer",
    "Email Provider",
)

C2_TOKENS = (
    "Web Application",
    "Application Server",
    "PostgreSQL",
    "Redis",
    "Scheduler and Outbox Relay",
    "Notification Worker",
    "Email Provider",
)


def extract_blocks(text: str) -> list[str]:
    """Return the body of every ```mermaid fenced block in ``text``."""
    return MERMAID_BLOCK_RE.findall(text)


def find_block(blocks: list[str], marker: str) -> str | None:
    """Return the block whose first line is ``marker``, if any."""
    for block in blocks:
        if block.lstrip().startswith(marker):
            return block
    return None


def missing_tokens(block: str, tokens: tuple[str, ...]) -> list[str]:
    """Return the required tokens absent from ``block``."""
    return [token for token in tokens if token not in block]


def check(path: Path = DIAGRAM) -> int:
    if not path.is_file():
        print(f"ERROR: {path.name} not found.", file=sys.stderr)
        return 1

    blocks = extract_blocks(path.read_text(encoding="utf-8"))
    for marker, tokens in ((C1_MARKER, C1_TOKENS), (C2_MARKER, C2_TOKENS)):
        label = marker.removeprefix("%% ")
        block = find_block(blocks, marker)
        if block is None:
            print(
                f"ERROR: {path.name}: no mermaid block marked '{marker}'.",
                file=sys.stderr,
            )
            return 1
        missing = missing_tokens(block, tokens)
        if missing:
            print(
                f"ERROR: {path.name}: {label} is missing '{missing[0]}'.",
                file=sys.stderr,
            )
            return 1

    print(
        f"{path.name}: {C1_MARKER.removeprefix('%% ')} has all {len(C1_TOKENS)} "
        f"nodes, {C2_MARKER.removeprefix('%% ')} has all {len(C2_TOKENS)} nodes."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(check())
