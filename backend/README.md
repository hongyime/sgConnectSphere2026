# Backend

TypeScript backend scaffold for Vercel Functions and provider integration seams.

## Runtime shape

- API handlers live in `api/` so Vercel can deploy them as serverless functions.
- Shared backend code lives in `backend/src/`.
- Module contracts live in `backend/src/modules/`; they define repository,
  service, access-control, audit, status, and notification boundaries.
  E01-S02 and E01-S03 include implemented PostgreSQL access checks.
- Upstash Redis is the queued notification transport.
- Brevo is the initial transactional email provider.
- PostgreSQL stores accounts, password hashes, sessions, events and audit records.
  Apply the migrations before serving authenticated routes; Supabase Auth is not used.
- PostgreSQL holds notification payloads and outcomes. Redis holds delivery IDs.
- Versioned database migrations live in `backend/database/migrations/`.

## Commands

Run from the repository root:

```text
npm install
npm run typecheck --workspace backend
npm run build --workspace backend
npm run test:runtime
```

Backend and API imports use explicit `.js` extensions (including `index.js` for
directory entry points). TypeScript's `NodeNext` resolution checks these paths
against the TypeScript sources and preserves them for the Node ESM runtime.

The runtime tests compile the backend and API into a temporary directory, then
load the emitted handlers in fresh Node processes. They check the health response
and method/authentication rejection paths with no provider credentials and with
outgoing fetch requests blocked. These checks do not validate live notification
delivery, database access, or production configuration.

The current API routes are deployable scaffolding only:

- `GET /api/health`
- `POST /api/notifications/send`
- `GET /api/cron/outbox-relay`
- `GET /api/cron/notification-worker`

## Durable notifications

This implements the dispatch boundary from ADR-006 in the primary architecture
Word document. Business services must use `inTransaction` and call
`insertNotificationDelivery` with the same database client as the business write.
Both changes then commit or roll back together. The separate event-create route
is preserved, but notification-producing business workflows still need to call
this helper. This does not claim complete event or registration workflows.

The internal `POST /api/notifications/send` contract now accepts only
`{"deliveryId":"<committed-delivery-uuid>"}` with the configured internal secret.
It prepares an existing email delivery using its notification and user rows.
Arbitrary `to`, `subject` and `html` request payloads are rejected. Callers of the
old scaffold must adopt the transaction helper and delivery ID contract before
release. Preparation does not send or publish an email.

The separate relay publishes at most five committed IDs. The separate worker
peeks at most five pointers, obtains a PostgreSQL send lease, sends once, records
the outcome, then acknowledges the pointer. A pointer cannot replace a stored
payload. Expired/ambiguous sends remain `uncertain` for provider reconciliation;
they are never automatically resent. Explicit provider throttling retries after
15 minutes, at most five attempts. Duplicate pointers do not create new emails.
Published pointers can be rebuilt from SQL after five minutes if Redis loses
them; a rebuild does not postpone a due email retry.

Requests are bounded: database pool two connections with query timeouts, Redis
three seconds and exactly one request per command, email five seconds and one
request per send. Redis holds at most 1,000 pointers; a full queue leaves pending
deliveries in PostgreSQL. Payloads are capped at 64 KiB before transaction commit.
Retained failures still consume database space; these bounds do not prove that
monthly usage or total retained history fits any provider allowance.

## Activation and retained data

1. Verify the intended Supabase database and quota headroom. Run migrations using
   a migration connection only after checking existing schema/history and a
   recovery copy. Migration `0002` is additive, preserves old rows, and makes the
   outbox private to server access. It does not secure all other scaffold tables.
2. Verify `DATABASE_URL` uses the intended server role and pooler. The migration
   grants outbox access to `connectsphere_app` only if that role already exists;
   role creation and grants for business tables are separate provisioning work.
   Never supply a database connection string to the browser.
3. Inventory the legacy Redis list with
   `npm run notifications:inspect-legacy --workspace backend`. It returns the
   count and lengths of at most five records, without content or mutations.
   This is an inventory, not an import. Preserve the old list until a lossless SQL
   archive/import, delivery mapping, and count/hash parity are verified. The new
   transport uses the suffix `:delivery-ids:v2` and never consumes the old list.
4. Verify provider configuration and agree the separate worker host/cadence.
   `vercel.json` still contains only the existing daily relay schedule. It does
   not schedule the new worker or meet ADR-006's low-latency target. No additional
   frequent Vercel cron or paid host is introduced here.
5. Keep `NOTIFICATION_RELAY_ENABLED` and `NOTIFICATION_DELIVERY_ENABLED` false
   until those checks pass. Both endpoints require the internal secret and their
   own activation flag. After activation, monitor retained pending, failed and
   uncertain outcomes alongside quota usage. Pause with the flags; retain SQL
   and Redis history. Do not roll back to the destructive raw-email worker.

This PR prepares code and tests; it does not migrate a live database, archive a
live legacy queue, configure a scheduler, enable delivery or send test emails.

## Notification regression tests

`npm run test:notifications` requires a disposable PostgreSQL 17 database on
loopback, named `connectsphere_notification_test` (or that prefix plus a suffix),
in `TEST_DATABASE_URL`. Tests create isolated schemas and synthetic records and
exercise real transactions, row locks, RLS and migration preservation. Provider
HTTP requests are intercepted, including those from the installed Redis SDK.

`npm run test:redis` requires an isolated Redis service on loopback in
`TEST_REDIS_URL`. It exercises the actual Lua scripts, queue capacity and exact
legacy-byte preservation using synthetic keys. CI provisions both services;
neither test command accepts a live provider URL. These tests do not validate
live provider credentials, actual email delivery or complete browser journeys.

Do not commit real provider tokens or service-role keys.

## Database tests without a local PostgreSQL

`backend/tests/deactivation.integration.test.ts` runs against the `test` schema
in the shared Supabase project, inside a transaction that is always rolled back,
so it needs no local database at all. Every other database test still requires
loopback PostgreSQL because it creates a fresh schema per run. The reasons, the
verified schema contents and the commands are in
[Supabase test schema](../docs/testing/supabase-test-schema.md).

## Access and Identity

The organiser and attendee event APIs use PostgreSQL-backed sessions. See
[attendee setup and verification](../docs/testing/attendee-event-visibility.md)
for migrations, credentials, publication and acceptance evidence. API routes:

- `POST /api/auth/session` and `DELETE /api/auth/session`
- `GET /api/events`
- `GET /api/attendee/events`
- `GET /api/internal/planning` (denial and auditing)
- `POST /api/events/publish` (assigned coordinator only)
