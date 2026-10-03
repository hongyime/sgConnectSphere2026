# test/e05-s03-s04-seeded-execution-records

## Goal

Real-data (seeded database) execution evidence for E05-S03 (SCRUM-42, venue
availability calendar) and E05-S04 (venue maintenance blocks), adding to the
fake-API records of 2 October (PR #191).

## Done so far

- E05-S03: 12-step click-through in Chromium against the local real stack
  (Vite 5173, `backend/src/dev.ts` 3001, Docker `postgres:17` reset and
  seeded), as coord_a and coord_b. 5/5 PASS. Record:
  `docs/testing/runs/20261003-124635-lexinphun2024-debug-frontend-e2e.md`
  (commit c6c9aab).
- The local API needs `ADDITIONAL_ALLOWED_ORIGINS` set to the frontend origin,
  otherwise sign-in is refused with "Request origin not allowed."

## Decisions taken without team sign-off

- Test cases were **not** edited. Names missing from the seed were replaced
  by seeded equivalents and listed in the record's Remarks: Grand Ballroom ->
  Orchid Hall, coordinator_1 -> coord_a, unassigned Coordinator -> coord_b,
  Annual Tech Summit / Spring Networking Night -> EVT-2001, pending booking ->
  EVT-3003, November 2026 -> October 2026.
- No seeded venue has both a booking and a maintenance block, so the Blocked
  state (TC_E05S03_01/03) was read on Maple Room. A draft that added an Orchid
  Hall seed block and rewrote the cases was reverted at the user's request.

## Not done / next step

- E05-S04 real-data run: blocked until PR #185 merges; `/venue/blockout` is a
  mock on main. Its cases also name Riverside Hall, venue_staff_1,
  coordinator_1, Charity Run and Tech Conference 2026, none of which are seeded.
- Team decision for Sprint 3: align the E05-S03/S04 cases with the seed, or
  extend the seed. A seeded coordinator_1 would change auto-assignment
  (fewest active events) for E03 tests.
- E05-S04 cases say Sprint 3; the story says Sprint 2.

## Commands run

- `npm run db:reset` against the local Docker database (seeded 13 users,
  5 venues, 10 events).
- `python scripts/check.py`: PASS (repository hygiene and tooling only).
