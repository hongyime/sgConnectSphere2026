---
date: 2026-10-31T18:43:32+08:00
runner: Bl0oper
scope: backend/unit
environment: local
run_type: automated
test_case_version: "311026"
database: mocked
commit: ab99f61
---

SCRUM-66 / E09-S04 gate 1: the whole backend unit suite, `npm test
--workspace backend`, on branch `feature/SCRUM-66-waiting-list` at
`ab99f61` (Windows 11, Node 22). Scripted (mocked) database: the real
PostgreSQL behaviour is in the same session's `backend/db` record. The
waiting-list tests are #379's, in `backend/tests/attendeeRegistration.test.ts`
and `backend/tests/deactivation.test.ts`; this branch only added full TC
IDs to two titles. Run by Claude for Aaron, from 18:43:32 to 18:43:48. Root
`npm run typecheck` passed on the same code earlier in the session.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E09S04_01 | joinWaitingList accepts only a full enabled Event and creates one empty Event-level entry (TC_E09S04_01) | PASS | 201 `waitlisted` with no Sessions; locks taken in the order Event, account, registration |
| TC_E09S04_02 | registerForEvent claims a released place by converting the same waitlisted row (TC_E09S04_02, TC_E09S04_03) | PASS | The waitlisted row is updated to `registered`, not a new row; "Registration confirmed" notice says "you've claimed a released place" |
| TC_E09S04_03 | registerForEvent claims a released place by converting the same waitlisted row (TC_E09S04_02, TC_E09S04_03) | PASS | (same test) |
| TC_E09S04_04 | joinWaitingList refuses a disabled list (TC_E09S04_04), an Event with room, and an Event without places | PASS | 409 "This event is not accepting waiting-list entries."; "This event has places available; register directly."; "This event has no places available to wait for." |
| MULTIPLE | Other waiting-list tests: refusals for unavailable Events, closed windows, existing registrations and invalid accounts; races and rollback; a lost place keeps the row waitlisted; claimWaitlist validation; deactivation sends no notice for a waitlisted row or a still-full Event | PASS | 6 tests without a single TC ID |
| MULTIPLE | Rest of the backend unit suite | PASS | 643 passed, 0 failed, 1 skipped (a database contract that needs `TEST_DATABASE_URL`) |
