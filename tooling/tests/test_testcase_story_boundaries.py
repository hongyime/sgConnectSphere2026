import importlib.util
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "export_testcases_xlsx.py"
SPEC = importlib.util.spec_from_file_location("export_testcases_xlsx", SCRIPT)
exporter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(exporter)


class TestcaseStoryBoundaryTests(unittest.TestCase):
    def test_empty_epic_has_no_cases(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "E03.md"
            path.write_text("", encoding="utf-8")

            rows = exporter._parse_epic_file(path)

        self.assertEqual(rows, [])

    def test_story_heading_can_start_the_document(self):
        markdown = """## E03-S12

### TC_E03S12_01 — Case without an epic heading

#### Expected result
Saved.
"""
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "E03.md"
            path.write_text(markdown, encoding="utf-8")

            rows = exporter._parse_epic_file(path)

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["story_id"], "E03-S12")
        self.assertEqual(rows[0]["case_id"], "TC_E03S12_01")
        self.assertEqual(rows[0]["expected"], "Saved.")

    def test_story_boundary_preserves_literal_case_fields_and_story_ids(self):
        markdown = """# E03 test cases

## E03-S11

### TC_E03S11_01 — First story case

- **Sprint**: 3
- **AC reference**: E03-S11 - Scenario 1
- **Type**: 2 - Happy Path

#### Pre-conditions
First precondition.

#### Test steps
1. First step.

#### Test data
First data.

#### Expected result
Expected A

## E03-S12

Planning story note.

### TC_E03S12_01 — Second story case

- **Sprint**: 3
- **AC reference**: E03-S12 - Scenario 1
- **Type**: 4 - Negative

#### Pre-conditions
Second precondition.

#### Test steps
1. Second step.

#### Test data
Second data.

#### Expected result
Expected B
"""
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "E03.md"
            path.write_text(markdown, encoding="utf-8")

            rows = exporter._parse_epic_file(path)

        self.assertEqual(
            [
                (
                    row["story_id"],
                    row["case_id"],
                    row["ac_reference"],
                    row["step_type"],
                    row["preconditions"],
                    row["steps"],
                    row["test_data"],
                    row["expected"],
                )
                for row in rows
            ],
            [
                (
                    "E03-S11",
                    "TC_E03S11_01",
                    "E03-S11 - Scenario 1",
                    "2 - Happy Path",
                    "First precondition.",
                    "1. First step.",
                    "First data.",
                    "Expected A",
                ),
                (
                    "E03-S12",
                    "TC_E03S12_01",
                    "E03-S12 - Scenario 1",
                    "4 - Negative",
                    "Second precondition.",
                    "1. Second step.",
                    "Second data.",
                    "Expected B",
                ),
            ],
        )

    def test_trailing_story_heading_does_not_extend_last_expected_result(self):
        markdown = """# E03 test cases

## E03-S11

### TC_E03S11_01 — Last case before next story

- **Sprint**: 3
- **AC reference**: E03-S11 - Scenario 1
- **Type**: 2 - Happy Path

#### Expected result
Only this expected result.

## E03-S12

Planning note with no testcase yet.
"""
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "E03.md"
            path.write_text(markdown, encoding="utf-8")

            rows = exporter._parse_epic_file(path)

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["story_id"], "E03-S11")
        self.assertEqual(rows[0]["expected"], "Only this expected result.")

    def test_level_four_section_content_is_kept_verbatim(self):
        markdown = """# E03 test cases

## E03-S11

### TC_E03S11_01 — Case with multiline data

- **Sprint**: 3
- **AC reference**: E03-S11 - Scenario 1
- **Type**: 2 - Happy Path

#### Test data
Line one.

Line two.

#### Expected result
Saved as specified.
"""
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "E03.md"
            path.write_text(markdown, encoding="utf-8")

            rows = exporter._parse_epic_file(path)

        self.assertEqual(rows[0]["test_data"], "Line one.\n\nLine two.")
        self.assertEqual(rows[0]["expected"], "Saved as specified.")


if __name__ == "__main__":
    unittest.main()
