---
date: 2026-10-23T01:30:35+08:00
runner: jininggg
scope: tooling
environment: local
run_type: regression
test_case_version: 171026
database: none
commit: 195375f
pr: 341
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| N/A | Repository check before CI test fix commit | FAIL | python scripts/check.py at195375f plus browser fixture fix: hygiene/env pass;163 tooling tests,3 failures/11 errors in Windows worktree fixtures. Mocked Jira transition output is tooling fixture output, not live mutation. No bypass or full-green claim. |
