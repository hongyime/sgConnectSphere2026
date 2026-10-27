---
date: 2026-10-24T20:40:32+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 241026
database: mocked
commit: c89c4a3
pr: 299
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Merged backend unit suite | PASS | npm.cmd test --workspace backend: 473/473 passed, zero skips. |
| MULTIPLE | Booking and attendance UI regression | PASS | npm.cmd exec --workspace frontend -- vitest run src/features/venue/VenueBookingRequests.test.tsx src/features/coordinator/EventAttendance.test.tsx: 24/24 passed, intercepted APIs. |
| MULTIPLE | Types and selector preservation | PASS | npm.cmd run typecheck passed both workspaces. Verified all tokens from both HEAD/main test, test:db and test:venue-booking-requests:db selectors remain in merged commands. |
| MULTIPLE | Inventory and repository checks | FAIL | Generated inventory 232/378; diff check passed. python scripts/check.py hygiene/env passed, but 163 Windows tooling tests retain 3 failures and 11 errors. |

Tested c89c4a3 plus pending merge main ca64a81. Conflicts .gitignore, backend/package.json and generated inventory resolved by union/regeneration. CoordinatorWorkspace auto-merge retains Venue bookings and attendance action. No new DB/manual rerun or provider claim.
