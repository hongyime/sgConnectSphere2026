# feature/SCRUM-213-e09-registration-period

Build E09-S03 "Control the registration period" (story SCRUM-65) as one full-stack
PR: backend subtask SCRUM-213 and frontend subtask SCRUM-214. The Event Organiser
sets one Event-level registration window, a withdrawal deadline and whether a
full event offers its waiting list; a closing date after the event starts needs
confirming. Stacked on #353 (E09-S02), which is stacked on #327; merge in that
order. No migration (the columns exist since 0001). Merging closes SCRUM-213/214,
not the story; the manual run is SCRUM-215.

## Done

- Backend: the E03-S07 edit route (`updateEventInformation`, `PATCH
  /api/events?edit=1`) now takes `withdrawalDeadline` and `waitlistEnabled`,
  editable by the Organiser after approval like `registrationDates` (T-16, C-24,
  C-44), and refuses a closing date after the event start with 428 until resent
  with `confirmLateClose: true`. The E09-S02 Organiser read returns the period.
- Frontend: new page `/organiser/requests/:eventCode/registration-period`, linked
  from the Organiser's event page (Approved to Confirmed) and the Registrations
  page. Datetime inputs with the timezone named, an optional withdrawal deadline,
  the waiting-list switch, the "Confirm the closing date" warning with "Save
  anyway", a notice when the event isn't taking registrations (pointing at
  change requests), and read-only when cancelled or completed.
- Tests: backend units in `eventVisibility.test.ts` and `attendeeCapacity.test.ts`;
  real PostgreSQL `registrationPeriod.integration.test.ts` (TC_E09S03_01 to _06,
  _09 through the real edit service); Vitest `RegistrationPeriod.test.tsx` (100%);
  Playwright TC_E09S03_01 to _06 and _09 in `e09.spec.ts`.

## Decisions

- One edit route, not a second one: E03-S07 already let the Organiser change
  registration dates after approval (T-16), so E09-S03 extends it.
- `registration_enabled` is not part of this story's checklist and stays as it
  is (seed data or an E10-S01 change request); the page says so.
- TC_E09S03_07/_08 (exact instants) stay `test.fixme` in the browser suite: the
  decision uses the database clock. The unit test of `registrationState` proves
  both ends are inclusive.
- E10-S01 change requests still list `registrationDates`, `waitlistEnabled` and
  `withdrawalDeadline`; that route still works, it's just no longer the only one.
  Worth telling Ji Ning.

## Next

- SCRUM-215 manual run with hand-taken screenshots (with SCRUM-209 and SCRUM-212).
- E09-S07 (registration list), reusing `getEventRegistrations`.
