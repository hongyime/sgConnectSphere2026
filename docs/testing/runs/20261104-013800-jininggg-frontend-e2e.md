---
date: 2026-11-04T01:38:00+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "021126"
database: real
commit: 607536e
---

Supplemental human check for E10-S01 / SCRUM-70 / SCRUM-204 after merged
#412 and #413. Preserves the earlier partial run in
[20261103-163000-jininggg-frontend-e2e.md](20261103-163000-jininggg-frontend-e2e.md).
No earlier record is edited or retrospectively marked passed.

Latest-main local API/frontend used the preserved disposable native loopback
PostgreSQL schema from the previous run. Application code was unchanged;
unrelated staged historical documentation did not alter the tested application.
The existing review notice was generated during the 3 November reconfirmation
workflow; today the human could read it through the repaired Safety Officer UI.
The record timestamp follows the fresh approval/Organiser notice shown at
01:38 Singapore time, rather than claiming the older notice was generated again.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S01_04 | Supplemental subset: Safety Officer inbox, fresh checklist and new approval after reconfirmation | PASS | Tester signed in as the synthetic Safety Officer and viewed Safety check needed for EVT-E10-SESSION, stating arrangements were confirmed again and a new Operational Safety Check was required. Review showed Safety Review, Event 09:00-13:00, Morning 10:00-11:00, Afternoon 12:00-13:00 and staffed support. All seven checklist factors were initially unanswered. Tester filled them, opened Approve and confirmed; result became Confirmed. After signing out and signing in as Organiser in the same regular browser window, tester received Event confirmed with Event dates and both venues. Using one browser window sequentially did not invalidate role-specific actions. This PASS is limited to this subset, not all expanded TC_04 assertions. |

## Scope and remaining work

The Safety Officer UI blocker documented in #418 is resolved on this combined
tree by Aaron's merged #412/#413. The earlier live Jira ownership check linked
the missing role handling to Bryan's SCRUM-157; that historical blocker is not
an outstanding requirement to wait for Bryan to implement the same fix again.
No Jira ownership/status is changed by this record.

The fixture started in its first Safety Review; no prior Safety Officer decision
was inserted. A blank new checklist and an actual fresh decision were observed,
but preservation of a prior decision is not demonstrated by this fixture.
Structured field/registration variants, other unexecuted TC_04 variants and
refresh/terminal-history assertions listed in the earlier run are not claimed
complete here. Prior automated evidence needs separate review for boundary and
rollback assertions. Mailbox/provider delivery and production roster are outside
this local inbox run. Independent review and PO/delegate acceptance remain open.

## Screenshots

- [TC_E10S01_04-19](evidence/20261104-013800-jininggg-frontend-e2e/TC_E10S01_04-19.png): Safety Officer reads the existing reconfirmation-triggered review notice.
- [TC_E10S01_04-20](evidence/20261104-013800-jininggg-frontend-e2e/TC_E10S01_04-20.png): Safety Review details with Morning and Afternoon times.
- [TC_E10S01_04-21](evidence/20261104-013800-jininggg-frontend-e2e/TC_E10S01_04-21.png): initially unanswered safety checklist and decision controls.
- [TC_E10S01_04-22](evidence/20261104-013800-jininggg-frontend-e2e/TC_E10S01_04-22.png): fresh approval makes Event Confirmed.
- [TC_E10S01_04-23](evidence/20261104-013800-jininggg-frontend-e2e/TC_E10S01_04-23.png): Organiser receives Event confirmed after the fresh decision.
