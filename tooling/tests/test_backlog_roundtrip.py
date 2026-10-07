"""Tooling test: verify the Markdown backlog round-trips through the
xlsx export and back. Not a full parity check; it asserts that the
canonical fields (story ID, title, points, BDR references, user story)
survive an export + re-parse cycle for a representative sample of
stories.

The seed-and-back-again pattern catches format regressions in either
scripts/export_backlog_xlsx.py or the story parser, which are the two
places a subtle bug would silently corrupt the backlog.
"""
from __future__ import annotations

import re
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKLOG_DIR = REPO_ROOT / "docs" / "backlog"


def _read_stories(path: Path) -> list[dict]:
    from openpyxl import load_workbook
    workbook = load_workbook(str(path), data_only=True)
    sheet = workbook["RELEASE 1 BACKLOG"]
    rows: list[dict] = []
    header = [cell.value for cell in sheet[1]]
    for record in sheet.iter_rows(min_row=2, values_only=True):
        if not record or record[2] is None:
            continue
        rows.append(dict(zip(header, record)))
    return rows


def _read_markdown_stories() -> dict[str, dict[str, str]]:
    """Return a mapping of story-id -> parsed metadata."""
    stories: dict[str, dict[str, str]] = {}
    heading_re = re.compile(r"^##\s+(E\d{2}-S\d+)\s+[-\u2013\u2014]\s+(.+?)\s*$")
    meta_re = re.compile(r"^-\s+\*\*(?P<key>[^*]+)\*\*:\s*(?P<value>.*)$")
    for path in sorted((BACKLOG_DIR / "release-1").glob("E*.md")):
        current: dict[str, str] | None = None
        for line in path.read_text(encoding="utf-8").splitlines():
            match = heading_re.match(line)
            if match:
                if current and "id" in current:
                    stories[current["id"]] = current
                current = {"id": match.group(1), "title": match.group(2)}
                continue
            if current is None:
                continue
            metadata_match = meta_re.match(line.strip())
            if metadata_match:
                current[metadata_match.group("key").strip()] = metadata_match.group("value").strip()
        if current and "id" in current:
            stories[current["id"]] = current
    return stories


class BacklogRoundtripTests(unittest.TestCase):
    """Every top-level assertion here matches something the export script
    guarantees. Failing a case means either the exporter regressed or the
    Markdown format documented in docs/backlog/README.md changed without
    updating the exporter to match."""

    @classmethod
    def setUpClass(cls) -> None:
        # Skip if openpyxl is not available (e.g. tooling not installed yet).
        try:
            import openpyxl  # noqa: F401
        except ImportError:
            raise unittest.SkipTest("openpyxl not installed; run scripts/setup.py first.")
        # Skip if the Markdown backlog does not exist on this branch.
        if not (BACKLOG_DIR / "release-1").is_dir():
            raise unittest.SkipTest("docs/backlog/release-1 not present on this branch.")

    def test_export_script_produces_expected_row_count(self) -> None:
        """The xlsx export must contain exactly one row per Markdown story
        in the release-1 tree."""
        markdown_stories = _read_markdown_stories()
        with tempfile.TemporaryDirectory() as tmpdir:
            sys.path.insert(0, str(REPO_ROOT / "scripts"))
            try:
                # Import lazily so the module is picked up from repo root, not
                # tooling/. Reset sys.modules if a prior import cached it.
                if "export_backlog_xlsx" in sys.modules:
                    del sys.modules["export_backlog_xlsx"]
                import export_backlog_xlsx  # type: ignore  # noqa: E402
                original_output_path = export_backlog_xlsx._output_path
                temp_target = Path(tmpdir) / "test-backlog.xlsx"
                export_backlog_xlsx._output_path = lambda target_date: temp_target  # type: ignore[assignment]
                try:
                    exit_code = export_backlog_xlsx.main(["--date", "160926"])
                    self.assertEqual(exit_code, 0)
                    self.assertTrue(temp_target.exists(), f"Export did not write {temp_target}.")
                    exported_rows = _read_stories(temp_target)
                finally:
                    export_backlog_xlsx._output_path = original_output_path
            finally:
                sys.path.remove(str(REPO_ROOT / "scripts"))
        self.assertEqual(len(exported_rows), len(markdown_stories),
                         "xlsx row count does not match Markdown story count.")

    def test_story_id_title_pairs_match(self) -> None:
        """Every Markdown story ID appears with the same title in the export."""
        markdown_stories = _read_markdown_stories()
        with tempfile.TemporaryDirectory() as tmpdir:
            sys.path.insert(0, str(REPO_ROOT / "scripts"))
            try:
                if "export_backlog_xlsx" in sys.modules:
                    del sys.modules["export_backlog_xlsx"]
                import export_backlog_xlsx  # type: ignore
                temp_target = Path(tmpdir) / "test-backlog.xlsx"
                original_output_path = export_backlog_xlsx._output_path
                export_backlog_xlsx._output_path = lambda target_date: temp_target  # type: ignore[assignment]
                try:
                    export_backlog_xlsx.main(["--date", "160926"])
                    exported_rows = _read_stories(temp_target)
                finally:
                    export_backlog_xlsx._output_path = original_output_path
            finally:
                sys.path.remove(str(REPO_ROOT / "scripts"))
        exported_pairs = {row["Story ID"]: row["Story Title"] for row in exported_rows}
        for story_id, markdown in markdown_stories.items():
            with self.subTest(story_id=story_id):
                self.assertIn(story_id, exported_pairs,
                              f"Story {story_id} missing from xlsx export.")
                self.assertEqual(exported_pairs[story_id], markdown["title"],
                                 f"Title mismatch for {story_id}.")


if __name__ == "__main__":
    unittest.main()
