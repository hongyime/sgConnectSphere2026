---
date: 2026-10-17T21:03:48+08:00
runner: jininggg
scope: backend/db
environment: local
run_type: regression
test_case_version: 161026
database: real
commit: aea9fad
---

E06-S03 / SCRUM-47 migration0020 split from application PR299. Actual test
checkout was application HEAD aea9fad plus merge of main c44c6af, not this
migration-only branch. Runner is the authenticated GitHub identity for Ji Ning.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_12 | Populated0019 replacement-index upgrade to0020 | PASS | node --import tsx --test --test-name-pattern="upgrading the existing replacement index" backend/tests/bookingSubmission.integration.test.ts:1 test passed,0 skipped on guarded native loopback disposable PostgreSQL with isolated schema. Retains Released history and enforces non-Released replacement uniqueness. |

The migration-only checkout's SQL bytes match the reviewed application-branch
file: SHA256 A1495C910FECCF17A26A16B2AFF94AE8242CD14A666E378C32F53C8E40D2B068.
No production connection, SQL application, ledger inspection or verification.
This is local migration evidence only, not permission to queue dependent code.
