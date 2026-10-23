# SCRUM-152 — E05-S06 venue unavailable over existing bookings

Goal: deliver E05-S06 "Mark a venue temporarily unavailable over existing bookings" (Jira SCRUM-152). This branch carries the first of three PRs: a docs-only alignment of E05-S06 and E10-S05 (SCRUM-74) and their test cases to the existing Week 9 decisions T-80, T-81 and T-91, before any code is written. Backend and frontend follow on separate branches.

## Why the docs PR comes first

The stories were labelled Sprint 3, so the Week 9 decisions were not applied to them while that sprint ran (T-73; see `docs/plans/week9-customer-answers-impact.md`). Nobody owned them afterwards, so the text stayed on the old O-23/O-24 defaults while `docs/contracts/venue-bookings.md` (Venue loss, Block edits rows) already followed T-80/T-81/T-91. Both stories are unstarted, so T-74 allows updating their criteria in place.

## Done so far (PR 1, docs only)

- `docs/backlog/release-1/` and `docs/backlog/product/` E05-S06: open-ended unavailability (T-80), Confirmed event returns to Planning, not cancelled (C-120, T-81), Coordinator-only notice at loss (C-121), restore on shorten/lift (C-122), new Scenario 7 for edit/lift history and lift notice (T-91). Sprint, Points and Owner metadata unchanged.
- Same two files, E10-S05: Scenario 1 now returns a Confirmed event to Planning; Scenario 4 triggers on the replacement being confirmed (C-121, T-81).
- `docs/testing/cases/E05.md`: TC_E05S06_02/_03/_04/_05 updated; TC_E05S06_04 now checks an open-ended save instead of a refusal; new TC_E05S06_07.
- `docs/testing/cases/E10.md`: TC_E10S05_01/_03/_04 updated.
- `tests/e2e/e05.spec.ts`, `tests/e2e/e10.spec.ts`: fixme scaffold titles follow the case titles; TC_E05S06_07 scaffold added. All remain `test.fixme`.
- Regenerated `CONNECTSPHERE BACKLOGS CAA 231026.xlsx`, `PROJECT TEST CASES CAA 231026.xlsx`, legacy `PROJECT TEST CASES.xlsx` (copy of the new export) and `docs/testing/tc-coverage.md` (377 cases).
- `docs/source-of-truth.md`: export table points at CAA 231026; one paragraph records this alignment.

## Decisions taken without team sign-off (reviewer please check)

- When a shortened or lifted unavailability restores a booking, the event that T-81 returned to Planning does not jump back to Confirmed; it follows E08-S04 Scenario 4 (reconfirmation, then Safety Review). Written into E05-S06 Scenario 6, TC_E05S06_05 and TC_E10S05_03.
- An affected event that was not Confirmed keeps its status (E05-S06 Scenario 3).

## Next

1. Open PR 1 as a draft, add a PostPlan, get one teammate approval.
2. PR 2 (backend, new branch): migration 0025 (block category, nullable end, lifted state, history table, booking status before conflict), datetime blocks, create/edit/lift with Conflicting flagging, T-81 reversion and Coordinator notices; unit tests at 100% and native loopback PostgreSQL integration tests only.
3. PR 3 (frontend, new branch): block form, affected-events list, event venue-conflict flag.
4. Le Xin runs TC_E05S06_01 to _07 by hand with T-93 screenshots.

## Blockers

- Jira: SCRUM-152 and SCRUM-74 still need assigning to Le Xin (agent write was not permitted).
