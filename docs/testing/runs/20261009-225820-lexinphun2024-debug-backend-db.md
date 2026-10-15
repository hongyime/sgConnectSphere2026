---
date: 2026-10-09T22:58:20+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: "091026"
database: real
commit: e6f58ea
---

Follow-up to #175 / #132. `npx tsx --test tests/decision.integration.test.ts`
in `backend/` against a disposable local PostgreSQL database
(`TEST_DATABASE_URL`, every migration applied): 17/17 passed. This checks
that the edit endpoint's refusals and editable-field lists still behave on a
real database after the change. Same working tree as commit e6f58ea.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | decision.integration.test.ts (E03-S03 decisions and E03-S07 edit refusals) | PASS | 17/17. Rejected-request edits are still refused, and the editable list is unchanged by a refused edit. |
