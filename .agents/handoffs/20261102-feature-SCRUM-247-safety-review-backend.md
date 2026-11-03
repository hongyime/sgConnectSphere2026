# SCRUM-247 / E08-S06 Safety Officer backend (Aaron)

Deliver the backend of E08-S06 "Conduct the Operational Safety Check as the
Safety Officer" (story SCRUM-158, owner Aaron): subtask SCRUM-247, the
Safety Officer's queue, review detail and decisions. The frontend (SCRUM-248)
and the acceptance evidence (SCRUM-249) follow in their own PRs, so each
stays inside the PR guardrails (decision 0017) and only the last one carries
the story key.

## Where this branch came from

- Branched from `main` at `c5a01dd` on 2 November 2026 as
  `feature/SCRUM-158-operational-safety-check`, then renamed for this
  subtask after `main` (`b03b8bf`, #408) was merged in. This handoff file
  moved with it.
- Bryan built a first version of SCRUM-158 on
  `feature/SCRUM-158-safety-officer-check` (1 November, no PR), stacked on
  his unmerged SCRUM-157, 153, 154 and 155 work. Three of his commits were
  cherry-picked here, with Bryan kept as their author:
  - `fe9c4ef` SCRUM-157 role landing queues, copied whole and unchanged.
    SCRUM-158 needs its Safety Officer role, route, page, queue and the
    `safetyQueue` route. It is here only until Bryan's SCRUM-157 PR merges;
    merging `main` in then drops it from this PR's diff.
  - `2058ede` SCRUM-158 safety officer check, without its two run records
    and its `docs/testing/tc-coverage.md` edit.
  - `83dc389` SCRUM-158 decision routing.

## Done on this branch

- Queue ordered by entry into Safety Review (`status_changed_at`).
- Review detail grouped by Session (E04-S02 made venue bookings, equipment
  and accessibility needs per Session).
- Request changes needs an unsatisfactory factor; the equipment flag skips
  released reservations.
- Notices: confirmed details on approval; factors and reason otherwise.
- `safetyReturn.ts`: the readiness read and the Organiser's event read say
  when a safety decision sent the Event back; automatic re-entry
  (`autoSafetyReview.ts`) skips such an Event, so its Coordinator resubmits.

## Not done / next step

1. SCRUM-248 frontend: `feature/SCRUM-248-safety-review-page`, stacked on
   this branch until it merges.
2. SCRUM-249: Playwright, the manual T-93 run with screenshots, run records,
   `tc-coverage.md`, PO acceptance.

## Decisions for the reviewer and the Product Owner

- Approval itself sets Confirmed (backlog Scenario 3, T-71), not a later
  Coordinator step as C-101 and C-131 describe. Recorded as T-107 in
  `docs/bdr/B-team-decisions.md`, proposed by the story owner and agreed
  through review; not a recorded Product Owner decision.
- The rejection flag and the "sent back" state are read from the latest
  status change's audit action and `events.decision_reason`; no migration.
- The checklist is kept in the decision's immutable `audit_logs` row
  (`field_changed = 'safety_check'`); no new table. `docs/db_schema.md`'s
  planned `SAFETY_CHECKS` tables are not built.
- "Request changes" flags confirmed venue bookings for venue factors and
  live equipment reservations for equipment placement; attendance and
  Technical Support flag nothing. Since Le Xin's review (3 Nov) each flag
  writes a "Reconfirmation required: safety check changes requested" row,
  as an edit's flags do. The checklist is event-wide, so every such booking
  or reservation is flagged, across all Sessions.
- Le Xin's review (3 Nov): the Activity log read skips a safety decision's
  status row, so the checklist row is its one entry (TC_E08S06_02);
  approval takes no reason, so `decision_reason` keeps its value; the
  review leaves cancelled support out; one Safety Officer guard checks the
  role before the id. `requireLead` (Bryan's SCRUM-157 copy) is left as is.
- A returned Event re-enters Safety Review only when its Coordinator
  resubmits (Scenario 4), including one that was Confirmed before; this
  adds one condition to Le Xin's `autoSafetyReview.ts`.

## Blockers

- Bryan's SCRUM-157 (E01-S13) has no PR; this branch carries a copy.
