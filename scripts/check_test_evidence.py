"""Enforce T-93 screenshot evidence and record/evidence atomicity.

The general run-record checker validates the Markdown schema. This companion
check validates newly added manual records and ensures their evidence files are
added in the same staged change or pull request. Existing merged records remain
immutable and are grandfathered.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path
from typing import Iterable

import yaml


ROOT = Path(__file__).resolve().parents[1]
RUNS_DIR = ROOT / "docs" / "testing" / "runs"
MAX_SCREENSHOT_BYTES = 1000 * 1024
SCREENSHOT_SUFFIXES = {".jpg", ".jpeg", ".png"}
FRONTMATTER_RE = re.compile(r"\A---\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|\Z)", re.DOTALL)
SCREENSHOT_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
RECORD_RE = re.compile(r"^docs/testing/runs/\d{8}-\d{6}-.+\.md$")


def table_cells(line: str) -> list[str] | None:
    stripped = line.strip()
    if not (stripped.startswith("|") and stripped.endswith("|")):
        return None
    return [cell.strip() for cell in stripped[1:-1].split("|")]


def record_data(path: Path) -> tuple[dict, list[tuple[str, str]], str]:
    text = path.read_text(encoding="utf-8")
    match = FRONTMATTER_RE.match(text)
    if match is None:
        return {}, [], ""
    frontmatter = yaml.safe_load(match.group(1)) or {}
    body = text[match.end() :]
    lines = body.splitlines()
    rows: list[tuple[str, str]] = []
    table_start = next(
        (index for index, line in enumerate(lines) if table_cells(line) == ["TC_ID", "Test Name", "Outcome", "Remarks"]),
        None,
    )
    if table_start is not None:
        for line in lines[table_start + 2 :]:
            cells = table_cells(line)
            if cells is None:
                break
            if len(cells) == 4:
                rows.append((cells[0], cells[2]))

    screenshot_body = ""
    heading = next(
        (index for index, line in enumerate(lines) if line.strip() == "## Screenshots"),
        None,
    )
    if heading is not None:
        end = next(
            (index for index in range(heading + 1, len(lines)) if re.match(r"^##\s+", lines[index])),
            len(lines),
        )
        screenshot_body = "\n".join(lines[heading + 1 : end])
    return frontmatter, rows, screenshot_body


def evidence_errors(path: Path) -> list[str]:
    frontmatter, rows, screenshot_body = record_data(path)
    if frontmatter.get("run_type") != "manual":
        return []

    required_rows = [(tc_id, outcome) for tc_id, outcome in rows if outcome in {"PASS", "FAIL"}]
    if not required_rows:
        return []
    if not screenshot_body:
        return [f"{path}: manual PASS/FAIL rows require a ## Screenshots section"]

    links = SCREENSHOT_LINK_RE.findall(screenshot_body)
    errors: list[str] = []
    labels: list[str] = []
    expected_prefix = f"evidence/{path.stem}/"
    for label, target in links:
        labels.append(label)
        normalized = target.replace("\\", "/")
        target_path = Path(normalized)
        if (
            target_path.is_absolute()
            or ".." in target_path.parts
            or not normalized.startswith(expected_prefix)
        ):
            errors.append(f"{path}: screenshot {label} must stay under {expected_prefix}")
            continue
        if target_path.stem != label:
            errors.append(f"{path}: screenshot filename {target_path.name} must match link label {label}")
        if target_path.suffix.lower() not in SCREENSHOT_SUFFIXES:
            errors.append(f"{path}: screenshot {target} must be PNG or JPG")
        absolute = RUNS_DIR.joinpath(*target_path.parts)
        if not absolute.is_file():
            errors.append(f"{path}: linked screenshot does not exist: {target}")
        elif absolute.stat().st_size > MAX_SCREENSHOT_BYTES:
            errors.append(f"{path}: screenshot exceeds 1000 KB: {target}")

    for tc_id, _outcome in required_rows:
        if not any(label == tc_id or label.startswith(f"{tc_id}-") for label in labels):
            errors.append(f"{path}: no screenshot linked for {tc_id}")
    for label in labels:
        if not any(label == tc_id or label.startswith(f"{tc_id}-") for tc_id, _outcome in required_rows):
            errors.append(f"{path}: screenshot label does not match a PASS/FAIL row: {label}")
    return errors


def parse_diff(output: str) -> list[tuple[str, list[str]]]:
    changes: list[tuple[str, list[str]]] = []
    for line in output.splitlines():
        if line.strip():
            fields = line.split("\t")
            changes.append((fields[0], fields[1:]))
    return changes


def changed_files(*, staged: bool, base: str | None, head: str | None) -> list[tuple[str, list[str]]]:
    if staged:
        command = ["git", "diff", "--cached", "--name-status", "--find-renames"]
    else:
        if not base or not head:
            raise ValueError("--base and --head are required outside staged mode")
        command = ["git", "diff", "--name-status", "--find-renames", base, head]
    command.extend(["--", "docs/testing/runs"])
    output = subprocess.check_output(command, cwd=ROOT, text=True)
    return parse_diff(output)


def atomicity_errors(changes: Iterable[tuple[str, list[str]]], *, staged: bool) -> list[str]:
    change_map = {path: status for status, paths in changes for path in paths}
    errors: list[str] = []
    added_records: list[Path] = []
    for status, paths in changes:
        if status != "A":
            for path in paths:
                if RECORD_RE.fullmatch(path):
                    errors.append(f"{path}: merged test-run records are immutable; add a new session file")
            continue
        for path in paths:
            if RECORD_RE.fullmatch(path):
                added_records.append(ROOT / path)

    for record in added_records:
        errors.extend(evidence_errors(record))
        frontmatter, _rows, screenshot_body = record_data(record)
        if frontmatter.get("run_type") != "manual" or not screenshot_body:
            continue
        for _label, target in SCREENSHOT_LINK_RE.findall(screenshot_body):
            relative = f"docs/testing/runs/{target.replace('\\', '/')}"
            if change_map.get(relative) != "A":
                mode = "staged change" if staged else "pull request"
                errors.append(f"{record}: screenshot {relative} must be added in the same {mode} as the record")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--staged", action="store_true")
    parser.add_argument("--base")
    parser.add_argument("--head")
    parser.add_argument("--merge-group", action="store_true")
    args = parser.parse_args()

    if args.merge_group:
        print("Test evidence: each queued PR was validated before entering the merge group")
        return 0

    try:
        changes = changed_files(staged=args.staged, base=args.base, head=args.head)
        errors = atomicity_errors(changes, staged=args.staged)
    except (OSError, subprocess.CalledProcessError, ValueError) as error:
        print(f"FAIL: unable to inspect test evidence: {error}", file=sys.stderr)
        return 1

    if errors:
        for error in errors:
            print(f"::error::{error}", file=sys.stderr)
        return 1
    print("Test evidence passed: new manual records and screenshots are complete and atomic")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
