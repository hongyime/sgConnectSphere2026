"""Regressions for the Release 1 submission workbook exporter (Xiang Ying's #443 review)."""

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[2] / "scripts"
sys.path.insert(0, str(SCRIPTS))
SPEC = importlib.util.spec_from_file_location("export_test_submission_xlsx", SCRIPTS / "export_test_submission_xlsx.py")
exporter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(exporter)


class AcResultTests(unittest.TestCase):
    def test_partial_execution_is_not_a_pass(self) -> None:
        # E08-S03 Scenario 1 with only TC_E08S03_01 executed: _07 and _08 have no result.
        self.assertEqual(exporter.ac_result(["Pass", "Not Executed", "Not Executed"]), "Not Executed")

    def test_all_passing_cases_pass(self) -> None:
        self.assertEqual(exporter.ac_result(["Pass", "Pass"]), "Pass")

    def test_fail_and_blocked_keep_precedence(self) -> None:
        self.assertEqual(exporter.ac_result(["Pass", "Not Executed", "Fail", "Blocked"]), "Fail")
        self.assertEqual(exporter.ac_result(["Pass", "Not Executed", "Blocked"]), "Blocked")

    def test_no_cases_is_not_executed(self) -> None:
        self.assertEqual(exporter.ac_result([]), "Not Executed")


class ManifestSourcesTests(unittest.TestCase):
    def test_missing_result_file_stops_the_export(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            results = Path(tmp)
            (results / "present.xml").write_text("<testsuites/>", encoding="utf-8")
            manifest = {"runs": [{"id": "ok", "path": "present.xml"}, {"id": "gone", "path": "missing.json"}]}
            with self.assertRaises(SystemExit) as caught:
                exporter.manifest_sources(results, manifest)
            self.assertIn("gone", str(caught.exception))
            self.assertIn("missing.json", str(caught.exception))

    def test_present_files_are_returned_in_order(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            results = Path(tmp)
            for name in ("a.xml", "b.json"):
                (results / name).write_text("{}", encoding="utf-8")
            manifest = json.loads('{"runs": [{"id": "a", "path": "a.xml"}, {"id": "b", "path": "b.json"}]}')
            self.assertEqual([src.name for _run, src in exporter.manifest_sources(results, manifest)], ["a.xml", "b.json"])


if __name__ == "__main__":
    unittest.main()
