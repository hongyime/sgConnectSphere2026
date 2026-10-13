# test/week7-playwright-scaffolds

Goal: Add traceable Playwright `test.fixme` scaffolds for the 58 acceptance cases introduced by PR #205, regenerate the coverage inventory, and keep the scaffolds honest about behavior that is not implemented.

## Current state

- PR #217 is based on current `main` at `8f246ae`; the branch is mergeable and its required checks currently pass.
- The coverage report was regenerated against current canonical tests and workbook: 351 catalogue cases, 153 automated tests, 160 scaffolds, and 38 cases without a test reference.
- Kept the four existing email-verification tests but removed their incorrect E01-S12 labels; those IDs now describe Coordinator cases.
- Amareet's request to remove the already-merged #240 handoff is satisfied. This task uses the original handoff dated when the branch work started; the duplicate 20261009 handoff was removed.
- SCRUM-178 tracks this cross-epic test tooling under E00 (`SCRUM-127`) and remains In Review. PR #217 body contains `Closes SCRUM-178`.
- Repository check at base `5cf492a`: PASS, 87 repository-tooling tests; T-65 record: `docs/testing/runs/20261014-015537-bryanseah234-tooling.md`.
- PostPlan: https://kvwc99kdmfsx.postplan.dev. No Playwright scaffold suite was run locally; `test.fixme` entries are not behavior verification.

## Remaining work

- A teammate must approve the current PR head before it can merge. Do not self-approve or contact reviewers without authorization.
- After merge, replace each `test.fixme` with acceptance assertions alongside the relevant story implementation; the remaining 38 cases are outside this PR.

## Decisions without team sign-off

- Kept the four existing email-verification browser tests, removing only their incorrect E01-S12 case IDs. The canonical case catalogue has no matching email-verification cases under those new IDs.
- Used canonical case titles and Markdown sources for the placeholders; no acceptance behavior was invented in the test bodies.

Do not edit `.agents/STATE.md`, `.agents/JOURNAL.md`, or the already-merged #240 handoff in this PR.
