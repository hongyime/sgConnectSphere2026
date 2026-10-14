---
date: 2026-10-09T20:54:23+08:00
runner: amareetkm2024-del
scope: backend/unit
environment: local
run_type: automated
test_case_version: 091026
database: mocked
commit: cc87ae4
---

E06-S05 tentative holds backend (SCRUM-138). Runs on Windows against a
scripted fake database:

1. `npx c8 --include src/modules/venueBooking/holds.ts --include
   src/modules/venueBooking/holdsHandler.ts tsx --test tests/venueHolds.test.ts`
   in `backend/` (before the commit, same code): 19/19 passed; 100% statements,
   branches, functions and lines for both files.
2. The full backend unit list (`scripts.test` in `backend/package.json`) on
   `cc87ae4`: 339/339 passed.

Three changed lines are SQL inside queries the unit tests never reach (block
notices, venue retire, venue search); they run in the PostgreSQL record
`20261009-205445`. Run by Claude for Amareet.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S05_01 | An overlapping hold, request, booking or block is refused and named | PASS | Tentative, pending and confirmed clashes each named with event and Singapore times; block names its reason; nothing written |
| TC_E06S05_03 | The assigned Coordinator holds a free venue with a 48-hour expiry | PASS | Saved `tentative`, expiry now + 48h, audited; 1 hour and 14 days accepted, just outside each refused |
| TC_E06S05_04 | Submitting the booking request turns a live hold into a pending request | PASS | `pending`, `expires_at` cleared; expired, missing or converted holds refused |
| TC_E06S05_05 | The expiry job marks passed holds expired | PASS | `expires_at <= now` boundary in the query; each audited with no actor |
| TC_E06S05_06 | The Coordinator is told once at expiry | PASS | One notice per hold with a Coordinator, with an email delivery row; no reminder exists |
| TC_E06S05_07 | Venue Staff extend a live hold; old and new expiry logged | PASS | Earlier or equal expiry, over 14 days, or an expired hold refused |
| MULTIPLE | Access rules, id checks, handler routing (venueHolds.test.ts) | PASS | Wrong role or signed out refused and audited |
| MULTIPLE | Full backend unit suite | PASS | 339/339 |
