---
date: 2026-10-28T14:14:09+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 261026
database: real
commit: d3790e5
---

Ji Ning performed this focused browser follow-up on EVT-E10-MESSAGE using the local frontend/API and isolated native PostgreSQL. The agent prepared the separate fixture; Ji Ning approved its Pending Manual Hall 3 replacement as Venue Staff, then signed in as the registered Attendee and Organiser to inspect the notices. This supplements, without editing, the earlier 13:30 manual record. It is a focused message-content check, not a claim that all canonical manual preconditions were rerun.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S05_04 | Confirmed replacement venue named in Attendee and Organiser notices | PASS | Both hand-taken screenshots show Venue recovery notification follow-up: Event venue changed. New venue: Manual Hall 3. Both notices have the same 14:12 timestamp. Earlier unrelated unread notifications remain; badge totals are not duplicate counts for this Event. Two-Attendee and intercepted email checks are covered separately by the automated full-regression record; no live provider or mailbox receipt is claimed. |

## Screenshots

- [TC_E10S05_04-attendee-named-venue](evidence/20261028-141409-jininggg-frontend-e2e/TC_E10S05_04-attendee-named-venue.png): corrected notice naming Manual Hall 3.
- [TC_E10S05_04-organiser-named-venue](evidence/20261028-141409-jininggg-frontend-e2e/TC_E10S05_04-organiser-named-venue.png): matching corrected notice naming Manual Hall 3.
