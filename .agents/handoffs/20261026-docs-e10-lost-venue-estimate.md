Propose re-estimating E10-S05 / SCRUM-74 from 3 to 5 points in PR #356. Ji Ning instructed on 26 October to restore Jira to 3 now and change it to 5 only after this backlog PR merges. Teammate/PO confirmation of the estimation basis remains pending; no story or subtask completion is claimed.

## Current state

- Both backlog views carry the proposed 5 points and explain that Jira remains at 3 until merge. The prior estimate of 3 is retained in the rationale and Git history.
- T-73 says in-flight work is estimated for remaining work only. Criteria changed on 23 October before implementation started; the team/PO must confirm whether 5 records the revised pre-implementation size and how it is counted. Do not assert agreement, call 5 the work remaining now, or rewrite historical sprint commitments.
- E05-S06 owns the trigger and Confirmed-to-Planning. Do not double-count its implementation or elapsed waiting time. Implementation remains in separate PR #355.
- Jira was prematurely set to 5, then restored to 3 following Le Xin's review and Ji Ning's explicit instruction. After #356 merges, verify that merged value is 5, then update Jira to 5 and record the reconciliation. Do not change it before merge.
- Current canonical export is CAA 261026. Older exports, including CAA 051026, remain historical.

## Evidence and review corrections

The earlier export contained 64 Release 1 stories and 84 product stories. Only E10-S05 rationale and points changed in each sheet (3 to 5); dimensions, styles and column widths were preserved. The original record is docs/testing/runs/20261026-214133-jininggg-tooling.md. That historical record is immutable; its compressed spacing is clarified in a new correction record rather than edited.

Local repository hygiene passed previously; the 163 tooling tests had 3 failures and 11 errors in Windows worktree fixtures. Linux CI passed on the earlier head. Fresh workbook comparison passed; local hygiene and record checks passed, with the same 3 failures and 11 errors among 163 Windows tooling tests. Correction and fresh verification record: docs/testing/runs/20261026-225819-jininggg-tooling.md. New-head CI and teammate/PO confirmation remain pending. Root staged review notes remain untouched. Branch/title contain no Jira key and PR must have no closing clause.
