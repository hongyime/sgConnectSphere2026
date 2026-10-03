# docs/e14-s02-activity-log-scope

Goal: PR #192. This branch predates decisions 0013 and 0014; its goal and progress are the entries below, moved here from `.agents/STATE.md` and `.agents/JOURNAL.md` so the PR shares no file with any other.

## Entries moved from STATE.md (decision 0014)

- 2026-10-02: PR #192 refreshed after #190 merged as 9d5ae60. Preserved its
  immutability migration/tests and regenerated the sole coverage conflict:
  118 active, 135 scaffold, 3 absent out of 256 catalogue rows. Local tooling
  verification is recorded in the new main-refresh session file. No application
  suite or migration was run by this scope refresh.
  The #190 Jira sync run 37018654001 prematurely moved SCRUM-86 from In Progress
  to Done despite the merged PR explicitly delivering only Scenario 5. Verified
  the live issue was Done, then restored In Progress using its available workflow
  transition; Jira confirmed In Progress. This is a progress correction from
  merged evidence, not an early scope/sprint reconciliation. No reassignment,
  estimate or sprint change. PR #192 remains unmerged for the story owner's review.

- 2026-10-02: E14-S02 scope decisions on `docs/e14-s02-activity-log-scope`.
  T-75 permits Coordinator reading through the existing event Activity log
  within existing event access; denial/deactivation verification uses the test
  database. Administrator viewing is Release 2. T-76 moves booking approval,
  rejection and release logging to E06-S04 Scenario 5 and carries the remaining
  E14-S02 criteria (1/2/4/5) into Sprint 3. Original commitments and estimates
  remain unchanged. Old booking TC IDs are retired with E06 replacements;
  backlog/test/ADR/BDR exports and the compatibility inventory are regenerated.
  This is a scope PR, not delivery evidence. Keep SCRUM-86 out of its branch,
  title and closing clauses so jira-sync cannot mark the unfinished story Done.
  Local repository hygiene and 76 tooling tests passed; immutable evidence is
  in docs/testing/runs/. Playwright collection only: 64 declarations, no business
  test execution. PostPlan: https://oe19j1p9wxfc.postplan.dev.
  Scope PR: https://github.com/hongyime/sgConnectSphere2026/pull/192.
  Requested next action: story-owner review after final-head readiness checks;
  do not merge or close the business story as part of this scope update.
  Jira scope/planning reconciliation follows merge. Implementation and peer
  verification remain the story owner's work; other worktrees are untouched.

## Learnings (moved from JOURNAL.md)

- 2026-10-02: Resumed the interrupted E14-S02 scope change after reading the
  originating OpenCode session. Recorded T-75/T-76, reconciled both backlog
  views, retired the three old booking-log cases with consecutive E06-S04
  replacements, and regenerated exports plus the compatibility inventory.
  Sprint 3 carryover preserves Sprint 1 history. No Administrator role, global
  audit endpoint, Jira transition or business-logic implementation is included.
  Scope PR #192 is open for the story owner's review; validation evidence lives
  in this change's immutable tooling session record.
  Repository hygiene and 76 tooling tests passed; the evidence session records
  the pre-commit HEAD and working-tree scope. Playwright collection found 64
  declarations without executing them. PostPlan prepared and visually checked:
  https://oe19j1p9wxfc.postplan.dev.
  Scope commit 4363ebf was pushed on the named branch. The inherited personal
  identity hook required a timestamp-scoped exception for the T-65 runner field;
  no hook or secret scan was bypassed. Automatic Jira key extraction from the
  actual PR metadata is empty. PR #192 is unmerged; review and CI remain GitHub
  gates, and Jira scope/planning changes wait for canonical merge.

- 2026-10-02: PR #192 refreshed after #190 merged as 9d5ae60. Preserved its
  immutability migration/tests and regenerated the sole coverage conflict:
  118 active, 135 scaffold, 3 absent out of 256 catalogue rows. Local tooling
  verification is recorded in the new main-refresh session file. No application
  suite or migration was run by this scope refresh.
  The #190 Jira sync run 37018654001 prematurely moved SCRUM-86 from In Progress
  to Done despite the merged PR explicitly delivering only Scenario 5. Verified
  the live issue was Done, then restored In Progress using its available workflow
  transition; Jira confirmed In Progress. This is a progress correction from
  merged evidence, not an early scope/sprint reconciliation. No reassignment,
  estimate or sprint change. PR #192 remains unmerged for the story owner's review.
