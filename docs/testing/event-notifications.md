# E11-S01 notification implementation and verification

Story: SCRUM-75. Rules: BDR T-64 (2026-09-27), the approved matrix in
`docs/backlog/release-1/E11-notifications-reminders.md`, and
`docs/plans/e11-notification-hooks.md`. This story remains partially integrated;
do not mark it Done merely because the inbox and reusable hooks pass tests.

## Implemented scope

- Existing event submission/status and date/time edits use the shared transactional
  event-notification hooks. No sessions or session IDs are introduced.
- Active linked recipients are deduplicated, the actor is excluded, and public
  changes include registered and waitlisted Attendees and the Coordinator.
  Attendee content uses the published name and fixed public wording, not internal
  titles, comments or decision reasons. Internal changes follow the T-64 matrix.
- Existing email outbox/provider is reused: one logical notification per recipient,
  with an email delivery referencing it. Email preparation reads the current user
  email; retries retain the prepared address/payload under the existing durability
  contract. Provider failures are recorded after commit and do not undo the event.
- All roles can list only their own inbox via cookie authentication. Newest-first
  order includes an ID tie-breaker. Read updates require same-origin requests and
  ownership, are idempotent, and never accept a client recipient/role.
- The real inbox at `/notifications` distinguishes unread messages and marks them
  read when opened. Signed-out access returns the normal sign-in error.

## Acceptance status and dependencies

| Acceptance criterion | Current status | Remaining dependency |
| --- | --- | --- |
| Status change / booking decision notified | Existing status flows integrated; booking hooks tested, callers pending | E06-S03 SCRUM-47 and E06-S04 SCRUM-48 |
| All affected parties notified for arrangements | Current date/time edit and shared old/new audience hooks tested; not complete for every workflow | Explicit Venue Staff assignment relationship: E05/E06 owners, no dedicated ticket identified; E07-S04..S07 SCRUM-54..57; E08-S03..S05 SCRUM-60..62; E10-S01..S05 SCRUM-70..74 |
| Unaffected users not notified | Recipient selection enforced/tested for integrated flows; future callers must use the same hook | Same workflow integrations above; assignment reconciliation E03-S01 SCRUM-32 / PR 141 |
| Delivered in-app and by email | In-app, durable email generation, provider success/failure handling implemented/tested | Authorized deployed relay/worker configuration and actual mailbox delivery verification remain deployment-owner work |
| Newest-first list and unread distinction | Fully implemented and verified | None |
| Opening marks notification read | Fully implemented and verified, including reload and ownership denial | None |

Place-release hooks additionally await E09-S04 SCRUM-66 and E09-S05 SCRUM-67.
Tests calling a hook directly are infrastructure evidence, not proof that those
booking, equipment, cancellation or waitlist business screens exist.

## Conflicts and boundaries

The older routing table in `docs/plans/sprint-2-sequencing.md` routes booking
outcomes to Organiser and Coordinator; newer T-64 routes them only to Coordinator.
Jira SCRUM-75 has not yet incorporated all of T-64's clarified routing. Follow the
approved canonical matrix as instructed. Older product material mentioning sessions
is obsolete for this implementation; current schema and hooks are event-based.
No fallback from `venue_bookings.decided_by` to Venue Staff assignment is allowed.
No new business-rule assumptions, migrations or production configuration changes.

## Run locally

Configure the existing database and APP_URL settings according to backend/README.md.
Run `npm run dev --workspace backend` with the normal environment loaded and
`npm run dev --workspace frontend`, sign in, and open `/notifications`.
An empty real inbox stays empty: fixtures are used only in tests. Existing
notification relay/worker deployment instructions remain in backend/README.md;
this change does not enable live email sending.

Database tests require a disposable loopback PostgreSQL database named
`connectsphere_notification_test` via TEST_DATABASE_URL. Redis tests require a
loopback TEST_REDIS_URL. Tests use synthetic users and isolated schemas.

| Command | Result on 2026-09-27 |
| --- | --- |
| `npm test --workspace backend` | Passed, including new inbox authorization tests |
| `npm test --workspace frontend -- --run src/features/notifications/NotificationInbox.test.tsx` | 7 passed |
| `npm run test:event-notifications:db --workspace backend` | 10 passed |
| `npm run test:notifications` | 26 passed with local PostgreSQL; provider HTTP intercepted |
| `npm run test:redis` | 2 passed with local Redis |
| `npm run test:runtime` | 15 passed |
| `python scripts/check.py` | Passed: repository hygiene and tooling |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `npx playwright test --config playwright.auth.config.ts notificationInbox.spec.ts` | 2 passed: real API/database, desktop and mobile |

The first dispatcher/Redis attempts failed because test service URLs were absent.
After starting disposable local services and setting test-only environment values,
both suites passed. No live Supabase data was modified and no production email
was sent. Inbox traceability: TC_E11S01_06 (list), TC_E11S01_07 (read); the browser
also exercises a real status-repository notification (TC_E11S01_01).
