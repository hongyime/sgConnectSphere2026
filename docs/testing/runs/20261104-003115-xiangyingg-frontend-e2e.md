---
date: 2026-11-04T00:31:15+08:00
runner: xiangyingg
scope: frontend/e2e
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
| MULTIPLE | First browser acceptance attempt | FAIL | 4 failed: the test expected the existing success message to use alert rather than status. UI correctly saved the Session. |
| MULTIPLE | Second browser attempt | FAIL | 2 passed, 2 fixture setup failures: a reused organisation name violated its unique constraint. Corrected to unique synthetic names. |
| TC_E02S07_01 / TC_E02S07_05 | Final real browser correction and submission | PASS | TEST_DATABASE_URL=<isolated native loopback PostgreSQL> npm run test:e2e:auth -- tests/auth-e2e/eventDateHorizon.spec.ts: 4 passed on desktop/mobile. Real sign-in, frontend/API/PostgreSQL; no response interception. Refusal, unchanged draft, correction, reload and submission verified. Automated browser execution is not a human run or hand-taken screenshot evidence. |
