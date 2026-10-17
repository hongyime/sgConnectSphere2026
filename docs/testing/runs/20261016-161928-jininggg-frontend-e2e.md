---
date: 2026-10-16T16:19:28+08:00
runner: jininggg
scope: frontend/e2e
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

Command: `npx playwright test tests/e2e/venue-booking-submission.spec.ts tests/e2e/venue-booking-requests.spec.ts --workers=1`.
16 tests passed: eight desktop and eight mobile. Browser APIs intercepted with
synthetic fixtures. Screenshots in ignored test-results are automated review
artifacts, not T-93 hand-taken screenshots and not a human manual run. Mobile
withdrawal/retry rendering was visually inspected separately by the agent.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_08 | Confirm withdrawal and preserve other bookings | PASS | Cancel then confirm; Released, success notice, Planning and other Confirmed primary remained visible on both viewports. |
| TC_E06S03_12 | Retry suggestion after withdrawal | PASS | Original rejection and Released row retained; suggested-venue request action returned after reload. |
| TC_E06S03_10 | Racing staff decision conflict | PASS | Mock 409 displayed refresh action; refresh showed Confirmed and no withdrawal control. Real concurrency evidenced only by the separate backend/db record. |
| MULTIPLE | Submission/list/switch responsive browser regression | PASS | 16 passed; real staff service integration, provider receipt and fresh human manual tests remain outstanding. |
