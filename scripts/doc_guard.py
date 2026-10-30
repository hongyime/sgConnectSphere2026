"""Fail when mapped code changed but no mapped doc changed.

Run from the repository root:

    python scripts/doc_guard.py               # base ref defaults to origin/main
    python scripts/doc_guard.py origin/main   # explicit base ref
    python scripts/doc_guard.py --selftest    # offline self-check

`docs/doc-map.json` maps code areas to the docs they affect. Exit 1 when an
unwaived rule fires or a frozen doc needs attention; exit 2 when the base ref
has not been fetched. Warnings alone exit 0.
"""
from __future__ import annotations

import fnmatch
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

DOC_CLIP = 5
WAIVER_RE = re.compile(r"^Docs-Impact:\s*none\b", re.MULTILINE | re.IGNORECASE)
VALID_STATUS = {"draft", "provisional", "final"}
STALE_RE = re.compile(r"\(provisional\s*[\u2014\u2013-]\s*Sprint 4 in progress\)", re.IGNORECASE)


def git(args: list[str], cwd: Path | None = None) -> tuple[int, str]:
    proc = subprocess.run(["git", *args], cwd=str(cwd) if cwd else None, capture_output=True,
                          text=True, encoding="utf-8", errors="replace", check=False)
    return proc.returncode, proc.stdout.strip()


def match(path: str, pat: str) -> bool:
    """Glob match that also covers the zero-directory case for interior /**/."""
    return (fnmatch.fnmatch(path, pat)
            or (pat.startswith("**/") and fnmatch.fnmatch(path, pat[3:]))
            or fnmatch.fnmatch(path, pat.replace("/**/", "/")))


def front_matter(text: str) -> dict[str, str] | None:
    """Tiny YAML-subset reader for the leading --- fenced block; no PyYAML."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    data: dict[str, str] = {}
    for line in lines[1:]:
        if line.strip() == "---":
            return data
        if ":" in line:
            key, value = line.split(":", 1)
            data[key.strip()] = value.strip().strip("'\"")
    return None


def guard(base: str) -> int:
    code, top = git(["rev-parse", "--show-toplevel"])
    if code != 0 or not top:
        print("doc_guard: not inside a git work tree", file=sys.stderr)
        return 2
    root, docs = Path(top), Path(top) / "docs"
    code, mb = git(["merge-base", base, "HEAD"])
    if code != 0 or not mb:
        print(f"doc_guard: cannot find merge-base with {base}; run 'git fetch' first.",
              file=sys.stderr)
        return 2

    changed: set[str] = set()
    for args in (["diff", "--name-only", mb], ["ls-files", "--others", "--exclude-standard"]):
        code, out = git(args)
        if code != 0:
            print(f"doc_guard: git {' '.join(args)} failed", file=sys.stderr)
            return 2
        changed.update(p.replace("\\", "/") for p in out.splitlines() if p)
    changed_docs = sorted(p for p in changed if p.startswith("docs/"))
    code_changed = sorted(changed.difference(changed_docs))

    _, log = git(["log", "--format=%B", f"{mb}..HEAD"])
    waived = bool(WAIVER_RE.search(log))
    frozen = (docs / "FREEZE").exists()
    errors: list[str] = []
    warnings: list[str] = []
    soft = errors if frozen else warnings

    map_path = docs / "doc-map.json"
    mapping = json.loads(map_path.read_text(encoding="utf-8")) if map_path.is_file() else {}
    if not mapping:
        errors.append("docs/doc-map.json not found; cannot map code to docs")
    rules, exempt = mapping.get("rules", []), mapping.get("exempt", [])

    for rule in rules:
        paths, doc_globs = rule.get("paths", []), rule.get("docs", [])
        hits = sorted(f for f in code_changed if any(match(f, p) for p in paths))
        if not hits or waived or any(match(d, g) for d in changed_docs for g in doc_globs):
            continue
        errors.append(f"[{rule.get('name', '?')}] changed {hits[:DOC_CLIP]} but none of "
                      f"{doc_globs} was updated. Update the doc, or add commit trailer "
                      "'Docs-Impact: none \u2014 <reason>'.")

    mapped = [p for rule in rules for p in rule.get("paths", [])]
    for doc in sorted(docs.rglob("*.md")):
        rel = doc.relative_to(root).as_posix()
        if any(match(rel, e) for e in exempt):
            continue
        text = doc.read_text(encoding="utf-8", errors="replace")
        meta = front_matter(text)
        if meta is None:
            soft.append(f"{rel}: missing front matter")
            continue
        status = meta.get("status", "")
        if status not in VALID_STATUS:
            soft.append(f"{rel}: status {status!r} not in {sorted(VALID_STATUS)}")
        if frozen:
            if status != "final":
                errors.append(f"{rel}: status {status!r} is not final during freeze")
            if "NEEDS-REVIEW" in text:
                errors.append(f"{rel}: contains NEEDS-REVIEW during freeze")
            if STALE_RE.search(text):
                errors.append(f"{rel}: contains a provisional Sprint 4 marker during freeze")
        verified = meta.get("verified_against", "")
        if not verified:
            continue
        rc, _ = git(["merge-base", "--is-ancestor", verified, "HEAD"])
        if rc != 0:
            soft.append(f"{rel}: verified_against {verified} is not a commit in this "
                        "branch's history")
            continue
        _, since = git(["diff", "--name-only", verified])
        touched = [f.replace("\\", "/") for f in since.splitlines()
                   if f and any(match(f.replace("\\", "/"), p) for p in mapped)]
        if touched:
            soft.append(f"{rel}: mapped code changed since {verified[:8]}; re-verify")

    for msg in warnings:
        print(f"WARN {msg}")
    for msg in errors:
        print(f"FAIL {msg}")
    print(f"doc_guard: {len(errors)} error(s), {len(warnings)} warning(s)"
          + (" FREEZE MODE" if frozen else ""))
    return 1 if errors else 0


def selftest() -> int:
    script = Path(__file__).resolve()
    with tempfile.TemporaryDirectory(prefix="doc_guard_selftest_") as tmpdir:
        tmp = Path(tmpdir)

        def run(*args: str) -> str:
            proc = subprocess.run(["git", *args], cwd=tmp, capture_output=True, text=True,
                                  encoding="utf-8", errors="replace", check=False)
            if proc.returncode != 0:
                raise RuntimeError(f"git {' '.join(args)} failed: {proc.stderr}")
            return proc.stdout.strip()

        def commit(message: str) -> None:
            run("add", "-A")
            run("commit", "-m", message)

        run("init")
        run("config", "user.email", "selftest@example.invalid")
        run("config", "user.name", "doc_guard selftest")
        (tmp / "backend" / "src").mkdir(parents=True)
        (tmp / "docs").mkdir()
        (tmp / "docs" / "doc-map.json").write_text(json.dumps({"exempt": [], "rules": [
            {"name": "Backend", "paths": ["backend/src/**/*"], "docs": ["docs/architecture.md"]}]}),
            encoding="utf-8")
        code = tmp / "backend" / "src" / "config.ts"
        code.write_text("export const port = 3000;\n", encoding="utf-8")
        doc = tmp / "docs" / "architecture.md"
        template = "---\nstatus: final\nverified_against: {sha}\n---\n\n# Architecture\n"
        doc.write_text(template.format(sha="PENDING"), encoding="utf-8")
        commit("chore: seed")
        first = run("rev-parse", "HEAD")
        doc.write_text(template.format(sha=first), encoding="utf-8")
        commit("docs: pin verified sha")
        base = run("rev-parse", "HEAD")
        failures: list[str] = []

        def expect(case: str, want: int) -> None:
            rc = subprocess.run([sys.executable, str(script), base], cwd=tmp, capture_output=True,
                                text=True, encoding="utf-8", errors="replace",
                                check=False).returncode
            if rc != want:
                failures.append(case)

        code.write_text("export const port = 4000;\n", encoding="utf-8")
        commit("feat: change port")
        expect("a", 1)

        run("commit", "--allow-empty", "-m", "chore: no doc impact",
            "-m", "Docs-Impact: none \u2014 no doc impact")
        expect("b", 0)

        code.write_text("export const port = 5000;\n", encoding="utf-8")
        doc.write_text(doc.read_text(encoding="utf-8") + "\nPort moved to 5000.\n", encoding="utf-8")
        commit("feat: change port and doc")
        expect("c", 0)

        (tmp / "docs" / "FREEZE").write_text("", encoding="utf-8")
        doc.write_text(doc.read_text(encoding="utf-8") + "\nNEEDS-REVIEW\n", encoding="utf-8")
        commit("chore: freeze")
        expect("d", 1)

        if failures:
            print(f"selftest: FAIL {', '.join(failures)}")
            return 1
        print("selftest: PASS")
        return 0


def main(argv: list[str]) -> int:
    if argv and argv[0] == "--selftest":
        return selftest()
    return guard(argv[0] if argv else "origin/main")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
