---
date: 2026-10-16T17:34:01+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: regression
test_case_version: 161026
database: mocked
commit: 8599ad2
---

Final E06-S03 / SCRUM-47 browser regression on HEAD 8599ad2 plus uncommitted
withdrawal/replacement work and UI fixes. Runner derived from authenticated
GitHub login. APIs are intercepted with synthetic fixtures; no PostgreSQL
business writes. Existing local frontend was reused. No commit/push in this run.

Command: `npx playwright test tests/e2e/venue-booking-submission.spec.ts tests/e2e/venue-booking-requests.spec.ts --workers=1`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_12 | Switch returns to fresh list without same-route stale state | PASS | Extended existing switch regression to click View venue booking requests after submission and observe the Pending card, consumed-source message, closed success form and no repeated switch control. Passed on desktop and mobile. |
| TC_E06S03_08 | Pending withdrawal and suggestion reopening | PASS | Desktop/mobile confirmation, cancellation, Released history and independent Confirmed primary fixture remain correct against intercepted APIs. |
| TC_E06S03_10 | Conflict refresh after staff decision | PASS | Mocked 409 displays refusal and refresh, then Confirmed state without withdrawal action; this is not real staff-decision concurrency. |
| MULTIPLE | Final desktop/mobile booking regression | PASS | 16 passed, zero failures, across the two files. |

Automated browser screenshots remain ignored review artifacts, not T-93 manual
evidence. The human's 24 originals and observations remain in their separate
[manual record](20261016-162300-jininggg-frontend-e2e.md).
