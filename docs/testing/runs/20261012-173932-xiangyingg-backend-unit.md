---
date: 2026-10-12T17:39:32+08:00
runner: xiangyingg
scope: backend/unit
environment: local
run_type: regression
test_case_version: 091026
database: mocked
commit: 4413fbe
pr: 231
---

Run on the conflict-resolved working tree combining PR head 4413fbe with main 01ad35b, before the merge commit.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Combined backend unit suite after main integration | PASS | `npm test --workspace backend`; exit 0. Both main's venue suitability unit test and PR buffer integration script entry retained. This run does not execute PostgreSQL integration tests. |
