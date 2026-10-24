---
date: 2026-10-16T21:56:06+08:00
runner: jininggg
scope: frontend/vitest
environment: local
run_type: regression
test_case_version: 161026
database: mocked
commit: 8599ad2
---

E06-S03 / SCRUM-47 primary reselection and agreed E06-S04 integration follow-up.
Root branch feature/e06-s03-pending-withdrawal: HEAD 8599ad2 plus uncommitted
work; the SHA alone does not contain this feature. Runner is the authenticated
GitHub login from this session. No commit or push; peer review remains required.

Command: `npm run test:coverage --workspace frontend -- --run src/features/venue/VenueBookingRequests.test.tsx src/features/venue/VenueBookingForm.test.tsx --no-file-parallelism`.
Final run19 passed across two files. Booking list and API reported100% lines,
branches, statements and functions; prior form coverage remains100%. Intercepted
APIs only; this is not the user's hand-driven primary selection acceptance run.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_07 | Primary selection confirmation, cancel and refresh | PASS | Only Confirmed non-primary action; Cancel made no POST; set_primary sent selected ID and refreshed badge onto selected card with both statuses unchanged. |
| TC_E06S03_07 | Busy and stale primary response | PASS | Busy controls blocked duplicate submission;409 remained visible with refresh; refreshed non-Confirmed target offered no selection. |
| MULTIPLE | Booking component regression | PASS | 19 passed, zero failures. |
