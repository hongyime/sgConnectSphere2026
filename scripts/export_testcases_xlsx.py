"""Regenerate the test-cases xlsx from docs/testing/cases/*.md.

Markdown is authoritative. This script rebuilds
docs/testing/PROJECT TEST CASES CAA <DDMMYYYY>.xlsx from the Markdown
files. Use it before a Jira import or when a reviewer wants the workbook.

Usage from the repository root:

    .venv-tools\\Scripts\\python.exe scripts\\export_testcases_xlsx.py

Pass --date DDMMYY to override the date suffix.
"""
from __future__ import annotations

import argparse
import re
import sys
from datetime import date
from pathlib import Path
from typing import Optional

import openpyxl
from openpyxl.styles import Alignment, Font

REPO_ROOT = Path(__file__).resolve().parents[1]
CASES_DIR = REPO_ROOT / "docs" / "testing" / "cases"
COLUMNS = ("Sprint Number", "Story ID", "AC Reference", "Step(1-5)",
           "Test Case ID", "Test Case Scenerio", "Pre Conditions",
           "Test Steps", "Test Data", "Expected Result")


def _parse_metadata(lines: list[str]) -> dict[str, str]:
    result: dict[str, str] = {}
    for line in lines:
        match = re.match(r"^-\s+\*\*(?P<key>[^*]+)\*\*:\s*(?P<value>.*)$", line.strip())
        if match:
            result[match.group("key").strip()] = match.group("value").strip()
    return result


def _split_sections(lines: list[str]) -> dict[str, str]:
    sections: dict[str, list[str]] = {}
    current: Optional[str] = None
    buffer: list[str] = []
    for line in lines:
        if line.startswith("#### ") and not line.startswith("#### Scenario"):
            if current is not None:
                sections[current] = "\n".join(buffer).strip()
            current = line[5:].strip()
            buffer = []
        else:
            buffer.append(line)
    if current is not None:
        sections[current] = "\n".join(buffer).strip()
    return sections


def _clean_section(value: str) -> str:
    if not value or value == "_None recorded._":
        return ""
    # Strip the trailing allowlist-pragma HTML comments the seeder added.
    lines = [re.sub(r"\s*<!--\s*pragma: allowlist secret\s*-->\s*$", "", line, flags=re.IGNORECASE)
             for line in value.splitlines()]
    return "\n".join(lines).strip()


def _parse_case_block(block: str, story_id_context: str) -> Optional[dict]:
    lines = block.splitlines()
    match = re.match(r"^###\s+(TC_[^\s]+|[A-Z0-9_]+)\s+[-\u2013\u2014]\s+(.+?)\s*$", lines[0])
    if not match:
        return None
    case_id = match.group(1)
    scenario = match.group(2)

    metadata_end = 0
    for index, line in enumerate(lines[1:], start=1):
        if line.startswith("#### "):
            metadata_end = index
            break
    metadata_lines = lines[1:metadata_end] if metadata_end else lines[1:]
    body_lines = lines[metadata_end:] if metadata_end else []
    metadata = _parse_metadata(metadata_lines)
    sections = _split_sections(body_lines)

    sprint_raw = metadata.get("Sprint", "").strip()
    sprint_value: object = ""
    if sprint_raw:
        try:
            sprint_value = int(sprint_raw)
        except ValueError:
            try:
                sprint_value = float(sprint_raw)
            except ValueError:
                sprint_value = sprint_raw

    return {
        "sprint": sprint_value,
        "story_id": story_id_context,
        "ac_reference": metadata.get("AC reference", ""),
        "step_type": metadata.get("Type", ""),
        "case_id": case_id,
        "scenario": scenario,
        "preconditions": _clean_section(sections.get("Pre-conditions", "")),
        "steps":         _clean_section(sections.get("Test steps", "")),
        "test_data":     _clean_section(sections.get("Test data", "")),
        "expected":      _clean_section(sections.get("Expected result", "")),
    }


def _parse_epic_file(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    cases: list[dict] = []
    current_story = ""
    story_pattern = re.compile(r"^##\s+(.+?)\s*$")
    case_pattern = re.compile(r"^###\s+")
    blocks = re.split(r"^(?=###\s)", text, flags=re.MULTILINE)

    header_lines = blocks[0].splitlines() if blocks else []
    for line in header_lines:
        match = story_pattern.match(line)
        if match:
            current_story = match.group(1).strip()

    for block in blocks[1:]:
        first_line = block.splitlines()[0]
        if not case_pattern.match(first_line):
            continue
        preceding = block.split("##", 1)
        parsed = _parse_case_block(block, current_story)
        if not parsed:
            continue
        cases.append(parsed)

    # Re-scan to attach the correct story-id context per case block.
    # Case blocks appear under ## <story-id> level-two headings.
    ordered_cases: list[dict] = []
    current_story = ""
    for line in text.splitlines():
        story_match = story_pattern.match(line)
        if story_match:
            current_story = story_match.group(1).strip()
        case_match = re.match(r"^###\s+(TC_[^\s]+|[A-Z0-9_]+)\s+[-\u2013\u2014]\s+", line)
        if case_match and cases:
            case_id = case_match.group(1)
            for candidate in cases:
                if candidate["case_id"] == case_id and not any(existing["case_id"] == case_id for existing in ordered_cases):
                    candidate["story_id"] = current_story if current_story else candidate["story_id"]
                    ordered_cases.append(candidate)
                    break

    return ordered_cases or cases


def _write_workbook(rows: list[dict], destination: Path) -> None:
    workbook = openpyxl.Workbook()
    workbook.remove(workbook.active)
    sheet = workbook.create_sheet("TEST CASES")
    header_font = Font(bold=True)
    wrap = Alignment(wrap_text=True, vertical="top")

    sheet.append(list(COLUMNS))
    for column_index in range(1, len(COLUMNS) + 1):
        cell = sheet.cell(row=1, column=column_index)
        cell.font = header_font
        cell.alignment = wrap

    for row in rows:
        sheet.append([
            row["sprint"], row["story_id"], row["ac_reference"], row["step_type"],
            row["case_id"], row["scenario"], row["preconditions"], row["steps"],
            row["test_data"], row["expected"],
        ])

    for column_letter, width in zip("ABCDEFGHIJ", (10, 12, 32, 16, 18, 40, 40, 60, 40, 60)):
        sheet.column_dimensions[column_letter].width = width
    for cells in sheet.iter_rows(min_row=2):
        for cell in cells:
            cell.alignment = wrap

    workbook.save(str(destination))


def _output_path(target_date: date) -> Path:
    return REPO_ROOT / "docs" / "testing" / f"PROJECT TEST CASES CAA {target_date.strftime('%d%m%y')}.xlsx"


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Export docs/testing/cases/*.md to xlsx.")
    parser.add_argument("--date", help="Override DDMMYY suffix.", default=None)
    args = parser.parse_args(argv)

    if args.date:
        match = re.fullmatch(r"(\d{2})(\d{2})(\d{2})", args.date)
        if not match:
            print("ERROR: --date must be DDMMYY (six digits).", file=sys.stderr)
            return 2
        target_date = date(2000 + int(match.group(3)), int(match.group(2)), int(match.group(1)))
    else:
        target_date = date.today()

    if not CASES_DIR.is_dir():
        print(f"ERROR: no test cases directory at {CASES_DIR}", file=sys.stderr)
        return 1

    rows: list[dict] = []
    for path in sorted(CASES_DIR.glob("*.md")):
        rows.extend(_parse_epic_file(path))

    if not rows:
        print("ERROR: no test case Markdown files found.", file=sys.stderr)
        return 1

    destination = _output_path(target_date)
    _write_workbook(rows, destination)
    print(f"Wrote {destination.name} — {len(rows)} test cases across {len(list(CASES_DIR.glob('*.md')))} epic file(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
