---
date: 2026-10-28T13:30:21+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 261026
database: real
commit: a1f2c54
---

Human browser run by Ji Ning, guided in chat, using the real local frontend/API and isolated native PostgreSQL. Synthetic Event EVT-E10-RECOVERY, 1 March 2027, 09:00-12:00 Singapore time. Screenshots were hand-taken by Ji Ning. PASS rows cover the explicitly described observations, not every canonical precondition or full-story acceptance.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S05_01 | Observed venue-loss flow | PASS | Ji Ning created the safety block on Manual Hall 1. Booking became Conflicting, Event returned to Planning and Coordinator inbox showed the reason and period. Manual Hall 2 remained Confirmed. Equipment/staff retention was not exercised. |
| TC_E10S05_02 | Observed recovery details and search | PASS | Original dates, purpose and headcount 40 were preserved; same-Event search prefilled 1 March 2027 09:00-12:00. Layout/accessibility were empty/default in this fixture; non-default requirement retention remains unverified. |
| TC_E10S05_03 | Replacement retry, lift and explicit cancellation | PASS | Pending replacement left original Conflicting without cancellation control. Rejected attempt remained visible; retry was approved. Lifting the block left original Conflicting. Explicit cancellation released it; replacement was primary/Confirmed and Event remained Planning. |
| TC_E10S05_04 | Observed publication and inbox timing | PASS | Attendee publication stayed Manual Hall 1 and inbox was empty while Pending. After confirmation publication showed Manual Hall 3; one Attendee and Organiser each showed one venue-change notice at 13:20. Organiser also had a separate Planning notice. Inbox message says Event venue changed, without naming the new venue; canonical message-content requirement is not satisfied by that screenshot. |
| TC_E10S05_01 | Canonical equipment/staff retention checks | SKIP | Fixture had no reserved equipment or assigned technical staff. Not claimed by this run. |
| TC_E10S05_02 | Canonical non-default requirements retention | SKIP | Theatre layout and wheelchair-access requirements were not populated in the manual fixture. |
| TC_E10S05_04 | Canonical intercepted email and second Attendee checks | SKIP | No provider relay or intercepted email was run; fixture used one registered Attendee. Inbox/outbox database evidence is separate and is not provider delivery evidence. |

## Screenshots

- [TC_E10S05_01-coordinator-notification](evidence/20261028-133021-jininggg-frontend-e2e/TC_E10S05_01-coordinator-notification.png): human screenshot of the named step.
- [TC_E10S05_01-unavailability](evidence/20261028-133021-jininggg-frontend-e2e/TC_E10S05_01-unavailability.png): human screenshot of the named step.
- [TC_E10S05_02-affected-booking](evidence/20261028-133021-jininggg-frontend-e2e/TC_E10S05_02-affected-booking.png): human screenshot of the named step.
- [TC_E10S05_02-prefilled-search](evidence/20261028-133021-jininggg-frontend-e2e/TC_E10S05_02-prefilled-search.png): human screenshot of the named step.
- [TC_E10S05_02-recovery-details](evidence/20261028-133021-jininggg-frontend-e2e/TC_E10S05_02-recovery-details.png): human screenshot of the named step.
- [TC_E10S05_03-after-lift-before-cancel](evidence/20261028-133021-jininggg-frontend-e2e/TC_E10S05_03-after-lift-before-cancel.png): human screenshot of the named step.
- [TC_E10S05_03-block-lifted](evidence/20261028-133021-jininggg-frontend-e2e/TC_E10S05_03-block-lifted.png): human screenshot of the named step.
- [TC_E10S05_03-final-replacement](evidence/20261028-133021-jininggg-frontend-e2e/TC_E10S05_03-final-replacement.png): human screenshot of the named step.
- [TC_E10S05_03-original-cancelled](evidence/20261028-133021-jininggg-frontend-e2e/TC_E10S05_03-original-cancelled.png): human screenshot of the named step.
- [TC_E10S05_03-original-released](evidence/20261028-133021-jininggg-frontend-e2e/TC_E10S05_03-original-released.png): human screenshot of the named step.
- [TC_E10S05_03-pending-replacement](evidence/20261028-133021-jininggg-frontend-e2e/TC_E10S05_03-pending-replacement.png): human screenshot of the named step.
- [TC_E10S05_03-replacement-confirmed](evidence/20261028-133021-jininggg-frontend-e2e/TC_E10S05_03-replacement-confirmed.png): human screenshot of the named step.
- [TC_E10S05_03-replacement-form](evidence/20261028-133021-jininggg-frontend-e2e/TC_E10S05_03-replacement-form.png): human screenshot of the named step.
- [TC_E10S05_03-replacement-rejected](evidence/20261028-133021-jininggg-frontend-e2e/TC_E10S05_03-replacement-rejected.png): human screenshot of the named step.
- [TC_E10S05_03-retry-available](evidence/20261028-133021-jininggg-frontend-e2e/TC_E10S05_03-retry-available.png): human screenshot of the named step.
- [TC_E10S05_04-after-confirmation](evidence/20261028-133021-jininggg-frontend-e2e/TC_E10S05_04-after-confirmation.png): human screenshot of the named step.
- [TC_E10S05_04-attendee-notification](evidence/20261028-133021-jininggg-frontend-e2e/TC_E10S05_04-attendee-notification.png): human screenshot of the named step.
- [TC_E10S05_04-before-confirmation](evidence/20261028-133021-jininggg-frontend-e2e/TC_E10S05_04-before-confirmation.png): human screenshot of the named step.
- [TC_E10S05_04-no-early-notification](evidence/20261028-133021-jininggg-frontend-e2e/TC_E10S05_04-no-early-notification.png): human screenshot of the named step.
- [TC_E10S05_04-organiser-notification](evidence/20261028-133021-jininggg-frontend-e2e/TC_E10S05_04-organiser-notification.png): human screenshot of the named step.
