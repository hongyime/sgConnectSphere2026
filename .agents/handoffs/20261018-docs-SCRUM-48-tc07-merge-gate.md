# Clarify SCRUM-48 TC_07 merge gate

Clarify the SCRUM-48 TC_E06S04_07 merge gate in the existing handoff to match the recorded 17 October PO decision: the case stays in E06-S04, and #298 remains unmerged until E10-S04 is built and TC_07 passes.

## Done so far

- Updated the stale “Still to do” wording in `.agents/handoffs/20261005-feature-SCRUM-48-decide-venue-request.md` to remove the suggestion that the team still needs to choose whether to wait for E10-S04.
- Updated PR #298’s body to state the recorded scope decision and merge gate; left Jira status, sprint, and estimate unchanged.

## Not done / next step

- Review and merge this docs-only correction into `feature/SCRUM-48-decide-venue-request` after approval. Do not merge PR #298 until E10-S04 is built and TC_E06S04_07 passes with its required evidence.
- PR #298 currently conflicts with `main`; its merge readiness remains separate from the TC_07 gate.

## Verification

- Read the existing PO decision in the SCRUM-48 handoff and the current PR #298 body/state before editing.
- No application test suite or database command was run for this documentation change.
- The uncommitted proposal and closeout files in the separate SCRUM-50 worktree were not touched.
