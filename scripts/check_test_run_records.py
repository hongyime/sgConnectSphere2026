"""Validate the T-65 test-run session records."""

from __future__ import annotations

import re
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:  # pragma: no cover - the tooling environment installs PyYAML
    print("Missing PyYAML. Run: python scripts/setup.py", file=sys.stderr)
    raise SystemExit(1)


ROOT = Path(__file__).resolve().parents[1]
RUNS_DIR = ROOT / "docs" / "testing" / "runs"
DATABASE_FIELD_CUTOFF = datetime.fromisoformat("2026-10-03T12:19:39+08:00")

# Legacy filenames from PR #214 that violate the convention but are immutably merged (T-65).
# These used "ci-regression" in the filename when the scope values were "frontend/e2e"
# and "full-regression". The validator's filename convention requires <runner>-<scope>.
LEGACY_FILENAME_EXCEPTIONS = {
    "20261006-003121-xiangyingg-ci-regression.md",
    "20261006-003923-xiangyingg-ci-regression.md",
}

REQUIRED_FIELDS = {
    "date",
    "runner",
    "scope",
    "environment",
    "run_type",
    "test_case_version",
    "commit",
}
OPTIONAL_FIELDS = {"database", "pr"}
SCOPES = {
    "backend/unit",
    "backend/db",
    "backend/api",
    "backend/notifications",
    "frontend/vitest",
    "frontend/e2e",
    "tooling",
    "runtime",
    "full-regression",
}
DATABASES = {"mocked", "real", "none"}
OUTCOMES = {"PASS", "FAIL", "SKIP", "N/A"}
FRONTMATTER_RE = re.compile(
    r"\A---\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|\Z)", re.DOTALL
)
FILENAME_RE = re.compile(r"(?P<date>\d{8})-(?P<time>\d{6})-(?P<tail>.+)\.md\Z")
VERSION_RE = re.compile(r"\d{6}\Z")
COMMIT_RE = re.compile(r"[0-9a-fA-F]{7}\Z")
PR_RE = re.compile(r"[1-9]\d*\Z")
SEPARATOR_CELL_RE = re.compile(r":?-{3,}:?\Z")
EXPECTED_HEADERS = ["TC_ID", "Test Name", "Outcome", "Remarks"]


class UniqueKeyLoader(yaml.BaseLoader):
    """Preserve scalars as strings and reject duplicate frontmatter keys."""


def _construct_unique_mapping(
    loader: UniqueKeyLoader, node: yaml.MappingNode, deep: bool = False
) -> dict[str, Any]:
    mapping: dict[str, Any] = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if not isinstance(key, str):
            raise yaml.constructor.ConstructorError(
                "while constructing a mapping",
                node.start_mark,
                "frontmatter keys must be strings",
                key_node.start_mark,
            )
        if key in mapping:
            raise yaml.constructor.ConstructorError(
                "while constructing a mapping",
                node.start_mark,
                f"duplicate frontmatter key {key!r}",
                key_node.start_mark,
            )
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping


UniqueKeyLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _construct_unique_mapping
)


def _table_cells(line: str) -> list[str] | None:
    stripped = line.strip()
    if not (stripped.startswith("|") and stripped.endswith("|")):
        return None
    return [cell.strip() for cell in stripped[1:-1].split("|")]


def _validate_table(body: str, line_offset: int = 0) -> list[str]:
    errors: list[str] = []
    lines = body.splitlines()
    start = next(
        (index for index, line in enumerate(lines) if line.strip().startswith("|")),
        None,
    )
    if start is None:
        return ["results table is missing"]

    table_lines: list[tuple[int, str]] = []
    for index in range(start, len(lines)):
        line = lines[index]
        if not line.strip():
            if table_lines:
                break
            continue
        if not line.strip().startswith("|"):
            break
        table_lines.append((line_offset + index + 1, line))

    if len(table_lines) < 3:
        return ["results table must contain a header, separator, and at least one row"]

    header = _table_cells(table_lines[0][1])
    if header != EXPECTED_HEADERS:
        errors.append("results table columns must be TC_ID, Test Name, Outcome, Remarks")

    separator = _table_cells(table_lines[1][1])
    if (
        separator is None
        or len(separator) != len(EXPECTED_HEADERS)
        or not all(SEPARATOR_CELL_RE.fullmatch(cell) for cell in separator)
    ):
        errors.append("results table separator is malformed")

    for line_number, line in table_lines[2:]:
        cells = _table_cells(line)
        if cells is None or len(cells) != len(EXPECTED_HEADERS):
            errors.append(f"line {line_number}: result row must have four columns")
            continue
        if not cells[0]:
            errors.append(f"line {line_number}: TC_ID must not be empty")
        if not cells[1]:
            errors.append(f"line {line_number}: Test Name must not be empty")
        if cells[2] not in OUTCOMES:
            errors.append(f"line {line_number}: Outcome must be PASS, FAIL, SKIP, or N/A")
    return errors


def _validate_record(path: Path) -> list[str]:
    errors: list[str] = []
    text = path.read_text(encoding="utf-8")
    match = FRONTMATTER_RE.match(text)
    if match is None:
        return ["frontmatter must start at the top of the file and be closed with ---"]

    try:
        data = yaml.load(match.group(1), Loader=UniqueKeyLoader)
    except yaml.YAMLError:
        return ["frontmatter is not valid YAML or contains duplicate keys"]
    if not isinstance(data, dict):
        return ["frontmatter must be a YAML mapping"]

    unknown = set(data) - REQUIRED_FIELDS - OPTIONAL_FIELDS
    if unknown:
        errors.append("unknown frontmatter field(s): " + ", ".join(sorted(unknown)))

    missing = REQUIRED_FIELDS - set(data)
    for field in REQUIRED_FIELDS & set(data):
        value = data[field]
        if not isinstance(value, str) or not value.strip():
            errors.append(f"{field} must be a non-empty string")

    record_date: datetime | None = None
    date_value = data.get("date")
    if isinstance(date_value, str) and date_value.strip():
        try:
            record_date = datetime.fromisoformat(date_value.replace("Z", "+00:00"))
            if record_date.utcoffset() is None:
                errors.append("date must include a timezone offset")
                record_date = None
            elif record_date.utcoffset() != timedelta(hours=8):
                errors.append("date must use the Singapore UTC+08:00 offset")
        except ValueError:
            errors.append("date must be a valid ISO 8601 timestamp")

    if record_date is not None and record_date >= DATABASE_FIELD_CUTOFF:
        missing |= {"database"} - set(data)
    if missing:
        errors.append("missing required frontmatter field(s): " + ", ".join(sorted(missing)))

    if not isinstance(data.get("scope"), str) or data["scope"] not in SCOPES:
        errors.append("scope must be one of the documented fixed values")
    if not isinstance(data.get("environment"), str) or data["environment"] not in {
        "local",
        "ci",
    }:
        errors.append("environment must be local or ci")
    if not isinstance(data.get("run_type"), str) or data["run_type"] not in {
        "manual",
        "automated",
        "regression",
    }:
        errors.append("run_type must be manual, automated, or regression")
    if "database" in data and (
        not isinstance(data["database"], str) or data["database"] not in DATABASES
    ):
        errors.append("database must be mocked, real, or none")
    if not isinstance(data.get("test_case_version"), str) or not VERSION_RE.fullmatch(
        data.get("test_case_version", "")
    ):
        errors.append("test_case_version must be six digits (DDMMYY)")
    if not isinstance(data.get("commit"), str) or not COMMIT_RE.fullmatch(
        data.get("commit", "")
    ):
        errors.append("commit must be a seven-character hexadecimal SHA")
    if "pr" in data and (
        not isinstance(data["pr"], str) or not PR_RE.fullmatch(data["pr"])
    ):
        errors.append("pr must be a positive pull request number")

    filename = FILENAME_RE.fullmatch(path.name)
    if filename is None:
        errors.append("filename must follow YYYYMMDD-HHMMSS-<runner>-<scope>.md")
    else:
        try:
            datetime.strptime(
                filename.group("date") + filename.group("time"), "%Y%m%d%H%M%S"
            )
        except ValueError:
            errors.append("filename must contain a valid local date and time")
        if (
            record_date is not None
            and filename.group("date") != record_date.strftime("%Y%m%d")
        ):
            errors.append("filename date must match the frontmatter date")
        if isinstance(data.get("runner"), str) and isinstance(data.get("scope"), str):
            expected_tail = f"{data['runner']}-{data['scope'].replace('/', '-')}"
            if filename.group("tail") != expected_tail:
                if path.name not in LEGACY_FILENAME_EXCEPTIONS:
                    errors.append("filename runner and scope must match the frontmatter")

    errors.extend(_validate_table(text[match.end() :], text[: match.end()].count("\n")))
    return errors


def main() -> int:
    if not RUNS_DIR.is_dir():
        print(f"Missing test-run records directory: {RUNS_DIR}", file=sys.stderr)
        return 1

    records = sorted(
        path
        for path in RUNS_DIR.glob("*.md")
        if path.name not in {"README.md", "TEMPLATE.md"}
    )
    failures: list[tuple[Path, str]] = []
    for path in records:
        for error in _validate_record(path):
            failures.append((path, error))

    if failures:
        for path, error in failures:
            print(f"{path.relative_to(ROOT)}: {error}", file=sys.stderr)
        print(f"FAIL: {len(failures)} issue(s) in test-run records.", file=sys.stderr)
        return 1

    print(f"PASS: validated {len(records)} test-run record(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
