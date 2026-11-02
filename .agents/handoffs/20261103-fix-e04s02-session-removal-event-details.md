# E04-S02: align event details and prompt for primary venue after deleting a Session

Follow-up to #408 under E04-S02 (SCRUM-39, reference only): when deleting down to
one Session, the Event's time, attendance, requirements and layout update to
match the survivor Session, preventing subsequent event edits from overwriting
the remaining Session with stale details. Also prompts for a primary venue when
a primary booking was released and other Confirmed bookings remain (T-94).

## What changed

- `removeSession`: when deleting leaves one Session (`remaining === 2`), `handNeedsToEvent`
  updates the `events` row (`event_range`, `expected_attendance`, `layout_id`,
  `venue_requirements`, `accessibility_note`, `equipment_requirements`,
  `layout_preference`) to match the surviving Session, and hands over accessibility
  and facility needs.
- `removeSession` returns `primaryNeeded` and sends the Coordinator a "Primary venue
  needed" notice when the primary was released and another Confirmed booking remains.
- The Organiser's removal message says the Coordinator must choose another; the
  Coordinator's booking list warns when Confirmed bookings have no primary.
- The editor no longer says a sole Session "uses the event's own requirements",
  which was untrue after deleting down to one.

## Deliberately not done (two limits & decisions)

- **Equipment reservations and Technical Support times keep their old times:**
  they are not altered when an Event narrows down to one Session; they keep their
  existing times until someone explicitly edits them.
- **With 2 or more Sessions left, Event time stays the same:** deleting down to 2
  or more Sessions keeps the Event envelope intact.
- **No automatic promotion:** T-94 says a released primary is cleared and someone is
  prompted. T-78 keeps choosing with the Coordinator, so the Organiser's prompt points there.

## Commands and outcomes

See the PR's Verification section.
- `npm test --workspace backend`: 693 passed, 1 skipped (0 failed).
- `npm test --workspace frontend`: 799 passed (0 failed).
- `python scripts/check.py`: PASS repository hygiene and tooling tests.
- Database integration test `backend/tests/eventSessionsRoutes.integration.test.ts`
  verifies survivor detail sync, edit non-overwrite, multi-session retention, and
  support range retention; runs on CI's managed PostgreSQL container.
