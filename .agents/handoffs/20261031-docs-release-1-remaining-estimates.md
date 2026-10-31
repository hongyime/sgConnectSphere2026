# Release 1 remaining estimates

Propose the three missing Release 1 estimates following #364, #356 and #388:
E03-S09 (SCRUM-154) 3 points, E08-S06 (SCRUM-158) 8 points and E07-S08
(SCRUM-181) 3 points, for teammate/PO review, in both canonical backlog views
with a regenerated workbook. Jira stays unchanged until this proposal merges
and the estimation basis is accepted.

## Checked sources

Backlog on main `4da52a4`, 31 October: of the eight Release 1 stories still
needing owners, five already carry points (E02-S05 3, E04-S02 5, E10-S05 5 via
#356, E05-S06 8 via #364, E02-S07 3 via #388). E03-S09, E08-S06 and E07-S08
have blank Points, and no open or closed PR proposes a size for them.

Jira read-only on 31 October: all three To Do, story point estimate unset,
assigned to the same account; only SCRUM-158 is in a sprint (Sprint 4).

Code on main: E03-S09 has only the `event_coordinator_lead` role; E08-S06 has
the Safety Review status, migration 0017 and the "submit for safety check"
step from other stories (#282, #283), but not the Safety Officer's queue,
checklist or decisions; E07-S08 has nothing yet and depends on E04-S02's
Session write path.

## Proposed sizes

- E03-S09 3, against E03-S01 (3) and E03-S02 (3): Lead reassigns at once with
  notices and a log entry, a new "ask the Lead" request with decline, and a
  role refusal; Scenario 2 reuses E03-S01 unchanged.
- E08-S06 8, against E08-S03 (5), E10-S01 (8) and E05-S06 (8): ten scenarios,
  a new Safety Officer queue, a seven-factor checklist, three decisions with
  status changes, re-review flags, notices, audit and status-display changes.
  The status, migration and submission already delivered are not counted.
- E07-S08 3, against E07-S02 (3), E07-S04 (5) and E02-S07 (3): Session link
  on equipment requests and reservations, availability on the Session period,
  cross-event refusal, staff assignment unchanged. E04-S02 is a dependency,
  not counted again.

These are proposed reference sizes, not team acceptance. T-73 estimates
in-flight stories for remaining work only; none of the three is in flight.
No accepted criteria, sprint, owner or history is changed. No application
code changes. The branch and title carry no Jira key and the body has no
closing clause, so merging must not transition any issue.

## Plan

- T1 branch (worktree, main folder untouched) and this handoff.
- T2 points and estimate paragraph in both backlog views.
- T3 regenerate CAA 311026, keep source-of-truth on it, compare with a fresh
  main baseline: expect exactly six changed cells.
- T4 check.py, T-65 tooling record, commit.
- T5 PR for review; after merge and acceptance, set the three Jira estimates.

## Not done / next step

T2.
