---
date: 2026-10-24T01:12:48+08:00
runner: xiangyingg
scope: full-regression
environment: local
run_type: regression
test_case_version: 211026
database: real
commit: 4c40c14
pr: 324
---

Base 4c40c14 plus resolved merge of newer main6ab9f80 (#341). Clean independent checkout; no deletions from damaged linked checkout staged. Unit/component checks use mocks; lifecycle acceptance uses disposable real PostgreSQL schemas. No new human acceptance or production write.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Completion, cancellation and change requests together | PASS | npx tsx --test on eventCompletion, eventCancellation and changeRequests unit/integration files with disposable loopback TEST_DATABASE_URL:38 passed. All three API dispatch branches and package/CI lists retained. |
| MULTIPLE | Backend regression | PASS | npm test --workspace backend:431 passed. |
| MULTIPLE | Frontend regression | PASS | npm test --workspace frontend:53files,491 passed. |
| MULTIPLE | Forced frontend and backend typing | PASS | Frontend tsc -b --force and backend tsc --noEmit passed. |
| MULTIPLE | Compiled API runtime | PASS | npm run test:runtime:20 passed. Initial compact merge callback initialized DB before auth and caused two anonymous completion guards to return503 rather than401. Restored original sequential authentication before pool access; rerun20/20 passed. No assertion relaxed. |
| MULTIPLE | Human TC06 acceptance | SKIP | Human before/at observations and original screenshots remain required. Controlled helper startup checked on pushed4c40c14; no automated execution counted as human evidence. |
