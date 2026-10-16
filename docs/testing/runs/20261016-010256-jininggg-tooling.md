---
date: 2026-10-16T01:02:56+08:00
runner: jininggg
scope: tooling
environment: local
run_type: regression
test_case_version: 161026
database: none
commit: b4725b6
---

Documentation review-fix verification for PR #280, on the reviewed baseline plus
uncommitted T-94/T-95/T-96 reference corrections and CAA 161026 exports.
No application, migration, database, Jira or sprint-allocation change is claimed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Canonical/export consistency | PASS | Tooling Python checked 359 unique cases cell by cell against both the regenerated CAA 161026 workbook and refreshed legacy compatibility workbook. No testcase count change from the reviewed PR; five additional IDs relative to original main baseline 7bfec65. |
| MULTIPLE | Decision reference correction | PASS | BDR table decision IDs are unique; withdrawal rows are T-94/T-95/T-96, leaving T-93 reserved for earlier #279. Release/product E06-S03 and the generated BDR retain the corrected references. |
| MULTIPLE | Planning and execution separation | PASS | TC_E06S03_09 to _13 retain their parent story's current Sprint 3 metadata pending PO/Scrum Master scheduling confirmation and remain no-test entries. No delivery, automatic carryover or new sprint commitment inferred. |
| MULTIPLE | Derived documents | PASS | export_backlog_xlsx.py --date 161026, export_testcases_xlsx.py --date 161026, BDR-only generation through export_adr_bdr_docx.py functions and tc_coverage_audit.py completed. Earlier CAA 151026 snapshots and immutable records retained. |
| MULTIPLE | Diff whitespace | PASS | git diff --check passed. |
| MULTIPLE | Repository check | FAIL | python scripts/check.py passed hygiene/env checks; 140 tooling tests retained the existing Windows worktree-fixture 3 failures and 11 errors. No hook bypass. |

No application or manual E2E tests were run for documentation-only corrections.
#268's reported exact-354-case assertion is not on this baseline and no unrelated
test was changed: watch that PR's integration against the actual 359-case input.
The ignored validation script was updated for the corrected IDs, new export date
and original comparison baseline, then all consistency assertions passed.
