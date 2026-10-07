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
| Unaffected users not notified | Recipient selection enforced/tested for integrated flows; future callers must use the same hook | Same workflow integrations above; PR #141 assignment integration is now on main |
| Delivered in-app and by email | In-app, durable email generation, provider success/failure handling implemented/tested | Authorized deployed relay/worker configuration and actual mailbox delivery verification remain deployment-owner work |
| Newest-first list and unread distinction | Fully implemented and verified | None |
| Opening marks notification read | Fully implemented and verified, including reload and ownership denial | None |

Place-release hooks additionally await E09-S04 SCRUM-66 and E09-S05 SCRUM-67.
Tests calling a hook directly are infrastructure evidence, not proof that those
booking, equipment, cancellation or waitlist business screens exist.

## Conflicts and boundaries

The older routing table in `docs/plans/sprint-2-sequencing.md` routes booking
outcomes to Organiser and Coordinator; newer T-64 routes them only to Coordinator.
Jira SCRUM-75 now incorporates T-64 and correctly remains In Progress. Follow the
approved canonical matrix. The earlier Jira-sync gap is resolved. Older product material mentioning sessions
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

## PR #143 review revision

Historical 2026-09-27 review revision (subsequently merged as PR #143) integrates PR #141 coordinator assignment, audit and
outbox fixes, including its existing migration 0008 unchanged. No new migration.
Resolved conflicts preserve both continuity histories and both test commands;
the plan drops obsolete pending tasks for assignment and inbox integration, and
test coverage is regenerated from the combined suite.

The inbox now excludes all eventless notifications from GET and POST read
responses and returns at most 100 event-linked notices, newest first. Verification
email rows can still be prepared and sent; their raw capability is never returned
by either inbox action. Password-reset notices are also hidden; their email-only
capability preparation remains unchanged. An audit of production notification
writers found verification and password reset as the eventless security producers.

Regression evidence lives in `notificationInbox.integration.test.ts`: real
verification-email preparation/delivery, hidden verification/reset/unknown eventless
rows, denied known-ID read attempts, successful email-token consumption, retained
event notices and the 100-row boundary. The real browser test uses an unverified
account and tests GET/POST non-disclosure alongside read persistence and ordering.

Follow-up: retire or align the legacy Organiser notification read path in
`api/events.ts` only after reviewing its current-organisation filter versus the
all-role recipient-history contract. Eventless filtering and the result cap now
agree; broader authorization changes and pagination are outside this security fix.

The revision was subsequently published and merged in PR #143. The following
run results and postplan describe that historical revision, not the current
working tree. Fresh results belong in a new T-65 execution record.

### Review-revision checks (2026-09-27)

- `npm test --workspace backend`: 208 passed (includes verification-email/token tests).
- `npm run test:event-notifications:db --workspace backend`: 12 passed, including
  verification-token isolation and the 100-result cap.
- `npm run test:auth:db --workspace backend`: 13 passed.
- `npm run test:notifications`: 26 passed; `npm run test:redis`: 2 passed.
- `npm test --workspace frontend`: 48 passed.
- `npx playwright test --config playwright.auth.config.ts`: 10 passed, desktop
  and mobile real login, inbox non-disclosure/read persistence and password reset.
- `npm run test:runtime`: 15 passed; typecheck and build passed.
- `npm run test:db --workspace backend`: 9 passed, 1 failed. First attempt lacked
  migrated public tables required by the older registration fixture. After local
  disposable migration, the unchanged registration concurrency test failed on
  `users_email_key` during concurrent inserts. Its repository, test and migration
  files match main. Record/fix that registration issue separately; do not describe
  the entire database suite or the final unpublished state as all-green.

Only the disposable local database was migrated; no live schema or email changed.

Postplan for this local review revision: https://0lympnguubta.postplan.dev (linked on PR #143).
`python scripts/check.py` passed with 45 tooling tests; the postplan HTML checker
and desktop/mobile visual inspection passed. That postplan describes the then-unpublished revision; PR #143 is now merged.

## Current dependency review (2026-10-02)

Reviewed Jira, GitHub main 1780b3c, current source and live Supabase metadata.
E11-S01 / SCRUM-75 remains In Progress. No E11 runtime changes are needed in this
increment: the newly available producers already integrate the shared writer.

| Story | Needed notification behaviour | Jira | Implementation / PR | Integrate now? | Remaining blocker |
| --- | --- | --- | --- | --- | --- |
| E03-S02 / SCRUM-33 | Clarification questions and responses | In Progress | #163 merged; clarification.ts uses applyEventStatusChange/writeEventNotification | Already integrated | Frontend SCRUM-125/126 belongs to E03 |
| E03-S03 / SCRUM-34 | Approval/rejection with safe decision content | In Progress | #174 merged; decision.ts uses the same transactional writer | Already integrated | Frontend SCRUM-132/133 belongs to E03 |
| E06-S03 / SCRUM-47 | Pending booking request to responsible staff | To Do | Hook only, no operational request caller | No | Request transaction and venue assignments |
| E06-S04 / SCRUM-48 | Booking decision to Coordinator | To Do | Hook only, no operational decision caller | No | Decision transaction |
| E07-S04/S05 / SCRUM-54/55 | Equipment result and shortfall | To Do | Typed hook exists, operational callers absent | No | Reservation/unavailability workflow |
| E07-S06/S07 / SCRUM-56/57 | Assigned Technical Staff | To Do | Tables and event-based recipient query exist | Selector already implemented | Support-request/assignment management |
| E08-S03/S04/S05 / SCRUM-60/61/62 | Confirm, revert, complete | To Do | Generic status hooks exist | No new caller | Readiness, timing and publication workflow |
| E09-S01 / SCRUM-63 | Registered membership | To Do | Table/selector exist, service scaffold | Selector already implemented | Real registration action |
| E09-S04/S05 / SCRUM-66/67 | Waitlist membership and released-place invitations | To Do | Selector/place_released hook exist | No new caller | Joining, claiming and withdrawal transactions |
| E10-S01/S02 / SCRUM-70/71 | Approved effective arrangement changes | To Do | Existing permitted direct edits notify; full change workflow absent | Direct edits already integrated | Change approval, classification and publication |
| E10-S03 / SCRUM-72 | Reschedule | To Do | Arrangement hook exists | No new caller | Reconfirmation/rescheduling transaction |
| E10-S04 / SCRUM-73 | Cancellation before recipient links release | To Do | Before/after hook contract tested | No new caller | Atomic cancellation/release workflow |
| E10-S05 / SCRUM-74 | Lost/replacement venue | To Do | #151 maintenance-block Coordinator alert already merged | Partial producer already integrated | Full at-risk/replacement workflow |
| Explicit venue-to-staff assignment | Responsible staff at old/new venues | No dedicated ticket found | Still absent from live schema | No | E05/E06 owners must supply relationship and trusted resolver |

E03-S01 is now Done: #141 backend and #147 frontend are merged. E05-S03 is
Done: #134/#136 merged. E05-S04 is marked Done although its frontend pilot
SCRUM-120 is To Do; #151 supplies a usable backend, not full frontend evidence.
No E06-S01/E11-S01 work is duplicated by the only currently open PRs: #182
(shared Inter font loading) and #183 (screen inventory).

### Existing producer and test evidence

- `eventLifecycle/clarification.ts`: questions/answers, status, audit and one
  recipient notification/email job commit together; actor excluded.
  `clarification.integration.test.ts` covers notification content and rollback.
- `eventLifecycle/decision.ts`: approval/rejection uses the shared status path;
  the targeted Organiser notice shares the audit ID so the generic notice does
  not duplicate it. `decision.integration.test.ts` covers notices and rollback.
- `venueBooking/blocks.ts`: merged maintenance-block flow uses
  writeEventNotification for affected Coordinators; it does not implement the
  complete E10-S05 replacement workflow. Covered by venueBlocks.integration.test.ts.
- Existing submission/reassignment, direct-edit, inbox, eventless-token isolation
  and delivery-failure suites remain applicable. Do not recreate these producers.

### Current work boundary

Unblocked work is record reconciliation and regression verification of the merged
producers. No additional E11 business caller is missing and unblocked. Venue Staff
assignment and the table's unfinished flows remain owning-story work. Deployment
owner verification of relay/worker scheduling and real mailbox receipt is still
missing; local intercepted provider tests are not that evidence.

Live schema remains event-based: notifications has event_id and no session_id;
event_registrations and tech_staff_assignments support existing selectors. The
live migration ledger stops at 0008 although repository 0009_keepalive_logs.sql
exists; no live migration or configuration changes were made here.

## Fresh verification (2026-10-02)

[Execution session](runs/20261002-161552-jininggg-full-regression.md) records the actual commands, outcomes,
base commit and working-tree qualification. Frontend 201, selected PostgreSQL
51, email/provider 26, Redis 2, runtime 15, venue browser 8 and real auth/inbox
browser 10 checks passed. Backend units, typecheck/build and repository hygiene
also passed. Provider tests do not prove deployed mailbox delivery.

[Final venue browser rerun](runs/20261002-161841-jininggg-frontend-e2e.md): 8 passed after the final copy/fixture corrections.

Publication refresh: main f0c4264 now includes font PR #182. The open-PR
snapshot above predates that merge; only screen-inventory PR #183 remains open.
