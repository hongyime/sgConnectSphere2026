Reorganise course lecture slide decks from loose docs/slides/ into the docs/slides/lecture/ subfolder, and track and populate the Week 11 client presentation slide deck.

## Task Details

- **Branch**: `docs/reorganise-lecture-slides`
- **Scope**:
  - Move 10 course lecture PDF slide decks into `docs/slides/lecture/` to keep `docs/slides/` clean and organised.
  - Track the populated deck at `docs/slides/presentation/Week 11 Presentation.pptx`.
    It was committed as `Week 11 Slide Template.pptx` and renamed on 2026-10-29 so the
    submission deck is not mistaken for the blank handout; the untouched instructor
    template is still readable at commit `56672fa3`.
  - Populate all 17 slides of the presentation deck with comprehensive course-mandated answers: project index with PostPlan and C4 links, customer changes (most vs least impact), CFO update table with 3 concrete human-added value examples beyond AI, AI usage analysis and rework disclosures, controlling AI (Delegate, Constrain, Verify, Own), Git collaboration strategy, testing strategy with metrics table, CI/CD pipeline architecture and value case study, team contribution breakdown, and closing notes.
- **Traceability**: Course presentation and reference material hygiene; follow-up to PR #359.

## Review round 2 (Bl0oper 2026-10-29 15:37, Ji Ning 2026-10-29 13:31)

Reviewer checked which claims hold against the repository. Deck rewritten so every
number and path is traceable; nothing was left as an unqualified assertion.

- **Slide 2 (index)**: exports now cite `CAA 281026` (the `27102026` files never
  existed); `docs/architecture/` replaced with `docs/c4-diagrams.md` and
  `docs/architecture.md`; run records 737 -> 739 and 509 evidence images added.
  Ceremony recording URLs are still missing: text now says the links must be
  inserted before submission rather than pointing at a folder that holds none.
- **Slide 4 (customer change, most impact)**: FIFO auto-promotion with a claim
  window removed. The canonical rule is notify-all then first-come
  (C-23, T-33, T-46); the deck now says so and names the real code paths
  (`eventLifecycle/cancellation.ts`, `venueBooking/lostVenueRecovery.ts`) and real
  tests (`eventCancellation.test.ts`, `cancellationRecovery.integration.test.ts`,
  `attendeeCapacity.test.ts`). The nonexistent `cancellationRollback.integration.test.ts`
  and the "attendee refund" wording are gone. Migration 0025 is described as venue
  unavailability only (#348).
- **Slide 5**: `backend/src/modules/venues/` -> `venueBooking/` (search.ts,
  suitability.ts); frontend paths corrected to `frontend/src/features/venue/`.
- **Slides 8, 10, 11, 16**: coverage is no longer described as a CI gate. The
  Definition of Done requires 100% coverage of changed code and it is measured with
  `npm run test:coverage`; no workflow runs coverage. Counts now come from CI run
  40901918683 on main `eab9f898` (2026-10-29): 676 frontend Vitest + 612 backend
  unit tests, 48 integration test files, 40 Playwright spec files, 379 test-case
  IDs. "Zero technical debt" and "0 known unresolved defects" are replaced with
  the tracked follow-ups (PRs #309, #328, #361, one open issue).
- **Slide 11**: "every test case verified by a human" is now scoped to what T-65/T-93
  records cover; the 74 scaffold-only cases are named as not click-through tested.
- **Slide 15**: Amareet added as the sixth member and the five existing rows rebuilt
  from git and PR authorship. Aaron's row no longer claims auth/profiles/app shell,
  and the PRs attributed to the wrong people (#88, #96, #143, #108, #202, #203, #205,
  #366, #368) are re-homed to their authors. Contribution percentages are
  `git shortlog -sne origin/main` share and now total 100%.

## Review fixes pushed by Aaron (Bl0oper), 30 Oct 2026

Aaron's 30 Oct review points, applied on Bryan's behalf as single text-run edits:

- **Slide 2**: ceremony links are now `[link to be added]` placeholders.
- **Slide 4**: "status polymorphism" cites #371 instead of T-59/T-63.
- **Slide 6**: example 1 says what AI *could* do and cites what the repo records
  (T-59, rollback isolation, `isSafeResetTarget()` in `backend/src/database/cli.ts`);
  example 2 says 739 run records; example 3 cites T-100 (rule B) and the
  `FOR UPDATE` locks in `venueBooking/` instead of T-63/T-68.
- **Slide 9**: branch prefix `feature/`, not `feat/`.
- **Slide 10**: no open issues (30 Oct 2026).
- **Slide 12**: no linter; `check.py` and the tc-coverage audit listed under
  `repository-checks`. The CI failure count is kept as Bryan wrote it.
- **Slide 14**: rewritten around PR #355, where application-checks caught a booking
  query that read migration 0025's `conflict_block_id` against a fixture schema built
  from 0001 and 0019 (run 40331728045; fixed in `2e7b580`).
- **Slide 15**: Amareet's two text columns as Amareet asked; the table's minimum row
  heights were lowered so the longer row stays on the slide.

The changed slides were rendered in PowerPoint 16 and checked.

Second pass, same day (Aaron asked for everything outside his review too):

- **Layout**: on slides 4, 5, 7, 9, 10, 11, 13 and 16 only the first paragraph of each
  answer box had a font size, so the rest fell back to 18 pt and overlapped the next
  question or ran off the slide. Each answer box now uses its first paragraph's size
  throughout, and the boxes were fitted and stacked in PowerPoint (no text shrunk).
- **Claims the repo does not support, reworded to what it records**: slide 5's
  frontend files and tests; slide 6 examples 2–3; slide 7's rework examples (now T-93's
  agent screenshots and SCRUM-51's agent setup error), "transaction isolation levels"
  and "near-match scoring"; slide 8's CI list; slide 9's worktree path, merge strategy
  and the 1 Oct unapproved merges before the 3 Oct ruleset; slide 10's 20/20 check
  runs on `eab9f898`; slide 11's "same millisecond" and the CFO sentence (the CFO's
  Week 10 request is about AI and is not in the repo); slide 12's triggers, required
  checks, CI-caught example (#320, run 39831097976) and bypass answer; slide 13's
  overclaims; slide 16's Sprint 4 points (35 Done on 29 Oct per the PostPlan
  dashboard, not 50) and the `check_postplan_html.py` claim.

## Not done / next step

1. **Ceremony video URLs** (slide 2) still have to come from the team; they are not
   in the repository. Replace the placeholders before submission.
2. **Each member should confirm their own slide 15 row** — content is git-derived,
   not self-reported. Amareet has confirmed theirs; Xiang Ying has not.
3. The deck was rebuilt as slide XML text; there is no LibreOffice in this
   environment, so layout was checked structurally (python-pptx: 17 slides, 7x5
   table, table bottom 7.03 in on a 7.5 in slide) but not rendered. Ask a reviewer
   to open it in PowerPoint before the review is re-requested.

## Commands run

- `gh pr list` / `git shortlog -sne origin/main` — PR authorship and commit shares.
- `gh run view --job 123546217808 --log` — CI counts on main `eab9f898`.
- `python scripts/tc_coverage_audit.py` (earlier commit) — 379 TC IDs, 74 scaffold.
- `python scripts/check.py` — repository checks.

## Learnings

Presentation claims about CI, coverage and ownership are the first thing a reviewer
verifies. Cite the run id, the date and the command in the deck itself; a plausible
number that nobody can reproduce costs more than an admitted gap.
