"""Fail when a test case cites a backlog story or scenario that no longer exists.

The backlog is authoritative and it is meant to change. When a scenario is
deleted, renumbered or marked superseded, every case that cited it is orphaned,
and nothing anywhere reports that. This check parses the `AC reference` line of
every case in `docs/testing/cases/` and resolves it against
`docs/backlog/release-1/` and `docs/backlog/product/`.

It fails when:

- the referenced story does not exist in either backlog view;
- the referenced scenario number does not exist on that story;
- the referenced scenario is marked `[Superseded ...]` and the case is neither
  retired in its own title nor listed in `docs/testing/tc-drift-allowlist.json`;
- an allowlist entry is stale, because its scenario is no longer superseded or
  its case no longer exists. That makes the allowlist self-cleaning: the entry
  for a pending replacement disappears the day the replacement ships.

Run directly or through `scripts/check.py`.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple

ROOT = Path(__file__).resolve().parents[1]
CASES_DIR = ROOT / "docs" / "testing" / "cases"
BACKLOG_DIRS = (ROOT / "docs" / "backlog" / "release-1", ROOT / "docs" / "backlog" / "product")
ALLOWLIST = ROOT / "docs" / "testing" / "tc-drift-allowlist.json"

STORY_HEADING = re.compile(r"^## (E\d+-S\d+)")
SCENARIO_HEADING = re.compile(r"^#### Scenario (\d+[a-z]?)(.*)$")
CASE_HEADING = re.compile(r"^### (TC_[A-Z0-9_]+)\s*[\u2014\u2013-]\s*(.*)$")
AC_LINE = re.compile(r"^-\s+\*\*AC reference\*\*:\s*(.*)$")
STORY_TOKEN = re.compile(r"E\d+-S\d+")
# Scenario labels are numbered with optional letter suffixes: 3, 3e, 3f.
SCENARIO_LABEL = re.compile(r"Scenarios?\s+(\d+[a-z]?(?:\s*(?:,|and)\s*\d+[a-z]?)*)")
# These files hold cases that are not anchored to a user story (the three
# performance targets, which CONTRIBUTING.md keeps outside the Definition of Done).
CASES_WITHOUT_BACKLOG_ANCHOR = {"EXX.md"}


def backlog_index() -> Tuple[Dict[str, Set[str]], Set[Tuple[str, str]]]:
    """Return every story's scenario numbers, and the superseded (story, scenario) pairs."""
    scenarios: Dict[str, Set[str]] = {}
    superseded: Set[Tuple[str, str]] = set()
    for directory in BACKLOG_DIRS:
        if not directory.is_dir():
            continue
        for path in sorted(directory.glob("*.md")):
            story = None
            for line in path.read_text(encoding="utf-8").splitlines():
                heading = STORY_HEADING.match(line)
                if heading:
                    story = heading.group(1)
                    scenarios.setdefault(story, set())
                    continue
                scenario = SCENARIO_HEADING.match(line)
                if scenario and story:
                    label = scenario.group(1)
                    scenarios[story].add(label)
                    if "superseded" in scenario.group(2).lower():
                        superseded.add((story, label))
    return scenarios, superseded


def case_records() -> List[dict]:
    """Return every case with the story and scenario numbers it cites."""
    records: List[dict] = []
    for path in sorted(CASES_DIR.glob("E*.md")):
        current = None
        for line in path.read_text(encoding="utf-8").splitlines():
            heading = CASE_HEADING.match(line)
            if heading:
                current = {
                    "tc": heading.group(1),
                    "title": heading.group(2),
                    "retired": "[RETIRED" in heading.group(2).upper(),
                    "ac": "",
                    "refs": [],
                    "file": path.name,
                }
                records.append(current)
                continue
            if current is None:
                continue
            ac = AC_LINE.match(line)
            if ac and not current["ac"]:
                current["ac"] = ac.group(1).strip()
                current["refs"] = parse_references(ac.group(1))
    return records


def parse_references(text: str) -> List[Tuple[str, List[str]]]:
    """Split an AC reference into (story, scenario numbers) pairs.

    Handles the shapes in use: a single scenario, "Scenarios 1 and 3", a
    checklist reference with no scenario at all, and trailing BDR citations that
    introduce a second story token.
    """
    positions = [(match.start(), match.group(0)) for match in STORY_TOKEN.finditer(text)]
    references: List[Tuple[str, List[str]]] = []
    for index, (start, story) in enumerate(positions):
        end = positions[index + 1][0] if index + 1 < len(positions) else len(text)
        segment = text[start + len(story) : end]
        labels: List[str] = []
        for scenario in SCENARIO_LABEL.finditer(segment):
            labels.extend(re.findall(r"\d+[a-z]?", scenario.group(1)))
        references.append((story, labels))
    return references


def load_allowlist() -> Dict[str, dict]:
    if not ALLOWLIST.is_file():
        return {}
    data = json.loads(ALLOWLIST.read_text(encoding="utf-8"))
    return {entry["case"]: entry for entry in data.get("entries", [])}


def main() -> int:
    scenarios, superseded = backlog_index()
    records = case_records()
    allowlist = load_allowlist()
    errors: List[str] = []
    used_allowlist: Set[str] = set()

    for record in records:
        if not record["refs"]:
            if record["file"] not in CASES_WITHOUT_BACKLOG_ANCHOR:
                errors.append(
                    f"{record['file']}: {record['tc']} has no AC reference, so its "
                    "backlog anchor cannot be checked."
                )
            continue
        flagged = False
        for story, numbers in record["refs"]:
            if story not in scenarios:
                errors.append(
                    f"{record['tc']} cites {story}, which is not in either backlog view."
                )
                continue
            for number in numbers:
                if number not in scenarios[story]:
                    errors.append(
                        f"{record['tc']} cites {story} Scenario {number}, which does not exist."
                    )
                elif (story, number) in superseded:
                    flagged = True
        if flagged and not record["retired"]:
            entry = allowlist.get(record["tc"])
            if not entry:
                errors.append(
                    f"{record['tc']} cites a superseded scenario and is neither retired "
                    "nor listed in docs/testing/tc-drift-allowlist.json."
                )
            else:
                used_allowlist.add(record["tc"])
                if not STORY_TOKEN.fullmatch(str(entry.get("superseded_by", ""))):
                    errors.append(
                        f"{record['tc']} has an allowlist entry without a valid "
                        "'superseded_by' story."
                    )
                if not str(entry.get("reason", "")).strip():
                    errors.append(
                        f"{record['tc']} has an allowlist entry without a reason."
                    )

    known_cases = {record["tc"] for record in records}
    for name in allowlist:
        if name not in known_cases:
            errors.append(f"Allowlist names {name}, which is not a test case any more.")
        elif name not in used_allowlist:
            errors.append(
                f"Allowlist entry for {name} is stale: it no longer cites a superseded "
                "scenario. Remove the entry, or retire the case if the replacement shipped."
            )

    if errors:
        print("Test-case reference check failed:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1
    print(
        f"PASS: {len(records)} test cases reference backlog scenarios that exist; "
        f"{len(used_allowlist)} allowlisted supersession(s)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
