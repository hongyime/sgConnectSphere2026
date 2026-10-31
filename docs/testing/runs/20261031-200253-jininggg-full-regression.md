---
date: 2026-10-31T20:02:53+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 311026
database: mocked
commit: 5f2af33
pr: 391
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E11S01_01 | Backend unit regression after merge resolution | PASS | `npm.cmd test --workspace backend`: 659 passed, one existing skip, zero failures. Includes main's auto Safety Review unit suite. |

Tested tree: HEAD `5f2af33` plus merge of main `44d08267` and the resolved backend test-script union. This is combined working-tree evidence, not an exact clean-head run. No database integration, human manual run or provider delivery is claimed. Backend `npm.cmd run typecheck --workspace backend` passed. Regenerated `docs/testing/tc-coverage.md`; no generated drift remained relative to the auto-merged inventory.
