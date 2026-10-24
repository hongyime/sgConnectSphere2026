---
date: 2026-10-22T05:16:33.780+08:00
runner: bryanseah234
scope: backend/db
environment: local
run_type: automated
test_case_version: 171026
database: real
commit: 56d7117
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Task 21 cancellation integration CI selector | PASS | Exact command: `npx tsx --test tests/eventCancellation.integration.test.ts tests/cancellationRecovery.integration.test.ts tests/cancellationRace.integration.test.ts`; 10/10 passed, zero skipped on owned loopback native PostgreSQL 17. Cleanup stopped the owned cluster, released its port and removed its temporary directory. Runtime HEAD was `56d7117`, based on tree `50c97483` with workflow delta `8b52c4a4` still local and unpublished; this is not a live CI result. Earlier helper failures remain preserved in local Task 21 evidence. |

Status when recorded: local and uncommitted. Task 21 receipt is execution-local provenance.
