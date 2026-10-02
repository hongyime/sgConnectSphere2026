---
date: 2026-10-02T13:11:42+08:00
runner: amareetkm2024-del
scope: frontend/vitest
environment: local
run_type: regression
test_case_version: 300926
commit: cceac38
pr: 179
---

`npx vitest run --no-file-parallelism` in `frontend/` on Windows. Run serially
because the parallel run hits 5 s timeouts on this machine. Run by Claude for
Amareet.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Frontend component suite | PASS | 24/24 files, 185/185 tests passed |
