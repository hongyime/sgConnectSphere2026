---
date: 2026-10-02T22:01:29+08:00
runner: lexinphun2024-debug
scope: backend/unit
environment: local
run_type: regression
test_case_version: "021026"
commit: db8360d
---

Sprint 2 evidence for E05-S03 (SCRUM-42, venue availability calendar):
`npm test --workspace backend`, the whole unit suite on Windows, 259/259
passed. The E05-S03 cases are in `backend/tests/venueCalendar.test.ts`.
TC_E05S03_04 (date range navigation) is a screen behaviour proven in the
frontend records. Run by Claude for lexinphun2024-debug.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S03_01 | Verify that opening a venue's calendar for a period with bookings and blocks should show each entry's state, visually distinguishable | PASS | Each period carries a distinct Free, Tentative, Confirmed or Blocked state |
| TC_E05S03_02 | Verify that a period the Coordinator is not permitted to view should show as unavailable without revealing the other event's details | PASS | Another Coordinator sees the period as Unavailable with no event information |
| TC_E05S03_03 | Verify that a venue blocked for maintenance should be visually distinct from a booked period on the calendar | PASS | Same test as TC_E05S03_01 |
| TC_E05S03_05 | Verify that for periods the Coordinator is permitted to view, the calendar should show the event name, event, date and time | PASS | The assigned Coordinator sees the event name, code, date and time |
| MULTIPLE | Rest of the backend unit suite | PASS | 259/259 passed in total, including the rows above |
