---
date: 2026-10-26T18:43:20+08:00
runner: amareetkm2024-del
scope: backend/unit
environment: local
run_type: automated
test_case_version: 261026
database: mocked
commit: a06f9b7
---

Branch `feature/SCRUM-210-SCRUM-211-e09-capacity` (E09-S02, stacked on #327), run by the coding agent on Amareet's behalf on Windows 11 on 26 Oct 2026, on the working tree later committed unchanged as `a06f9b7`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Backend unit suite (`npm test --workspace backend`) and typecheck | PASS | 511/511 passed; `npm run typecheck --workspace backend` (includes `api/`) passed. `c8`: `attendeeRegistration/capacity.ts`, `organiser.ts` and `service.ts` at 100% statements, branches, functions and lines. |
| TC_E09S02_08 | Last place in a Session and the Event is confirmed | PASS | `backend/tests/attendeeRegistration.test.ts`, scripted database. |
| TC_E09S02_09 | Over a Session's capacity stays Pending | PASS | Same file; Pending notice checked. |
| TC_E09S02_10 | Over the Event's capacity stays Pending | PASS | Same file. |
| TC_E09S02_06 | Manual addition within both limits | PASS | `backend/tests/attendeeCapacity.test.ts`. |
| TC_E09S02_07 | Manual addition blocked at either limit | PASS | Same file; nothing inserted. |
| TC_E09S02_11 | Approval only while both limits allow | PASS | Same file. |
| TC_E09S02_12 | Event capacity is the sum of Session layout capacities | PASS | Same file (80 + 40 = 120). |
