---
date: 2026-10-16T21:56:07+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: regression
test_case_version: 161026
database: mocked
commit: 8599ad2
---

E06-S03 / SCRUM-47 primary reselection and agreed E06-S04 integration follow-up.
Root branch feature/e06-s03-pending-withdrawal: HEAD 8599ad2 plus uncommitted
work; the SHA alone does not contain this feature. Runner is the authenticated
GitHub login from this session. No commit or push; peer review remains required.

Command: `npx playwright test tests/e2e/venue-booking-submission.spec.ts tests/e2e/venue-booking-requests.spec.ts --workers=1`.
20 tests passed across desktop/mobile, zero failures. APIs intercepted with
synthetic fixtures. Automated primary-selected screenshot visually inspected
on mobile; it is ignored review output, not a T-93 human screenshot.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_07 | Select another Confirmed primary | PASS | Cancel then confirm; old card regained action, chosen card showed Primary venue, Pending card offered no primary selection, all booking/event statuses retained. Passed desktop/mobile. |
| TC_E06S03_07 | Stale target refusal | PASS | Mocked409 showed explanatory error; refresh showed Released and no primary selection control. Passed desktop/mobile. |
| MULTIPLE | Booking submission/switch/withdrawal/browser regression | PASS | 20 passed; not a real staff workflow or human manual run. |
