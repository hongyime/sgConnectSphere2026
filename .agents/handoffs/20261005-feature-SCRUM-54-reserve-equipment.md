# feature/SCRUM-54-reserve-equipment

Goal: E07-S04 Reserve equipment for an event (Jira SCRUM-54, owner Aaron),
backend and frontend in one PR: Technical Support reserves, changes and
releases equipment per request line on the live event equipment page
(`/support/events/:eventCode/equipment`), and the Coordinator sees each
line's state. Subtasks SCRUM-163 to 166. Branch pre-created by Bryan on
2026-10-05; `main` merged in (not rebased) on 2026-10-08.

## Done so far

- Backend: `equipmentSupport/reservations.ts` (reserve, change, release),
  reservation state and free quantity in the event equipment read
  (`requests.ts`), three new actions on the existing equipment route (no new
  `api/` file). E07-S03's free-quantity query is shared
  (`availabilityRows`, `availability.ts`) rather than copied.
- Frontend: reserve form (`EquipmentReservations.tsx`), reservation pills,
  actions and the release panel on `EquipmentRequests.tsx`; the old mock
  `/support/queue` and `/support/requests/:id` now go to the live list.
- Tests: unit, real-database, Vitest and Playwright (TC_E07S04_01 to _07 live in
  `tests/e2e/equipmentReservations.spec.ts`); 100% of changed lines and
  branches; deliberate-bug checks; real-stack click-through (F3) 41/41.
- Run record: `docs/plans/scrum-54-implementation-status.md` (rules, screens,
  click-through script, known limits, every run).

## Not done / next step

Aaron's own click-through (F4), then `tc-coverage.md`, postplan and the PR.

## Decisions taken without team sign-off

Settled by the story owner (D39–D48), recorded in the run record's rules
table: reservation period is the event's dates; reserve or change only while
Approved or Planning, release also while Cancelled, nothing once Confirmed;
at most the requested quantity; release sends no notice; each reserve,
change and release writes an event Activity log entry (beyond what the other
E07 stories record; it is the only record of who released and when).

## Changes to teammates' files

- `requests.ts`, `availability.ts`, `requestHandler.ts`, `EquipmentRequests.tsx`,
  `equipmentRequestApi.ts` (Xiang Ying's, E07-S01 to S03): listed in the PR
  for her review.

## Learnings

- Free quantity must be stock minus the peak overlapping demand, not the sum
  of every overlapping reservation (SCRUM-51 and SCRUM-53 handoffs).
- Reservation writers lock the equipment row so they serialise with the
  catalogue's stock-reduce and retire transaction.
