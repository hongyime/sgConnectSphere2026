Finish PR #230 by syncing its seeded-account test documentation with current `origin/main`, correcting the review findings, regenerating the dated test-case workbook, and refreshing the PR evidence.

## Current state

- `docs/seeded-account-names` is based on `origin/main` at `8f246ae`. The current PR head is published in GitHub; the test-case content corrections are present through `2cd535b`.
- Corrected the cases against the CLI seed and regenerated `PROJECT TEST CASES CAA 141026.xlsx` with 351 cases across 13 epic files. `TC_E01S12_03` uses seeded EVT-3001 at Jasmine Hall on 15/10/2026 and shows only `Unavailable` to coord_b. New request scenarios use `Team Offsite 2` and explicit provisioned event counts.
- The duplicate task handoff was removed; the branch keeps only this original task-start handoff. No merged handoff, `.agents/STATE.md`, or `.agents/JOURNAL.md` is edited.
- SCRUM-179 tracks this cross-epic test-data work under SCRUM-127 (E00) and remains In Progress while PR #230 is unmerged.
- Xiang Ying's `CHANGES_REQUESTED` review is on older head `cb0406a`. Amareet's later review comments on `5205609` also called out the calendar state/date, duplicate event title and preconditions, and duplicate handoff; those content findings are corrected in the current test cases. The current PR still needs a teammate to re-review the latest head; do not self-approve or send reviewer messages without authorization.
- The six required checks passed on the last content head `2cd535b`. The handoff refresh creates a new PR head, so check the live GitHub status before merge. No one has approved the latest content head.
- The local repository check passed at source commit `951e6f8` with 87 tooling tests; T-65 record: `docs/testing/runs/20261014-001840-bryanseah234-tooling.md`. The latest PR-head checks are the broader current verification. No application suite was run because this PR changes acceptance-test documentation and its generated workbook only.
- PR body retains `Closes SCRUM-179` and the review artifact: https://yc98rmz1xnwp.postplan.dev.

## Remaining work

- Have a teammate re-review the corrected cases on the latest PR head and clear Xiang's outstanding change request.
- Merge only after required approval and checks. Keep SCRUM-179 In Progress until merge.

## Decisions

- `TC_E01S12_03` uses the future seeded EVT-3001 at Jasmine Hall; coord_b sees only `Unavailable`, without event or organiser details.
- New request examples use a distinct title and explicit provisioned counts rather than reusing a seeded event.
- This PR updates test documentation and a generated workbook; it does not claim application behavior is implemented or tested.
