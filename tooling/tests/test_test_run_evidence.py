import importlib.util
import tempfile
import unittest
from unittest import mock
from pathlib import Path


SCRIPT = Path(__file__).parents[2] / "scripts" / "check_test_evidence.py"
SPEC = importlib.util.spec_from_file_location("check_test_evidence", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


RECORD = """---
date: 2026-10-26T22:00:00+08:00
runner: testuser
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 300926
database: mocked
commit: 1234567
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E01S01_01 | Saved item | PASS | Saved confirmation was visible |

## Screenshots

- [TC_E01S01_01](evidence/20261026-220000-testuser-frontend-e2e/TC_E01S01_01.png): confirmation
"""


class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.original_root = MODULE.ROOT
        self.original_runs_dir = MODULE.RUNS_DIR
        self.temp = tempfile.TemporaryDirectory()
        MODULE.ROOT = Path(self.temp.name)
        MODULE.RUNS_DIR = MODULE.ROOT / "docs" / "testing" / "runs"
        MODULE.RUNS_DIR.mkdir(parents=True)

    def tearDown(self):
        MODULE.ROOT = self.original_root
        MODULE.RUNS_DIR = self.original_runs_dir
        self.temp.cleanup()

    def write_record(self, text=RECORD):
        record_dir = MODULE.RUNS_DIR / "evidence" / "20261026-220000-testuser-frontend-e2e"
        record_dir.mkdir(parents=True)
        path = MODULE.RUNS_DIR / "20261026-220000-testuser-frontend-e2e.md"
        path.write_text(text, encoding="utf-8")
        return path, record_dir

    def test_manual_record_requires_existing_screenshot(self):
        path, _record_dir = self.write_record()
        errors = MODULE.evidence_errors(path)
        self.assertTrue(any("does not exist" in error for error in errors))

    def test_manual_record_passes_with_linked_screenshot(self):
        path, record_dir = self.write_record()
        (record_dir / "TC_E01S01_01.png").write_bytes(b"png")
        self.assertEqual(MODULE.evidence_errors(path), [])

    def test_automated_record_does_not_require_screenshot(self):
        path, _record_dir = self.write_record(RECORD.replace("run_type: manual", "run_type: automated"))
        self.assertEqual(MODULE.evidence_errors(path), [])

    def test_atomicity_rejects_unstaged_screenshot(self):
        path, record_dir = self.write_record()
        (record_dir / "TC_E01S01_01.png").write_bytes(b"png")
        relative_record = "docs/testing/runs/20261026-220000-testuser-frontend-e2e.md"
        errors = MODULE.atomicity_errors([("A", [relative_record])], staged=True)
        self.assertTrue(any("same staged change" in error for error in errors))

    def test_atomicity_accepts_record_and_screenshot_together(self):
        path, record_dir = self.write_record()
        (record_dir / "TC_E01S01_01.png").write_bytes(b"png")
        relative_record = "docs/testing/runs/20261026-220000-testuser-frontend-e2e.md"
        relative_image = "docs/testing/runs/evidence/20261026-220000-testuser-frontend-e2e/TC_E01S01_01.png"
        errors = MODULE.atomicity_errors(
            [("A", [relative_record]), ("A", [relative_image])], staged=True
        )
        self.assertEqual(errors, [])

    def test_atomicity_allows_removing_unmerged_record(self):
        with mock.patch.object(MODULE, "exists_in_merge_base", return_value=False):
            errors = MODULE.atomicity_errors(
                [("D", ["docs/testing/runs/20261026-222548-testuser-tooling.md"])],
                staged=True,
            )
        self.assertEqual(errors, [])

    def test_changed_files_uses_merge_base_for_pull_request_comparisons(self):
        with mock.patch.object(
            MODULE.subprocess,
            "check_output",
            side_effect=["merge-base-sha\n", "A\tdocs/testing/runs/new-record.md\n"],
        ) as check_output:
            changes = MODULE.changed_files(staged=False, base="main-tip", head="feature-tip")
        self.assertEqual(changes, [("A", ["docs/testing/runs/new-record.md"])])
        self.assertEqual(
            check_output.call_args_list,
            [
                mock.call(["git", "merge-base", "main-tip", "feature-tip"], cwd=MODULE.ROOT, text=True),
                mock.call(
                    [
                        "git", "diff", "--name-status", "--find-renames",
                        "merge-base-sha", "feature-tip", "--", "docs/testing/runs",
                    ],
                    cwd=MODULE.ROOT,
                    text=True,
                ),
            ],
        )


if __name__ == "__main__":
    unittest.main()
