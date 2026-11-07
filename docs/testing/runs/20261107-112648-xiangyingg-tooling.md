---
date: 2026-11-07T11:26:48+08:00
runner: xiangyingg
scope: tooling
environment: local
run_type: automated
test_case_version: 061126
database: none
commit: b0be336
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Repository checks for submission scope correction | PASS | `python scripts/check.py` passed on this commit plus the staged restoration. Repository hygiene and tooling only; no application suites were rerun. |
| MULTIPLE | Documentation guard | PASS | `python scripts/doc_guard.py`: zero errors; existing frontmatter warnings remain. |
| MULTIPLE | Submission restoration and retained-file comparison | PASS | `git diff --exit-code 24095ea4` for submission folders 1, 2 and 4 returned zero differences; comparison with HEAD for system designs and submission README also returned zero differences. Restored bytes are exact; no timestamps were backdated. |
