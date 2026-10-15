"""Run-record validation must preserve legacy data and reject schema drift."""

import importlib.util
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "check_test_run_records.py"
SPEC = importlib.util.spec_from_file_location("check_test_run_records", SCRIPT)
checker = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(checker)


def _write_record(
    root: Path,
    *,
    date: str = "2026-10-06T10:00:00+08:00",
    run_type: str = "automated",
    extra_fields: str = "",
    include_database: bool = True,
    row: str = "| TC_E01S01_01 | Example case | PASS | |",
    filename_date: str | None = None,
) -> Path:
    timestamp = datetime.fromisoformat(date.replace("Z", "+00:00"))
    date_part = filename_date or timestamp.strftime("%Y%m%d")
    time_part = timestamp.strftime("%H%M%S")
    database_line = "database: none\n" if include_database else ""
    frontmatter = (
        f"date: {date}\n"
        "runner: testuser\n"
        "scope: tooling\n"
        "environment: local\n"
        f"run_type: {run_type}\n"
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
    filename = f"{date_part}-{time_part}-testuser-tooling.md"
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

    def test_manual_blank_remarks_one_second_before_cutoff_are_accepted(self):
        errors = self._validate(
            date="2026-10-07T15:09:09+08:00",
            run_type="manual",
        )
        self.assertEqual(errors, [])

    def test_manual_blank_remarks_at_cutoff_are_rejected(self):
        errors = self._validate(
            date="2026-10-07T15:09:10+08:00",
            run_type="manual",
        )
        self.assertTrue(any("manual Remarks" in error for error in errors))

    def test_manual_whitespace_only_remarks_after_cutoff_are_rejected(self):
        errors = self._validate(
            date="2026-10-07T15:09:11+08:00",
            run_type="manual",
            row="| TC_E01S01_01 | Example case | PASS |   |",
        )
        self.assertTrue(any("manual Remarks" in error for error in errors))

    def test_manual_outcome_only_remarks_after_cutoff_are_rejected_case_insensitively(self):
        errors = self._validate(
            date="2026-10-07T15:09:11+08:00",
            run_type="manual",
            row="| TC_E01S01_01 | Example case | PASS | pass |",
        )
        self.assertTrue(any("manual Remarks" in error for error in errors))

    def test_manual_observed_result_remarks_after_cutoff_are_accepted(self):
        errors = self._validate(
            date="2026-10-07T15:09:11+08:00",
            run_type="manual",
            row="| TC_E01S01_01 | Example case | PASS | Status changed to Active |",
        )
        self.assertEqual(errors, [])

    def test_october_2_manual_blank_remarks_remain_accepted(self):
        errors = self._validate(
            date="2026-10-02T17:04:20+08:00",
            run_type="manual",
            row="| TC_E01S01_01 | Example case | PASS | |",
        )
        self.assertEqual(errors, [])

    def test_post_cutoff_automated_blank_remarks_remain_accepted(self):
        errors = self._validate(
            date="2026-10-08T10:00:00+08:00",
            run_type="automated",
        )
        self.assertEqual(errors, [])

    def test_manual_multiple_row_requires_aggregate_result(self):
        blank_errors = self._validate(
            date="2026-10-08T10:00:00+08:00",
            run_type="manual",
            row="| MULTIPLE | Validator suite | PASS | |",
        )
        populated_errors = self._validate(
            date="2026-10-08T10:00:00+08:00",
            run_type="manual",
            row="| MULTIPLE | Validator suite | PASS | 9/9 cases passed |",
        )
        self.assertTrue(any("manual Remarks" in error for error in blank_errors))
        self.assertEqual(populated_errors, [])

    def test_regression_run_type_keeps_blank_remarks_behavior(self):
        errors = self._validate(
            date="2026-10-08T10:00:00+08:00",
            run_type="regression",
        )
        self.assertEqual(errors, [])

    def test_invalid_singapore_offset_does_not_drive_manual_remarks_policy(self):
        errors = self._validate(
            date="2026-10-08T10:00:00+07:00",
            run_type="manual",
        )
        self.assertTrue(any("Singapore UTC+08:00" in error for error in errors))
        self.assertFalse(any("manual Remarks" in error for error in errors))

    def test_wrong_column_count_is_rejected(self):
        errors = self._validate(
            row="| TC_E01S01_01 | Example case | PASS | Extra | Column |",
        )
        self.assertTrue(any("four columns" in error for error in errors))

    def test_filename_date_mismatch_is_rejected(self):
        errors = self._validate(
            date="2026-10-08T10:00:00+08:00",
            filename_date="20261007",
        )
        self.assertTrue(any("filename date must match" in error for error in errors))

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
