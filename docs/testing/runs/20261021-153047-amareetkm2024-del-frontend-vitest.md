---
date: 2026-10-21T15:30:47+08:00
runner: amareetkm2024-del
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: 171026
database: mocked
commit: daedab4
---

Branch `feature/SCRUM-208-e09-registration-frontend` (E09-S01 frontend, stacked on #326), uncommitted changes on base `daedab4`, run by the coding agent on Amareet's behalf on Windows 11.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Frontend component suite (`npm test --workspace frontend`) | PASS | 452/452 tests in 49 files, including the 16 new tests in `EventRegistration.test.tsx` (stubbed API). |
| TC_E09S01_01 | Two Sessions selected, one registration, confirmation shown | PASS | One POST with both Session ids; confirmation lists both Sessions and focuses the success message. |
| TC_E09S01_03 | Second registration refused, first shown unchanged | PASS | Server 409 with the existing registration switches to the already-registered view. |
| TC_E09S01_04 | Missing contact number named, registration blocked | PASS | "Missing: Contact number" with a Profile link; no POST sent. |
| TC_E09S01_05 | Unconfirmed event refused | PASS | The server's 409 sentence is shown on the event page and the form. |
| TC_E09S01_06 | Primary venue for the Event, own venue per Session | PASS | Event shows Grand Auditorium; Sessions show their own venues. |
| MULTIPLE | Changed-code coverage for `EventRegistration.tsx` and `registrationApi.ts` | PASS | `npx vitest run src/features/attendee/EventRegistration.test.tsx --coverage`: 100% statements, branches, functions and lines; includes a late-response test for the event page. |
