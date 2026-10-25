---
date: 2026-10-24T01:44:01+08:00
runner: xiangyingg
scope: full-regression
environment: local
run_type: regression
test_case_version: 211026
database: real
commit: 82a6cef
pr: 343
---

Tested attendance base 82a6cef with staged merge of main 6ab9f80 and resolved shared dispatch/routes/test scripts. Real PostgreSQL tests use a disposable loopback test database; no production writes. This is automated regression evidence, not human acceptance. Registration-owner contract confirmed separately in #326 issuecomment-6356562188.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Typechecks and build | PASS | npm run typecheck and npm run build passed; existing frontend chunk-size advisory. |
| MULTIPLE | Backend units | PASS | npm test --workspace backend: 429 passed. Sandbox blocked initial test-runner IPC; outside-sandbox rerun passed without code changes. |
| MULTIPLE | Frontend component regression | PASS | npm test --workspace frontend: 492 passed. |
| MULTIPLE | Shared attendance/cancellation/change-request database regressions | PASS | npx tsx --test backend/tests/eventAttendance.test.ts backend/tests/eventAttendance.integration.test.ts backend/tests/eventAttendanceRoutes.integration.test.ts backend/tests/eventCancellation.integration.test.ts backend/tests/changeRequests.integration.test.ts: 28 passed against real disposable PostgreSQL. |
| MULTIPLE | Compiled runtime | PASS | npm run test:runtime: 17 passed. |
| MULTIPLE | Desktop/mobile attendance browsers | PASS | npx playwright test tests/e2e/event-attendance.spec.ts --workers=1 --reporter=list: 4 passed with stubbed attendance API. |
| MULTIPLE | Repository tooling and review HTML | PASS | python3 scripts/check.py: 163 tooling tests and hygiene passed. Coverage generator regenerated 214/376 active cases. Postplan structural check and visual browser inspection passed with no horizontal overflow. |
