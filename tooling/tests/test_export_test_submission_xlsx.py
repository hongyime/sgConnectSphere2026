"""Regressions for the Release 1 submission workbook exporter (Xiang Ying's #443 review)."""
import importlib.util, json, sys, tempfile, unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[2] / "scripts"
sys.path.insert(0, str(SCRIPTS))
SPEC = importlib.util.spec_from_file_location("export_test_submission_xlsx", SCRIPTS / "export_test_submission_xlsx.py")
exporter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(exporter)


class ExportTestSubmissionXlsxTests(unittest.TestCase):
    def test_exporter_regressions(self) -> None:
        self.assertEqual(exporter.ac_result(["Pass", "Not Executed", "Not Executed"]), "Not Executed")
        self.assertEqual(exporter.ac_result(["Pass", "Pass"]), "Pass")
        self.assertEqual(exporter.ac_result(["Pass", "Not Executed", "Fail", "Blocked"]), "Fail")
        self.assertEqual(exporter.ac_result(["Pass", "Not Executed", "Blocked"]), "Blocked")
        self.assertEqual(exporter.ac_result([]), "Not Executed")
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "present.xml").write_text("<testsuites/>", encoding="utf-8")
            manifest = {"runs": [{"id": "ok", "path": "present.xml"}, {"id": "gone", "path": "missing.json"}]}
            with self.assertRaises(SystemExit) as caught:
                exporter.manifest_sources(Path(tmp), manifest)
            self.assertTrue("gone" in str(caught.exception) and "missing.json" in str(caught.exception))
            for name in ("a.xml", "b.json"):
                (Path(tmp) / name).write_text("{}", encoding="utf-8")
            manifest_ok = {"runs": [{"id": "a", "path": "a.xml"}, {"id": "b", "path": "b.json"}]}
            self.assertEqual([src.name for _, src in exporter.manifest_sources(Path(tmp), manifest_ok)], ["a.xml", "b.json"])


if __name__ == "__main__":
    unittest.main()
