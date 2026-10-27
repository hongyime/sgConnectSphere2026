---
date: 2026-10-24T16:48:33+08:00
runner: jininggg
scope: frontend/vitest
environment: local
run_type: regression
test_case_version: 171026
database: mocked
commit: b5f5736
pr: 299
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_11 | Suggested replacement updates the booking list | PASS | VenueBookingRequests and VenueBookingForm: 21/21 component tests passed, including submission followed by automatic GET and visible Pending replacement without clicking View or refreshing. Intercepted API, not real database evidence. |

Commands: `npm.cmd exec --workspace frontend -- vitest run src/features/venue/VenueBookingRequests.test.tsx src/features/venue/VenueBookingForm.test.tsx`; frontend typecheck also passed. Tested b5f5736 plus uncommitted frontend refresh fix. Initial sandbox test startup failed with spawn EPERM; rerun outside sandbox passed. No new human rerun claimed.
