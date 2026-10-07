# E01-S11: Account deactivation

## Accepted rules

T-52 through T-55 in docs/bdr/B-team-decisions.md and E01-S11 Scenarios 3/4
in docs/backlog/release-1/E01-access-identity.md are authoritative:

- Block coordinators only for submitted, under_review, awaiting_clarification,
  approved, planning or confirmed assignments. Dates do not exempt these statuses.
- Upcoming means lower(event_range) > transaction timestamp. At the exact start,
  and after it, retain registrations unchanged.
- Ignore withdrawal_deadline during account deactivation.
- Withdraw both registered and waitlisted upcoming entries, setting withdrawn_at.

The older proposal footer still says it is a proposal; its newer accepted status,
numbered BDR entries and amended backlog supersede that text. No new business
rule or timed window is introduced. No sessions table for event sessions exists;
event_range is the current event timing model.

## Implementation

DELETE /api/account/profile with JSON {"confirm":true} reuses the existing profile
route (ADR-014 function limit), cs_access session and same-origin protection.
Other body keys, including user_id and role, are rejected. The session supplies
the user ID; the transaction reloads and locks the database user for role/status.
The account lock serializes deactivation with existing login transactions.

The transaction checks coordinator assignments, withdraws eligible attendee rows,
sets is_active=false and deactivated_at, deletes all auth_sessions for that user,
and appends Account Deactivated to audit_logs with actor, entity and timestamp.
Failures roll back all changes. No user, registration or historical event row is
removed. A known already-inactive account returns 409; a revoked session returns
401. Success expires the browser cookie and the profile UI navigates to /login.

## Remaining integration dependencies

The current E09 backend registration service/repository are scaffolds. The attendee
registration UI uses mock counts. Withdrawing a registered row reduces occupied
places counted by status='registered'; no separate capacity counter is introduced.
The real register/capacity/waitlist-notification workflow must consume this state
when E09 is implemented. No automatic waitlist promotion is added. Future assignment
and registration writers must reject inactive users under the same user-row locking
protocol; those writers are not implemented by this story.

## Run

Use the existing migrated database, APP_URL and cookie-login setup. Run
npm run dev --workspace backend and npm run dev, open /profile, then choose
Deactivate Account and Confirm deactivation. The UI explains retention and withdrawal.

- npm run test:deactivation --workspace backend
- npm run test:profile --workspace backend
- npm run test:deactivation:db --workspace backend
- npm run test:e2e -- tests/e2e/deactivation.spec.ts tests/e2e/profile.spec.ts
- npm run typecheck
- npm run build
- python scripts/check.py

Database tests accept TEST_DATABASE_URL or the existing DATABASE_POOLER_URL /
DATABASE_URL environment variables. They use the test schema per T-59, verify
all table lookups resolve to test, and run fixtures in an outer transaction that
always rolls back. If test is absent, the base/auth migrations are applied there
inside that rollback-only transaction; public tables are never used as fixtures.
The service transactions run as real savepoints in this harness. Configure the
existing pgcrypto and btree_gist extensions beforehand. To load local .env safely:
node --env-file=.env --import tsx --test backend/tests/deactivation.integration.test.ts

Browser tests mock API responses; database tests separately verify persistence,
login rejection, session revocation, exact timing boundaries, all blocking statuses,
retained attribution, status-derived occupied places and audit-failure rollback.
