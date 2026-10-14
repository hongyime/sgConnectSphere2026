---
date: 2026-10-11T23:19:59+08:00
runner: amareetkm2024-del
scope: backend/unit
environment: local
run_type: automated
test_case_version: 091026
database: mocked
commit: a6a76ce
pr: 245
---

E06-S05 holds after Bryan's PO review: expiry judged at database time after
the row locks, release refuses a passed hold, extend locks the venue first.
Runs on Windows against a scripted fake database, on `a6a76ce`. Run by Claude
for Amareet.

1. `npx c8 --include src/modules/venueBooking/holds.ts --include
   src/modules/venueBooking/holdsHandler.ts tsx --test tests/venueHolds.test.ts`
   in `backend/`: 25/25 passed; 100% statements, branches, functions and lines.
2. The full backend unit list (`scripts.test` in `backend/package.json`):
   346/346 passed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S05_04 | Convert is refused when the database clock read after the lock is past expiry | PASS | Clock read after the hold lock (call order asserted) |
| TC_E06S05_07 | Extend locks the venue before the hold and is refused past expiry | PASS | Venue lock precedes hold lock |
| TC_E06S05_05 | Release of a passed hold is refused; the expiry job uses the database clock by default | PASS | Left for the job so the notice is sent |
| MULTIPLE | Rest of venueHolds.test.ts | PASS | 25/25 in total |
| MULTIPLE | Full backend unit suite | PASS | 346/346 |
