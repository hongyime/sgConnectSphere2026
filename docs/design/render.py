"""Render the adjacent Mermaid sources and assemble their explained PDF pack.

Requires Node/npm, Mermaid CLI 12.2.0 (via npx), reportlab and pypdf.
Use --puppeteer-config when Chromium needs an explicit executablePath.
"""
from __future__ import annotations

import argparse
import io
import json
import subprocess
import tempfile
from pathlib import Path
from xml.sax.saxutils import escape

from pypdf import PdfReader, PdfWriter, Transformation
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

HERE = Path(__file__).resolve().parent
STYLE = ParagraphStyle("body", fontName="Helvetica", fontSize=12, leading=17)


def paragraph(page: canvas.Canvas, text: str, y: float, width: float) -> float:
    block = Paragraph(escape(text), STYLE)
    _, height = block.wrap(width - 84, 2000)
    block.drawOn(page, 42, y - height)
    return y - height - 12


def explained_page(title: str, notes: list[str], size: tuple, number: int):
    stream = io.BytesIO()
    page = canvas.Canvas(stream, pagesize=size)
    width, height = size
    page.setFillColor(HexColor("#0a5958"))
    page.rect(0, height - 18, width, 18, fill=1, stroke=0)
    page.setFont("Helvetica-Bold", 22)
    page.drawString(42, height - 60, title)
    page.setFillColor(HexColor("#263d43"))
    y = height - 90
    for note in notes:
        y = paragraph(page, note, y, width)
    page.setFont("Helvetica", 10)
    page.drawString(42, 24, "ConnectSphere | Release 1 | Source 0773a721 | 5 November 2026")
    page.drawRightString(width - 42, 24, str(number))
    page.showPage()
    page.save()
    return PdfReader(stream).pages[0], y


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--puppeteer-config", type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    sources = sorted(HERE.glob("[0-9][0-9]-*.mmd"))
    if not sources:
        raise SystemExit("No numbered Mermaid sources found")
    with tempfile.TemporaryDirectory() as scratch:
        config = Path(scratch) / "mermaid.json"
        config.write_text(json.dumps({
            "theme": "neutral", "themeVariables": {"fontFamily": "Arial", "fontSize": "20px"},
            "flowchart": {"htmlLabels": False, "curve": "linear", "nodeSpacing": 35, "rankSpacing": 55},
            "sequence": {"wrap": True, "messageFontSize": 18, "noteFontSize": 16},
            "er": {"fontSize": 18},
        }))
        for source in sources:
            for extension in ("svg", "png", "pdf"):
                command = ["npx", "--yes", "--package", "@mermaid-js/mermaid-cli@12.2.0", "mmdc",
                           "-i", str(source), "-o", str(args.output / f"{source.stem}.{extension}"),
                           "-c", str(config), "-b", "white", "--size", "2600"]
                if args.puppeteer_config:
                    command += ["-p", str(args.puppeteer_config.resolve())]
                if extension == "png":
                    command += ["--scale", "2"]
                subprocess.run(command, check=True)
    writer = PdfWriter()
    cover, _ = explained_page("System Design - ConnectSphere Release 1", [
        "As-built source: main 0773a721. Code and Jira status are separate from final acceptance.",
        "Lecture basis: Week 4 PDF pp. 58, 60-66 (C4, ER, ADRs); Week 5 PDF pp. 7-15 and 22 (UML). DFDs and user flows are supplementary.",
        "Known limits: single-role runtime, Coordinator-triggered initial safety submission, eligible automatic re-entry and no frequent worker cron declared. See docs/design/README.md for scope and discrepancies.",
        *[source.stem[:2] + ". " + source.with_suffix(".md").read_text().splitlines()[0][2:] for source in sources],
    ], landscape(A3), 1)
    writer.add_page(cover)
    for number, source in enumerate(sources, 2):
        sections = source.with_suffix(".md").read_text().split("\n\n")
        diagram_pdf = PdfReader(args.output / f"{source.stem}.pdf")
        if len(diagram_pdf.pages) != 1:
            raise ValueError(f"Expected one PDF page for {source.name}")
        diagram = diagram_pdf.pages[0]
        dw, dh = float(diagram.mediabox.width), float(diagram.mediabox.height)
        size = A3 if dw / dh < 0.85 else landscape(A3)
        notes = [sections[1], next(s for s in sections if s.startswith("Notation:")),
                 sections[sections.index("## Evidence") + 1]]
        page, top = explained_page(sections[0][2:], notes, size, number)
        scale = min((size[0] - 84) / dw, (top - 55) / dh)
        if scale <= 0:
            raise ValueError(f"Explanation leaves no diagram space: {source.name}")
        page.merge_transformed_page(diagram, Transformation().scale(scale).translate(
            42 + (size[0] - 84 - dw * scale) / 2, 55 + (top - 55 - dh * scale) / 2))
        writer.add_page(page)
    target = args.output / "System Design - ConnectSphere Release 1.pdf"
    with target.open("wb") as output:
        writer.write(output)
    if len(PdfReader(target).pages) != len(sources) + 1:
        raise ValueError("Combined PDF page count mismatch")
    print(f"Verified {len(sources)} SVG/PNG/PDF sets and {len(sources) + 1} combined pages")


if __name__ == "__main__":
    main()
