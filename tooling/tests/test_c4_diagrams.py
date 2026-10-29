"""Verify scripts/check_c4_diagrams.py extracts Mermaid blocks and enforces the
C1/C2 node inventory.

Run directly (no pytest in this repo's tooling env):

    .venv-tools/bin/python tooling/tests/test_c4_diagrams.py
"""
from __future__ import annotations

import contextlib
import importlib.util
import io
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "check_c4_diagrams.py"
SPEC = importlib.util.spec_from_file_location("check_c4_diagrams", SCRIPT)
checker = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(checker)

C1_BLOCK = (
    "```mermaid\n%% C1 SystemContext\nflowchart TB\n"
    + "".join(f'    N{i}["{token}"]\n' for i, token in enumerate(checker.C1_TOKENS))
    + "```\n"
)
C2_BLOCK = (
    "```mermaid\n%% C2 Containers\nflowchart TB\n"
    + "".join(f'    N{i}["{token}"]\n' for i, token in enumerate(checker.C2_TOKENS))
    + "```\n"
)


def _run(path: Path) -> tuple[int, str, str]:
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = checker.check(path)
    return code, out.getvalue(), err.getvalue()


class C4DiagramCheckTests(unittest.TestCase):
    def _fixture(self, content: str) -> Path:
        handle = tempfile.NamedTemporaryFile(
            "w", suffix=".md", delete=False, encoding="utf-8"
        )
        handle.write(content)
        handle.close()
        self.addCleanup(Path(handle.name).unlink)
        return Path(handle.name)

    def test_extracts_only_mermaid_blocks(self):
        text = "intro\n" + C1_BLOCK + "prose\n```text\nnot mermaid\n```\n" + C2_BLOCK
        self.assertEqual(len(checker.extract_blocks(text)), 2)
        self.assertEqual(checker.find_block(checker.extract_blocks(text), "%% C1 SystemContext"), checker.extract_blocks(text)[0])

    def test_happy_path_exits_zero(self):
        code, out, _ = _run(self._fixture(C1_BLOCK + C2_BLOCK))
        self.assertEqual(code, 0)
        self.assertIn("all 8 nodes", out)

    def test_missing_c2_token_names_it(self):
        broken = C2_BLOCK.replace('["Notification Worker"]', '')
        code, _, err = _run(self._fixture(C1_BLOCK + broken))
        self.assertNotEqual(code, 0)
        self.assertIn("Notification Worker", err)

    def test_missing_block_exits_non_zero(self):
        code, _, err = _run(self._fixture(C1_BLOCK))
        self.assertNotEqual(code, 0)
        self.assertIn("%% C2 Containers", err)


if __name__ == "__main__":
    unittest.main()
