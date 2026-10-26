---
date: 2026-10-24T22:07:41+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 241026
database: real
commit: 4d5da03
pr: 347
---

Ji Ning performed the browser actions against the actual local frontend/API and isolated native PostgreSQL fixture EVT-PRIMARY-MANUAL. The agent restarted only the owned API with implementation4d5da03 before this run, retaining the earlier fixture data. Human changed primary from Hall2 to Hall1 as Coordinator, then opened Attendee and Coordinator inboxes. The agent transcribed the observations and retained the two human-supplied PNG originals without modification. Timestamp is the observed notification change time; this record was prepared after the human supplied the images.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E11S01_02 | Registered attendee receives effective primary venue-change notice | PASS | Attendee inbox displayed one unread Event update: Primary venue manual test: Event venue changed, with changed-at2026-10-24T14:07:41.236Z and24October2026 22:07 display time. Public event name shown. Human supplied screenshot1. |
| TC_E11S01_03 | Acting Coordinator is excluded from own venue-change notification | PASS | After signing back in as the Coordinator who selected Hall1, notifications page displayed No notifications yet, with no unread count. Human supplied screenshot2. This proves actor self-suppression in this fixture, not every unrelated-role boundary. |

## Screenshots

- [Attendee venue-change notice](evidence/20261024-220741-jininggg-frontend-e2e/TC_E11S01_02_primary-change-attendee-notification.png)
- [Coordinator actor excluded](evidence/20261024-220741-jininggg-frontend-e2e/TC_E11S01_03_primary-change-actor-excluded.png)

This focused inbox run supplements the earlier publication manual record20261024-212800. Old/new staff, technician, organiser, waitlist, inactive/withdrawn/unrelated exclusions, deduplication and transaction rollback have separately recorded automated database evidence, not human screenshots here. No actual mailbox receipt, provider delivery, production roster, or whole-story Done acceptance claimed. No agent-generated screenshots used.
