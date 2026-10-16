---
date: 2026-10-16T17:33:30+08:00
runner: lexinphun2024-debug
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: "161026"
database: none
commit: 415d17e
pr: 292
---

SCRUM-176 / E03-S11. Links the existing edit-form tests to TC_E03S11_01, _02,
_03 and _05, adding the empty-setup and locked-setup checks. Run on the
working tree at 415d17e; the test changes are committed straight after this
record. Start time is to the nearest minute.
`npx vitest run` in `frontend/`: 44 files, 410/410 passed. `npm run typecheck`: no errors.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E03S11_01 | registration setup is sent like the other text fields | PASS | `EventEditForm.test.tsx`: the trimmed value is in the patch. |
| TC_E03S11_02 | clearing a recorded registration setup is refused before anything is sent | PASS | Error "Registration setup can't be left empty."; field left out of the patch. |
| TC_E03S11_03 | a locked registration setup is read-only and explains how to request a change | PASS | Read-only, value kept, described by the restricted-after-approval note. |
| TC_E03S11_05 | the Organiser can fill in registration setup, shown with the two labelled dates under Registration | PASS | "Registration opens" and "Registration closes" are separate labelled fields in the Registration section, with no nested fieldset. Phone width is covered by the manual run `20261016-143425-lexinphun2024-debug-frontend-e2e.md`. |
| MULTIPLE | full frontend suite | PASS | 410/410; no regressions. |
