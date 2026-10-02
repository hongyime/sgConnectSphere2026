---
date: 2026-10-02T13:50:55+08:00
runner: lexinphun2024-debug
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: "011026"
commit: 397e499
pr: 175
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Frontend component tests | PASS | `npx vitest run`: 184/184 passed, 24 files. Includes the new EventEditForm test that leaves out locked, empty registration dates, and routes.test for the new E10-S01 Coming soon route. Run on 397e499 with the uncommitted review fixes for #175 applied. |
