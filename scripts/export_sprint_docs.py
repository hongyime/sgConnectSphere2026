"""Export corrected sprint sources outside the repository; retain original links."""

from __future__ import annotations

import argparse
import re
import shutil
from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from docx.opc.constants import RELATIONSHIP_TYPE as RT

ROOT = Path(__file__).resolve().parents[1]
ORIGINALS = ROOT / "submission" / "2. SPRINT MEETINGS"
KINDS = {"planning": "Planning", "standups": "Standups",
         "review-retrospective": "Review and Retrospective"}


def cells(line: str) -> list[str]:
    return [part.strip() for part in line.strip().strip("|").split("|")]


def plain(text: str) -> str:
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", text)
    return text.replace("**", "").replace("`", "").replace("*", "")


def hyperlink(paragraph, url: str) -> None:
    link = OxmlElement("w:hyperlink")
    link.set(qn("r:id"), paragraph.part.relate_to(url, RT.HYPERLINK, is_external=True))
    run = OxmlElement("w:r")
    value = OxmlElement("w:t")
    value.text = url
    run.append(value)
    link.append(run)
    paragraph._p.append(link)


def render(source: Path, original: Path, target: Path) -> None:
    old = Document(original)
    links = sorted({rel.target_ref for rel in old.part.rels.values()
                    if rel.is_external and rel.reltype == RT.HYPERLINK})
    doc = Document()
    section = doc.sections[0]
    section.orientation = WD_ORIENT.LANDSCAPE
    section.page_width, section.page_height = Inches(11.69), Inches(8.27)
    section.top_margin = section.bottom_margin = Inches(0.65)
    section.left_margin = section.right_margin = Inches(0.65)
    normal = doc.styles["Normal"]
    normal.font.name, normal.font.size = "Calibri", Pt(10)
    normal.paragraph_format.space_after = Pt(5)
    for name in ("Title", "Heading 1", "Heading 2", "Heading 3"):
        doc.styles[name].font.color.rgb = RGBColor(0, 0, 0)
    lines = source.read_text(encoding="utf-8").splitlines()
    index = 0
    while index < len(lines):
        line = lines[index].strip()
        if not line:
            index += 1
            continue
        if line.startswith("|"):
            rows = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                row = cells(lines[index])
                if not all(re.fullmatch(r":?-+:?", cell) for cell in row):
                    rows.append(row)
                index += 1
            if not rows or any(len(row) != len(rows[0]) for row in rows):
                raise ValueError(f"Malformed table in {source.name} near line {index}")
            table = doc.add_table(rows=0, cols=len(rows[0]))
            table.style = "Table Grid"
            for number, row in enumerate(rows):
                output = table.add_row()
                for cell, value in zip(output.cells, row):
                    cell.text = plain(value)
                    for paragraph in cell.paragraphs:
                        paragraph.paragraph_format.space_after = Pt(3)
                        for run in paragraph.runs:
                            run.font.size = Pt(9)
                            run.bold = number == 0
                if number == 0:
                    output._tr.get_or_add_trPr().append(OxmlElement("w:tblHeader"))
            doc.add_paragraph()
            continue
        heading = re.match(r"^(#{1,4})\s+(.*)", line)
        if heading:
            level = len(heading[1])
            doc.add_paragraph(plain(heading[2]), "Title" if level == 1 else f"Heading {level - 1}")
            if index == 0:
                doc.add_paragraph(
                    "Revised compilation from the canonical sprint record. Corrections "
                    "distinguish historical meeting evidence from later reconciliation; "
                    "unresolved confirmations remain visible. Original recording and "
                    "evidence links are retained in the appendix."
                )
        elif line.startswith("- "):
            body = line[2:]
            while index + 1 < len(lines) and lines[index + 1].startswith("  "):
                index += 1
                body += " " + lines[index].strip()
            doc.add_paragraph(plain(body), "List Bullet")
        else:
            body = line.removeprefix("> ")
            while index + 1 < len(lines):
                following = lines[index + 1].strip()
                if not following or following.startswith(("#", "|", "- ")):
                    break
                index += 1
                body += " " + following.removeprefix("> ")
            doc.add_paragraph(plain(body))
        index += 1
    if links:
        doc.add_heading("Original recording and evidence links", level=1)
        for url in links:
            hyperlink(doc.add_paragraph(), url)
    doc.core_properties.title = plain(lines[0].lstrip("# "))
    doc.core_properties.author = "ConnectSphere Team 8"
    doc.save(target)
    reopened = Document(target)
    exported_links = {rel.target_ref for rel in reopened.part.rels.values()
                      if rel.is_external and rel.reltype == RT.HYPERLINK}
    if exported_links != set(links):
        raise ValueError(f"Recording links changed in {target.name}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True,
                        help="External destination for the twelve sprint DOCX files")
    args = parser.parse_args()
    output = args.output.resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error("--output must be outside the repository")
    assert cells("| Story | Points |") == ["Story", "Points"]
    assert plain("**Story** [source](https://example.org)") == "Story source (https://example.org)"
    output.mkdir(parents=True, exist_ok=True)
    for sprint in range(1, 5):
        for slug, label in KINDS.items():
            matches = list(ORIGINALS.glob(f"Sprint {sprint} - {label} - *.docx"))
            if len(matches) != 1:
                raise ValueError(f"Expected one original for sprint {sprint} {label}")
            original = matches[0]
            target = output / original.name
            if sprint == 1:
                shutil.copy2(original, target)
            else:
                render(ROOT / "docs" / "sprints" / f"sprint-{sprint}-{slug}.md", original, target)
            print(target.name)


if __name__ == "__main__":
    main()
