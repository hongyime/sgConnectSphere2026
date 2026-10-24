---
date: 2026-10-16T16:19:27+08:00
runner: jininggg
scope: frontend/vitest
environment: local
run_type: regression
test_case_version: 161026
database: mocked
commit: 8599ad2
---

E06-S03 / SCRUM-47, T-94/T-95/T-96. Tested branch
`feature/e06-s03-pending-withdrawal`: HEAD `8599ad2` plus uncommitted
withdrawal/replacement implementation and tests. The SHA alone does not contain
this work. Runner derived from authenticated GitHub login. Agent-driven tests;
no fresh human manual execution, whole-story Done claim or Jira change.

Command: `npm run test:coverage --workspace frontend -- --run src/features/venue/VenueBookingRequests.test.tsx src/features/venue/VenueBookingForm.test.tsx --no-file-parallelism`.
17 tests passed across two files. VenueBookingRequests.tsx, VenueBookingForm.tsx
and venueBookingRequestsApi.ts each reported 100% lines/statements/functions/
branches. This is focused coverage, not whole-frontend 100% coverage. API calls
are intercepted mocks, not PostgreSQL. Earlier refresh assertion was corrected
to wait for the replacement list rather than a retained stale card.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_08 | Confirm or cancel single Pending withdrawal | PASS | Cancel did not POST; confirmation sent booking_id, refreshed Released, and retained Confirmed card. |
| TC_E06S03_10 | Refusal refresh and duplicate submission | PASS | 409 remained visible with refresh; refreshed status hid withdrawal. Busy controls and duplicate form submission produced only one POST. |
| TC_E06S03_12 | Released replacement leaves suggestion available | PASS | Retained Released history and server's has_replacement=false restored switch action. |
| MULTIPLE | Booking form and list component regression | PASS | All 17 tests passed; no human manual claim. |
