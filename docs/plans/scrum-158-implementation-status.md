# SCRUM-158 / E08-S06 implementation status

Conduct the Operational Safety Check as the Safety Officer. This file
records what was built, which test proves each acceptance criterion, and
**every run of those tests**, so each result can be traced back to the
exact code it ran against.

## Scope

From `docs/backlog/product/E08-readiness-confirmation.md`, E08-S06
Scenarios 1-10 and the checklist (BDR C-70, C-101, C-131 to C-135, T-71,
T-72, T-82, T-103; O-39 to O-43, all closed). Test cases
`docs/testing/cases/E08.md` TC_E08S06_01 to TC_E08S06_06.

Already on `main` before this branch: the `safety_review` status
(migration 0017) and its transitions, the Safety Officer-only confirm
check, automatic entry into Safety Review, the reconfirmation flags on
venue bookings, equipment reservations and Technical Support requests, and
Scenario 9's tracker and deactivation behaviour.

**Who wrote what.**
- Bryan built the first version on `feature/SCRUM-158-safety-officer-check`
  (1 November, no PR): the seven-factor decision check, the review detail
  and decision endpoints, the Activity log row with the checklist, the
  notices, the re-review flags and an inline review control. His commits
  `2058ede` and `83dc389` are cherry-picked here.
- Bryan's SCRUM-157 commit `fe9c4ef` (the Safety Officer role, landing
  route and queue) is carried here until his SCRUM-157 PR merges.
- This branch (Aaron, with Claude) finishes the story: see Known gaps.

## Rules this story applies

| Rule | Test case |
|---|---|
| The queue lists every Event in Safety Review, oldest entry first, with what the check needs | TC_E08S06_01 |
| Every one of the seven factors is marked satisfactory or not, with a comment, before deciding | TC_E08S06_02 |
| Approval with every factor satisfactory confirms the Event and notifies Organiser and Coordinator | TC_E08S06_02 |
| Request changes returns the Event to Planning, names the items and flags the affected arrangements | TC_E08S06_03 |
| Rejection returns the Event to Planning with a visible flag and reason, never cancelling it | TC_E08S06_04 |
| Reject and request changes need a reason; only a Safety Officer decides | TC_E08S06_05 |
| Events confirmed earlier are untouched; tracker and deactivation treat Safety Review as active | TC_E08S06_06 |
| Every decision is one immutable Activity log row with the checklist | TC_E08S06_02 to _05 |

"What the user sees" for each rule is added once the screens are final.

## Known gaps (from Bryan's version) and where each is closed

The story ships in three PRs, one per Jira subtask, to stay inside the PR
guardrails (decision 0017): SCRUM-247 backend, SCRUM-248 frontend,
SCRUM-249 acceptance evidence.

| Gap | Closed by |
|---|---|
| The queue orders by event date, not by time entered Safety Review | SCRUM-247 |
| Accessibility shows only the free-text note, not the features | SCRUM-247 (per Session, D117) |
| Venue layout read from the Event, wrong once Sessions differ (#408) | SCRUM-247 (D117) |
| No "safety arrangement rejected" state to show | SCRUM-247 (`safetyReturn`); shown by SCRUM-248 |
| Notices carry no confirmed details or unsatisfactory factors | SCRUM-247 (D115) |
| The equipment flag also marks released reservations | SCRUM-247 |
| A returned Event that was Confirmed before re-enters Safety Review by itself | SCRUM-247 (D118) |
| Every factor pre-marked satisfactory; the review sits in a table cell | SCRUM-248 |
| Tests cover only the parser and one refusal | SCRUM-247 (unit, real database); SCRUM-249 (Playwright, manual) |

## Test gates

To be filled with the gates before the PR (unit, real-database, coverage,
typecheck, Vitest, Playwright, repository checks).

## Known limits

None recorded yet.

## Run log

| When (SGT) | Commit | Gate | TC IDs | Command | Where | Result | What was seen | Run by |
|---|---|---|---|---|---|---|---|---|
| 2026-11-02 ≈00:46 | `8fdf63b+local` (committed as `a89272a`) | typecheck | - | `npm run typecheck` (root) | local | clean | checks the cherry-pick conflict resolution compiles | Claude (for Aaron) |
| 2026-11-02 ≈00:46 | `8fdf63b+local` (committed as `a89272a`) | unit | _05 | `npx tsx --test tests/safetyCheck.test.ts tests/roleQueues.test.ts` (backend) | local | 10/10 passed | Bryan's tests, unchanged | Claude (for Aaron) |
| 2026-11-02 ≈00:46 | `8fdf63b+local` (committed as `a89272a`) | Vitest | - | `npx vitest run --no-file-parallelism src/features/roleQueues src/app/routes.test.tsx src/features/accessControl/LoginPage.test.tsx` | local | 34/34 passed in 3 files | Bryan's tests, unchanged | Claude (for Aaron) |
| 2026-11-02 ≈00:48 | `ac5bf31` | unit | _05 | `npm test --workspace backend` | local | 696 passed, 1 skipped | the skip is a database contract with no `TEST_DATABASE_URL` | Claude (for Aaron) |
| 2026-11-02 ≈00:48 | `ac5bf31` | repository | - | `python scripts/doc_guard.py origin/main` | local | 0 errors, 156 warnings | - | Claude (for Aaron) |
| 2026-11-02 17:53 | `8054e44` | typecheck | - | `npm run typecheck` (root) | local | clean | - | Claude (for Aaron) |
| 2026-11-02 17:53 | `8054e44` | unit | _01 to _05 | `npm test --workspace backend` | local | 714 tests: 713 passed, 1 skipped | new and changed safety files at 100%; record `20261102-175346-Bl0oper-backend-unit.md` | Claude (for Aaron) |
| 2026-11-02 17:54 | `8054e44` | real database | _01 to _06 | `npx tsx --test tests/safetyReview.integration.test.ts` + 7 related integration suites (backend), Docker `postgres:17` | local | 55/55 passed | record `20261102-175404-Bl0oper-backend-db.md` | Claude (for Aaron) |
| 2026-11-02 18:07 | `f30e9b5` | typecheck | - | `npm run typecheck` (root) | local | clean | - | Claude (for Aaron) |
| 2026-11-02 18:07 | `f30e9b5` | Vitest | _01 to _05 | `npx vitest run --no-file-parallelism` (frontend) | local | 812/812 passed in 76 files | record `20261102-180747-Bl0oper-frontend-vitest.md`; every changed line covered | Claude (for Aaron) |
| 2026-11-02 18:10 | `f30e9b5` | Playwright regression | - | `npx playwright test` on 9 specs (coordinator, e03, e06, e08, e10, e14, eventReadiness, venueBookingDecisions, skeleton) | local, desktop + Pixel 7 | 122 passed, 126 skipped, 0 failed | the skips are `test.fixme` scaffolds; record `20261102-181032-Bl0oper-frontend-e2e.md` | Claude (for Aaron) |
| 2026-11-02 19:13–19:42 | `d8ba321` | manual (T-93) | _01 to _06 | Aaron's click-through of TC_E08S06_01 to _06, setup `docs/testing/manual/E08-S06-preconditions.sql` | local real stack (Docker `postgres:17`) | **TC_02 and TC_03 FAIL**, others PASS | the Organiser's Activity log showed the checklist as raw JSON (fixed in `e49b4c3`); also fixed: stale review pill, notice full stop, "stock changed" wording (`be0eb43`, `e49b4c3`); record `20261102-191300-Bl0oper-frontend-e2e.md`, 22 screenshots | Aaron |
