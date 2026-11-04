---
date: 2026-11-04T18:24:14+08:00
runner: xiangyingg
scope: tooling
environment: local
run_type: automated
test_case_version: 011126
database: none
commit: 6896564
pr: 411
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Repository checks | PASS | `python scripts/check.py` on the PR head plus the working-tree workflow/doc fix. Repository hygiene and tooling only. Initial sandbox attempt stopped at the end-of-file hook due to protected-file permissions; the unrestricted rerun passed. |
| MULTIPLE | Doc sync guard | PASS | `python scripts/doc_guard.py`: 0 errors, 156 existing warnings. |
| MULTIPLE | Deployment condition truth table | PASS | Parsed the workflow YAML and evaluated its actual condition for main push, ready human PR, human draft, ready Dependabot PR and Dependabot draft; all five matched the expected result. |
