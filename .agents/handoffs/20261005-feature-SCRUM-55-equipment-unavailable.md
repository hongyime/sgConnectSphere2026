# feature/SCRUM-55-equipment-unavailable

Goal: build E07-S05 "Mark equipment as unavailable" (Jira SCRUM-55, owner
Aaron), backend and screens in one PR, closing the story on merge: Technical
Support takes some or all units of an item out of service for a period with a
reason, reservations that no longer fit are flagged and their Coordinators
notified, and the item can be returned to service. Subtasks SCRUM-167
(backend), SCRUM-168 (frontend) and SCRUM-169 (tests). Branch pre-created by
Bryan on 2026-10-05; `main` merged in on 2026-10-12.

## Done so far

- Decisions D36 and D49–D54 settled (recorded in the run record,
  `docs/plans/scrum-55-implementation-status.md`, "Rules this story applies").
  The closest precedent is E05-S04's venue blocks (`venueBooking/blocks.ts`).
- Backend: `equipmentSupport/unavailability.ts` (`markUnavailable`,
  `returnToService`, `listUnavailability`); the `/api/equipment` handler
  dispatches the two new actions and adds the item's periods to its detail
  read. No new `api/` file, no migration.
- Tests: `equipmentUnavailability.test.ts` (unit) and
  `.integration.test.ts` (real database), both in `backend/package.json`;
  a CI step in `application-checks.yml`.

- Screens: "Mark unavailable" on the equipment detail page opens
  `/support/catalogue/:equipmentId/unavailable` (`EquipmentUnavailability.tsx`);
  the detail page lists current and future periods with "Return to service…"
  and shows each outcome at the top. Two lines added to Xiang Ying's
  `EquipmentCatalogue.tsx` and one optional field to `equipmentApi.ts`.
- Tests: Vitest (14), Playwright (`equipmentUnavailability.spec.ts`, replacing
  the `test.fixme` cases), 100% of new lines and branches, deliberate-bug
  check, real-stack click-through (36/36). Every run is in the run record's
  Run log.

## Not done / next step

- Aaron's own click-through (F4) of the script in the run record, then the PR
  (regenerate `tc-coverage.md` last, postplan, `Closes SCRUM-167` to 169).

## Decisions taken without team sign-off

- D49: "Return to service" deletes the withdrawal row (as E05-S04's "Remove
  block"); the audit entry keeps the period, units and reason.
- D51: overlapping withdrawals are allowed but can't exceed the item's stock;
  a period whose last day has passed is refused.
- D52: audit entries are written against the withdrawal row
  (`entity_type = 'equipment_unavailability'`), not against events.
- D54: only reservations that no longer fit are flagged, judged with E07-S03's
  calculation.

## Learnings

- `equipment_unavailability` has no `created_by` column, so the audit entry is
  the only record of who withdrew an item.
- E07-S01's stock-drop check (`catalogue.ts`) compares reservations with one
  flat capacity and ignores withdrawals, so a stock cut while units are
  withdrawn can miss a flag. Not changed here; raised with its owner.
- Database tests use dates in 2030, because the "end date today or later"
  rule would make tests with near dates expire.
