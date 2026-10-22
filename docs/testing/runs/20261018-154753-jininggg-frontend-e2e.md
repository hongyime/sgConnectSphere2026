---
date: 2026-10-18T15:47:53+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 161026
database: real
commit: 3c744d2
---

Ji Ning's human browser walkthrough, observed through the screenshots supplied
in chat. Runtime: HEAD plus uncommitted E11 equipment/staffing integration,
before the subsequent UI fixes. Agent prepared a fresh disposable native local
database with synthetic accounts, Planning event EVT-E11-MANUAL, one responsible
Venue Staff account, a support request and four requested microphones out of ten
in stock. The human performed assignments, reservations, stock edit, sign-ins
and inbox interactions. No workflow outcomes were pre-seeded as passing tests.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E11S01_11 | Self-assignment/removal do not notify the actor | PASS | Tech A assigned and removed themselves; staffing changed and actor inbox stayed empty. See 11-01 through 11-04. |
| TC_E11S01_11 | Self-action acknowledgement wording | FAIL | Both success banners claimed "has been notified" despite correctly suppressed self-notices. Original screenshots retained; later code fix is not a human retest. |
| TC_E11S01_11 | Colleague assignment/removal notification | PASS | Tech A assigned/removed Tech B. Tech B received one notice for each action; removal was newest, older assignment stayed Read. See 11-05 through 11-08. Tech B was assigned again before equipment checks. |
| TC_E11S01_06 | Newest-first and unread distinction | PASS | Human screens show new unread removal/equipment notices above older notices, read/unread styles and counts. No claim of testing pagination or more than 100 messages. |
| TC_E11S01_07 | Persistent read state | PASS | Mark as read updated the card and inbox heading; after F5 the same notice stayed Read. See 07-03. |
| TC_E11S01_07 | Bell count updates without F5 | FAIL | Bell retained 1 after the inbox/card became Read; F5 cleared it. See 07-02 and 07-03. Later code fix still needs focused human retest. |
| TC_E11S01_10 | Equipment allocation/change/release reach affected staff | PASS | Human reserved 2 of 4, changed to 4, saved unchanged 4, then released. Tech B and Venue A each received partial/change/release notices; unchanged save left Venue A at two notices. See 10-01 through 10-10. |
| TC_E11S01_11 TC_E11S01_13 | Actor and unrelated staff stay silent | PASS | Tech A's inbox remained empty after equipment actions; unrelated technician inbox empty before and after. See 11-09, 13-01 and 13-02. |
| TC_E11S01_10 | Equipment operational shortfall | PASS | Human reserved 4 again, then reduced total stock from 10 to 3. Reservation flagged for review; Tech B and Venue A received needs-review notices, newest above the re-reservation notice. See 10-11 through 10-13. This tested catalogue stock shortfall, not the separate dated-unavailability UI. |
| TC_E11S01_11 | Discoverable staffing confirmation | FAIL | Human initially reported Assign appeared unresponsive; confirmation was above the colleague list and outside their viewport. They scrolled up and confirmed successfully. Report observed in chat; screenshots show successful results, not the off-screen viewport itself. |
| TC_E11S01_01 | Notification detail discoverability | FAIL | Cards initially showed generic titles/dates without event/change detail; details required expanding the title. No claim the server lost message payloads. Follow-up makes details visible immediately; human retest pending. |
| TC_E11S01_05 | Actual email mailbox receipt | SKIP | Local run used inbox plus outbox infrastructure with provider credentials excluded. No actual email was sent or received; requires separate coordinated verification. |

The earlier self/actor/unrelated checks and source/database regressions do not
establish every negative recipient after the final stock edit. Same-transaction
pre-release link removal and outbox failure rollback were automated database
tests, not human browser actions in this run. Coordinator delivery/counts were
not manually inspected beyond UI acknowledgements. Do not mark all E11-S01 Done.

## Screenshots

Original human PNGs are stored under
`evidence/20261018-154753-jininggg-frontend-e2e/`. All 26 originals are retained,
each below 1000 KB. They depict the pre-fix runtime; never replace them with
agent screenshots or overwrite them with retest images.

- [TC_E11S01_07-02-stale-bell-badge.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_07-02-stale-bell-badge.png)
- [TC_E11S01_07-03-read-after-refresh.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_07-03-read-after-refresh.png)
- [TC_E11S01_10-01-partial-reservation.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_10-01-partial-reservation.png)
- [TC_E11S01_10-02-tech-partial-notice.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_10-02-tech-partial-notice.png)
- [TC_E11S01_10-03-venue-partial-notice.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_10-03-venue-partial-notice.png)
- [TC_E11S01_10-04-full-reservation.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_10-04-full-reservation.png)
- [TC_E11S01_10-05-venue-change-notice.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_10-05-venue-change-notice.png)
- [TC_E11S01_10-06-tech-change-notice.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_10-06-tech-change-notice.png)
- [TC_E11S01_10-07-unchanged-no-notice.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_10-07-unchanged-no-notice.png)
- [TC_E11S01_10-08-reservation-released.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_10-08-reservation-released.png)
- [TC_E11S01_10-09-venue-release-notice.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_10-09-venue-release-notice.png)
- [TC_E11S01_10-10-tech-release-notice.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_10-10-tech-release-notice.png)
- [TC_E11S01_10-11-shortfall.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_10-11-shortfall.png)
- [TC_E11S01_10-12-tech-shortfall-notice.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_10-12-tech-shortfall-notice.png)
- [TC_E11S01_10-13-venue-shortfall-notice.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_10-13-venue-shortfall-notice.png)
- [TC_E11S01_11-01-assigned.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_11-01-assigned.png)
- [TC_E11S01_11-02-self-inbox.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_11-02-self-inbox.png)
- [TC_E11S01_11-03-self-removed.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_11-03-self-removed.png)
- [TC_E11S01_11-04-self-removal-inbox.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_11-04-self-removal-inbox.png)
- [TC_E11S01_11-05-colleague-assigned.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_11-05-colleague-assigned.png)
- [TC_E11S01_11-06-colleague-inbox.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_11-06-colleague-inbox.png)
- [TC_E11S01_11-07-colleague-removed.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_11-07-colleague-removed.png)
- [TC_E11S01_11-08-colleague-removal-inbox.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_11-08-colleague-removal-inbox.png)
- [TC_E11S01_11-09-equipment-actor-inbox.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_11-09-equipment-actor-inbox.png)
- [TC_E11S01_13-01-unrelated-inbox.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_13-01-unrelated-inbox.png)
- [TC_E11S01_13-02-unrelated-after-equipment.png](evidence/20261018-154753-jininggg-frontend-e2e/TC_E11S01_13-02-unrelated-after-equipment.png)
