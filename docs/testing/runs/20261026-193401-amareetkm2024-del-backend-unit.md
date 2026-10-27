---
date: 2026-10-26T19:34:01+08:00
runner: amareetkm2024-del
scope: backend/unit
environment: local
run_type: automated
test_case_version: 261026
database: mocked
commit: b1220d0
---

Branch `feature/SCRUM-213-e09-registration-period` (E09-S03, stacked on #353), run by the coding agent on Amareet's behalf on Windows 11 on 26 Oct 2026, on the tree committed as `b1220d0`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Backend unit suite (`npm test --workspace backend`) and typecheck | PASS | 515/515 passed; `npm run typecheck --workspace backend` passed. The changed lines in `eventVisibility/service.ts` are covered; `attendeeRegistration/organiser.ts` is at 100%. |
| TC_E09S03_01 | Organiser sets the opening and closing dates after approval | PASS | `backend/tests/eventVisibility.test.ts`. |
| TC_E09S03_02 | Organiser sets a withdrawal deadline | PASS | Same file; clearing with null and invalid values also checked. |
| TC_E09S03_05 | Closing after the event starts needs confirming | PASS | Same file; 428 without `confirmLateClose`, saved with it, closing exactly at the start allowed. |
| TC_E09S03_06 | Organiser enables the waiting list | PASS | Same file. |
