Bring PR #217 up to current `origin/main`, regenerate its generated coverage report, and keep the merged continuity files out of this PR's own changes.

## Current state

- Fetched `origin` and merged `origin/main` at `8f246ae` into `test/week7-playwright-scaffolds`.
- Resolved the generated `docs/testing/tc-coverage.md` conflict by regenerating from merged tests and the canonical workbook: 351 cases, 153 automated, 160 scaffolds, 38 without a test reference.
- `.agents/STATE.md`, `.agents/JOURNAL.md`, and the already-merged #240 handoff have no branch-authored diff. Amareet's request to restore the #240 handoff is satisfied.
- Technical enabler `SCRUM-178` now tracks this cross-epic scaffolding work under `SCRUM-127` (E00); Jira status is In Review. PR #217 body has `Closes SCRUM-178`.
- Repository tooling check passed at `6272d98` (87 tooling tests), with T-65 record `docs/testing/runs/20261014-000027-bryanseah234-tooling.md`.
- Current pushed head `9f492dc` is mergeable. All 14 reported GitHub checks pass, but `reviewDecision` is `REVIEW_REQUIRED`; no teammate has approved the current head.
- The PR description and PostPlan link are present. No Playwright scaffold suite was run locally; declarations are `test.fixme`, not product verification.

## Remaining work

- Wait for a teammate to approve the current or a later PR head. Do not self-approve or message reviewers without authorization.
- After merge, fill each `test.fixme` alongside implementation of its story. The other 38 cases without test references are outside this scaffolding PR.

Do not edit `.agents/STATE.md`, `.agents/JOURNAL.md`, or the already-merged #240 handoff in this PR.
