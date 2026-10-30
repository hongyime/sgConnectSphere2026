---
date: 2026-10-30T13:47:09+08:00
runner: lexinphun2024-debug
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: 281026
database: none
commit: 5fdddca
---

Command: `npm test --workspace frontend` (Vitest, jsdom, faked API replies). 66 files,
686 tests, 686 passed, 0 failed. E10-S02 / SCRUM-71, frontend subtask SCRUM-237.
Changed lines and branches of `ArrangementReview.tsx`, `eventEditApi.ts`,
`EventEditForm.tsx`, `CoordinatorWorkspace.tsx` and `VenueBookingRequests.tsx`
are 100% covered (`npx vitest run … --coverage`).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_01 | Attendance above capacity names the headcount and places; one flag tells the Venue Staff | PASS | CoordinatorEditing.test.tsx |
| TC_E10S02_03 | A date change shows the affected booking and equipment, and saves only after confirming | PASS | CoordinatorEditing.test.tsx |
| TC_E10S02_04 | Over-subscription warns, removes nobody, and the plain Save still applies the change | PASS | CoordinatorEditing.test.tsx |
| TC_E10S02_06 | Equipment alone is reconfirmed by Technical Support Staff only | PASS | ArrangementReview.test.tsx |
| MULTIPLE | Full frontend component suite | PASS | 686/686, including the E10-S02 review step's cancel, refused-preview and refused-save paths and the Needs reconfirmation marker |
