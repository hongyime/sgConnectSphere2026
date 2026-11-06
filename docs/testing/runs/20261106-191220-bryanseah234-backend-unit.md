---
date: 2026-11-06T19:12:20+08:00
runner: bryanseah234
scope: backend/unit
environment: local
run_type: regression
test_case_version: 051126
database: mocked
commit: c344848
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E03S09_01 | Lead reassignment is immediate, audited, and notifies affected users | PASS | `npm test --workspace backend`: 723 passed, 1 skipped; focused Lead tests passed 6/6. |
| TC_E03S09_03 | Non-Leads are refused from direct reassignment and the refusal is audited | PASS | `backend/tests/leadReassignment.test.ts` verifies 403 and the Access Denied audit write. |
