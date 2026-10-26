---
date: 2026-10-24T22:00:31+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 241026
database: real
commit: 211d9d1
pr: 347
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E11S01_02 | Effective primary venue change routes old/new affected parties | PASS | bookingSubmission.integration.test.ts: 22/22. New case asserts exactly six inbox/outbox recipient pairs: organiser, deduplicated old/new venue staff, assigned technician, registered and waitlisted attendees. Public names used for attendees. Actor, inactive, withdrawn and unrelated accounts excluded. |
| TC_E11S01_03 | Silence, replay and rollback | PASS | Same real-DB case asserts replay and same-venue booking selection add no notice; Planning/unpublished changes add no public venue notices. Injected outbox failure leaves publication, primary flags, audit and notices unchanged. |
| MULTIPLE | Exact CI booking database selector | PASS | npm.cmd run test:venue-booking-requests:db --workspace backend with isolated loopback TEST_DATABASE_URL: 55/55, zero skipped. |
| MULTIPLE | Backend unit suite, primary coverage and types | PASS | npm.cmd test --workspace backend: 475/475. npx.cmd c8 --include=backend/src/modules/venueBooking/bookingPrimary.ts --reporter=text node --import tsx --test backend/tests/bookingPrimary.test.ts: 7/7, 100% statements/branches/functions/lines. npm.cmd run typecheck --workspace backend passed. |
| MULTIPLE | Initial new unit assertion | FAIL | First run 6/7: scope assertion included the unresolved-assignment subquery as well as resolver SQL. Restricted to the exact resolver SELECT; actual old/new scopes unchanged, final 7/7 passed. |
| MULTIPLE | Repository/inventory checks | FAIL | python scripts/check.py hygiene/env/records pass; existing 163 Windows tooling tests retain 3 failures/11 errors. Inventory regenerated 233/378; diff check passes. |

Tested 211d9d1 plus uncommitted notification-hook integration. The shared capture/notify hook receives before/after venue scopes inside the same primary/publication/audit transaction. No new provider, route, migration or production operation. Existing manual screenshots evidence publication only; they do not prove this new notification caller. Focused human inbox verification remains; queued outbox and these real DB assertions are not actual email receipt.
