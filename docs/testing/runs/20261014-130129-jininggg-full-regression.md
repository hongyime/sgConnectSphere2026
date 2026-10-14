---
date: 2026-10-14T13:01:29+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 131026
database: real
commit: 9546159
pr: 256
---

HEAD plus main efd8e3b and Bl0oper review fixes. Database classification applies
only to the PostgreSQL row below; component/browser tests use intercepted APIs.
Unused preparation/form code and its tests were removed, not claimed as delivered.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_05 | Read service and HTTP handler | PASS | node --import tsx --test backend/tests/venueBookingRequests.test.ts: 4 passed. c8 with includes for bookingRequests.ts and bookingRequestsHandler.ts reported 100% statements, branches, functions, lines. |
| TC_E06S03_05 | Read screen and search navigation | PASS | npm test --workspace frontend -- --run --no-file-parallelism src/features/venue/VenueBookingRequests.test.tsx src/features/venue/VenueSearch.navigation.test.tsx: 8 passed, mocked API. |
| TC_E06S03_05 | PostgreSQL ownership, ordering and history | PASS | npm run test:venue-booking-requests:db --workspace backend: 1 passed, no skips. Disposable local Postgres 17; no shared database. Same command now explicitly wired into CI. |
| TC_E06S03_05 | Desktop/mobile status and safe refusal | PASS | npx playwright test tests/e2e/venue-booking-requests.spec.ts --workers=1: 4 passed, intercepted APIs. Screenshots included in postplan. |
| MULTIPLE | Typecheck/build | PASS | npm run typecheck and npm run build passed; existing Vite bundle-size warning. |
| MULTIPLE | Repository checks | PASS | python scripts/check.py passed, 87 tooling tests. Coverage inventory regenerated; no unresolved conflicts; staged whitespace check passed. |
| MULTIPLE | Postplan validation | PASS | python scripts/check_postplan_html.py artifacts/pr-256-review.html passed. Rendered with Playwright and visually inspected; https://2w4js4e1iikd.postplan.dev contains synthetic automated screenshots. |

Human manual testing and final CI are pending. No submission acceptance or
hold-conversion evidence is claimed.
