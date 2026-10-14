---
date: 2026-10-07T00:01:04+08:00
runner: xiangyingg
scope: full-regression
environment: local
run_type: regression
test_case_version: '031026'
database: mocked
commit: 824be17
pr: 216
---

# SCRUM-52 merge conflict regression

Executed against the resolved, uncommitted merge of origin/main `ccb32b6` into
branch HEAD `824be17`. The commit field is HEAD at completion, not a claim that
the merged working tree was already committed. Timestamp records final result
inspection. Backend tests initially encountered sandbox IPC restrictions and
passed after rerunning outside the sandbox.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Backend unit regression | PASS | npm test --workspace backend exited 0. Mocked/unit scope. |
| MULTIPLE | Frontend component regression | PASS | npm test --workspace frontend: 278 tests passed across 33 files. |
| MULTIPLE | Catalogue and equipment-request browser regression | PASS | npx playwright test tests/e2e/equipmentCatalogue.spec.ts tests/e2e/equipmentRequests.spec.ts --reporter=list: 16 passed desktop/mobile with intercepted APIs. |
| MULTIPLE | Application typecheck and build | PASS | npm run typecheck and npm run build exited 0. Build reports a bundle-size warning. |
| MULTIPLE | Fresh real-database/authenticated browser regression | SKIP | No disposable local PostgreSQL service was available; Docker daemon unavailable. No shared database used for regression. CI database evidence remains required. |
