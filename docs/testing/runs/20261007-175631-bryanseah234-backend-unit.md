---
date: 2026-10-07T17:56:31+08:00
runner: bryanseah234
scope: backend/unit
environment: local
run_type: manual
test_case_version: 011026
database: mocked
commit: 88059a5
pr: 231
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S01_01..TC_E05S02_08 | venue catalogue and layout unit scenarios (venueCatalogue.test.ts) | PASS | 21 tests incl. new E05-S05 buffer validation, createVenue persistence/return, updateVenue buffer return |
| TC_E05S04_01..TC_E05S04_04 | maintenance block unit scenarios (venueBlocks.test.ts) | PASS | 11 tests incl. new Scenario 5 SQL-shape test (no occupied_window in block conflict/notification queries) |
| TC_E05S03_01..TC_E05S03_05 | venue calendar unit scenarios (venueCalendar.test.ts) | PASS | 17 tests; booking() stub fixed to include buffered_start/buffered_end (2 pre-existing failures from the branch's earlier calendar change, fixed here) |
| — | remaining backend unit suite | PASS | Full `npm test` file list: 264 tests, 264 pass, 0 fail |

Command: `tsx --test tests/registration.test.ts tests/eventVisibility.test.ts tests/venueCatalogue.test.ts tests/venueAccessibility.test.ts tests/verificationTokens.test.ts tests/eventLifecycle.test.ts tests/coordinatorAssignment.test.ts tests/sessions.test.ts tests/verificationEmail.test.ts tests/deactivation.test.ts tests/venueSearch.test.ts tests/emailTemplate.test.ts tests/eventNotifications.test.ts tests/notificationInbox.test.ts tests/venueCalendar.test.ts tests/venueBlocks.test.ts tests/clarification.test.ts tests/originAllowlist.test.ts tests/decision.test.ts` (the `npm test` script file list), plus `tsc -p backend/tsconfig.json --noEmit` clean.
