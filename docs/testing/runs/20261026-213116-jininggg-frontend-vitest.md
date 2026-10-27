---
date: 2026-10-26T21:31:16+08:00
runner: jininggg
scope: frontend/vitest
environment: local
run_type: regression
test_case_version: 261026
database: mocked
commit: b0145df
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S05_02 | Lost-venue recovery context | PASS | Reason, unavailable period, original requirements, same-event source link. |
| TC_E10S05_03 | Explicit cancellation and linked replacement submission | PASS | Five dedicated recovery component tests passed; replacement form preserves original purpose/headcount and posts replaces_booking_id. |
| TC_E06S02_01 | Existing venue frontend regression | PASS | 24 tests passed in the separate Search/Suitability/BookingRequests selection. |

## Remarks

Commands: `node node_modules/vitest/vitest.mjs run --root frontend src/features/venue/LostVenueRecovery.test.tsx --reporter verbose`; existing selection: `src/features/venue/VenueSearch.test.tsx src/features/venue/VenueSuitability.test.tsx src/features/venue/VenueBookingRequests.test.tsx`. API responses are intercepted; this does not prove persistence.

The run used the working changes on the recorded HEAD. This is automated evidence, not a human manual acceptance run.
