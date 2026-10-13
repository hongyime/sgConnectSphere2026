# Week 9 architecture and UI handoff

Goal: align the target schema, ADR history, API/venue contracts, architecture views, dynamic user flows, and UI/UX handoff with the accepted Week 9 decisions, preserving historical customer evidence and keeping implementation/Jira work downstream of the canonical Markdown PRs.

## Done so far

- Started from `docs/week9-backlog-tests`, which is stacked on the Week 9 decision PR branch.
- Added ADR-018 for restored Session ownership and ADR-019 for multi-role accounts; updated supersession links for ADR-004/005/012 and Week 9 consequences in ADR-003/006/007/009/010.
- Updated the target schema, venue booking contract, API overview, C4/module/class views, dynamic flows, design status vocabulary, E11 notification follow-up and Figma refinement plan. Corrected stale one-Event-per-Session and Event-level attendance claims.
- Corrected the out-of-release history for E02-S05/E04-S02 and clarified that E01-S09 role-switcher UI remains future scope while role membership is supported.
- Expanded the impact register with exact affected code module groups and implementation follow-ups. No application code or Jira issue has been changed.

## Decisions and scope boundaries

- Keep C-62 as historical customer evidence; T-79/ADR-018 records the current Session model.
- Keep C-134's decision/comments requirement distinct from the team-added safety checklist (T-82).
- Keep the existing Event attendance as an overall planning total; Session attendance is separate and drives suitability only for bookings in that Session (T-79 team design detail).
- Keep O-50 and O-51 explicit as team assumptions.
- Preserve Sprint 3 criteria and Done-story history. Reconcile Jira only after canonical Markdown merges.
- Actual Figma frame edits and application implementation remain downstream; the repository UI/UX handoff is updated here.

## Not done / next step

Create the full PR review artifact, commit and push the final change set, open the stacked PR, link its PostPlan in a top-level comment, and review the live checks. Actual Figma frame edits, application migrations/behavior and Jira reconciliation remain downstream of canonical Markdown review/merge.

## Verification

- `python scripts/export_adr_bdr_docx.py`: regenerated both CAA 131026 Word exports from Markdown.
- `python scripts/agent_handoffs.py`: lists this branch handoff.
- `python scripts/check.py`: passed in an isolated worktree based on `b6ed6b0`; all 87 tooling tests passed. The primary worktree attempt stopped on mixed line endings in uncommitted `.agents/STATE.md` and `.agents/JOURNAL.md`; those files remain unstaged and excluded from the PR.
- T-65 record: see the 13 October tooling run in `docs/testing/runs/` (filename follows the required schema).
- Application tests, build and deployment were not run; this PR contains documentation only.
