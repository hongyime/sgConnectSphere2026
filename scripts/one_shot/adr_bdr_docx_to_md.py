"""One-shot: convert the ADR and BDR .docx documents to per-section Markdown.

Uses python-docx's low-level block iteration so paragraphs and tables come
back in document order. Each ADR retains its Status + Related BDR footer
table. Each BDR section carries the full customer / team / open-questions
table as a Markdown table.

Output layout:

    docs/adr/
        README.md                       (title, version history, index)
        ADR-001-<slug>.md ... ADR-013-<slug>.md
    docs/bdr/
        README.md                       (purpose, version history, refs)
        A-customer-clarifications.md    (Table 0: 65 rows)
        B-team-decisions.md             (Table 1: 52 rows)
        C-open-questions.md             (Table 2: 20 rows)
        D-boundary-rulings.md           (Table 3: 12 rows)
        E-out-of-release-1.md           (Table 4: 25 rows)
        F-core-feature-coverage.md      (Table 5: 21 rows)
        G-change-log.md                 (paragraph-only)

The .docx files stay on disk under ADR-015 copy-forward.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Iterator

from docx import Document
from docx.document import Document as DocumentType
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph

REPO_ROOT = Path(__file__).resolve().parents[2]
ADR_SRC = REPO_ROOT / "docs" / "ARCHITECTURE DECISION RECORDS CAA 140926.docx"
BDR_SRC = REPO_ROOT / "docs" / "BACKLOG DECISION REVIEW CAA 140926.docx"
ADR_DIR = REPO_ROOT / "docs" / "adr"
BDR_DIR = REPO_ROOT / "docs" / "bdr"


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "section"


def iter_blocks(document: DocumentType) -> Iterator[Paragraph | Table]:
    body = document.element.body
    for child in body.iterchildren():
        if child.tag == qn("w:p"):
            yield Paragraph(child, document)
        elif child.tag == qn("w:tbl"):
            yield Table(child, document)


def table_to_markdown(table: Table) -> list[str]:
    rows = table.rows
    if not rows:
        return []
    lines: list[str] = []
    header = [cell.text.strip().replace("|", "\\|").replace("\n", " ") for cell in rows[0].cells]
    lines.append("| " + " | ".join(header) + " |")
    lines.append("| " + " | ".join("---" for _ in header) + " |")
    for row in rows[1:]:
        cells = [cell.text.strip().replace("|", "\\|").replace("\n", "<br>") for cell in row.cells]
        lines.append("| " + " | ".join(cells) + " |")
    return lines


# ---------------------------------------------------------------------------
# ADR
# ---------------------------------------------------------------------------

def convert_adr() -> None:
    document = Document(str(ADR_SRC))
    ADR_DIR.mkdir(parents=True, exist_ok=True)

    preamble_paras: list[Paragraph] = []
    adrs: list[dict] = []
    current: dict | None = None

    for block in iter_blocks(document):
        if isinstance(block, Paragraph):
            style = block.style.name if block.style else "Normal"
            text = block.text.strip()
            if style == "Heading 1" and text.startswith("ADR-"):
                if current is not None:
                    adrs.append(current)
                current = {"title": text, "blocks": []}
                continue
            if current is None:
                preamble_paras.append(block)
            else:
                current["blocks"].append(("para", block))
        else:  # Table
            if current is None:
                # Table 0 in ADR is the summary index; skip because we'll regenerate.
                continue
            current["blocks"].append(("table", block))

    if current is not None:
        adrs.append(current)

    # README with preamble.
    readme_lines: list[str] = ["# Architecture Decision Records", ""]
    for para in preamble_paras:
        style = para.style.name if para.style else "Normal"
        text = para.text.strip()
        if not text or style == "Title":
            if readme_lines and readme_lines[-1] != "":
                readme_lines.append("")
            continue
        readme_lines.append(text)
        readme_lines.append("")

    readme_lines.append("## Index")
    readme_lines.append("")
    for adr in adrs:
        title = adr["title"]
        match = re.match(r"^(ADR-\d+)", title)
        if not match:
            continue
        adr_id = match.group(1)
        slug = slugify(title[len(adr_id):].strip(" —–-"))
        readme_lines.append(f"- [{title}](./{adr_id}-{slug}.md)")
    readme_lines.append("")
    (ADR_DIR / "README.md").write_text(
        "\n".join(line.rstrip() for line in readme_lines).rstrip() + "\n",
        encoding="utf-8",
    )

    # Per-ADR file.
    for adr in adrs:
        title = adr["title"]
        match = re.match(r"^(ADR-\d+)", title)
        if not match:
            continue
        adr_id = match.group(1)
        slug = slugify(title[len(adr_id):].strip(" —–-"))

        out_lines: list[str] = [f"# {title}", ""]
        buffer_list: list[str] = []

        def flush_list() -> None:
            nonlocal buffer_list
            if buffer_list:
                if out_lines and out_lines[-1] != "":
                    out_lines.append("")
                out_lines.extend(f"- {item}" for item in buffer_list)
                out_lines.append("")
                buffer_list = []

        for kind, block in adr["blocks"]:
            if kind == "table":
                flush_list()
                if out_lines and out_lines[-1] != "":
                    out_lines.append("")
                # Render as key: value block for the 2-column ADR metadata tables.
                if len(block.rows) == 2 and len(block.rows[0].cells) == 2:
                    for row in block.rows:
                        label = row.cells[0].text.strip()
                        value = row.cells[1].text.strip()
                        out_lines.append(f"- **{label}:** {value}")
                    out_lines.append("")
                else:
                    out_lines.extend(table_to_markdown(block))
                    out_lines.append("")
                continue
            style = block.style.name if block.style else "Normal"
            text = block.text.strip()
            if not text:
                flush_list()
                continue
            if style == "Heading 3":
                flush_list()
                if out_lines and out_lines[-1] != "":
                    out_lines.append("")
                out_lines.append(f"### {text}")
                out_lines.append("")
            elif style == "List Paragraph":
                buffer_list.append(text)
            else:
                flush_list()
                out_lines.append(text)
                out_lines.append("")
        flush_list()

        content = "\n".join(line.rstrip() for line in out_lines).rstrip() + "\n"
        (ADR_DIR / f"{adr_id}-{slug}.md").write_text(content, encoding="utf-8")

    print(f"ADR: wrote {len(adrs)} entry files + README.md")


# ---------------------------------------------------------------------------
# BDR
# ---------------------------------------------------------------------------

BDR_SECTIONS = [
    ("A. Customer clarifications",       "A-customer-clarifications.md"),
    ("B. Team decisions",                "B-team-decisions.md"),
    ("C. Open questions and standing assumptions", "C-open-questions.md"),
    ("D. Story boundary rulings",        "D-boundary-rulings.md"),
    ("E. Out of the first release",      "E-out-of-release-1.md"),
    ("F. Core feature coverage",         "F-core-feature-coverage.md"),
    ("G. Change log",                    "G-change-log.md"),
]


def convert_bdr() -> None:
    document = Document(str(BDR_SRC))
    BDR_DIR.mkdir(parents=True, exist_ok=True)

    preamble_paras: list[Paragraph] = []
    sections: dict[str, list[tuple[str, object]]] = {title: [] for title, _ in BDR_SECTIONS}
    current: str | None = None

    for block in iter_blocks(document):
        if isinstance(block, Paragraph):
            style = block.style.name if block.style else "Normal"
            text = block.text.strip()
            if style == "Heading 1" and text in {title for title, _ in BDR_SECTIONS}:
                current = text
                continue
            if current is None:
                preamble_paras.append(block)
            else:
                sections[current].append(("para", block))
        else:
            if current is None:
                # Should not happen for the BDR; but skip to be safe.
                continue
            sections[current].append(("table", block))

    # README with preamble.
    readme_lines: list[str] = ["# Backlog Decision Review (BDR)", ""]
    for para in preamble_paras:
        style = para.style.name if para.style else "Normal"
        text = para.text.strip()
        if not text or style == "Title":
            if readme_lines and readme_lines[-1] != "":
                readme_lines.append("")
            continue
        if style == "Heading 2":
            if readme_lines and readme_lines[-1] != "":
                readme_lines.append("")
            readme_lines.append(f"## {text}")
            readme_lines.append("")
        elif style == "Heading 3":
            if readme_lines and readme_lines[-1] != "":
                readme_lines.append("")
            readme_lines.append(f"### {text}")
            readme_lines.append("")
        elif style == "List Paragraph":
            readme_lines.append(f"- {text}")
        else:
            readme_lines.append(text)
            readme_lines.append("")

    readme_lines.append("")
    readme_lines.append("## Section files")
    readme_lines.append("")
    for section_title, filename in BDR_SECTIONS:
        readme_lines.append(f"- [{section_title}](./{filename})")
    readme_lines.append("")
    (BDR_DIR / "README.md").write_text(
        "\n".join(line.rstrip() for line in readme_lines).rstrip() + "\n",
        encoding="utf-8",
    )

    # Per-section files.
    for section_title, filename in BDR_SECTIONS:
        out_lines: list[str] = [f"# {section_title}", ""]
        buffer_list: list[str] = []

        def flush_list() -> None:
            nonlocal buffer_list
            if buffer_list:
                if out_lines and out_lines[-1] != "":
                    out_lines.append("")
                out_lines.extend(f"- {item}" for item in buffer_list)
                out_lines.append("")
                buffer_list = []

        for kind, block in sections[section_title]:
            if kind == "table":
                flush_list()
                if out_lines and out_lines[-1] != "":
                    out_lines.append("")
                out_lines.extend(table_to_markdown(block))
                out_lines.append("")
                continue
            style = block.style.name if block.style else "Normal"
            text = block.text.strip()
            if not text:
                flush_list()
                continue
            if style == "Heading 2":
                flush_list()
                if out_lines and out_lines[-1] != "":
                    out_lines.append("")
                out_lines.append(f"## {text}")
                out_lines.append("")
            elif style == "Heading 3":
                flush_list()
                if out_lines and out_lines[-1] != "":
                    out_lines.append("")
                out_lines.append(f"### {text}")
                out_lines.append("")
            elif style == "List Paragraph":
                buffer_list.append(text)
            else:
                flush_list()
                out_lines.append(text)
                out_lines.append("")
        flush_list()

        content = "\n".join(line.rstrip() for line in out_lines).rstrip() + "\n"
        (BDR_DIR / filename).write_text(content, encoding="utf-8")

    print(f"BDR: wrote {len(BDR_SECTIONS)} section files + README.md")


def main() -> int:
    if not ADR_SRC.is_file():
        print(f"ERROR: missing {ADR_SRC}", file=sys.stderr)
        return 1
    if not BDR_SRC.is_file():
        print(f"ERROR: missing {BDR_SRC}", file=sys.stderr)
        return 1
    convert_adr()
    convert_bdr()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
