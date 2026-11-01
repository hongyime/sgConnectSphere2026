"""Verify the test-case reference check catches orphaned and superseded citations.

Regression coverage for the case that made this check necessary: a scenario
renamed or deleted in the backlog leaves every test case citing it silently
pointing at nothing, and a scenario marked ``[Superseded ...]`` quietly keeps a
live case alive. Neither produces an error anywhere else in the pipeline.

Run directly (no pytest in this repo's tooling env):

    .venv-tools\\Scripts\\python.exe tooling\\tests\\test_check_test_case_references.py
"""
from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "check_test_case_references.py"
SPEC = importlib.util.spec_from_file_location("check_test_case_references", SCRIPT)
check = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(check)


def _write(root: Path, relpath: str, content: str) -> Path:
    target = root / relpath
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return target


class ParseReferencesTests(unittest.TestCase):
    def test_lettered_scenario_labels_stop_before_a_bdr_citation(self) -> None:
        # "T-95" and "T-96" must not be read as scenario numbers 95 and 96.
        self.assertEqual(
            check.parse_references("E06-S03 - Scenario 3e, 3f; T-95, T-96"),
            [("E06-S03", ["3e", "3f"])],
        )

    def test_multiple_scenarios_across_two_stories(self) -> None:
        self.assertEqual(
            check.parse_references(
                "E03-S01 - Scenarios 1 and 3 (requested, then accepted); "
                "E06-S04 - Scenario 5 (recorded)"
            ),
            [("E03-S01", ["1", "3"]), ("E06-S04", ["5"])],
        )

    def test_checklist_reference_has_no_scenario(self) -> None:
        self.assertEqual(
            check.parse_references("E01-S04 (checklist: cannot change own role)"),
            [("E01-S04", [])],
        )

    def test_transferred_scenario_names_the_destination(self) -> None:
        self.assertEqual(
            check.parse_references(
                "E14-S02 - former Scenario 3 (transferred to E06-S04 Scenario 5 by T-76)"
            ),
            [("E14-S02", ["3"]), ("E06-S04", ["5"])],
        )


class CheckTests(unittest.TestCase):
    def setUp(self) -> None:
        self._root = tempfile.TemporaryDirectory()
        self.root = Path(self._root.name)
        _write(
            self.root,
            "docs/backlog/release-1/E03-example.md",
            "# E03\n\n## E03-S01 - Example\n\n#### Scenario 1 - Current\n\n#### Scenario 2 - [Superseded by E03-S08] Old\n",
        )
        self._redirect()

    def tearDown(self) -> None:
        self._root.cleanup()
        self._restore()

    def _redirect(self) -> None:
        self._saved = (check.ROOT, check.CASES_DIR, check.BACKLOG_DIRS, check.ALLOWLIST)
        check.ROOT = self.root
        check.CASES_DIR = self.root / "docs" / "testing" / "cases"
        check.BACKLOG_DIRS = (self.root / "docs" / "backlog" / "release-1", self.root / "docs" / "backlog" / "product")
        check.ALLOWLIST = self.root / "docs" / "testing" / "tc-drift-allowlist.json"

    def _restore(self) -> None:
        check.ROOT, check.CASES_DIR, check.BACKLOG_DIRS, check.ALLOWLIST = self._saved

    def _case(self, tc: str, reference: str, title_extra: str = "") -> None:
        _write(
            self.root,
            "docs/testing/cases/E03.md",
            f"## E03-S01\n\n### {tc} - {title_extra}Example case\n\n- **Sprint**: 1\n"
            f"- **AC reference**: {reference}\n",
        )

    def _run(self) -> tuple[int, str]:
        error = io.StringIO()
        with contextlib.redirect_stderr(error):
            code = check.main()
        return code, error.getvalue()

    def _allowlist(self, entries: list[dict]) -> None:
        _write(
            self.root,
            "docs/testing/tc-drift-allowlist.json",
            json.dumps({"entries": entries}),
        )

    def test_clean_case_passes(self) -> None:
        self._case("TC_E03S01_01", "E03-S01 - Scenario 1 (current)")
        code, error = self._run()
        self.assertEqual(code, 0, error)

    def test_missing_scenario_fails(self) -> None:
        self._case("TC_E03S01_09", "E03-S01 - Scenario 9 (deleted)")
        code, error = self._run()
        self.assertEqual(code, 1)
        self.assertIn("Scenario 9", error)

    def test_missing_story_fails(self) -> None:
        self._case("TC_E03S99_01", "E03-S99 - Scenario 1 (gone)")
        code, error = self._run()
        self.assertEqual(code, 1)
        self.assertIn("E03-S99", error)

    def test_superseded_scenario_without_allowlist_fails(self) -> None:
        self._case("TC_E03S01_02", "E03-S01 - Scenario 2 (replaced)")
        code, error = self._run()
        self.assertEqual(code, 1)
        self.assertIn("superseded", error.lower())

    def test_superseded_scenario_with_allowlist_passes(self) -> None:
        self._case("TC_E03S01_02", "E03-S01 - Scenario 2 (replaced)")
        self._allowlist([
            {"case": "TC_E03S01_02", "superseded_by": "E03-S08", "reason": "replacement unbuilt"}
        ])
        code, error = self._run()
        self.assertEqual(code, 0, error)

    def test_retired_case_needs_no_allowlist(self) -> None:
        self._case("TC_E03S01_02", "E03-S01 - Scenario 2 (replaced)", "[RETIRED - superseded] ")
        code, error = self._run()
        self.assertEqual(code, 0, error)

    def test_stale_allowlist_entry_fails(self) -> None:
        # The scenario is no longer superseded, so the entry must be removed.
        self._case("TC_E03S01_01", "E03-S01 - Scenario 1 (current)")
        self._allowlist([
            {"case": "TC_E03S01_01", "superseded_by": "E03-S08", "reason": "stale"}
        ])
        code, error = self._run()
        self.assertEqual(code, 1)
        self.assertIn("stale", error.lower())


if __name__ == "__main__":
    unittest.main()
