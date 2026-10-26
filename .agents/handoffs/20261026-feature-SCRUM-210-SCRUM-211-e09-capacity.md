# feature/SCRUM-210-SCRUM-211-e09-capacity

Build E09-S02 "Enforce registration capacity" (story SCRUM-64) as one full-stack
PR: backend subtask SCRUM-210 and frontend subtask SCRUM-211. Each selected
Session's confirmed layout capacity and the combined Event capacity are enforced;
over either limit a request is Pending for the Event Organiser, who approves
(rechecking both limits), declines, or adds an attendee manually within both
limits. Stacked on #327 (E09-S01 frontend); merge #327 first. No migration: 0023
and 0024 already provide `pending`, `rejected` and `manually_added`. The branch
carries the subtask keys only, so merging closes SCRUM-210/211, not the story;
the manual run is SCRUM-212.

## Done

- `backend/src/modules/attendeeRegistration/capacity.ts`: `eventCapacity()` is the
  one shared capacity function (agreed with Le Xin for E10-S02 on #326). A
  Session's places are the sum of its Confirmed bookings, each at the Session's
  layout capacity for that venue (`venue_supported_layouts`), else the venue's
  `max_capacity`; the Event's places are the sum across Sessions; only
  `registered` rows count. `overCapacity()` names the full Session or the full
  Event; `fullSessionIds()` feeds the Attendee form.
- `service.ts`: registration stays under the Event row lock and is saved as
  `pending` when it doesn't fit (with a "Registration request received" notice);
  the form returns `capacity { eventFull, waitlistEnabled, fullSessionIds }`.
- `organiser.ts` plus `api/events.ts ?registrations=1`: GET the Organiser view;
  POST approve / reject / add. Writes lock the Event row, check `Origin`, require
  Confirmed, audit to `audit_logs` (`event_registration`), and notify the attendee.
- Frontend: the register page marks full Sessions, says a full choice goes for
  review ("Send request for review"), shows a Pending confirmation, and on a full
  Event offers the Event-level waiting list link (`/attendee/waitlist/:eventCode`,
  E09-S04's route) where enabled. New Organiser page
  `/organiser/requests/:eventCode/registrations` (linked from the Organiser's event
  page once Confirmed): places per Session, Pending requests with Approve (disabled
  while over capacity) and a confirm-step Decline, and the manual addition form.
- Tests: backend units 26 (capacity, organiser, service at 100%); real PostgreSQL
  `attendeeCapacity.integration.test.ts` (TC_E09S02_03, _06 to _12, the API
  handler); Vitest 29 in the two registration test files (all four changed
  frontend files at 100%); Playwright TC_E09S02_04, _06 to _12 in `e09.spec.ts`.

## Decisions

- With Event capacity = sum of Sessions, an Event can only be full while a chosen
  Session has room after capacity drops (for example a smaller layout).
  TC_E09S02_10's real-database step shrinks a layout to reach that state.
- TC_E09S02_03 (a race) stays `test.fixme` in the browser suite: a fake backend
  can't race; the real-database test proves it.
- Manual additions ignore the registration window (C-58: VIPs after normal
  registration is full or closed) but never either capacity limit.
- "Event Organiser" is the event's `organiser_id` (T-85, C-98 wording); another
  Organiser's event reads as 404.

## Verification so far

- Local: backend typecheck; backend unit tests; frontend changed-file typecheck;
  Vitest; Playwright E09 specs. See the PR body for counts and run records.
- Not run locally: the real-PostgreSQL suites. Docker Desktop was off and agents
  don't start it (AGENTS.md); CI runs them in its own PostgreSQL service.

## Next

- SCRUM-212: the manual run with hand-taken screenshots (T-93).
- E09-S03 (registration period, Organiser side), then E09-S07, which can reuse
  `getEventRegistrations` for its list.
