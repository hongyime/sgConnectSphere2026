---
date: 2026-10-02T22:04:23+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: regression
test_case_version: "021026"
commit: db8360d
---

Sprint 2 evidence for E05-S03 (SCRUM-42, venue availability calendar): full `npx playwright test` on Windows
against the Vite dev server, desktop and mobile (Pixel 7) projects, with the
specs' in-browser fake API (no database). 206 passed, 368 skipped
(`test.fixme` specifications), 0 failed. Run by Claude for lexinphun2024-debug.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S03_01 | Verify that opening a venue's calendar for a period with bookings and blocks should show each entry's state, visually distinguishable | PASS | Desktop and mobile |
| TC_E05S03_02 | Verify that a period the Coordinator is not permitted to view should show as unavailable without revealing the other event's details | PASS | Desktop and mobile |
| TC_E05S03_03 | Verify that a venue blocked for maintenance should be visually distinct from a booked period on the calendar | PASS | Desktop and mobile |
| TC_E05S03_04 | Verify that an Event Coordinator should be able to select a date or date range and navigate to different periods on the calendar | PASS | Desktop and mobile |
| TC_E05S03_05 | Verify that for periods the Coordinator is permitted to view, the calendar should show the event name, event, date and time | PASS | Desktop and mobile |
| MULTIPLE | availability calendar loads the selected venue from the API (`tests/e2e/venue.spec.ts`) | PASS | Desktop and mobile; no TC_ID in the test title |
| MULTIPLE | Rest of the Playwright suite | PASS | 206 passed, 368 skipped, 0 failed in total, including the rows above |
