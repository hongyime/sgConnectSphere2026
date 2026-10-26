---
date: 2026-10-24T21:26:02+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 241026
database: real
commit: 53b038f
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_07 | Publication/booking real database regressions | PASS | node --env-file=<isolated-loopback-env> --import tsx --test backend/tests/bookingSubmission.integration.test.ts backend/tests/attendeeVisibility.integration.test.ts: 22/22 passed. Two Confirmed bookings publish only primary; attendee sees switched venue; publication failure rolls back flags/audit; Planning/unpublished snapshots protected; no-primary publication refused. |
| MULTIPLE | Exact CI booking selector | PASS | npm.cmd run test:venue-booking-requests:db --workspace backend with temporary isolated TEST_DATABASE_URL: 54/54, zero skips, including actual-service races and attendee publication test. |
| TC_E06S03_07 | Primary unit coverage | PASS | npx.cmd c8 --include=backend/src/modules/venueBooking/bookingPrimary.ts --reporter=text node --import tsx --test backend/tests/bookingPrimary.test.ts: 6/6; 100% statements/branches/functions/lines. Publication SQL behavior verified with actual PostgreSQL, not claimed as unit coverage of the entire attendee module. |
| MULTIPLE | Full backend units/typecheck | PASS | npm.cmd test --workspace backend: 474/474, zero skips. npm.cmd run typecheck --workspace backend passed. |
| MULTIPLE | Initial stopped database | FAIL | First DB attempt returned ECONNREFUSED on old local server, no tests passed. Started fresh isolated native instance and reran successfully above. No shared database touched. |
| MULTIPLE | Repository/inventory checks | FAIL | python scripts/check.py record validation, hygiene and env parity pass; 163 Windows tooling tests retain 3 failures and 11 errors. tc_coverage_audit.py regenerated with no tracked drift; diff check passed. |

Tested 53b038f plus uncommitted primary-publication implementation on fix/e06-primary-publication. Exact SHA alone does not contain the change. No migration, environment-variable addition, live email, production operation, human browser or whole-story acceptance claimed. Existing attendee integration fixture now applies all migrations and explicitly seeds its Confirmed primary booking. Frontend code unchanged.
