---
date: 2026-10-18T11:54:30+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 161026
database: real
commit: 3c744d2
---

E11-S01 / SCRUM-75 equipment affected-staff integration at HEAD plus working
changes, including the earlier self-action fix. Unit queries are mocked; database
tests use isolated random schemas in the guarded native loopback test database.
No human E2E, provider delivery or full-story completion is claimed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Initial equipment database attempt | FAIL | 34 tests failed before business assertions: ECONNREFUSED on the previous local port. Windows now excludes ports 55423–55522, so restart on the old port also failed to bind. Restarted the existing disposable PostgreSQL data directory on unreserved loopback port 55422, with temporary test-only configuration; no reset or seed. |
| TC_E11S01_09 TC_E11S01_10 TC_E11S01_11 | Focused unit tests and changed-module coverage | PASS | `npx.cmd c8 --include=backend/src/modules/equipmentSupport/notifications.ts --include=backend/src/modules/equipmentSupport/staffAssignments.ts --reporter=text node --import tsx --test backend/tests/equipmentNotifications.test.ts backend/tests/staffAssignments.test.ts backend/tests/equipmentReservations.test.ts backend/tests/equipmentUnavailability.test.ts backend/tests/equipmentCatalogue.test.ts`: 37 passed; notifications.ts and staffAssignments.ts both 100% statements/branches/functions/lines. |
| MULTIPLE | Standard backend unit suite | PASS | `npm.cmd run test --workspace backend`: 418 passed, zero failures/skips; new helper suite included in the standard command. This does not claim all existing modules have 100% unit coverage; database-backed caller branches are verified below. |
| TC_E11S01_09 TC_E11S01_10 TC_E11S01_11 TC_E11S01_13 | Equipment/staffing database regression | PASS | First successful rerun: 34 passed across equipmentReservations, equipmentUnavailability, equipmentCatalogue and staffAssignments integration suites. New case exercises actual partial/full allocation, quantity changes/no-op, stock and dated shortfalls, and release. Only assigned active technicians/current venue staff receive notices; actor/inactive/ended/unrelated/decision-author users do not. Each staff notice has one email delivery. |
| TC_E11S01_06 TC_E11S01_07 TC_E11S01_09 TC_E11S01_10 TC_E11S01_11 TC_E11S01_13 | Final expanded real-PostgreSQL regression | PASS | `node --env-file=<temporary-local-test-env> --import tsx --test backend/tests/equipmentReservations.integration.test.ts backend/tests/equipmentUnavailability.integration.test.ts backend/tests/equipmentCatalogue.integration.test.ts backend/tests/staffAssignments.integration.test.ts backend/tests/eventNotifications.integration.test.ts backend/tests/notificationInbox.integration.test.ts`: 48 passed, zero skips. Added allocation and shortfall rollback checks; staff-outbox failures leave no reservation/change notice, shortfall period or release/audit changes. Release test removes staff/venue links through a synthetic trigger in the same transaction; captured recipients still receive notices. Existing Coordinator counts, D42 release silence, D53 return-to-service silence, shared routing/inbox and 25-round staffing concurrency remain covered. |
| MULTIPLE | Backend types and inventory | PASS | `npm.cmd run typecheck --workspace backend`; `python scripts/tc_coverage_audit.py` regenerated traceability; `git diff --check` passed before final docs. |

Existing equipment writers now call the shared helper; their successful and
failure branches changed here are exercised through actual PostgreSQL writes.
Focused unit coverage is scoped to the new helper and changed staffing module;
it is not a whole-backend coverage claim. No frontend code, migration, provider
configuration, production roster, website/API server or live mailbox send changed.
Human review/manual testing and remaining owning-workflow integrations remain.
