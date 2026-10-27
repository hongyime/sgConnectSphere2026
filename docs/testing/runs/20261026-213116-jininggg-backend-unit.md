---
date: 2026-10-26T21:31:16+08:00
runner: jininggg
scope: backend/unit
environment: local
run_type: regression
test_case_version: 261026
database: mocked
commit: b0145df
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_01 | Backend unit regression | PASS | `npm.cmd test --workspace backend`: 497 tests passed, zero failed. |

## Remarks

Backend and frontend typechecks also passed. Unit coverage of the new SQL orchestration is incomplete: real PostgreSQL tests exercise persistence, primary uniqueness, publication, notification atomicity and cancellation instead of treating mocked SQL as acceptance evidence. This is an explicit coverage gap for review, not a 100% unit-coverage claim. E05-S06 integrated manual evidence remains pending.

The run used the working changes on the recorded HEAD. This is automated evidence, not a human manual acceptance run.
