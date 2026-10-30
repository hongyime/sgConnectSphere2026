---
date: 2026-10-30T22:00:26+08:00
runner: lexinphun2024-debug
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: "301026"
database: none
commit: 63c100d
pr: 380
---

From `frontend/`, `npx vitest run --coverage.enabled` at `63c100d`, the fix
for Ji Ning's #380 re-review (an edit during the mutating save could start a
second save): 69 files, 728 tests passed, 0 failed. Every line #380 changes in
`src/features/events/EventEditForm.tsx`, including this fix, is covered (lcov
checked against the diff from `main`).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | the fields are read-only and Save sends nothing more until the first save answers | PASS | fails with the previous `EventEditForm.tsx` (two PATCHes) |
| MULTIPLE | confirming the review twice sends one save | PASS | non-regression |
| MULTIPLE | after a refused save the fields can be edited and saved again | PASS | |
| MULTIPLE | Frontend component suite | PASS | 728/728 |
