---
date: 2026-11-04T00:31:15+08:00
runner: xiangyingg
scope: backend/db
environment: local
run_type: automated
test_case_version: "021126"
database: real
commit: 267348f
---

Tested 267348f plus the uncommitted SCRUM-180 implementation/test working diff,
not a clean-HEAD-only run. Test title-only metadata changes do not alter these outcomes.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Initial parallel database suites | FAIL | 18 passed, 2 existing Session tests failed during concurrent pg_extension creation. No product assertion failed in the new API cases. Sequential rerun is recorded below. |
| TC_E02S07_01 / TC_E02S07_02 / TC_E02S07_03 / TC_E02S07_04 / TC_E02S07_05 | Final API, Session and lifecycle integration | PASS | TEST_DATABASE_URL=<isolated native loopback PostgreSQL> node --import tsx --test --test-concurrency=1 tests/eventDateHorizon.integration.test.ts tests/eventSessionsRoutes.integration.test.ts tests/eventLifecycle.integration.test.ts: 22 passed, 0 failed. Includes refusal without persistence/history changes, correction/resubmission, boundary/near-term dates, queued Session writers and missing Events. No Supabase, production or Docker execution. |
