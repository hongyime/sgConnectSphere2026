---
date: 2026-10-31T19:12:51+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: "301026"
database: real
commit: 4a35e3b
pr: 392
---

From `backend/`, `npx tsx --test` over `autoSafetyReview.integration.test.ts`,
`e08s04Arrangements.integration.test.ts` and `eventReadiness.integration.test.ts`
at `4a35e3b`, against isolated schemas in the loopback
`connectsphere_notification_test` database (native PostgreSQL 17; no Supabase,
no Docker). 24 passed, 0 failed, 0 cancelled, 0 skipped. Same commit: backend
`npm test` 656 passed, 1 skipped (`repositoryContract.test.ts`, needs
`TEST_DATABASE_URL`); typecheck clean; `python scripts/check.py` passed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E08S04_05 | reconfirming the last booking of a reverted event puts it in Safety Review and tells the Safety Officer | PASS | |
| MULTIPLE | a legacy Confirmed event with no earlier confirmation entry still enters Safety Review once reverted and reconfirmed | PASS | New for Ji Ning's #392 review. With the old check put back (change to Confirmed only) it failed, 7 of 8 in the file; restored before this run. |
| MULTIPLE | remaining E08-S04 auto Safety Review, arrangement and readiness tests | PASS | 22 further tests in the three files. |
