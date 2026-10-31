---
date: 2026-10-30T20:19:09+08:00
runner: lexinphun2024-debug
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: "301026"
database: none
commit: cad7bd7
---

From `frontend/`, `npx vitest run --coverage.enabled` at `cad7bd7`: 68 files,
709 tests passed, 0 failed. Changed production file
`src/features/venue/conflictDetection.ts`: 100% statements, branches,
functions and lines.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S06_06 | does not block a flagged request once nothing overlaps it any more | PASS | |
| TC_E06S05_01 | a clash is refused with the server sentence giving the unavailable window | PASS | |
| MULTIPLE | Frontend component suite | PASS | 709/709 |
