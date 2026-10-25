---
date: 2026-10-24T18:31:44+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 211026
database: mocked
commit: f44bb61
pr: 299
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Form and replacement component regression | PASS | npm.cmd exec --workspace frontend -- vitest run src/features/venue/VenueBookingForm.test.tsx src/features/venue/VenueBookingRequests.test.tsx --coverage --coverage.include=src/features/venue/VenueBookingForm.tsx: 21/21 pass. Form coverage 100% statements (55/55), branches (50/50), functions (13/13), lines (31/31). Intercepted APIs; no database/human claim. |
| MULTIPLE | Frontend typecheck | PASS | npm.cmd run typecheck --workspace frontend passed. |
| MULTIPLE | Repository checks | FAIL | python scripts/check.py hygiene/env passed; 163 Windows tooling tests retain 3 failures and 11 errors in existing worktree fixtures. |

Tested f44bb61 plus removal of unused onViewBookings prop and unreachable button branch requested in Le Xin review comment4366750419. Existing link and automatic replacement assertions retained. No product workflow change or manual rerun.
