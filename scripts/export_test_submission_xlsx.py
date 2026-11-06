"""Build the Release 1 test-case and execution workbook (submission folder "4. TEST CASES").

Markdown stays authoritative (docs/source-of-truth.md). This script reads:

- docs/testing/cases/*.md: the test-case specifications (IS212 Week 4 slide 22);
- docs/backlog/release-1/*.md: the Release 1 acceptance criteria (scenarios);
- docs/testing/runs/*.md: every T-65 execution record (the run history);
- docs/testing/run-record-corrections.md: records later found wrong;
- docs/testing/defects.md: defects raised from failed runs;
- optionally a results folder holding a ``manifest.json`` that lists raw JUnit
  and Playwright JSON results of the submission runs, plus a Stryker JSON report.

and writes one workbook with the sheets Summary, Test Cases, Execution Log,
Traceability, Defects and Mutation Summary. Screenshots attached to Playwright
results are copied next to the workbook under ``screenshots/<TC_ID>/``.

Usage from the repository root:

    .venv-tools\\Scripts\\python.exe scripts\\export_test_submission_xlsx.py \\
        --out "<submission>/4. TEST CASES/ConnectSphere Release 1 Test Cases.xlsx" \\
        --results <folder with manifest.json> --mutation reports/mutation/mutation.json
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from pathlib import Path

import openpyxl
from openpyxl.formatting.rule import CellIsRule
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from export_testcases_xlsx import CASES_DIR, REPO_ROOT, _parse_epic_file  # noqa: E402

RUNS_DIR = REPO_ROOT / "docs" / "testing" / "runs"
BACKLOG_DIR = REPO_ROOT / "docs" / "backlog" / "release-1"
CORRECTIONS = REPO_ROOT / "docs" / "testing" / "run-record-corrections.md"
DEFECTS = REPO_ROOT / "docs" / "testing" / "defects.md"
TC_RE = re.compile(r"TC_E\d{2}S\d{2}_\d{2}[a-z]?")
# Git and GitHub identities -> the team names used in every deliverable.
TEAM = {"b": "Bryan", "bryanseah234": "Bryan", "amareetkm2024-del": "Amareet",
        "lexinphun": "Lexin", "lexinphun2024-debug": "Lexin", "Ji Ning": "Jining",
        "jininggg": "Jining", "Xiang Ying": "Xiangying", "xiangyingg": "Xiangying",
        "Bl0oper": "Aaron", "aaronkwk": "Aaron"}
# The course's four execution statuses (Week 4 slide 22).
STATUS = {"PASS": "Pass", "PASSED": "Pass", "FAIL": "Fail", "FAILED": "Fail",
          "TIMEDOUT": "Fail", "INTERRUPTED": "Fail", "SKIP": "Not Executed",
          "SKIPPED": "Not Executed", "N/A": "Not Executed", "BLOCKED": "Blocked"}
# Tie-break for one TC in one run: a failure wins, and an unexecuted placeholder never hides an executed result.
RANK = {"Fail": 0, "Blocked": 1, "Pass": 2, "Not Executed": 3}


def course_status(raw: str) -> str:
    return STATUS.get(raw.strip().upper(), "Not Executed")


def tc_ids(text: str) -> list[str]:
    return list(dict.fromkeys(TC_RE.findall(text or "")))


# ---------------------------------------------------------------- sources

def case_origins() -> dict[str, tuple[str, str]]:
    """First commit that added each '### TC_...' heading: (author, ISO date)."""
    out = subprocess.run(
        ["git", "log", "--reverse", "--no-color", "-U0", "--format=@@%an\t%aI", "-p", "--", "docs/testing/cases"],
        cwd=REPO_ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", check=True).stdout
    origins: dict[str, tuple[str, str]] = {}
    author = when = ""
    for line in out.splitlines():
        if line.startswith("@@") and "\t" in line and not line.startswith("@@ "):
            author, when = line[2:].split("\t", 1)
        elif line.startswith("+### "):
            for tc in tc_ids(line[:40]):
                origins.setdefault(tc, (TEAM.get(author, author), when[:10]))
    return origins


def release1_acs() -> list[dict]:
    acs, story, title = [], "", ""
    for path in sorted(BACKLOG_DIR.glob("E*.md")):
        for line in path.read_text(encoding="utf-8").splitlines():
            m = re.match(r"^##\s+(E\d{2}-S\d{2})\s+[-–—]\s+(.+)$", line)
            if m:
                story, title = m.groups()
                continue
            m = re.match(r"^####\s+Scenario\s+(\d+[a-z]?)\s+[-–—]\s+(.+)$", line)
            if m and story:
                name = m.group(2).strip()
                acs.append({"story": story, "story_title": title, "scenario": m.group(1),
                            "name": name, "superseded": name.startswith(("[Superseded", "Transferred"))})
    return acs


def read_record(path: Path) -> tuple[dict, list[list[str]]]:
    text = path.read_text(encoding="utf-8")
    meta: dict[str, str] = {}
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if m:
        for line in m.group(1).splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.split("#")[0].strip().strip('"')
    rows = []
    for line in text.splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if line.startswith("|") and len(cells) >= 4 and cells[0] not in ("TC_ID", "---") and not set(cells[0]) <= set("-: "):
            rows.append(cells[:3] + [" | ".join(cells[3:])])
    return meta, rows


def md_table(path: Path) -> list[dict]:
    """Rows of the first Markdown table in a file, keyed by header."""
    if not path.exists():
        return []
    lines = [ln for ln in path.read_text(encoding="utf-8").splitlines() if ln.startswith("|")]
    if len(lines) < 2:
        return []
    head = [c.strip() for c in lines[0].strip("|").split("|")]
    return [dict(zip(head, (c.strip() for c in ln.strip("|").split("|")))) for ln in lines[2:]]


def junit_tests(path: Path) -> list[dict]:
    tests = []
    for case in ET.parse(path).getroot().iter("testcase"):
        if case.find("failure") is not None or case.find("error") is not None:
            node = case.find("failure") if case.find("failure") is not None else case.find("error")
            status, detail = "Fail", (node.get("message") or node.text or "")[:500]
        elif case.find("skipped") is not None:
            status, detail = "Not Executed", "skipped"
        else:
            status, detail = "Pass", ""
        tests.append({"file": case.get("classname") or case.get("file") or "", "title": case.get("name", ""),
                      "project": "", "status": status, "duration": float(case.get("time") or 0),
                      "detail": detail, "shots": []})
    return tests


def playwright_tests(path: Path) -> list[dict]:
    tests = []

    def walk(suite: dict, file: str) -> None:
        file = suite.get("file") or file
        for spec in suite.get("specs", []):
            for test in spec.get("tests", []):
                result = (test.get("results") or [{}])[-1]
                annotations = {a.get("type") for a in test.get("annotations", [])}
                raw = result.get("status") or ("skipped" if test.get("status") == "skipped" else "")
                status = "Not Executed" if "fixme" in annotations or raw == "skipped" else course_status(raw or "fail")
                error = (result.get("error") or {}).get("message", "")
                tests.append({"file": file, "title": spec.get("title", ""), "project": test.get("projectName", ""),
                              "status": status, "duration": (result.get("duration") or 0) / 1000,
                              "detail": ("fixme placeholder" if "fixme" in annotations else re.sub(r"\x1b\[[0-9;]*m", "", error)[:500]),
                              "shots": [a["path"] for a in result.get("attachments", [])
                                        if a.get("contentType") == "image/png" and a.get("path")]})
        for child in suite.get("suites", []):
            walk(child, file)

    for suite in json.loads(path.read_text(encoding="utf-8")).get("suites", []):
        walk(suite, "")
    return tests


# ---------------------------------------------------------------- workbook helpers

HEAD_FILL = PatternFill("solid", fgColor="1F3864")
FILLS = {"Pass": "C6EFCE", "Fail": "FFC7CE", "Blocked": "FFEB9C", "Not Executed": "D9D9D9"}


def sheet(wb, name: str, header: list[str], rows: list[list], widths: list[int], status_cols: tuple[str, ...] = ()):
    ws = wb.create_sheet(name)
    ws.append(header)
    for cell in ws[1]:
        cell.font, cell.fill = Font(bold=True, color="FFFFFF"), HEAD_FILL
        cell.alignment = Alignment(wrap_text=True, vertical="top")
    for row in rows:
        ws.append(row)
    for i, width in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = width
    for cells in ws.iter_rows(min_row=2):
        for cell in cells:
            cell.alignment = Alignment(wrap_text=True, vertical="top")
    ws.freeze_panes = "B2"
    if rows:
        ws.auto_filter.ref = f"A1:{get_column_letter(len(header))}{len(rows) + 1}"
    for col in status_cols:
        letter = get_column_letter(header.index(col) + 1)
        for status, colour in FILLS.items():
            ws.conditional_formatting.add(f"{letter}2:{letter}{len(rows) + 1}", CellIsRule(
                operator="equal", formula=[f'"{status}"'], fill=PatternFill("solid", fgColor=colour)))
    return ws


def link(ws, col: str, rel_paths: dict[int, str]) -> None:
    letter = get_column_letter([c.value for c in ws[1]].index(col) + 1)
    for row, rel in rel_paths.items():
        cell = ws[f"{letter}{row}"]
        cell.hyperlink, cell.style = rel, "Hyperlink"


# ---------------------------------------------------------------- build

def build(out: Path, results: Path | None, mutation: Path | None) -> str:
    cases = [c for p in sorted(CASES_DIR.glob("*.md")) for c in _parse_epic_file(p)]
    ids = Counter(c["case_id"] for c in cases)
    origins = case_origins()
    acs = release1_acs()
    corrections = {r.get("Record", "").strip("` "): r for r in md_table(CORRECTIONS)}
    defects = md_table(DEFECTS)
    # An open defect turns its cases' non-passing results (expected failures, todo) into Fail.
    known = {tc: d for d in defects if not re.search(r"fixed|closed|resolved", d.get("Status", ""), re.I)
             for tc in tc_ids(d.get("TC IDs", ""))}
    release1 = {a["story"] for a in acs}

    # Execution log: history from T-65 records, then this submission's raw results.
    log: list[dict] = []
    for path in sorted(RUNS_DIR.glob("2*.md")):
        meta, rows = read_record(path)
        fixed = corrections.get(path.name)
        for tc_cell, name, outcome, remarks in rows:
            log.append({"when": meta.get("date", ""), "env": {"ci": "CI"}.get(meta.get("environment", ""), "Local"),
                        "commit": meta.get("commit", ""), "runner": TEAM.get(meta.get("runner", ""), meta.get("runner", "")),
                        "suite": f"{meta.get('scope', '')} ({meta.get('run_type', '')}, db {meta.get('database', 'n/a')})",
                        "browser": "", "title": name, "tcs": tc_ids(tc_cell) or [tc_cell], "status": course_status(outcome),
                        "actual": remarks, "shot": "", "source": f"docs/testing/runs/{path.name}",
                        "correction": (f"Corrected: {fixed.get('Problem', '')} -> {fixed.get('Correction', '')}" if fixed else "")})
    out.parent.mkdir(parents=True, exist_ok=True)
    if results:
        manifest = json.loads((results / "manifest.json").read_text(encoding="utf-8"))
        for run in manifest["runs"]:
            src = results / run["path"]
            if not src.exists():
                continue
            parsed = playwright_tests(src) if run["kind"] == "playwright" else junit_tests(src)
            for n, t in enumerate(parsed):
                tcs = tc_ids(t["title"])
                defect = next((known[tc] for tc in tcs if tc in known), None)
                if defect and t["status"] != "Pass" and t["detail"] != "fixme placeholder":
                    t["status"] = "Fail"
                    t["detail"] = f"Known defect {defect.get('Defect', '')} ({defect.get('Jira', '')}): {defect.get('Summary', '')}"
                shot = ""
                for i, png in enumerate(t["shots"]):
                    folder = tcs[0] if tcs else "_no-TC-id"
                    rel = Path("screenshots") / folder / f"{run['id']}-{t['project'] or 'default'}-{n:04d}-{i}.png"
                    if Path(png).exists():
                        (out.parent / rel).parent.mkdir(parents=True, exist_ok=True)
                        shutil.copyfile(png, out.parent / rel)
                        shot = shot or rel.as_posix()
                log.append({"when": run["started"], "env": run["environment"], "commit": run["commit"],
                            "runner": run.get("runner", "Aaron"), "suite": f"{run['suite']} [{run['level']}]",
                            "browser": t["project"] or run.get("browser", ""), "title": f"{t['file']} > {t['title']}".strip(" >"),
                            "tcs": tcs, "status": t["status"],
                            "actual": t["detail"] or ("All assertions passed" if t["status"] == "Pass" else ""),
                            "shot": shot, "source": f"{run['id']} ({run.get('report', run['path'])})", "correction": ""})

    # Latest result per TC per environment (submission runs are newest).
    latest: dict[str, dict[str, dict]] = defaultdict(dict)
    for entry in sorted(log, key=lambda e: e["when"]):
        for tc in entry["tcs"]:
            if not TC_RE.fullmatch(tc):
                continue
            prev = latest[tc].get(entry["env"])
            # An executed result beats a placeholder; then the newest; then the worst of one run.
            def key(e: dict) -> tuple:
                return (e["status"] != "Not Executed", e["when"], -RANK[e["status"]])
            if not prev or key(entry) > key(prev):
                latest[tc][entry["env"]] = entry

    def overall(tc: str) -> dict | None:
        envs = latest.get(tc, {})
        return envs.get("Local") or envs.get("Vercel") or envs.get("CI")

    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    # Summary (filled after the other sheets so the counts are final).
    summary = wb.create_sheet("Summary")

    case_rows = []
    for c in cases:
        retired = bool(re.search(r"retired|superseded", c["ac_reference"] + c["scenario"], re.I))
        who, when = origins.get(c["case_id"], ("", ""))
        last = overall(c["case_id"])
        case_rows.append([c["case_id"], c["story_id"], c["ac_reference"], c["scenario"], c["step_type"],
                          c["preconditions"], c["steps"], c["test_data"], c["expected"], who, when, c["sprint"],
                          "Retired" if retired else "Active",
                          last["actual"] if last else "", last["status"] if last else "Not Executed",
                          last["runner"] if last else "", (last["when"] or "")[:19] if last else "",
                          last["env"] if last else "", last["source"] if last else "",
                          "Duplicate ID" if ids[c["case_id"]] > 1 else "",
                          "Yes" if c["story_id"] in release1 else "No (product backlog / cross-cutting)"])
    sheet(wb, "Test Cases",
          ["Test Case ID", "Story ID", "AC Reference", "Test Scenario", "Technique (5-step)", "Pre-conditions",
           "Test Steps", "Test Data", "Expected Result", "Created By", "Date of Creation", "Sprint", "Case Status",
           "Actual Result (latest)", "Pass/Fail/Not Executed/Blocked", "Executed By", "Date of Execution",
           "Environment", "Evidence", "Notes", "Release 1"],
          case_rows, [16, 10, 30, 40, 16, 36, 50, 30, 45, 12, 12, 8, 10, 40, 14, 12, 18, 10, 40, 12, 14],
          ("Pass/Fail/Not Executed/Blocked",))

    log_rows = [[e["when"][:19], e["env"], e["commit"], e["runner"], e["suite"], e["browser"], e["title"],
                 ", ".join(e["tcs"]), e["status"], e["actual"], e["shot"], e["source"], e["correction"]]
                for e in sorted(log, key=lambda e: (e["when"], e["env"]), reverse=True)]
    ws = sheet(wb, "Execution Log",
               ["Executed At (SGT)", "Environment", "Commit", "Executed By", "Suite [level]", "Browser / project",
                "Test", "TC IDs", "Pass/Fail/Not Executed/Blocked", "Actual Result / Remarks", "Screenshot",
                "Source record or report", "Correction"],
               log_rows, [19, 10, 9, 11, 34, 12, 60, 22, 14, 50, 30, 40, 40], ("Pass/Fail/Not Executed/Blocked",))
    link(ws, "Screenshot", {i + 2: r[10] for i, r in enumerate(log_rows) if r[10]})

    by_ac: dict[tuple[str, str], list[str]] = defaultdict(list)
    for c in cases:
        if c["scenario"].startswith("[RETIRED"):
            continue
        # "E08-S06 — Scenario 2 (...); Scenario 3 (...); regression on E03-S05 Scenario 1": own-story segments only.
        for segment in c["ac_reference"].split(";"):
            if any(s != c["story_id"] for s in re.findall(r"E\d{2}-S\d{2}", segment)):
                continue
            for group in re.findall(r"Scenarios?\s+(\d+[a-z]?(?:\s*(?:,|and|&)\s*\d+[a-z]?)*)", segment):
                for scenario in re.findall(r"\d+[a-z]?", group):
                    by_ac[(c["story_id"], scenario)].append(c["case_id"])
    trace_rows = []
    for ac in acs:
        tcs = by_ac.get((ac["story"], ac["scenario"]), [])
        results_ = [overall(tc) for tc in tcs]
        statuses = [r["status"] for r in results_ if r]
        worst = min(statuses, key=RANK.get) if statuses else "Not Executed"
        trace_rows.append([ac["story"], ac["story_title"], f"Scenario {ac['scenario']}", ac["name"],
                           "Superseded" if ac["superseded"] else "In force", ", ".join(tcs) or "NO TEST CASE",
                           len(tcs), sum(s == "Pass" for s in statuses), worst,
                           "; ".join(sorted({r['env'] + ' ' + r['when'][:10] for r in results_ if r}))])
    sheet(wb, "Traceability",
          ["Story ID", "Story", "Acceptance Criterion", "AC Name", "AC Status", "Test Cases", "# Cases",
           "# Passing", "Latest Result (worst case)", "Latest Run(s)"],
          trace_rows, [10, 36, 12, 44, 11, 40, 8, 9, 14, 30], ("Latest Result (worst case)",))

    head = list(defects[0].keys()) if defects else ["Defect", "Jira", "Story", "TC IDs", "Found in run", "Summary", "Status"]
    sheet(wb, "Defects", head, [[d.get(h, "") for h in head] for d in defects], [14] * len(head))

    mut_rows, mut_note = [], "Not run: no Stryker report supplied."
    if mutation and mutation.exists():
        report = json.loads(mutation.read_text(encoding="utf-8"))
        for name, data in sorted(report.get("files", {}).items()):
            counts = Counter(m.get("status") for m in data.get("mutants", []))
            caught = counts["Killed"] + counts["Timeout"]
            valid = caught + counts["Survived"] + counts["NoCoverage"]
            covered = caught + counts["Survived"]
            mut_rows.append([name, sum(counts.values()), counts["Killed"], counts["Timeout"], counts["Survived"],
                             counts["NoCoverage"], counts["CompileError"] + counts["RuntimeError"], counts["Ignored"],
                             round(100 * caught / valid, 1) if valid else None,
                             round(100 * caught / covered, 1) if covered else None])
            for m_ in data.get("mutants", []):
                if m_.get("status") in ("Survived", "NoCoverage"):
                    loc = m_.get("location", {}).get("start", {})
                    mut_rows.append([f"  {m_['status']}: {name}:{loc.get('line')}", m_.get("mutatorName"),
                                     (m_.get("replacement") or "")[:80], "", "", "", "", "", None, None])
        mut_note = (f"Stryker {report.get('schemaVersion', '')} report {mutation.name}. Score = caught (killed + timed out) "
                    "/ (caught + survived + no coverage); covered score excludes uncovered mutants.")
    sheet(wb, "Mutation Summary",
          ["File / surviving mutant", "Mutants (or mutator)", "Killed (or replacement)", "Timed out", "Survived",
           "No coverage", "Errors", "Ignored", "Mutation score %", "Covered score %"],
          mut_rows, [60, 14, 30, 10, 10, 11, 8, 8, 14, 14])
    wb["Mutation Summary"].insert_rows(1)
    wb["Mutation Summary"]["A1"] = mut_note

    # Summary sheet.
    sub = [e for e in log if not e["source"].startswith("docs/")]
    summary.append(["ConnectSphere Release 1 - test cases and execution"])
    summary["A1"].font = Font(bold=True, size=14)
    active = sum(r[12] == "Active" for r in case_rows)
    in_force = [r for r in trace_rows if r[4] == "In force"]
    summary.append([])
    for label, value in [
        ("Test cases (all / active / retired)", f"{len(case_rows)} / {active} / {len(case_rows) - active}"),
        ("Release 1 acceptance criteria in force", len(in_force)),
        ("ACs in force with no test case", sum(r[6] == 0 for r in in_force)),
        ("ACs in force whose cases all pass (latest)", sum(r[8] == "Pass" for r in in_force)),
        ("Historical execution rows (T-65 records)", len(log) - len(sub)),
        ("Submission execution rows", len(sub)),
        ("Run dates", ", ".join(sorted({e["when"][:10] for e in sub}))),
        ("Defects raised", len(defects)),
    ]:
        summary.append([label, value])
    summary.append([])
    summary.append(["Submission runs by environment and suite"])
    summary.append(["Environment", "Suite [level]", "Commit", "Executed At (SGT)", "Pass", "Fail", "Not Executed",
                    "Blocked", "Pass rate (executed)"])
    groups: dict[tuple, Counter] = defaultdict(Counter)
    for e in sub:
        groups[(e["env"], e["suite"], e["commit"], e["when"][:19])][e["status"]] += 1
    for key, cnt in sorted(groups.items()):
        executed = cnt["Pass"] + cnt["Fail"]
        summary.append([*key, cnt["Pass"], cnt["Fail"], cnt["Not Executed"], cnt["Blocked"],
                        f"{100 * cnt['Pass'] / executed:.1f}%" if executed else "n/a"])
    if results:
        summary.append([])
        summary.append(["Code coverage of the submission runs (c8 / Vitest v8; whole codebase, not only changed code)"])
        summary.append(["Suite", "Lines %", "Branches %", "Functions %", "Statements %"])
        for label, folder in (("Backend unit", "backend-unit-cov"), ("Backend integration", "backend-db-cov"),
                              ("Frontend component", "frontend-cov")):
            path = results / folder / "coverage-summary.json"
            if path.exists():
                total = json.loads(path.read_text(encoding="utf-8"))["total"]
                summary.append([label, *(total[k]["pct"] for k in ("lines", "branches", "functions", "statements"))])
    summary.append([])
    summary.append(["Pass rate by story and environment (latest result per test case)"])
    summary.append(["Story ID", "Environment", "Cases with a result", "Pass", "Fail", "Not Executed", "Blocked",
                    "Pass rate (executed)"])
    per_story: dict[tuple, Counter] = defaultdict(Counter)
    story_of = {c["case_id"]: c["story_id"] for c in cases}
    for tc, envs in latest.items():
        for env, e in envs.items():
            per_story[(story_of.get(tc) or f"E{tc[4:6]}-S{tc[7:9]}", env)][e["status"]] += 1
    for key, cnt in sorted(per_story.items()):
        executed = cnt["Pass"] + cnt["Fail"]
        summary.append([*key, sum(cnt.values()), cnt["Pass"], cnt["Fail"], cnt["Not Executed"], cnt["Blocked"],
                        f"{100 * cnt['Pass'] / executed:.1f}%" if executed else "n/a"])
    for i, w in enumerate([44, 30, 10, 20, 8, 8, 12, 9, 16], start=1):
        summary.column_dimensions[get_column_letter(i)].width = w
    summary.freeze_panes = "A3"

    wb.save(out)
    return (f"{len(case_rows)} cases, {len(trace_rows)} ACs, {len(log_rows)} execution rows "
            f"({len(sub)} from this submission), {len(defects)} defects, {len(mut_rows)} mutation rows")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--results", type=Path, help="Folder with manifest.json and raw results.")
    parser.add_argument("--mutation", type=Path, help="Stryker JSON report.")
    args = parser.parse_args(argv)
    print(build(args.out, args.results, args.mutation))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
