"""One-shot: convert CONNECTSPHERE BACKLOGS CAA <DDMMYYYY>.xlsx to per-epic
Markdown files under docs/backlog/. This script is one-shot: run it once to
seed docs/backlog/. Ongoing edits happen directly against the Markdown files.

Usage from the repository root:

    .venv-tools\\Scripts\\python.exe scripts\\one_shot\\backlog_xlsx_to_md.py

Requires openpyxl (pinned in tooling/requirements.txt).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Iterable, Optional

import openpyxl

REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCE_XLSX = REPO_ROOT / "docs" / "CONNECTSPHERE BACKLOGS CAA 140926.xlsx"
BACKLOG_DIR = REPO_ROOT / "docs" / "backlog"


def _slug(text: str) -> str:
    lowered = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return lowered or "epic"


def _epic_id(epic_label: str) -> str:
    match = re.match(r"^(E\d{2})", epic_label.strip())
    if not match:
        return "EXX"
    return match.group(1)


def _epic_name(epic_label: str) -> str:
    # "E01 Access & Identity" -> "Access & Identity"
    return re.sub(r"^E\d{2}\s*", "", epic_label.strip())


def _split_scenarios(criteria: str) -> tuple[list[tuple[str, str]], list[str]]:
    """Return (scenarios, checklist_bullets).

    A scenario is (label, body). Scenarios are separated by 'Scenario N -'
    headings in the source cell. Everything after 'Checklist' becomes
    checklist bullets.
    """
    if not criteria:
        return [], []
    text = criteria.replace("\r\n", "\n").replace("\r", "\n").strip()
    checklist: list[str] = []
    if "Checklist" in text:
        parts = text.split("Checklist", 1)
        text = parts[0].rstrip()
        checklist_block = parts[1].strip()
        for line in checklist_block.splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            checklist.append(re.sub(r"^[-*\u2022]\s*", "", stripped))

    scenarios: list[tuple[str, str]] = []
    # Split on "Scenario N - Title" style headings.
    pattern = re.compile(r"Scenario\s+\d+\s*[-\u2013\u2014]\s*(.+)", re.IGNORECASE)
    lines = text.splitlines()
    current_label: Optional[str] = None
    current_body: list[str] = []

    def flush() -> None:
        if current_label is not None:
            scenarios.append((current_label, "\n".join(current_body).strip()))

    for line in lines:
        match = pattern.match(line.strip())
        if match:
            flush()
            current_label = match.group(1).strip()
            current_body = []
        else:
            current_body.append(line)
    flush()

    # If no scenario headings were found, treat the whole block as a single
    # scenario so the user story's acceptance criteria are still visible.
    if not scenarios and text:
        scenarios.append(("Recorded criteria", text))

    return scenarios, checklist


def _render_story(row: dict) -> str:
    story_id = str(row["story_id"]).strip()
    title = str(row["title"]).strip() or "(untitled)"
    sprint = (row.get("sprint") or "").strip()
    points_raw = row.get("points")
    points = "" if points_raw in (None, "") else str(points_raw).rstrip("0").rstrip(".") if isinstance(points_raw, float) else str(points_raw)
    bdr = (row.get("bdr") or "").strip()
    owner = (row.get("owner") or "").strip()
    user_story = (row.get("user_story") or "").strip() or "_No user story recorded._"
    criteria = (row.get("criteria") or "").strip()
    scenarios, checklist = _split_scenarios(criteria)

    out: list[str] = []
    out.append(f"## {story_id} — {title}")
    out.append("")
    out.append(f"- **Sprint**: {sprint}")
    out.append(f"- **Points**: {points}")
    out.append(f"- **BDR references**: {bdr}")
    out.append(f"- **Owner**: {owner}")
    out.append("")
    out.append("### User story")
    out.append("")
    out.append(user_story)
    out.append("")
    out.append("### Acceptance criteria")
    if not scenarios:
        out.append("")
        out.append("_No acceptance criteria recorded._")
    else:
        for index, (label, body) in enumerate(scenarios, start=1):
            out.append("")
            out.append(f"#### Scenario {index} — {label}")
            out.append("")
            out.append(body if body else "_No detail recorded._")
    out.append("")
    out.append("### Checklist")
    if not checklist:
        out.append("")
        out.append("_No checklist recorded._")
    else:
        out.append("")
        for item in checklist:
            out.append(f"- {item}")
    out.append("")
    return "\n".join(out)


def _write_epic_file(target_dir: Path, epic_label: str, rows: Iterable[dict]) -> None:
    epic_id = _epic_id(epic_label)
    epic_name = _epic_name(epic_label)
    filename = f"{epic_id}-{_slug(epic_name)}.md"
    target_path = target_dir / filename
    parts: list[str] = []
    parts.append(f"# {epic_id} — {epic_name}")
    parts.append("")
    for row in sorted(rows, key=lambda r: r["story_id"]):
        parts.append(_render_story(row))
    target_path.write_text("\n".join(parts), encoding="utf-8")


def _read_sheet(worksheet) -> list[dict]:
    header = [str(cell.value).strip() if cell.value else "" for cell in worksheet[1]]
    field_index = {name: index for index, name in enumerate(header)}
    field_map = {
        "sprint": "Sprint",
        "epic": "Epic",
        "story_id": "Story ID",
        "title": "Story Title",
        "user_story": "User Story",
        "criteria": "Acceptance Criteria",
        "points": "Points",
        "bdr": "Backlog Decision Reference",
        "owner": "Person Doing",
    }
    for name in field_map.values():
        if name not in field_index:
            print(f"WARN: header missing column '{name}' in sheet '{worksheet.title}'", file=sys.stderr)

    rows: list[dict] = []
    for raw in worksheet.iter_rows(min_row=2, values_only=True):
        if not raw or all(cell in (None, "") for cell in raw):
            continue
        record = {}
        for key, header_name in field_map.items():
            index = field_index.get(header_name)
            record[key] = raw[index] if index is not None and index < len(raw) else None
        if not record.get("story_id"):
            continue
        rows.append(record)
    return rows


def main() -> int:
    if not SOURCE_XLSX.is_file():
        print(f"ERROR: source workbook not found: {SOURCE_XLSX}", file=sys.stderr)
        return 1
    workbook = openpyxl.load_workbook(str(SOURCE_XLSX), data_only=True)

    for sheet_name, output_subdir in (
        ("RELEASE 1 BACKLOG", "release-1"),
        ("PRODUCT BACKLOG", "product"),
    ):
        if sheet_name not in workbook.sheetnames:
            print(f"WARN: sheet '{sheet_name}' not found in workbook", file=sys.stderr)
            continue
        sheet_rows = _read_sheet(workbook[sheet_name])
        target_dir = BACKLOG_DIR / output_subdir
        target_dir.mkdir(parents=True, exist_ok=True)
        by_epic: dict[str, list[dict]] = {}
        for row in sheet_rows:
            epic = (row.get("epic") or "").strip() or "E00 Uncategorised"
            by_epic.setdefault(epic, []).append(row)
        for epic_label, rows in sorted(by_epic.items()):
            _write_epic_file(target_dir, epic_label, rows)
        print(f"{sheet_name}: wrote {len(by_epic)} epic file(s), {len(sheet_rows)} stories total")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
