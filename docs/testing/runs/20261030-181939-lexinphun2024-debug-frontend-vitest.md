---
date: 2026-10-30T18:19:39+08:00
runner: lexinphun2024-debug
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: 281026
database: none
commit: 770d24c
---

Command: `npm test --workspace frontend` (Vitest, jsdom, faked API replies) with a clean working
tree at the commit. 66 files, 693 tests, 693 passed, 0 failed. E10-S02 / SCRUM-71,
frontend subtask SCRUM-237, fixes for the PR #380 review (Ji Ning). Every line and
branch changed since c7ef449 in `EventEditForm.tsx`, `eventEditApi.ts` and
`ArrangementReview.tsx` is covered (`npx vitest run --coverage`, compared with the diff).

Before this run, three deliberate breaks of the late-preview guard and four of the
revision binding (confirm without the revision, the refusal ignored, the
nothing-to-review save unbound, the URL without `reviewed`) each failed at least
one of the new tests; the code was restored first.

The three review-focus assertions in `CoordinatorEditing.test.tsx` now wait for
focus. TC_E10S02_03 failed 2 of 12 runs on c7ef449 as well, because focus moves in an
effect after render; with the wait, 0 of 45 strictly counted runs failed, and
removing the focus call still fails the tests.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_03 | A date change shows the affected booking and equipment, and saves only after confirming | PASS | CoordinatorEditing.test.tsx; focus check now waits for focus |
| TC_E10S02_01 | Attendance above capacity names the headcount and places; one flag tells the Venue Staff | PASS | CoordinatorEditing.test.tsx |
| TC_E10S02_04 | Over-subscription warns, removes nobody, and the plain Save still applies the change | PASS | CoordinatorEditing.test.tsx |
| MULTIPLE | A late preview answer does not save (#380 review point 1) | PASS | EventEditForm.test.tsx: no save after the form closes, after switching event, or after a new edit; a normal save still goes through |
| MULTIPLE | The save is bound to the list reviewed (#380 review point 2) | PASS | CoordinatorEditing.test.tsx: confirm sends the shown revision; a 409 arrangements_changed shows Riverside Hall and Garden Hall with a warning and saves nothing, then confirming sends the new revision; the nothing-to-review save is bound too |
| MULTIPLE | Full frontend component suite | PASS | 693/693 |
