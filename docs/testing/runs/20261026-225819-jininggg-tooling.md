---
date: 2026-10-26T22:58:19+08:00
runner: jininggg
scope: tooling
environment: local
run_type: regression
test_case_version: 261026
database: none
commit: 5550ac5
pr: 356
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| N/A | Backlog export and workbook comparison | PASS | Export produced 64 Release 1 stories and 84 product stories. Exactly four cells differ from the original baseline: E10-S05 rationale and points (3 to 5) in each sheet. Sheet names, dimensions, cell styles and column widths are preserved. Both proposed point cells are 5. |
| N/A | Repository checks | FAIL | `python scripts/check.py`: hygiene, secret scan, record validation and environment-template checks passed. The 163 tooling tests had 3 failures and 11 errors in Windows worktree fixtures and path handling. |

## Formatting clarification for the earlier record

The immutable record [20261026-214133-jininggg-tooling.md](20261026-214133-jininggg-tooling.md) contains compressed spacing. Its readable wording is: the export produced **64 Release 1 stories and 84 product stories**; the estimate changed **from 3 to 5** in the proposed workbook; **163 tooling tests** had **3 failures and 11 errors**; Jira was read back **as 5** at that earlier time. Its recorded outcomes, date and commit remain unchanged. This clarification does not claim those older checks were rerun on their original commit.

## Current reconciliation

On 26 October, following Le Xin's review and Ji Ning's instruction, Jira SCRUM-74 was restored from 5 to **3** and read back as 3, with status In Progress. PR #356 continues to propose 5. Reconcile Jira to 5 only after that backlog PR merges. Team/PO confirmation of the T-73 estimation basis remains pending; no agreement or story completion is claimed.

Fresh verification above used working changes on the recorded HEAD. The workbook was regenerated using `.venv-tools/Scripts/python.exe scripts/export_backlog_xlsx.py`. Application tests were not rerun for this documentation-only correction. Linux CI must establish the new-head repository result.
