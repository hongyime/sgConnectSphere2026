Reorganise course lecture slide decks from loose docs/slides/ into the docs/slides/lecture/ subfolder, and track and populate the Week 11 client presentation slide deck.

## Task Details

- **Branch**: `docs/reorganise-lecture-slides`
- **Scope**:
  - Move 10 course lecture PDF slide decks into `docs/slides/lecture/` to keep `docs/slides/` clean and organised.
  - Track `docs/slides/presentation/Week 11 Slide Template.pptx`.
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

## Not done / next step

1. **Ceremony video URLs** (slide 2) still have to come from the team; they are not
   in the repository. Insert them before submission.
2. **Each member should confirm their own slide 15 row** — content is git-derived,
   not self-reported. Amareet and Xiang Ying have not reviewed theirs.
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
