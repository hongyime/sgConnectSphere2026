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

    def test_expected_failures_are_known_defects_not_automated(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "a.test.ts").write_text(
                "test('TC_E01S01_01 todo', {todo:'Known defect'}, async () => {});\n"
                "test('TC_E01S01_02 fails', async () => { test.fail(true, 'Known defect'); });\n"
                "test('TC_E01S01_03 passes', async () => {});\n"
                "test('TC_E01S01_04 todo', { todo: 'Known defect' }, async () => {});\n"
                "test('TC_E01S01_04 passes too', async () => {});\n"
                "test.fixme('TC_E01S01_05 placeholder', async () => {});\n"
                "test('TC_E01S01_05 todo', {todo:'Known defect'}, async () => {});\n"
                "test(\"TC_E01S01_06: a Coordinator's call\", {todo:'Known defect'}, async () => {});\n",
                encoding="utf-8",
            )
            with patch.object(audit, "REPO_ROOT", root), patch.object(audit, "TEST_ROOTS", [root]):
                scan = audit.scan_test_files()
            status = {tc: entry["status"] for tc, entry in scan["tc_index"].items()}
            self.assertEqual(status, {
                "TC_E01S01_01": "known-defect",
                "TC_E01S01_02": "known-defect",
                "TC_E01S01_03": "active",
                "TC_E01S01_04": "active",
                "TC_E01S01_05": "known-defect",
                "TC_E01S01_06": "known-defect",
            })
            cases = [{"case_id": tc, "story_id": "E01-S01", "scenario": "Login"} for tc in sorted(status)]
            report = audit.build_report(cases, scan)
            self.assertIn("- Automated (explicit TC_ID in an active test title): **2**", report)
            self.assertIn("**4** (66.7%)", report)
            self.assertIn("| E01 | 6 | 2 | 4 | 0 | 0 |", report)


if __name__ == "__main__":
    unittest.main()
