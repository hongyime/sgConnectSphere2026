"""Run-record validation must preserve legacy data and reject schema drift."""

import importlib.util
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "check_test_run_records.py"
SPEC = importlib.util.spec_from_file_location("check_test_run_records", SCRIPT)
checker = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(checker)


def _write_record(
    root: Path,
    *,
    date: str = "2026-10-06T10:00:00+08:00",
    extra_fields: str = "",
    include_database: bool = True,
    row: str = "| TC_E01S01_01 | Example case | PASS | |",
) -> Path:
    date_part = date[:10].replace("-", "")
    database_line = "database: none\n" if include_database else ""
    frontmatter = (
        f"date: {date}\n"
        "runner: testuser\n"
        "scope: tooling\n"
        "environment: local\n"
        "run_type: automated\n"
        'test_case_version: "011026"\n'
        f"{database_line}"
        "commit: 123abcd\n"
        f"{extra_fields}"
    )
    content = (
        f"---\n{frontmatter}---\n\n"
        "| TC_ID | Test Name | Outcome | Remarks |\n"
        "| --- | --- | --- | --- |\n"
        f"{row}\n"
    )
    filename = f"{date_part}-100000-testuser-tooling.md"
    path = root / filename
    path.write_text(content, encoding="utf-8")
    return path


class RunRecordValidationTests(unittest.TestCase):
    def _validate(self, **kwargs):
        with tempfile.TemporaryDirectory() as temporary:
            record = _write_record(Path(temporary), **kwargs)
            return checker._validate_record(record)

    def test_legacy_record_can_omit_database_and_keep_non_catalogue_id(self):
        errors = self._validate(
            date="2026-10-03T00:14:04+08:00",
            include_database=False,
            row="| N/A | Reviewer component test | PASS | |",
        )
        self.assertEqual(errors, [])

    def test_database_is_required_at_the_rollout_cutoff(self):
        with tempfile.TemporaryDirectory() as temporary:
            record = _write_record(
                Path(temporary),
                date="2026-10-03T12:19:39+08:00",
                include_database=False,
            )
            errors = checker._validate_record(record)
        self.assertTrue(any("database" in error for error in errors))

    def test_unknown_frontmatter_fields_are_rejected(self):
        errors = self._validate(extra_fields="unexpected: value\n")
        self.assertTrue(any("unknown frontmatter field" in error for error in errors))

    def test_duplicate_frontmatter_fields_are_rejected(self):
        errors = self._validate(extra_fields="scope: frontend/vitest\n")
        self.assertEqual(
            errors,
            ["frontmatter is not valid YAML or contains duplicate keys"],
        )

    def test_unsupported_result_outcome_is_rejected(self):
        errors = self._validate(row="| TC_E01S01_01 | Example case | MAYBE | |")
        self.assertTrue(any("Outcome must be" in error for error in errors))

    def test_mismatched_filename_scope_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            content = (
                "---\n"
                "date: 2026-10-06T10:00:00+08:00\n"
                "runner: testuser\n"
                "scope: frontend/e2e\n"
                "environment: local\n"
                "run_type: automated\n"
                "test_case_version: '011026'\n"
                "database: none\n"
                "commit: 123abcd\n"
                "---\n\n"
                "| TC_ID | Test Name | Outcome | Remarks |\n"
                "| --- | --- | --- | --- |\n"
                "| TC_E01S01_01 | Example | PASS | |\n"
            )
            path = root / "20261006-100000-testuser-wrong-scope.md"
            path.write_text(content, encoding="utf-8")
            errors = checker._validate_record(path)
        self.assertTrue(any("filename runner and scope must match" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
