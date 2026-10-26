# feature/SCRUM-207-e09-registration-backend

Build the E09-S01 "Register for an event" backend (subtask SCRUM-207 of story
SCRUM-63): an Attendee registers once for a published, Confirmed Event and
selects one or more of its Sessions. Stacked on the E09 migration PR #322
(0023-0024); it must not merge until #322 is merged and both migrations are
applied in production. The branch carries the subtask key only, so merging
closes SCRUM-207, not the story.

## Done

- `backend/src/modules/attendeeRegistration/service.ts`: `listOpenEvents`,
  `getRegistrationForm`, `registerForEvent`, plus the pure `registrationState`,
  `missingDetails` and `parseSessionIds`.
- `api/attendee/events.ts`: `GET ?open=1`, `GET ?registration=1&id=`,
  `POST ?registration=1&id=` with `{ sessionIds }`; the existing registered-events
  GET is unchanged. `backend/src/dev.ts` routes POST too.
- `requireAttendee` exported from `attendeeVisibility/service.ts` for reuse.
- Tests: `backend/tests/attendeeRegistration.test.ts` (12 unit tests, 100% of the
  service) and `attendeeRegistration.integration.test.ts` (real PostgreSQL, all
  migrations, a concurrent double-submit, the real API handler). Both wired into
  `backend/package.json` and `.github/workflows/application-checks.yml`.
- Docs: the endpoint row in `docs/api-changes-week7.md`; TC_E09S01_04 updated
  from "Email blank" to "contact number missing on the account" (T-32, O-05);
  regenerated `PROJECT TEST CASES CAA 211026.xlsx`, `docs/source-of-truth.md`
  and `docs/testing/tc-coverage.md`.

## Decisions

- Registration details are the account's name, email and contact number; nothing
  is stored on the registration (T-32 amended, O-05 closed). A blank detail blocks
  registration and is named, with the Profile page as the fix.
- "Registration open" = Confirmed, `registration_enabled`, published, and now
  within `registration_opens_at`..`registration_closes_at` (both ends inclusive,
  an unset end unbounded). E09-S03 adds the Organiser side and its messages.
- The Event shows its primary Confirmed venue (O-30, T-78); each Session shows its
  own Confirmed venue. The event row lock serialises registrations; E09-S02's
  capacity checks build on it. Every registration is `registered` until E09-S02.
- Confirmation is an in-app notification with an email delivery
  (`changeId = registration:<id>`), using the published name only.

## Next

- Frontend SCRUM-208 (form, Session choices, confirmation) on its own branch.
- E09-S02 (SCRUM-210): capacity, Pending, Organiser review, manual additions.
- Seed or a manual-run setup script with a future Confirmed, published event
  for the SCRUM-209 manual run.
