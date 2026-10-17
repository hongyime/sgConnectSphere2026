---
date: 2026-10-16T01:14:35+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 141026
database: real
commit: ef18a96
---

# E07-S01 current-main stock reduction check — completed case

Human manually created a six-unit request and reservation for synthetic event EVT-S01-MANUAL-16OCT on current main ef18a96. Agent prepared the future event using existing seeded users; an accidentally duplicated synthetic Session initially blocked the request, then the unused extra Session was removed. Original event EVT-3001 was unchanged. This fixture correction is not a product defect. No reset/reseed performed. Record timestamp is evidence intake, not an independently verified capture time.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S01_02 | Stock reduction flags reservation and notifies assigned Coordinator | PASS | Setup observed: Reserved confirmation for S01 Manual Microphone 16Oct × 6, event EVT-S01-MANUAL-16OCT, 16 November 2026 09:00–12:00 Singapore time; total stock 10, Reserved pill, Coordinator notified banner. Second human screenshot shows stock reduced to 4, a Reservations need review banner, and EVT-S01-MANUAL-16OCT: 6 units reserved. Banner reports eligible Coordinators notified; Third human screenshot, supplied after following Coordinator A login instructions, shows the read notification Equipment reservation needs review, timestamp 16 October 2026 01:15, identifying EVT-S01-MANUAL-16OCT and S01 Manual Microphone 16Oct, stating Reservations need review; total stock is 4. Recipient-side notification now evidenced. The first screenshot’s notification banner relates to reservation creation; the third screenshot independently evidences the stock-review notification. |
| TC_E07S01_03 | Retire equipment while retaining past reservations | PASS | Human reports retirement succeeded. Screenshot shows S01 Retirement Projector 16Oct marked Retired, quantity 5, and both one-unit history rows for 10 and 11 October 2026, 09:00–12:00. Subsequent human screenshot shows complete availability results for 16 November 2026 09:00–26 November 2026 01:29, excluding S01 Retirement Projector 16Oct. Combined with Retired details and both historical rows, retirement case PASS. Agent prepared synthetic historical fixture; human performed retirement. |

## Screenshots

- [TC_E07S01_02-1](evidence/20261016-011435-xiangyingg-frontend-e2e/TC_E07S01_02-1.png): human-taken reservation confirmation; original supplied PNG copied unchanged under requested name.

- [TC_E07S01_02-2](evidence/20261016-011435-xiangyingg-frontend-e2e/TC_E07S01_02-2.png): human screenshot of stock 4 and review warning for six reserved units; original PNG copied unchanged (195950 bytes).

- [TC_E07S01_02-3](evidence/20261016-011435-xiangyingg-frontend-e2e/TC_E07S01_02-3.png): human screenshot of the opened stock-review notification for the correct event and item, total stock 4; original PNG unchanged (83639 bytes).

- [TC_E07S01_03-3](evidence/20261016-011435-xiangyingg-frontend-e2e/TC_E07S01_03-3.png): retired projector details with both historical reservations retained. Filename supplied by tester; this image shows history retention, not availability exclusion. Original PNG unchanged (160500 bytes).

- [TC_E07S01_03-4](evidence/20261016-011435-xiangyingg-frontend-e2e/TC_E07S01_03-4.png): human availability screenshot excludes the retired projector for 16–26 November 2026; original PNG unchanged (147686 bytes). Also shows microphone stock 4, reserved 6 and free 0.

## Next

TC_E07S01_02 is PASS based on all three human screenshots. TC_E07S01_03 retirement/history and future availability exclusion are evidenced and PASS. Add/edit evidence is preserved separately under application commit 7a3368e; no current-main creation/edit rerun is claimed.
