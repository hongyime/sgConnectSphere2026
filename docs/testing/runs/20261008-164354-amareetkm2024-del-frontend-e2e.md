---
date: 2026-10-08T16:43:54+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: 031026
database: real
commit: 3ccf2c3
pr: 237
---

`npx playwright test --config playwright.auth.config.ts` on Windows: the whole
real-session suite. Each file starts the API (`backend/src/dev.ts`) against a
fresh random schema in a disposable local PostgreSQL 17 container
(`TEST_DATABASE_URL` on 127.0.0.1, never the application database), and Vite
on 5176. 10/10 passed: five files on desktop Chrome and Pixel 7, including
the new `technicalSupport.spec.ts` journey and #216/#229's equipment files.
Run by Claude for Amareet.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S06_01 | A request is recorded and Technical Support Staff are notified | PASS | Real sign-in as the Coordinator; "3 Technical Support Staff members have been notified."; one open `support_required` row; 3 notifications |
| TC_E07S06_03 | Marking no support needed records it and notifies nobody | PASS | One `support_required = false` row for the gala; 0 notifications |
| TC_E07S07_03 | An overlapping colleague is refused, naming the clashing event | PASS | Tech B on the overlapping Charity Run: "Busy: EVT-SUP-CR Charity Run…"; "Tech B is already assigned to EVT-SUP-CR Charity Run at an overlapping time." |
| TC_E07S07_01 | A free colleague is assigned | PASS | Tech C assigned; the assignment row is `assigned`; the request is `staffed` |
| TC_E07S07_02 | The assignment shows on the technician's schedule | PASS | Tech C's My schedule lists "EVT-SUP-TC Tech Conference" |
| TC_E07S07_04 | Removing an assignment frees the slot | PASS | The row is `released`; the request is back to `open`; "Nobody is assigned yet." |
| TC_E07S07_05 | A replacement goes through the same check | PASS | Tech B is still refused; Tech A is assigned; one assigned row (Tech A) |
| TC_E07S07_06 | Notified when assigned and when removed | PASS | Tech C's notices, in order: "Technical support requested", "Technical support assignment", "Technical support assignment removed" |
| MULTIPLE | Refusals | PASS | A cross-site POST got 403; a Coordinator calling the staffing API got 403 |
| MULTIPLE | Rest of the real-session suite | PASS | equipmentAvailability, equipmentCatalogue, equipmentRequests, loginRecovery and notificationInbox journeys on both viewports |
