"""Regenerate the ADR and BDR .docx exports from the Markdown source.

Markdown is authoritative (see docs/decisions/0005-adr-bdr-markdown-authority.md).
This script rebuilds the `.docx` files for reviewers who insist on Word format
or for archival. Use before handing the documents to someone outside the repo.

Usage from the repository root:

    .venv-tools\\Scripts\\python.exe scripts\\export_adr_bdr_docx.py

By default the filenames use today's date. Pass --date DDMMYY to override.
"""
from __future__ import annotations

import argparse
import re
import sys
from datetime import date
from pathlib import Path
from typing import Iterator

from docx import Document
from docx.shared import Pt

REPO_ROOT = Path(__file__).resolve().parents[1]
ADR_DIR = REPO_ROOT / "docs" / "adr"
BDR_DIR = REPO_ROOT / "docs" / "bdr"


def _output_paths(target_date: date) -> tuple[Path, Path]:
    suffix = target_date.strftime("%d%m%y")
    return (
        REPO_ROOT / "docs" / f"ARCHITECTURE DECISION RECORDS CAA {suffix}.docx",
        REPO_ROOT / "docs" / f"BACKLOG DECISION REVIEW CAA {suffix}.docx",
    )


def _read_lines(path: Path) -> list[str]:
    return path.read_text(encoding="utf-8").splitlines()


def _write_heading(doc, text: str, level: int) -> None:
    heading = doc.add_heading(text, level=level)
    for run in heading.runs:
        run.font.size = Pt({0: 20, 1: 16, 2: 14, 3: 12}.get(level, 11))


def _parse_markdown_table(lines: list[str], start: int) -> tuple[list[list[str]], int]:
    """Parse a Markdown table starting at lines[start]. Returns (rows, next_index)."""
    rows: list[list[str]] = []
    index = start
    while index < len(lines) and lines[index].startswith("|"):
        raw = lines[index].strip()
        cells = [cell.strip() for cell in raw.strip("|").split("|")]
        # Skip separator row like | --- | --- |
        if not all(re.match(r"^:?-{3,}:?$", cell) for cell in cells):
            rows.append(cells)
        index += 1
    return rows, index


def _emit_markdown(doc, lines: list[str]) -> None:
    """Convert a Markdown file's lines to Word paragraphs. Handles headings 1-4,
    bullet lists, paragraphs, and pipe-delimited tables. Fenced code blocks and
    inline formatting are rendered plain — this is a lossy Word export, not a
    faithful round trip."""
    index = 0
    in_bullets = False
    while index < len(lines):
        line = lines[index]
        stripped = line.strip()
        if not stripped:
            in_bullets = False
            index += 1
            continue
        # Table
        if stripped.startswith("|"):
            table_rows, next_index = _parse_markdown_table(lines, index)
            if table_rows:
                columns = len(table_rows[0])
                table = doc.add_table(rows=len(table_rows), cols=columns)
                table.style = "Table Grid"
                for row_index, row in enumerate(table_rows):
                    for col_index in range(columns):
                        cell_value = row[col_index] if col_index < len(row) else ""
                        table.cell(row_index, col_index).text = cell_value.replace("<br>", "\n")
            index = next_index
            continue
        # Headings
        heading_match = re.match(r"^(#{1,4})\s+(.+)$", stripped)
        if heading_match:
            level = len(heading_match.group(1))
            _write_heading(doc, heading_match.group(2), level=level)
            index += 1
            in_bullets = False
            continue
        # Bullets
        bullet_match = re.match(r"^-\s+(.+)$", stripped)
        if bullet_match:
            para = doc.add_paragraph(bullet_match.group(1), style="List Bullet")
            for run in para.runs:
                run.font.size = Pt(11)
            index += 1
            in_bullets = True
            continue
        # Plain paragraph
        doc.add_paragraph(stripped)
        index += 1
        in_bullets = False


def _iter_adr_files() -> Iterator[Path]:
    yield ADR_DIR / "README.md"
    for path in sorted(ADR_DIR.glob("ADR-*.md")):
        yield path


def _iter_bdr_files() -> Iterator[Path]:
    yield BDR_DIR / "README.md"
    for filename in [
        "A-customer-clarifications.md",
        "B-team-decisions.md",
        "C-open-questions.md",
        "D-boundary-rulings.md",
        "E-out-of-release-1.md",
        "F-core-feature-coverage.md",
        "G-change-log.md",
    ]:
        yield BDR_DIR / filename


def _export(doc_files: Iterator[Path], destination: Path, title: str) -> None:
    doc = Document()
    doc.add_heading(title, level=0)
    for path in doc_files:
        if not path.is_file():
            print(f"WARN: missing {path.relative_to(REPO_ROOT)}", file=sys.stderr)
            continue
        _emit_markdown(doc, _read_lines(path))
        # A soft page break between top-level files so the exported document
        # stays readable rather than one wall of text.
        doc.add_page_break()
    # Drop the trailing page break the last iteration added.
    last = doc.paragraphs[-1] if doc.paragraphs else None
    if last is not None and last.text == "":
        pass  # python-docx does not expose an easy way to trim a page break; leave it.
    doc.save(str(destination))


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Export ADR and BDR Markdown to .docx.")
    parser.add_argument("--date", help="Override DDMMYY suffix.", default=None)
    args = parser.parse_args(argv)

    if args.date:
        match = re.fullmatch(r"(\d{2})(\d{2})(\d{2})", args.date)
        if not match:
            print("ERROR: --date must be DDMMYY (six digits).", file=sys.stderr)
            return 2
        target_date = date(2000 + int(match.group(3)), int(match.group(2)), int(match.group(1)))
    else:
        target_date = date.today()

    adr_out, bdr_out = _output_paths(target_date)

    if not ADR_DIR.is_dir():
        print(f"ERROR: {ADR_DIR} missing. Run scripts/one_shot/adr_bdr_docx_to_md.py first.", file=sys.stderr)
        return 1
    if not BDR_DIR.is_dir():
        print(f"ERROR: {BDR_DIR} missing. Run scripts/one_shot/adr_bdr_docx_to_md.py first.", file=sys.stderr)
        return 1

    _export(_iter_adr_files(), adr_out, "Architecture Decision Records")
    _export(_iter_bdr_files(), bdr_out, "Backlog Decision Review (BDR)")

    print(f"Wrote {adr_out.name}")
    print(f"Wrote {bdr_out.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
