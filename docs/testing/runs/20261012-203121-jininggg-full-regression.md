---
date: 2026-10-12T20:31:21+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 091026
database: mocked
commit: 01ad35b
---

E06-S03 / SCRUM-47 foundation on this HEAD plus working-tree changes. No
submission workflow or human manual run is claimed. Real SQL evidence is in
the separate backend/db record from this session. Sandbox spawn/cache failures
were retried with permission; the authorized runs passed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Backend unit suite | PASS | npm test --workspace backend exited 0. Includes new booking request tests and existing venue, auth and notification suites. |
| MULTIPLE | Booking preparation and venue regression coverage | PASS | 38 tests passed using npx c8 --include=backend/src/modules/venueBooking/bookingRequests.ts --include=backend/src/modules/venueBooking/bookingRequestsHandler.ts --reporter=text node --import tsx --test backend/tests/venueBookingRequests.test.ts backend/tests/venueSearch.test.ts backend/tests/venueSuitability.test.ts. Both new modules have 100% statements, branches, functions and lines. |
| TC_E06S03_05 | Booking status and search navigation components | PASS | npm test --workspace frontend -- --run --no-file-parallelism src/features/venue/VenueBookingRequests.test.tsx src/features/venue/VenueSearch.navigation.test.tsx: 10 passed. Assigned-event read path only. |
| MULTIPLE | New frontend module coverage | PASS | 6 tests passed with Vitest --coverage and coverage.include set to VenueBookingRequests.tsx, VenueBookingRequestForm.tsx and venueBookingRequestsApi.ts. coverage-summary.json reported 100% statements, branches, functions and lines for all three. Existing route/dispatch files are not claimed as 100% covered. |
| MULTIPLE | Booking list, search and suitability browser regression | PASS | npx playwright test tests/e2e/venue-booking-requests.spec.ts tests/e2e/venue-search.spec.ts tests/e2e/venue-suitability.spec.ts --workers=1: 18 passed across desktop/mobile. APIs intercepted. New list screenshots inspected for shared cards, typography and responsive layout. Dev-server teardown logged an npm dev termination message; Playwright exited 0. |
| MULTIPLE | Typecheck and build | PASS | npm run typecheck and npm run build passed. Existing Vite chunk-size warning remains. |
| MULTIPLE | Compiled runtime regression | PASS | npm run test:runtime: 15 passed. |
| MULTIPLE | Repository hygiene and tooling | PASS | python scripts/check.py passed, including 87 tooling tests. tc_coverage_audit.py regenerated the inventory. |

No Pending creation, buffered exclusion, hold conversion, Approved-to-Planning
write, audit/outbox persistence or Venue Staff delivery is verified by this run.
