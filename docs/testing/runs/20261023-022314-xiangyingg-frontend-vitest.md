---
date: 2026-10-23T02:23:14+08:00
runner: xiangyingg
scope: frontend/vitest
environment: local
run_type: regression
test_case_version: 171026
database: mocked
commit: f78487c
pr: 320
---

Base f78487c plus staged TC_E05S04_01 async assertion correction. Source application unchanged.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S04_01 | Maintenance creation reloads the block list | PASS | Existing assertion now waits for the post-save GET and also checks the created block's returned table cell. Stateful stub reflects successful create. No delay/retry or weakened assertion. |
| MULTIPLE | Targeted venue-blockout component regression | PASS | npm test --workspace frontend -- --run src/features/venue/VenueBlockout.test.tsx: 7 passed. Stubbed API. |
| MULTIPLE | Full frontend regression | PASS | npm test --workspace frontend: 51 files, 463 passed, zero failures. |
| MULTIPLE | Frontend typecheck | PASS | npm run typecheck --workspace frontend passed. No production code changed; changed-product unit coverage N/A. |
