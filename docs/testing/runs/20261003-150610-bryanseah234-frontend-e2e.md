---
date: 2026-10-03T15:06:10+08:00
runner: bryanseah234
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 031026
database: mocked
commit: dbfb642
pr: 185
---

Review follow-up on PR #185, same working tree as the vitest record above. Command:

    npx playwright test tests/e2e/e05.spec.ts --grep TC_E05S04 --workers=1

8/8 passed (4 cases x desktop and mobile projects), exit 0. Routes are intercepted with page.route; no database. Also run: npm run build (PASS, existing chunk-size warning) and npx tsc -p frontend --noEmit (PASS).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S04_01 | Verify that blocking a venue for a period with no bookings should make it unavailable for those dates | PASS | desktop + mobile |
| TC_E05S04_02 | Verify that attempting to block a venue over a period with a confirmed booking should warn of the conflict before the block takes effect | PASS | desktop + mobile |
| TC_E05S04_03 | Verify that creating a block over an upcoming event's dates should notify the affected Coordinators | PASS | desktop + mobile |
| TC_E05S04_04 | Verify that removing or shortening an existing block should restore the venue's availability for the released period | PASS | desktop + mobile |
