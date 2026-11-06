"""Submission packaging boundaries must fail before publishing unsafe artifacts."""
import importlib.util
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "assemble_submission.py"
SPEC = importlib.util.spec_from_file_location("assemble_submission", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class AssemblyBoundaryTests(unittest.TestCase):
    def test_private_and_escape_paths_are_rejected(self):
        for name in (".env", "backend/.env.production", "submission/README.md",
                     "SUBMISSION/file", ".git/config", "node_modules/a.js",
                     "a/../secret", "/absolute", "C:/secret", "backend\\.env"):
            with self.subTest(name=name):
                self.assertTrue(MODULE.forbidden_archive_path(name))
        for name in (".env.template", "frontend/.env.example", "README.md",
                     "scripts/generate_env_template.py"):
            with self.subTest(name=name):
                self.assertFalse(MODULE.forbidden_archive_path(name))

    def test_valid_svg_and_office_xml_still_parse(self):
        xml = '<svg xmlns="http://www.w3.org/2000/svg"><text>A &amp; B</text></svg>'
        with tempfile.TemporaryDirectory() as temporary:
            svg = Path(temporary) / "drawing.svg"
            svg.write_text(xml, encoding="utf-8")
            self.assertTrue(MODULE.check_file(svg).startswith("PASS:"))
            office = Path(temporary) / "document.docx"
            with ZipFile(office, "w") as archive:
                archive.writestr("word/document.xml", "<document>A &amp; B</document>")
            self.assertTrue(MODULE.check_file(office).startswith("PASS:"))

    def test_entity_declarations_are_rejected_in_svg_and_office_xml(self):
        xml = '<!DOCTYPE root [<!ENTITY payload "expanded">]><root>&payload;</root>'
        with tempfile.TemporaryDirectory() as temporary:
            svg = Path(temporary) / "drawing.svg"
            svg.write_text(xml, encoding="utf-8")
            self.assertEqual(MODULE.check_file(svg), "FAIL: EntitiesForbidden (content omitted)")
            office = Path(temporary) / "document.docx"
            with ZipFile(office, "w") as archive:
                archive.writestr("word/document.xml", xml)
            self.assertEqual(MODULE.check_file(office), "FAIL: EntitiesForbidden (content omitted)")

    def test_output_must_be_outside_repo_including_parent_traversal(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / "repo"
            root.mkdir()
            for output in (root, root / "submission", root / "x" / ".." / "final"):
                with self.subTest(output=output), self.assertRaises(ValueError):
                    MODULE.external_output(output, root)
            sibling = Path(temporary) / "final"
            self.assertEqual(MODULE.external_output(sibling, root), sibling.resolve())


if __name__ == "__main__":
    unittest.main()
