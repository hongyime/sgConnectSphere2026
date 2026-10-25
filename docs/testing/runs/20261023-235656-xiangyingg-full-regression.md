---
date: 2026-10-23T23:56:56+08:00
runner: xiangyingg
scope: full-regression
environment: local
run_type: regression
test_case_version: 211026
database: real
commit: eccb039
pr: 324
---

Base eccb039 plus resolved merge of main38ffa99 and controlled-boundary helper. Pure unit/component checks use mocks; lifecycle DB tests and helper use disposable real PostgreSQL schemas. Initial DB attempts failed with ECONNREFUSED because Docker was stopped; all DB checks below rerun after starting the existing disposable container. No production database write or human screenshot PASS claimed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Completion and cancellation coexist after merge | PASS | TEST_DATABASE_URL set to disposable loopback DB; npx tsx --test backend/tests/eventCompletion.test.ts backend/tests/eventCompletion.integration.test.ts backend/tests/eventCancellation.test.ts backend/tests/eventCancellation.integration.test.ts: 16 passed. Both runtime branches and CI/package commands retained. |
| MULTIPLE | Backend unit regression | PASS | npm test --workspace backend: 426 passed. |
| MULTIPLE | Frontend component regression | PASS | npm test --workspace frontend: 52 files, 471 passed. |
| MULTIPLE | Forced frontend and backend typechecks | PASS | npm run typecheck --workspace frontend -- --force and npm run typecheck --workspace backend passed. Forced rebuild avoids shared incremental metadata. |
| MULTIPLE | Compiled API runtime regression | PASS | npm run test:runtime: 20 passed. |
| TC_E08S05_06 | Controlled boundary helper developer smoke | PASS | Automated piped before/at/quit input to scripts/manual_completion_boundary.ts in a random schema. At 2026-11-02T16:59:59+08:00 observed confirmed, zero completions and empty completion activity; at 17:00:00+08:00 observed completed, one completion and actual System confirmed-to-completed row. This is automated helper validation, not human acceptance. |
| MULTIPLE | Human TC06 acceptance | SKIP | Operator must manually run before/at commands and supply original screenshots. Old #325 SKIP record remains unchanged. |
