---
date: 2026-10-31T18:00:27+08:00
runner: lexinphun2024-debug
environment: local
run_type: automated
test_case_version: "311026"
scope: frontend/e2e
database: mocked
commit: d0ddd36
---

From the repository root, `npx playwright test` (scaffold mode, mocked API,
desktop and mobile) at `d0ddd36`: 672 tests, 430 passed, 240 skipped (`fixme`
scaffolds), 2 failed. Both failures passed on an immediate rerun (4/4): the
desktop TC_E08S04_03 stopped at `page.goto` with `net::ERR_NETWORK_IO_SUSPENDED`
before any assertion, and the desktop TC_E05S03_05 (a file this branch does not
touch) did not find its "November 2026" heading within 5 s under full load.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E08S04_01 | TC_E08S04_01 - Verify that reverting a Confirmed event to Planning with a recorded reason should update its status and notify the Organiser with the reason | PASS | desktop and mobile |
| TC_E08S04_02 | TC_E08S04_02 - Verify that reverting a Confirmed event with registered Attendees should notify them that arrangements are being revised | PASS | desktop and mobile |
| TC_E08S04_03 | TC_E08S04_03 - A non-venue arrangement failure should be flagged without automatically reverting the Event | PASS | mobile passed in the full run; desktop hit a network-suspend error at `page.goto`, then passed on rerun |
| TC_E08S04_04 | TC_E08S04_04 - Verify that a reversion from Confirmed to Planning should be recorded in the activity log | PASS | desktop and mobile |
| TC_E08S04_05 | TC_E08S04_05 - A reverted Event should enter Safety Review automatically after all arrangements are reconfirmed | PASS | desktop and mobile |
| MULTIPLE | Remaining Playwright suite | PASS | 430 passed in the full run; TC_E05S03_05 desktop timed out once and passed on rerun |
