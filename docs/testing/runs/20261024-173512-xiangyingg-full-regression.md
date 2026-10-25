---
date: 2026-10-24T17:35:12+08:00
runner: xiangyingg
scope: full-regression
environment: local
run_type: regression
test_case_version: 211026
database: real
commit: 949ab07
pr: 343
---

Tested attendance base949ab07 plus staged merge main9c8a37f. Only conflict resolutions combine existing feature imports, routes, test commands and artifact allowlists; coverage regenerated. No production access or human acceptance claim.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Typechecks and build | PASS | npm run typecheck and npm run build passed. Existing frontend chunk advisory remains. |
| MULTIPLE | Backend unit regression | PASS | npm test --workspace backend:464 passed. |
| MULTIPLE | Frontend regression | PASS | npm test --workspace frontend:526 passed. |
| MULTIPLE | Compiled runtime | PASS | npm run test:runtime:20 passed. |
| MULTIPLE | Attendance/completion real-PostgreSQL acceptance | PASS | npx tsx --test backend/tests/eventAttendance.test.ts backend/tests/eventAttendance.integration.test.ts backend/tests/eventAttendanceRoutes.integration.test.ts backend/tests/eventCompletion.integration.test.ts:11 passed after restarting disposable PostgreSQL. Initial attempt had2 pass/9 fail due ECONNREFUSED while Docker was stopped; no code changes required. |
| MULTIPLE | Repository hygiene and tooling | PASS | python3 scripts/check.py passed. Coverage regenerated at226/376 active cases. |
