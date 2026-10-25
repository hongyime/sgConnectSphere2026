---
date: 2026-10-25T13:43:44+08:00
runner: lexinphun2024-debug
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: "241026"
database: none
commit: 86666e4
---

SCRUM-152 / E05-S06 frontend (venue unavailability screens) at `86666e4`.
`npx vitest run --coverage --coverage.reporter=json` from `frontend/`, on
Windows. API replies are stubbed; the server rules are covered by the backend
database records for #348. Coverage of the lines this branch added or changed
was checked against `coverage/coverage-final.json` for each of the 9 changed
source files. The `date` is when the run started.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S06_01 | Marking a venue unavailable with a reason category and note over a free period sends the timed period | PASS | `VenueBlockout.test.tsx` |
| TC_E05S06_02 | A save over a Pending request and a Confirmed booking lists both events, only the Confirmed one Returned to Planning; the Coordinator's flags show category, note, period and earlier status | PASS | `VenueBlockout.test.tsx`, `VenueBookingRequests.test.tsx`, `VenueConflictFlag.test.tsx` |
| TC_E05S06_04 | Leaving the end empty saves an open-ended unavailability, until lifted | PASS | `VenueBlockout.test.tsx` |
| TC_E05S06_05 | Extending flags a newly covered event and shortening again restores it | PASS | `VenueBlockout.test.tsx` |
| TC_E05S06_07 | The history shows the create, the edit and the lift with who, when, and before and after; lifted entries listed as lifted | PASS | `VenueBlockout.test.tsx` |
| TC_E05S06_08 | An event holding the venue with an unexpired tentative hold is listed the same way | PASS | `VenueBlockout.test.tsx` |
| TC_E05S04_01 | Lists current and upcoming blocks, then creates one through the timed form | PASS | |
| TC_E05S04_02 | Superseded by TC_E05S06_02: saving over a confirmed booking succeeds instead of being refused | PASS | |
| TC_E05S04_03 | The success alert shows which affected events had their Coordinator notified | PASS | |
| TC_E05S04_04 | Editing to shorten restores the bookings it no longer covers; lifting removes the block | PASS | |
| MULTIPLE | Full frontend suite | PASS | 571/571 tests in 57 files, zero skipped. Every added or changed line in the 9 changed source files is covered |
