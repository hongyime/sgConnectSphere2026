"""Coverage reports must not depend on filesystem enumeration order."""

import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "tc_coverage_audit.py"
SPEC = importlib.util.spec_from_file_location("tc_coverage_audit", SCRIPT)
audit = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audit)


class CoverageAuditTests(unittest.TestCase):
    def test_report_is_identical_for_opposite_file_orders(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            paths = [root / name for name in ("a.spec.ts", "z.spec.ts")]
            paths[0].write_text("test.fixme('TC_E01S01_01 scaffold', () => {});", encoding="utf-8")
            paths[1].write_text("test('TC_E01S01_01 active', () => {});", encoding="utf-8")
            cases = [{"case_id": "TC_E01S01_01", "story_id": "E01-S01", "scenario": "Login"}]
            reports = []
            with patch.object(audit, "REPO_ROOT", root), patch.object(audit, "TEST_ROOTS", [root]):
                for order in (paths, list(reversed(paths))):
                    with patch.object(Path, "rglob", return_value=iter(order)):
                        scan = audit.scan_test_files()
                    self.assertEqual(scan["tc_index"]["TC_E01S01_01"]["status"], "active")
                    reports.append(audit.build_report(cases, scan))
            self.assertEqual(reports[0], reports[1])
            self.assertIn("a.spec.ts: TC_E01S01_01 scaffold", reports[0])
            self.assertIn("z.spec.ts: TC_E01S01_01 active", reports[0])

    def test_interpretation_uses_the_actual_no_test_count(self):
        cases = [
            {"case_id": f"TC_E01S01_0{number}", "story_id": "E01-S01", "scenario": "Login"}
            for number in range(1, 5)
        ]
        scan = {
            "tc_index": {
                "TC_E01S01_01": {"status": "active", "category": "live-assertion", "files": []},
                "TC_E01S01_02": {"status": "scaffold", "files": []},
            },
            "active_no_tc": {},
            "test_only_warnings": [],
        }

        report = audit.build_report(cases, scan)

        self.assertIn("**2** workbook TC_IDs have no matching test title", report)
        self.assertNotIn("Every TC_ID in the workbook is at least scaffolded", report)


if __name__ == "__main__":
    unittest.main()
