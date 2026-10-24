---
date: 2026-10-16T16:50:58+08:00
runner: jininggg
scope: frontend/vitest
environment: local
run_type: regression
test_case_version: 161026
database: mocked
commit: 8599ad2
---

E06-S03 / SCRUM-47 manual testing exposed a same-page navigation bug after
submitting a suggested-venue replacement: View venue booking requests linked
to the already-mounted route, leaving the list stale. The form now accepts an
optional callback; the embedded switch form uses a button to close the form
and reload the list. Assessment-page forms retain their navigation link.

Code tested: HEAD 8599ad2 plus uncommitted Pending-withdrawal implementation
and this refresh fix. The SHA alone does not contain these changes. Runner
identity was derived from the authenticated GitHub login in this session.

Command: `npm run test:coverage --workspace frontend -- --run src/features/venue/VenueBookingRequests.test.tsx src/features/venue/VenueBookingForm.test.tsx --no-file-parallelism`.
Final result: 17 passed across two files. Form and booking-list screen retain
100% line and branch coverage. `npm run typecheck` also passed. An initial
regression assertion matched both the suggestion label and card title; it was
corrected to assert the heading before the passing rerun.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_12 | Suggested replacement returns to an updated booking list | PASS | Component test clicks View venue booking requests after success, observes third fetch and replacement card, retains consumed-source message, and removes success form. Mocked API only. |
| MULTIPLE | Booking form and withdrawal component regression | PASS | 17 tests passed; form/list 100% line and branch coverage. |

The human's reported unresponsive control is a manual failure pending retest,
not a manual PASS established by this automated run. Existing human evidence
and prior automated records are unchanged. No database mutation in this run.
