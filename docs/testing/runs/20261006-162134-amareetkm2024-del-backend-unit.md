---
date: 2026-10-06T16:21:34+08:00
runner: amareetkm2024-del
scope: backend/unit
environment: local
run_type: automated
test_case_version: 031026
database: mocked
commit: 730e275
pr: 222
---

E07-S06 technical support request backend (SCRUM-145). Two runs in one
sitting on Windows, both against a scripted fake database (no PostgreSQL):

1. `npx c8 --include 'src/modules/equipmentSupport/support*.ts' tsx --test tests/supportRequests.test.ts`
   in `backend/`: 19/19 passed; coverage of the two new files 100% statements
   (223/223), branches (99/99), functions (15/15), lines (223/223). Finished
   16:21:17.
2. The full `npm test --workspace backend` file list via `npx c8` (local
   `c8` is not installed): 283/283 passed.

A mutation check before the run confirmed the tests fail when the rules
break: six deliberate bugs, each caught. The real-PostgreSQL test
(`tests/supportRequests.integration.test.ts`) was not run in this session;
it gets its own `backend/db` record. Run by Claude for Amareet.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S06_01 | Submitting a support request describing the support and times notifies Technical Support Staff and records it against the event | PASS | Unit, mocked database: request written with the Coordinator as requester; both active technicians notified with one change; an event without a code is named by its title; zero technicians still records the request |
| TC_E07S06_02 | Submitting a support request before the venue is confirmed is accepted | PASS | Unit, mocked database: an approved event accepts the request with no venue booking consulted |
| TC_E07S06_03 | Marking an event as needing no technical support creates no request and doesn't block confirmation | PASS | Unit, mocked database: declaration recorded with no notification; idempotent; refused while a live request exists |
| MULTIPLE | Other supportRequests.test.ts cases (validation boundaries, access refusals and audit, status window, handler) | PASS | 16/16 |
| MULTIPLE | Full backend unit suite | PASS | 283/283 |
