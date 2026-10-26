---
date: 2026-10-24T22:25:58+08:00
runner: lexinphun2024-debug
scope: runtime
environment: local
run_type: automated
test_case_version: "241026"
database: none
commit: 0203699
---

SCRUM-152 / E05-S06: `npm run test:runtime` from the repository root, on
Windows, after adding the block history and lifted-list GET routes to
`api/venues/index.ts`. The suite compiles the backend fresh and calls the
handlers without a database. The `date` is when the run started.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | compiled venue block history and lifted list require a signed-in actor (E05-S06, T-91) | PASS | New test; both GET routes return 401 before any database access |
| MULTIPLE | rest of the runtime suite | PASS | 23/23, zero skipped |
