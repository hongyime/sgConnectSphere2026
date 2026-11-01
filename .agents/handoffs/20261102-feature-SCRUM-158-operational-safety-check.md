# SCRUM-158 / E08-S06 Operational Safety Check (Aaron)

Finish E08-S06 "Conduct the Operational Safety Check as the Safety Officer"
(story SCRUM-158, owner Aaron; subtasks SCRUM-247 backend, SCRUM-248
frontend, SCRUM-249 tests) in one PR that carries only SCRUM-158's work.

## Where this branch came from

- Branched from `main` at `c5a01dd` on 2 November 2026.
- Bryan built a first version of SCRUM-158 on
  `feature/SCRUM-158-safety-officer-check` (1 November, no PR). That branch
  is stacked on his unmerged SCRUM-157, 153, 154 and 155 work. To keep this
  PR to one story, three of his commits were cherry-picked here, with Bryan
  kept as their author:
  - `fe9c4ef` SCRUM-157 role landing queues, copied whole and unchanged.
    SCRUM-158 needs its Safety Officer role, route, page and queue. It is
    here only until Bryan's SCRUM-157 PR merges; merging `main` in then
    drops it from this PR's diff.
  - `2058ede` SCRUM-158 safety officer check, without its two run records
    (they name `5781de9`, a commit not on this branch) and without its
    `docs/testing/tc-coverage.md` edit (regenerated before the PR).
  - `83dc389` SCRUM-158 decision routing.
- Not copied: SCRUM-153, 154 and 155, Bryan's handoff commits and his run
  record commit `d7c5f0f`.

## Not done / next step

1. Keep the PR a draft until Bryan's SCRUM-157 PR merges, then merge `main`
   in.
2. Close the gaps against the acceptance criteria listed in
   `docs/plans/scrum-158-implementation-status.md` (Known gaps).
3. Real-database, Vitest and Playwright evidence; run records; regenerate
   `docs/testing/tc-coverage.md` in the last commit before the PR.

## Decisions for the reviewer and the Product Owner

- Approval itself sets Confirmed (backlog Scenario 3, T-71), not a later
  Coordinator step as C-101 and C-131 describe. Needs a recorded PO
  decision.
- The checklist is kept in the decision's immutable `audit_logs` row; no
  new table and no migration.
- "Request changes" flags confirmed venue bookings for venue factors and
  equipment reservations for equipment placement.
- A returned Event re-enters Safety Review when its Coordinator resubmits
  (E08-S03), not automatically.

## Blockers

- Bryan's SCRUM-157 (E01-S13) must merge first; this branch carries a copy
  of it until then.
