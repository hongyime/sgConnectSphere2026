---
date: 2026-10-24T21:28:00+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 241026
database: real
commit: 60bdc65
pr: 347
---

Ji Ning drove the browser and supplied the three original screenshots below through chat, then moved the PNG originals into the evidence directory. Agent transcribed only the observed results. Actual local API/frontend ran the clean implementation at60bdc65 against a fresh isolated native PostgreSQL database. Event EVT-PRIMARY-MANUAL had two synthetic Confirmed bookings and a registered Attendee; Hall1 was primary and initial publication was prepared by the agent using the real publishEvent service. Fixture creation/publication is setup, not human verification of the publication UI. No shared Supabase/production writes or agent screenshots.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_07 | Attendee sees initial published primary | PASS | Registered Attendee opened My registered events; Primary venue manual test displayed Manual Hall1 at Local test campus, starting09:00 and ending12:00 on1March2027. |
| TC_E06S03_07 | Coordinator selects another Confirmed primary | PASS | Human signed in as Coordinator and selected Hall2. Screenshot shows Manual Hall2 with Confirmed status, Primary venue, purpose Local manual test, headcount40 and1March2027 09:00-12:00 period. |
| TC_E06S03_07 | Attendee publication follows selected primary | PASS | Human returned as Attendee. My registered events showed Manual Hall2 instead of Hall1; name, location, date and09:00-12:00 times remained unchanged. |

This is the focused primary-publication follow-up to #299, not a repeat of every booking acceptance case. It establishes displayed venue after navigation/sign-in, not live push to an already-open attendee page. Publication rollback, missing primary, Planning/unpublished guards and concurrency are separately automated where recorded, not human claims. No email receipt or whole-story DoD acceptance claimed. Earlier connection-refused report occurred before user actions; page and login were reverified before the human run. Original setup publication and subsequent switch ran against two actual Confirmed bookings.

## Screenshots

- [Initial attendee venue](evidence/20261024-212800-jininggg-frontend-e2e/TC_E06S03_07_attendee-primary-before.png)
- [Coordinator selection](evidence/20261024-212800-jininggg-frontend-e2e/TC_E06S03_07_coordinator-primary-switched.png)
- [Updated attendee venue](evidence/20261024-212800-jininggg-frontend-e2e/TC_E06S03_07_attendee-primary-after.png)
