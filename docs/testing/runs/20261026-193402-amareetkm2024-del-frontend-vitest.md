---
date: 2026-10-26T19:34:02+08:00
runner: amareetkm2024-del
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: 261026
database: mocked
commit: b1220d0
---

Branch `feature/SCRUM-213-e09-registration-period` (E09-S03, stacked on #353), run by the coding agent on Amareet's behalf on Windows 11 on 26 Oct 2026, on the tree committed as `b1220d0`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Full Vitest suite (`npx vitest run --no-file-parallelism` in `frontend`) | PASS | 58 files, 571/571 passed. `RegistrationPeriod.tsx`, `EventRegistrations.tsx` and `registrationsApi.ts` at 100% statements, branches, functions and lines. |
| TC_E09S03_01 | Set the window and see it as current | PASS | `RegistrationPeriod.test.tsx`. |
| TC_E09S03_02 | Set the withdrawal deadline | PASS | Same file. |
| TC_E09S03_05 | Warning, then Save anyway | PASS | Same file. |
| TC_E09S03_06 | Waiting-list switch saved | PASS | Same file. |
