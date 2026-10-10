---
date: 2026-10-09T21:17:19+08:00
runner: amareetkm2024-del
scope: backend/unit
environment: local
run_type: automated
test_case_version: 091026
database: mocked
commit: 700964f
---

E06-S05 holds after aligning with the shared venue_bookings contract (#244):
contract field names, `convert_hold` by `booking_id` and safe to retry, holds
kept within the event period (T-78). Supersedes `20261009-205423` for the PR's
current code. Runs on Windows against a scripted fake database, on `700964f`:

1. `npx c8 --include src/modules/venueBooking/holds.ts --include
   src/modules/venueBooking/holdsHandler.ts tsx --test tests/venueHolds.test.ts`
   in `backend/`: 22/22 passed; 100% statements, branches, functions and lines.
2. The full backend unit list (`scripts.test` in `backend/package.json`):
   342/342 passed.

Run by Claude for Amareet.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S05_01 | An overlapping hold, request, booking or block is refused and named | PASS | Nothing written on refusal |
| TC_E06S05_03 | The assigned Coordinator holds a free venue with a 48-hour expiry | PASS | Outside the event period refused (T-78, O-29); 1 hour to 14 days enforced |
| TC_E06S05_04 | Submitting the booking request turns a live hold into a pending request | PASS | Found by `booking_id`; a second call returns the same booking with no write or audit; expired, confirmed or missing refused |
| TC_E06S05_05 | The expiry job marks passed holds expired | PASS | `expires_at <= now`; an already-expired hold can't be released or extended |
| TC_E06S05_06 | The Coordinator is told once at expiry | PASS | One notice with an email delivery row; no reminder |
| TC_E06S05_07 | Venue Staff extend a live hold; old and new expiry logged | PASS | Not earlier, not over 14 days, not on an expired hold |
| MULTIPLE | Full backend unit suite | PASS | 342/342 |
