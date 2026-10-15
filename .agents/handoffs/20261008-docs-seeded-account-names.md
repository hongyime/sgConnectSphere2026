Finish PR #230 by syncing the seeded-account acceptance cases with current `origin/main`, mapping the reviewer-listed E05/E06/E07/E10 scenarios to the CLI seed, regenerating the test-case workbook, and recording the remaining review follow-up.

## Current state

- Merged `origin/main` normally in `2f7ac03`. The E06 and binary-workbook conflicts were resolved from canonical Markdown without rewriting published history.
- Remapped all 24 listed cases across E05, E06, E07 and E10 to seeded venue/event/item names. Test-only preparation is stated where the pristine seed lacks a block, hold, required status, item location, second Session, equipment reservation, or staff routing. `TC_E05S01_01` was not edited.
- Rewrote `TC_E06S03_03` to expect a second independent venue booking under T-68/T-79 and identify the older blocked-second-request assertion as superseded. Follow up in the PR/review with the story owner to confirm any remaining backlog/test inventory or implementation scaffolding that still asserts the obsolete behavior.
- Consolidated the duplicate `TC_E10S04_01` Markdown entry into one Session-based seeded fixture. Updated `TC_E10S04_04` and the direct dependent `TC_E08S05_04` reference to use the same seeded cancelled event.
- Resolved the E06 T-92 conflict using the accepted no-reminder/expiry notice and extension-history wording. No `.agents/STATE.md` or `.agents/JOURNAL.md` content was edited by this task; those paths are staged only because the normal `origin/main` merge brought them in.
- Remap commits are `003332d` (E05), `97a9ae1` (E06 scenario preservation), `b2258d7` (E07), and `7eddbf4` (the linked E08/E10 cancellation fixture).
- Regenerated `PROJECT TEST CASES CAA 141026.xlsx` from merged Markdown to resolve the binary conflict and generated `PROJECT TEST CASES CAA 151026.xlsx` (354 cases across 13 epic files). `docs/source-of-truth.md` points at `CAA 151026`.
- The canonical Markdown audit found all 24 target IDs exactly once with none of the six stale fixture names; the generated `CAA 151026` workbook has the same 24 unique rows and no stale fixture names. `TC_E05S01_01` is byte-identical to the pre-edit branch version.
- `python scripts/check.py` passed on the final content tree: 128 repository-tooling tests and hygiene checks passed; it warned about intentional secondary worktrees. Application lint, build, database and browser suites were not run. Markdown LSP diagnostics are unavailable because no `.md` server is configured.
- PR #230 remains unmerged; teammate re-review is still required. No approval, review comment, PR edit or Jira update was made.

## Remaining work

- Have a teammate re-review the latest test-case content and clear the outstanding change request. Explicitly discuss the E06-S03-03 assertion change against T-68/T-79.
- Push the verified commits, refresh the PR body/PostPlan evidence, and re-check live required checks before requesting teammate re-review.
- Keep SCRUM-179 In Progress until PR #230 merges.

## Decisions

- Seed facts come from `backend/src/database/cli.ts`: Orchid Hall confirmed/pending bookings and the Lotus Room event ownership/status pairs support the calendar, privacy, and booking cases; Jasmine Hall's confirmed EVT-3001 booking supports the permitted-details case; Maple Room and seeded layouts preserve their capacity inequalities.
- For E06-S03-03, the current requirement permits multiple venue bookings for one event; the case now verifies independent creation rather than preserving the superseded second-request rejection.
- This is a documentation/workbook change only. Repository hygiene/tooling verification passed, but no application behavior or story acceptance execution is claimed.
