# feature/SCRUM-208-e09-registration-frontend

Build the E09-S01 "Register for an event" frontend (subtask SCRUM-208 of story
SCRUM-63): Discover, the event page and the registration form go live against
the SCRUM-207 backend. Stacked on #326 (backend), which is stacked on #322
(migrations 0023-0024); merge in that order, after both migrations are applied
in production. The branch carries the subtask key only, so merging closes
SCRUM-208, not the story.

## Done

- `frontend/src/features/attendee/registrationApi.ts` and `EventRegistration.tsx`:
  `EventDiscovery` (/attendee/discover), `EventDetail` (/attendee/discover/:eventCode)
  and `RegisterForEvent` (/attendee/register/:eventCode), built from the shared
  blocks with `useLoad`; the three routes are now `live`.
- The mock versions were removed from `AttendeeRegistration.tsx`; Aaron's
  withdrawal page (E09-S05) and the feedback page there are unchanged mocks.
- Tests: `EventRegistration.test.tsx` (16 tests, 100% of both files, including a
  late-response test); Playwright TC_E09S01_01 and _07 in
  `attendee-registration.spec.ts` (replacing the mock tests), TC_E09S01_03 to _06
  turned on in `e09.spec.ts`, a shared fake backend in
  `tests/e2e/helpers/registrationBackend.ts`, and the register page's layout check
  in `layout-and-focus.spec.ts` now measures the live page's centred card.

## Decisions

- Details are shown read-only from the account (T-32, O-05), with the Profile
  page as the place to change them; a missing detail is named and blocks submit.
- The Session checkboxes use the shared `.field-checkbox-group` inside the
  "Choose your Sessions" fieldset; the fieldset is the only group, and the error is
  linked to each checkbox (an extra nested group was removed after screenshots).
- Removing the mock tests leaves retired TC_E09S02_01/_02 with no test; they are
  retired, so nothing replaces them.

## Next

- Manual-run setup script with a future Confirmed, published event, then the
  SCRUM-209 manual run with hand-taken screenshots.
- Shared-style follow-up for the skeleton owner: plain inline links (e.g. the
  "Profile page" hint link) use the browser's default blue; there is no app-wide
  link colour in `styles.css`.
