# E01-S04: Profile editing scope and integration

The user clarified that ordinary profile editing may change full_name, email and
contact_number only. Each is required. Email is trimmed and lowercased, validated,
and protected by the existing unique indexes. Keeping one's own email is allowed.
Role, identity, organisation and security/admin fields are rejected, not persisted.

## Organisation clarification / backlog blocker

The primary test workbook TC_E01S04_01 describes changing Client A Pte Ltd to
Client A Holdings. However, CLIENT_ORGANISATIONS is shared and USERS.client_org_id
controls event access. No permission model distinguishes renaming a shared record,
switching membership, or a separate authorised organisation-management workflow.
The explicit E01-S04 clarification therefore makes organisation read-only. Display
the existing relationship; do not rename, switch or create organisations. The original
organisation-editing acceptance criterion remains blocked pending that decision.

## Authentication and notification behaviour

GET and PUT /api/account/profile reuse the existing cs_access cookie, auth_sessions
and currentUser resolver used by the event UI. The server derives the user ID from
the session. PUT also checks Origin against APP_URL, as the session endpoint does.
Inactive and locked accounts cannot read or update their profile. Responses project
only profile fields and contain no password hashes or security/admin state.

The separate Supabase bearer-token adapter is not used by this cookie-based feature.
That adapter currently maps users by email; changing local email does not update a
Supabase identity. Reconciliation with that separate integration is outside E01-S04.

New notification deliveries join notifications.user_id to USERS.email when preparing
the delivery. They use the new address after a successful update. Already prepared
or attempted deliveries retain their original recipient for durable retry semantics;
profile editing does not rewrite them. No notification migration is required.

## Run and verify

Apply existing migrations with npm run db:migrate. Set DATABASE_URL (or the existing
DATABASE_POOLER_URL) and APP_URL=http://127.0.0.1:5173 in the API process environment.
Run npm run dev --workspace backend and npm run dev in separate terminals. Open
http://127.0.0.1:5173/profile and sign in with an existing account. Local development
now routes profile and existing session requests through the same API server.

- npm run test:profile --workspace backend: service, authorization and endpoint tests.
- npm run test:profile:db --workspace backend: isolated PostgreSQL integration test;
  requires an explicit disposable TEST_DATABASE_URL. Exercises real migrations,
  sessions, persistence, uniqueness and future notification recipient preparation.
- npm run test:e2e -- tests/e2e/profile.spec.ts: desktop/mobile UI tests with mocked APIs;
  start the frontend first. These do not claim database or real email delivery coverage.
- npm run typecheck and python scripts/check.py: type and repository hygiene checks.

No new authentication system, organisation table, or profile email copy is introduced.
