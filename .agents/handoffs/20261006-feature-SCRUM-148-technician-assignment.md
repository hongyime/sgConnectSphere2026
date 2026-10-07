# E07-S07 technician assignment backend (SCRUM-148, SCRUM-149)

Goal: the backend for E07-S07 "Assign and manage technical staff for an
event" (story SCRUM-57). Technical Support Staff assign colleagues to an
E07-S06 support request with an overlap check naming the clashing event,
remove them (freeing the slot), and each technician has a schedule. Covers
subtasks SCRUM-148 (assign and remove) and SCRUM-149 (schedule). Stacked on
#222 (E07-S06 backend); open as a Draft into `main` until #222 merges.
Owner: Amareet.

## Done

- `backend/src/modules/equipmentSupport/staffAssignments.ts` and
  `staffingHandler.ts`, routed as `/api/venues?task=staffing`.
- Tests:
  - `backend/tests/staffAssignments.test.ts`: 17 tests, 100% c8 coverage
    of both files
  - `backend/tests/staffAssignments.integration.test.ts`: PostgreSQL,
    TC_E07S07_01 to _06 plus a simultaneous-assignment race
- Four deliberate mutations were each caught. Skipping the code's overlap
  check is still stopped by the table's exclusion constraint, which is the
  designed backstop.

## CI

- `application-checks.yml` now runs `supportRequests.integration.test.ts`
  (E07-S06) and `staffAssignments.integration.test.ts` (E07-S07) against the
  CI PostgreSQL service, next to the equipment tests added by #216.

## Decisions for the reviewer (not yet confirmed by the team)

1. **Who assigns:** any active Technical Support Staff member, including
   themselves. Coordinators don't assign.
2. **Which events:** approved, planning or confirmed. Removal is always
   allowed, so a cancelled event never keeps a colleague's time blocked.
3. **Assignment period:** an assignment covers the request's whole support
   range. Several colleagues may be on one request.
4. **Removal:** sets `released` and keeps history. The request goes back to
   `open` when the last colleague leaves, and is `staffed` while anyone is
   on it.
5. **Notifications:** the assigned or removed colleague is notified, even
   when they acted on themselves.

## Next

- SCRUM-150: frontend for the staffing queue, request detail with who's
  free, and My schedule. Use `/support/technicians` (an existing E07-S07
  mock route), not `/support/queue`, which is E07-S04's.
- SCRUM-151: Playwright and the manual run.
