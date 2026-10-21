---
date: 2026-10-18T19:32:00+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 161026
database: real
commit: 3672ae8
---

Publication candidate: current main HEAD plus E11 working changes. Original
human records remain pinned to their actual earlier runtime commit.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Backend unit suite | PASS | `npm.cmd run test --workspace backend`: 418 passed, zero skipped. Mocked boundaries. |
| TC_E11S01_06 TC_E11S01_07 TC_E11S01_09 TC_E11S01_10 TC_E11S01_11 TC_E11S01_13 | Equipment/staffing/routing/inbox database regressions | PASS | `node --env-file=<temporary-loopback-test-env> --import tsx --test backend/tests/equipmentReservations.integration.test.ts backend/tests/equipmentUnavailability.integration.test.ts backend/tests/equipmentCatalogue.integration.test.ts backend/tests/staffAssignments.integration.test.ts backend/tests/eventNotifications.integration.test.ts backend/tests/notificationInbox.integration.test.ts`: 48 passed, zero skips. Fresh isolated schemas with current main migrations including 0020. No shared/production database. |
| MULTIPLE | Initial frontend suite under concurrent load | FAIL | `npm.cmd run test --workspace frontend`: 438 passed / 2 failed. Unchanged RegisterForm.test.tsx: required-fields submission timed out at 5000 ms; following test could not find Create Account while prior submission remained in flight. Other 47 files passed. Not hidden by the later pass. |
| MULTIPLE | Standalone frontend rerun | PASS | Same command rerun without concurrent backend/database load: 440 passed across 48 files. No test assertions, timeout configuration or registration code changed to obtain the pass. |
| MULTIPLE | Frontend/backend type check | PASS | `npm.cmd run typecheck`: both passed. |
| MULTIPLE | PostPlan structure and layout | PASS | `python scripts/check_postplan_html.py artifacts/e11-notification-integration.html`: one inline SVG, passed. Agent browser inspection at 1280/390 widths: no horizontal overflow; desktop/mobile previews inspected. These are review-document checks, not human application E2E. |

Changed helper/staffing and UI coverage is retained in earlier exact-runtime
records with branch gaps disclosed. Human retest is recorded separately with
three original screenshots. No new live email, production roster or complete
E11-S01 acceptance claim. The initial frontend failure remains for reviewer/CI
visibility; final published-head CI is still required.
