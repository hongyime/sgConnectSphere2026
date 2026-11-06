"""Assemble tracked submission files outside the repository; never deletes files.

Usage: python scripts/assemble_submission.py --output <external-folder>
Requires openpyxl for the existing backlog exporter; pypdf and Pillow are optional
file validators. Parser checks do not establish visual quality or absence of secrets.
"""
from __future__ import annotations

import argparse
import csv
import json
import shutil
import subprocess
import defusedxml.ElementTree as ET
from collections import Counter
from pathlib import Path, PurePosixPath
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
FOLDERS = (
    "1. PRODUCT BACKLOG", "2. SPRINT MEETINGS", "3. SYSTEM DESIGNS",
    "4. TEST CASES", "5. SLIDE DECK", "6. CODE REPOSITORY", "7. README",
)


def external_output(value: Path, root: Path = ROOT) -> Path:
    resolved = value.expanduser().resolve()
    if resolved.is_relative_to(root.resolve()):
        raise ValueError("Output must be outside the repository.")
    return resolved


def forbidden_archive_path(name: str) -> bool:
    parts = PurePosixPath(name.replace("\\", "/")).parts
    if not parts or name.startswith(("/", "\\")) or ":" in parts[0]:
        return True
    forbidden = {"..", ".git", "node_modules"}
    if any(part.lower() in forbidden for part in parts):
        return True
    if parts[0].lower() == "submission":
        return True
    return any(
        part.lower() == ".env" or (
            part.lower().startswith(".env.")
            and part.lower() not in {".env.template", ".env.example", ".env.sample"}
        ) for part in parts
    )


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT).decode("utf-8")


def check_file(path: Path) -> str:
    try:
        suffix = path.suffix.lower()
        if suffix in {".zip", ".docx", ".xlsx", ".pptx"}:
            with ZipFile(path) as archive:
                if archive.testzip() is not None:
                    return "FAIL: ZIP CRC"
                if suffix != ".zip":
                    for name in archive.namelist():
                        if name.endswith((".xml", ".rels")):
                            ET.fromstring(archive.read(name))
            return "PASS: ZIP CRC / Office XML; visual opening not checked"
        if suffix == ".pdf":
            from pypdf import PdfReader
            document = PdfReader(path)
            for page in document.pages:
                page.get_contents()
            return f"PASS: PDF parsed ({len(document.pages)} pages); visual opening not checked"
        if suffix in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico"}:
            from PIL import Image
            with Image.open(path) as picture:
                picture.verify()
            return "PASS: image decoded; visual opening not checked"
        if suffix in {".md", ".txt", ".html", ".css", ".js", ".json", ".csv", ".svg"}:
            text = path.read_text(encoding="utf-8-sig")
            if suffix == ".json":
                json.loads(text)
            elif suffix == ".svg":
                ET.fromstring(text)
            elif suffix == ".csv":
                list(csv.reader(text.splitlines(), strict=True))
            return "PASS: UTF-8 read; interactive behavior not checked"
        return "UNVERIFIED: no parser for this extension"
    except ImportError:
        return "UNVERIFIED: optional parser unavailable"
    except Exception as error:
        return f"FAIL: {type(error).__name__} (content omitted)"


def assemble(output: Path) -> None:
    output = external_output(output)
    main_commit = git("rev-parse", "origin/main").strip()
    head = git("rev-parse", "HEAD").strip()
    dirty = bool(git("diff", "--name-only", "HEAD", "--").strip())
    provisional = head != main_commit or dirty
    output.mkdir(parents=True, exist_ok=True)
    for folder in FOLDERS:
        destination = output / folder
        if destination.resolve().parent != output:
            raise ValueError("Submission subfolder resolves outside the output folder.")
        destination.mkdir(exist_ok=True)
    # Only tracked files are eligible; ignored local evidence or credentials stay out.
    for name in git("ls-files", "-z", "--", "submission/").split("\0"):
        if not name:
            continue
        relative = Path(name).relative_to("submission")
        if relative.parts[0] not in FOLDERS or relative.name == ".gitkeep":
            continue
        source, destination = ROOT / name, output / relative
        if source.is_symlink() or not source.resolve().is_relative_to(ROOT):
            raise ValueError(f"Refusing submission symlink: {relative}")
        if not destination.resolve().is_relative_to(output):
            raise ValueError("Destination resolves outside the output folder.")
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)

    from export_backlog_xlsx import BACKLOG_DIR, _iter_epic_files, _parse_epic_file, _write_workbook
    rows = [[story for path in _iter_epic_files(BACKLOG_DIR / kind)
             for story in _parse_epic_file(path)[1]] for kind in ("release-1", "product")]
    _write_workbook(*rows, output / FOLDERS[0] / "ConnectSphere Release 1 Product Backlog.xlsx")

    archive_path = output / FOLDERS[5] / "sgConnectSphere2026.zip"
    if archive_path.is_symlink():
        raise ValueError("Refusing archive destination symlink.")
    subprocess.run(["git", "archive", "--format=zip", "-o", str(archive_path),
                    "origin/main"], cwd=ROOT, check=True)
    compressed: Counter[str] = Counter()
    with ZipFile(archive_path) as archive:
        invalid = [entry.filename for entry in archive.infolist()
                   if forbidden_archive_path(entry.filename)]
        if invalid:
            raise ValueError("Archive contains forbidden paths; do not upload.")
        if archive.testzip() is not None:
            raise ValueError("Archive CRC validation failed; do not upload.")
        for entry in archive.infolist():
            compressed[entry.filename.split("/")[0]] += entry.compress_size
    inventory = []
    for folder in FOLDERS:
        for path in sorted((output / folder).rglob("*")):
            if path.is_file():
                inventory.append((path.relative_to(output).as_posix(), path.stat().st_size,
                                  check_file(path)))
    with (output / "_FILE-CHECKLIST.csv").open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(("File", "Bytes", "Opening check"))
        writer.writerows(inventory)
    lines = ["# Assembly receipt", "", f"Archive origin/main: `{main_commit}`",
             f"Working HEAD: `{head}`", f"Dirty tracked files: {dirty}",
             f"Provisional (different HEAD or dirty sources): {provisional}", "",
             "Existing output files were retained; remove superseded files only after human review.",
             "Parser checks do not verify visual layout, links, macros, or interactive HTML.",
             "Archive path exclusions and CRC passed. Secret-content scanning is a separate required check.",
             "Readiness still requires merged owner PRs, resolved confirmations and visual review.", "",
             f"Code archive bytes: {archive_path.stat().st_size}",
             f"Over 100 MB: {archive_path.stat().st_size > 100_000_000}", "",
             "## Compressed archive bytes by top-level path", ""]
    lines.extend(f"- {name}: {size}" for name, size in compressed.most_common())
    lines.extend(["", "## Folder file counts", ""])
    lines.extend(f"- {folder}: {sum(row[0].startswith(folder + '/') for row in inventory)}"
                 for folder in FOLDERS)
    (output / "_ASSEMBLY-RECEIPT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Assembled {len(inventory)} files. Provisional={provisional}. See external receipt/checklist.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    assemble(parser.parse_args().output)
