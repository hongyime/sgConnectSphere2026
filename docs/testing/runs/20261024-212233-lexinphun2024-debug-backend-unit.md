---
date: 2026-10-24T21:22:33+08:00
runner: lexinphun2024-debug
scope: backend/unit
environment: local
run_type: automated
test_case_version: "241026"
database: mocked
commit: 0a5900e
---

SCRUM-152 / E05-S06 application PR evidence. `npm test --workspace backend`
from the repository root at `0a5900e`, on Windows. The E05-S06 unit tests use
a scripted fake database (docs/contributing/writing-tests.md); the real
database runs are in `20261024-212240-lexinphun2024-debug-backend-db.md`. The
`date` is when the run started.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | `venueUnavailability.test.ts` (11 tests, new) | PASS | One per scenario: create flags bookings and holds, only Confirmed events to Planning, Coordinator-only notices (Scenarios 2-4); open-ended without a note (1, 5); refusals; event-lock retry; edit restore/skip/flag/history (5-7); E05-S04 shorten and remove; lift notices (6, 7); block list; applyEventStatusChange skipNotices |
| MULTIPLE | `venueBlocks.test.ts` validator and create tests (updated) | PASS | validateUnavailabilityInput accepts and refuses each field; create finds affected bookings on advertised times, not buffers (T-80) |
| MULTIPLE | `venueBookingDecisions.test.ts` open-ended block approval (new) | PASS | "from 15 Jan 2027, 12:00 am, until lifted" |
| MULTIPLE | `venueCalendar.test.ts` Conflicting booking entry (new) | PASS | Conflicting state with category inside the Blocked period; other Coordinators see Unavailable |
| MULTIPLE | rest of the backend unit suite | PASS | 479/479. c8: 100% statements, branches, functions and lines for `blocks.ts`, `decisions.ts`, `bookingRequests.ts`, `bookingSubmission.ts`; `calendar.ts`, `holds.ts`, `search.ts` at 100% lines with only branches that predate this change uncovered |
