# E10-S01 evidence review - 4 November 2026

SCRUM-70 / SCRUM-204. This maps existing evidence, not new requirements or PO
acceptance. Application tested manually on a954231b (3 November) and 607536e3
(4 November). No application code changes in this consolidation.

## Human records

- [Initial combined run](../runs/20261103-163000-jininggg-frontend-e2e.md), merged #418: request core paths and one-venue/crew Safety Review interruption.
- [Safety Officer supplemental run](../runs/20261104-013800-jininggg-frontend-e2e.md): repaired login/inbox, new checklist, actual safety approval and Organiser confirmation notice.
- [Continuation](../runs/20261104-014800-jininggg-frontend-e2e.md): refresh persistence, Session name, cancellation history and two-booking/crew reconfirmation after explicit reversion.

| Acceptance criterion | Human observation | Additional existing evidence / qualification |
| --- | --- | --- |
| Scenario 1: record request and notify assigned Coordinator | Initial TC_01 submission/Pending and Coordinator Change requested screenshots | Real browser/API/database workflows in the recorded 2 November regression. |
| Scenario 2: current details alongside Pending request | Initial Event and Session comparisons; 4 November refresh retained current/requested names separately | Latest continuation explicitly confirms persistence after F5. |
| Scenario 3: refused direct edit offers pre-filled form | Confirmed Event restricted attendance link opened selected field with current 40; explicit submission still required | Concurrent approval/save-refusal is covered by real-stack browser tests; not manually repeated. |
| Scenario 4: approve, apply and notify Organiser | Initial safe name and attendance applications/notice; Session time application isolates the other Session and Event; later title-only zero-impact preview/apply | Structured fields, registration settings, stale/foreign/deleted targets, invalid values, revision checks and atomic rollback have recorded automated evidence. Expanded catalogue is not entirely human-executed. |
| Scenario 5: decline without changing confirmed details | Initial Declined comparison and Organiser notice with reason | Purpose stayed unchanged. |
| Scenario 6: Completed/Cancelled closes Pending as Obsolete with history | Initial terminal UI shows Obsolete and distinct terminal reason, original values retained; 4 November cancellation history shows transition, actor and time | Completion audit is recorded/tested in database; general Event Activity log filters change_request entities. Do not falsely claim it was visible there. |

## Integration assertions

| Assertion | Evidence and limits |
| --- | --- |
| Session change flags only relevant venue and assigned crew | Human preview/apply, unaffected Afternoon, two staff inboxes, venue then crew reconfirmation. Fixture contained no equipment reservation; equipment flagging is automated evidence. |
| First Safety Review can be interrupted and re-enter automatically | Initial human run: one venue plus crew; supplied Activity log screenshot 04-32 explicitly shows Safety Review to Planning, reconfirmations and Planning to Safety Review. Two-venue automatic interruption has recorded real-database coverage. |
| Fresh Safety Officer notice/check required | 4 November human inbox and blank checklist; fresh approval and Organiser Event confirmed. This clears the UI blocker recorded in #418, fixed by Aaron's merged #412/#413. |
| Previous decision survives a later reconfirmation cycle | Human 04-31 preserves 01:38 approval, explicit 01:57 Confirmed-to-Planning reversion, both venue reconfirmations and 02:02 Safety Review re-entry; previous approval did not make it Confirmed again. This explicit path is not the automatic T-103 path. |
| Safe-only/structured no-impact changes retain Safety Review | Existing real-database regression; human name-only step retained Confirmed, which is a different starting status. |

## Recorded automated evidence retained

- [31 October structured/real-stack run](../runs/20261031-020539-jininggg-full-regression.md): mixed layout/accessibility, reference clears, 20 desktop/mobile workflows, 88 request/impact/database-unit tests, 42 focused UI tests.
- [31 October registration/late-close run](../runs/20261031-010847-jininggg-full-regression.md): real registration enablement/window and explicit late-close confirmation workflows.
- [31 October Safety Review lifecycle run](../runs/20261031-201320-jininggg-full-regression.md): affected/no-impact apply, two-booking first-review re-entry, previous approval retention and notification rollback; 39 focused tests.
- [2 November Session run](../runs/20261102-211112-jininggg-full-regression.md): final 34 real-database request tests, 22 earlier desktop/mobile workflows plus two final Session rechecks, requirements and failure paths. The record's source-tree and full-UI failure limitations remain intact.

These are prior executions at their recorded trees, not a fresh regression on
607536e3. Test code alone is not execution evidence. Human code/test reviewers
must assess the combined-tree applicability and coverage justification.

## Status and next gate

All six core story scenarios have human workflow evidence, with completion
history supplemented by real-database evidence. The expanded TC_04 catalogue
is not a blanket manual PASS: structured layout/accessibility/facilities,
registration/late-close, no-impact Safety Review, two-booking automatic
interruption and fault-injection assertions rely on the linked automated runs.
No additional user click-through is scheduled by this document. Independent
review should assess whether the mixed evidence satisfies those variants and
identify a precise gap if further execution is required.

The next actions are evidence publication/review and explicit PO/delegate
AC-to-evidence acceptance under CONTRIBUTING.md. Neither a merge nor this map
marks SCRUM-70/SCRUM-204 Done. Production roster/mailbox gates of E11-S01 are
separate and do not invalidate this local E10-S01 inbox evidence.

Screenshots from 4 November are supplemental observations of preserved local
data; the 3 November timestamps in history/notices are intentionally retained.
