---
date: 2026-10-12T01:06:22+08:00
runner: Bl0oper
scope: backend/unit
environment: local
run_type: automated
test_case_version: "091026"
database: mocked
commit: f899019
---

SCRUM-55 / E07-S05 gate 1: the whole backend unit suite
(`npm test --workspace backend`), including the new
`tests/equipmentUnavailability.test.ts`. Stubbed queries and pools only; no
PostgreSQL. Run by Claude for Aaron.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Backend unit suite | PASS | 327/327 passed, including the six E07-S05 unit tests (day, quantity and reason rules, Singapore dates, in-service sentences, refusals before any transaction, route dispatch and the item's periods on the detail read) |
