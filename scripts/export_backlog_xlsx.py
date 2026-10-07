"""Regenerate the backlog xlsx export from docs/backlog/*.md.

Markdown is authoritative. This script rebuilds
docs/CONNECTSPHERE BACKLOGS CAA <DDMMYYYY>.xlsx from the Markdown files
under docs/backlog/. Use it before a Jira CSV import or when a reviewer
wants to open the backlog in Excel.

Usage from the repository root:

    .venv-tools\\Scripts\\python.exe scripts\\export_backlog_xlsx.py

By default the output filename uses today's date. Pass --date DDMMYYYY to
override, useful for regenerating a historical dated copy.
"""
from __future__ import annotations

import argparse
import re
import sys
from datetime import date
from pathlib import Path
from typing import Iterable, Optional

import openpyxl
from openpyxl.styles import Alignment, Font

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKLOG_DIR = REPO_ROOT / "docs" / "backlog"
COLUMNS = ("Sprint", "Epic", "Story ID", "Story Title", "User Story",
           "Acceptance Criteria", "Points", "Backlog Decision Reference", "Person Doing")


def _parse_metadata_block(lines: list[str]) -> dict[str, str]:
    result: dict[str, str] = {}
    for line in lines:
        match = re.match(r"^-\s+\*\*(?P<key>[^*]+)\*\*:\s*(?P<value>.*)$", line.strip())
        if not match:
            continue
        result[match.group("key").strip()] = match.group("value").strip()
    return result


def _parse_story_block(block: str) -> Optional[dict]:
    lines = block.splitlines()
    heading = lines[0].strip()
    heading_match = re.match(r"^##\s+(E\d{2}-S\d+(?:\.\d+)?)\s+[-\u2013\u2014]\s+(.+?)\s*$", heading)
    if not heading_match:
        return None
    story_id = heading_match.group(1)
    title = heading_match.group(2)

    metadata_lines: list[str] = []
    body_lines: list[str] = []
    seen_section = False
    for line in lines[1:]:
        if line.startswith("### "):
            seen_section = True
        if seen_section:
            body_lines.append(line)
        else:
            metadata_lines.append(line)
    metadata = _parse_metadata_block(metadata_lines)

    sections = _split_sections(body_lines)
    user_story_text = sections.get("User story", "").strip()
    if user_story_text == "_No user story recorded._":
        user_story_text = ""
    criteria_text = _join_scenarios_and_checklist(
        sections.get("Acceptance criteria", ""),
        sections.get("Checklist", ""),
    )

    points_raw = metadata.get("Points", "").strip()
    points_value: object = ""
    if points_raw:
        try:
            points_value = float(points_raw) if "." in points_raw else int(points_raw)
        except ValueError:
            points_value = points_raw

    return {
        "story_id": story_id,
        "title": title,
        "sprint": metadata.get("Sprint", ""),
        "points": points_value,
        "bdr": metadata.get("BDR references", ""),
        "owner": metadata.get("Owner", ""),
        "user_story": user_story_text,
        "criteria": criteria_text,
    }


def _split_sections(body_lines: list[str]) -> dict[str, str]:
    sections: dict[str, list[str]] = {}
    current: Optional[str] = None
    buffer: list[str] = []
    for line in body_lines:
        if line.startswith("### "):
            if current is not None:
                sections[current] = "\n".join(buffer).strip()
            current = line[4:].strip()
            buffer = []
        else:
            buffer.append(line)
    if current is not None:
        sections[current] = "\n".join(buffer).strip()
    return sections


def _join_scenarios_and_checklist(criteria_section: str, checklist_section: str) -> str:
    """Rebuild the xlsx-style acceptance criteria cell from Markdown."""
    parts: list[str] = []
    if criteria_section and criteria_section.strip() != "_No acceptance criteria recorded._":
        scenario_pattern = re.compile(r"^####\s+Scenario\s+(\d+)\s+[-\u2013\u2014]\s+(.+)$")
        current_header: Optional[str] = None
        current_body: list[str] = []
        for raw_line in criteria_section.splitlines():
            match = scenario_pattern.match(raw_line.strip())
            if match:
                if current_header is not None:
                    parts.append(current_header)
                    body = "\n".join(current_body).strip()
                    if body and body != "_No detail recorded._":
                        parts.append(body)
                    parts.append("")
                current_header = f"Scenario {match.group(1)} - {match.group(2).strip()}"
                current_body = []
            else:
                current_body.append(raw_line)
        if current_header is not None:
            parts.append(current_header)
            body = "\n".join(current_body).strip()
            if body and body != "_No detail recorded._":
                parts.append(body)

    if checklist_section and checklist_section.strip() != "_No checklist recorded._":
        parts.append("")
        parts.append("Checklist")
        for raw_line in checklist_section.splitlines():
            stripped = raw_line.strip()
            if not stripped:
                continue
            stripped = re.sub(r"^-\s+", "- ", stripped)
            if not stripped.startswith("- "):
                stripped = f"- {stripped}"
            parts.append(stripped)

    return "\n".join(parts).strip()


def _iter_epic_files(subdir: Path) -> Iterable[Path]:
    if not subdir.is_dir():
        return []
    return sorted(subdir.glob("E*.md"))


def _parse_epic_file(path: Path) -> tuple[str, list[dict]]:
    text = path.read_text(encoding="utf-8")
    heading_match = re.match(r"^#\s+(E\d{2})\s+[-\u2013\u2014]\s+(.+?)\s*$", text.splitlines()[0])
    epic_id = heading_match.group(1) if heading_match else "EXX"
    epic_name = heading_match.group(2).strip() if heading_match else path.stem
    epic_label = f"{epic_id} {epic_name}"

    stories: list[dict] = []
    story_blocks = re.split(r"^(?=##\s)", text, flags=re.MULTILINE)
    for block in story_blocks:
        if not block.lstrip().startswith("## E"):
            continue
        parsed = _parse_story_block(block)
        if parsed is None:
            continue
        parsed["epic"] = epic_label
        stories.append(parsed)
    return epic_label, stories


def _write_workbook(release_rows: list[dict], product_rows: list[dict], destination: Path) -> None:
    workbook = openpyxl.Workbook()
    workbook.remove(workbook.active)

    for sheet_name, rows, include_sprint, include_owner in (
        ("RELEASE 1 BACKLOG", release_rows, True,  True),
        ("PRODUCT BACKLOG",   product_rows, False, False),
    ):
        sheet = workbook.create_sheet(sheet_name)
        header_font = Font(bold=True)
        wrap = Alignment(wrap_text=True, vertical="top")
        sheet.append(list(COLUMNS))
        for column_index in range(1, len(COLUMNS) + 1):
            cell = sheet.cell(row=1, column=column_index)
            cell.font = header_font
            cell.alignment = wrap
        for story in rows:
            row_values = [
                story["sprint"] if include_sprint else "",
                story["epic"],
                story["story_id"],
                story["title"],
                story["user_story"],
                story["criteria"],
                story["points"],
                story["bdr"],
                story["owner"] if include_owner else "",
            ]
            sheet.append(row_values)
        for column_letter, width in zip("ABCDEFGHI", (10, 32, 10, 32, 60, 90, 8, 20, 20)):
            sheet.column_dimensions[column_letter].width = width
        for row in sheet.iter_rows(min_row=2):
            for cell in row:
                cell.alignment = wrap

    workbook.save(str(destination))


def _output_path(target_date: date) -> Path:
    return REPO_ROOT / "docs" / f"CONNECTSPHERE BACKLOGS CAA {target_date.strftime('%d%m%y')}.xlsx"


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Export docs/backlog/*.md to xlsx.")
    parser.add_argument("--date", help="Override the DDMMYY date suffix. Format: DDMMYY.", default=None)
    args = parser.parse_args(argv)

    if args.date:
        match = re.fullmatch(r"(\d{2})(\d{2})(\d{2})", args.date)
        if not match:
            print("ERROR: --date must be DDMMYY (six digits).", file=sys.stderr)
            return 2
        target_date = date(2000 + int(match.group(3)), int(match.group(2)), int(match.group(1)))
    else:
        target_date = date.today()

    release_rows: list[dict] = []
    for path in _iter_epic_files(BACKLOG_DIR / "release-1"):
        _, stories = _parse_epic_file(path)
        release_rows.extend(stories)

    product_rows: list[dict] = []
    for path in _iter_epic_files(BACKLOG_DIR / "product"):
        _, stories = _parse_epic_file(path)
        product_rows.extend(stories)

    if not release_rows and not product_rows:
        print("ERROR: no Markdown backlog files found under docs/backlog/.", file=sys.stderr)
        return 1

    destination = _output_path(target_date)
    _write_workbook(release_rows, product_rows, destination)
    print(f"Wrote {destination.name}")
    print(f"  RELEASE 1 BACKLOG: {len(release_rows)} stories")
    print(f"  PRODUCT BACKLOG:   {len(product_rows)} stories")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
