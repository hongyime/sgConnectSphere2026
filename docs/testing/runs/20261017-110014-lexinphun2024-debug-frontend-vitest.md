---
date: 2026-10-17T11:00:14+08:00
runner: lexinphun2024-debug
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: "161026"
database: none
commit: d87081d
---

SCRUM-196 / E03-S12. The Organiser's saved-edit confirmation now uses the
shared success Alert. Run on the working tree at d87081d; the change is
committed straight after this record. `ClientEvents.saveAlert.test.tsx` was
also run with the `ClientEvents.tsx` change reverted: TC_E03S12_01 failed and
the other four passed, as expected for regression guards.
`npx vitest run --coverage` in `frontend/`: 45 files, 415/415 passed; the two
changed lines of `ClientEvents.tsx` (import and Alert render) are covered.
`npx tsc --noEmit -p .` in `frontend/`: no errors.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E03S12_01 | a saved edit is confirmed in the shared success Alert, not plain text | PASS | Saved text is inside `.ui-alert-success` with role="status"; no plain `p[role="status"]`. |
| TC_E03S12_02 | the saved value survives a reload, and the confirmation causes no second write | PASS | New title shown after re-render; no Alert after reload; exactly one PATCH. Stubbed API; audit rows not inspected here. |
| TC_E03S12_03 | an invalid edit keeps its validation feedback and shows no success | PASS | Empty title: "Fix the highlighted fields, then save again.", field aria-invalid, no PATCH, no success Alert. |
| TC_E03S12_04 | a failed save after a success leaves no stale or false confirmation | PASS | Second save returns 500: error alert shown, success Alert gone, title stays "First change". |
| TC_E03S12_05 | cancelling an approved event's edit confirms nothing, and restricted fields still route to a change request | PASS | Start is read-only with "Request a change" link; Cancel closes the form with no PATCH and no success Alert. |
| MULTIPLE | full frontend suite | PASS | 415/415; no regressions. |
