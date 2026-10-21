Finish PR #230's six fixture-consistency gate findings on `docs/seeded-account-names`, regenerate the canonical test-case export, record the verified repository check, and push the reviewed corrections without changing story scope.

## Continuation — 21 October 2026

- Switched to `docs/seeded-account-names` in a separate worktree, fetched the current remote branch head `26b8ceb`, and merged current `origin/main` (`0567f46`). All merge conflicts are resolved locally. The three conflicting dated workbooks use their `main` versions. E08 keeps the seeded `coord_a`/`organiser_a` identities and the latest safety-review flow; the E08-S03-10 case is retained with explicit fixture preparation and the seeded Coordinator identity.
- Updated `TC_E11S01_02` per the approved PO clarification: effective date/time change only, venue stays at seeded Jasmine Hall/`venue_b`; recipient links and attendee-facing publication snapshot are explicit preconditions. Venue-move coverage remains separate.
- Cross-checked E11-S01 Scenario 1 against the actual seed: changed its approved-event mismatch to seeded Under Review EVT-2003, owned by organiser_c and assigned to coord_b. The previous EVT-3001 fixture is already Approved and could not satisfy the case's precondition.
- Regenerated `docs/testing/PROJECT TEST CASES CAA 211026.xlsx`; the generator reports 376 cases across 13 epic files. `docs/source-of-truth.md` now points to this export.
- Regenerated `docs/testing/tc-coverage.md` for 376 cases. `python scripts/check.py` ran on Windows and exited 1: the secret scanner and repository hooks passed, but four `test_worktree_hygiene` unit tests failed on Windows path-separator/unlink behavior. These tests are unchanged from `main`; see the new T-65 tooling run record.
- The corrections and final-head review brief are committed and pushed; PR checks passed on the previously observed head. The PR body/comments remain untouched, and teammate review is still required.
- The separate production migration task is blocked in this shell because `DATABASE_URL` is absent and `psql` is unavailable. No production query or write was attempted.

### Resume next

Audit the merged test-case export against Markdown and verify only intended case changes; update the final-head review artifact without exposing private data; confirm the pre-existing Windows tooling failures against current `main`; commit the merge/corrections and derived artefacts normally and push; then refresh #230 checks and obtain independent teammate review. Continue the other PR actions only after their stated team-decision gates are satisfied.

## Current state

- Corrected the six gate findings in `docs/testing/cases/E03.md`, `E05.md`, `E06.md`, and `E09.md`: the E03 dependent status-history case follows "Team Offsite 2"; the four-state Lotus calendar fixture assigns its events to the viewing Coordinator only for that case; the January buffer/conflict cases explicitly prepare eligible event status, correct Coordinator ownership, and matching Event/Session periods; the suitability negatives explicitly remove Orchid Hall's seeded wheelchair-access feature only for those cases and the adjacent positive case uses the actual Theatre capacity; the buffered search searches Orchid Hall; and the cross-client negatives consistently use seeded `organiser_c@clientb.com`.
- Re-checked seed ownership, statuses, dates, capacities, layouts, and accessibility features in `backend/src/database/cli.ts`; accepted E06-S03 eligibility remains Approved/Planning per the release backlog. No story requirements or application files changed.
- Regenerated `docs/testing/PROJECT TEST CASES CAA 161026.xlsx` from canonical Markdown and updated `docs/source-of-truth.md` to that export. Generator reported 354 cases across 13 epic files.
- Targeted audit passed for the 24 reviewer-listed remaps (24 unique IDs, no stale fixture-name hits before or after this correction), all six finding groups, and workbook-to-Markdown parity across all 354 rows and 10 columns. `TC_E05S01_01` is byte-identical to the starting branch; `TC_E06S03_03` (T-68/T-79) and `TC_E08S05_04`/`TC_E10S04_01`/`TC_E10S04_04` cancellation fixtures are unchanged.
- `python scripts/check.py` passed on 2026-10-16 at 08:17:20 +08:00, HEAD `47b071a`: 128 repository-tooling tests passed, 321 test-run records validated, hygiene checks passed. It emitted the expected secondary-worktree warning. T-65 record: the 16 October 08:17 tooling run record.
- The four fixture/export/evidence commits were pushed normally (no force push), ending at `4b76859`. A read-only PR #230 snapshot at that head was `MERGEABLE`, `CHANGES_REQUESTED`, with `application-checks`, `repository-checks`, `dependency-review`, `lfs-guard`, `trufflehog`, and `pr-conventions` all `IN_PROGRESS`. Recheck the live head/checks after this handoff update is pushed; a teammate re-review is still needed.
- Markdown diagnostics are unavailable because no `.md` LSP is configured. No app, database, browser, or story acceptance suite was run; these are canonical fixture-document corrections only.
- `.agents/STATE.md` and `.agents/JOURNAL.md` were not edited. No database operation, remote PR body/comment edit, review approval, merge, or Jira update was performed.

## Fresh Oracle gate corrections (16 October)

- Applied only the three specified fresh Oracle findings. `TC_E05S05_04` now runs both requests independently from the same prepared baseline, removes only Request A before the second run, preserves EVT-101's Confirmed booking, and expects the conflict to name EVT-101 (not Charity Run). No future withdrawal flow is assumed.
- `TC_E06S02_02` now records Theatre layout, Wheelchair Access and 150 capacity as event requirements, distinguishing Orchid Hall's overall 200 capacity from its seeded Theatre capacity of 120. `TC_E06S03_06` now prepares both Setup time 30 and Turnaround time 45 to establish the 09:30-12:45 buffered conflict window.
- Regenerated only the existing `PROJECT TEST CASES CAA 161026.xlsx` from the canonical Markdown. Audit verified 354 data rows, all 10 columns equal to the generator's parsed Markdown output, only the three intended case blocks changed, and the five expressly protected cases remain identical. Existing fixture remaps and cancellation cases were not edited.
- The 16 October 10:20 T-65 record records the observed local check on HEAD `b052e44`; `python scripts/check.py` passed all 128 tooling tests and repository hygiene at 10:20:42 +08:00. It emitted the expected secondary-worktree warning and validated 322 pre-existing run records. A second pre-commit run after adding the record also passed and validated all 323 run records.
- The previous audit established 24 unique fixture remap targets with no stale fixture-name hits. This correction changed no case blocks outside the three specified IDs, verified against the starting HEAD; therefore those remaps remain unchanged. `TC_E05S01_01`, T-68/T-79 `TC_E06S03_03`, and cancellation cases `TC_E08S05_04`, `TC_E10S04_01`, and `TC_E10S04_04` are unchanged.
- Corrections, generated workbook and T-65 evidence were committed separately as `5fc72d3`, `1e2b518`, `80bc069`, and `47489a3`, followed by handoff-only commits. They were pushed normally, not force-pushed; the first correction push reached `c7e7b60` with a clean local/upstream status. Its immediate read-only GitHub snapshot showed all six checks `QUEUED`, merge state `BLOCKED`, and Xiang's existing `CHANGES_REQUESTED` review. That snapshot predates the final handoff-only push, so refresh status against the actual current PR head rather than waiting on those earlier queued checks. No app/database operation, `.agents/STATE.md`/`.agents/JOURNAL.md` edit, PR body/comment change, approval, merge, Jira change, or force push was performed.

## Remaining work

- Wait for the latest required checks and teammate re-review. Do not self-approve, edit PR body/comments, or merge; main will ping the team after this gate.
- Keep SCRUM-179 In Progress until PR #230 merges.

## Decisions

- Seed facts are sourced from `backend/src/database/cli.ts`; case-local feature/status/ownership/date preparations are stated explicitly so the intended acceptance checks can be reached without mutating the shared seed or weakening requirements.
- This remains a documentation/workbook change only. Repository hygiene/tooling verification and data audits passed; no application behavior or story acceptance execution is claimed.

## Latest-main refresh — 21 October 2026

- Merged latest `origin/main` at `56d7117` into this branch in `5c50a7d`.
  The merge was conflict-free and included #323's backlog export update; no
  additional canonical test-case changes were introduced by that main commit.
- The current branch retains the generated test-case export dated `211026` and
  the regenerated coverage catalogue. The accepted E11 date/time-only case and
  its explicit recipient/publication preconditions are present in the branch.
- `python scripts/check.py` at `5c50a7d` validated 445 prior run records and
  passed repository/secret hooks and `.env.template` validation, but exited 1
  after 158 tooling tests because of the same four Windows path/unlink failures
  in `test_worktree_hygiene.py`. This run is recorded as T-65 evidence.
- The PR still has a formal `CHANGES_REQUESTED` review state. Its required
  checks passed on the previous pushed head; refresh them for the new merge
  head and wait for Xiang's independent re-review. Do not self-approve, edit
  the PR body/comments, or merge.

## Xiang review follow-up — 21 October 2026

- Addressed the 17 October E11 finding in the canonical case and updated the
  final-head HTML review brief: `TC_E11S01_02` now changes only the effective
  date/time to a future period, keeps EVT-3001 at Jasmine Hall, and states the
  required recipient links and published attendee snapshot as preconditions.
  Venue-move coverage remains explicitly separate and is not claimed as
  executable.
- Corrected `TC_E01S12_03`'s stale past-date fixture to use seeded EVT-3003's
  future Orchid Hall booking on 25/10/2026. The case explicitly prepares the
  booking as Confirmed for the scenario and retains coord_a ownership while
  coord_b checks that the period is shown only as Unavailable.
- Regenerated `PROJECT TEST CASES CAA 211026.xlsx` from canonical Markdown;
  the generator reports 376 cases across 13 epic files. Regenerated
  `tc-coverage.md`; the count remains 201 automated, 134 scaffold and 41 no
  test, so no coverage diff was needed.
- `python scripts/check.py` with these source/workbook changes at HEAD `f557a5f`
  ran 158 tooling tests and exited 1 on the same four Windows
  `test_worktree_hygiene` path/unlink assertions. Repository and secret hooks,
  `.env.template`, and 446 prior run records passed. The observed run is
  recorded in a new T-65 tooling session file.
- The prior pushed head's six required GitHub checks passed, but these case and
  workbook corrections must be pushed and checked on their own PR head. The
  formal `CHANGES_REQUESTED` state remains until Xiang's independent re-review;
  no PR body/comment, approval, or merge was made.
