# Release 1 architecture

ConnectSphere is a **TypeScript modular monolith** exposed through Vercel
Functions, with one **React/Vite single-page application** for seven roles.
This is the as-built snapshot of main `0773a721` on 5 November 2026, not a
claim that every Jira story is accepted.

The maintained [design catalogue](design/README.md) contains C4 context,
containers and API components; a user journey and lifecycle; balanced Level 0/1
DFDs; selected physical ERDs; and focused UML code/sequence views. Every view
has one editable `.mmd` source and an explanation with source references.
Start with [C4 containers](design/02-c4-containers.md).

## Runtime boundaries

- `frontend/`: React, React Router, Vite, TypeScript and plain CSS/shared UI
  components. Browser validation improves feedback; trusted rules remain server-side.
- `api/`: Vercel function adapters with consolidated query-task routing and
  rewrites in `vercel.json`. Local `backend/src/dev.ts` mirrors the adapters.
- `backend/src/modules/`: access control, visibility, event lifecycle/Sessions,
  venue booking, equipment/support, readiness/safety, registration/attendance,
  change management and durable notifications. These collaborate in-process.
- `backend/src/database/`: `pg` pools and transactions; parameterized SQL with
  PostgreSQL ranges, locks and constraints. `DATABASE_POOLER_URL` takes precedence
  over `DATABASE_URL`. Migrations live in `backend/database/migrations/`.
- Supabase hosts PostgreSQL. Custom cookie sessions use token digests in SQL;
  this application does not use Supabase Auth or browser database credentials.
- Business state, audit, inbox and email delivery rows commit atomically. Redis
  holds delivery IDs; relay/worker handler modes call Upstash and Brevo over HTTPS.
- GitHub Actions builds/deploys with Vercel CLI. `vercel.json` disables direct Git
  deployments and declares two daily cron paths. There is no independently
  deployed always-running worker or declared frequent worker cron.

## Important design limits

The runtime still uses one `users.role` value even though ADR-019 accepts a
multi-role target. Initial Safety Review is Coordinator-triggered; automatic
entry applies to eligible re-entry after arrangements are reconfirmed. Safety
factors/decisions are audit data, not a separate physical safety_checks table.
Read the [discrepancy inventory](design/README.md) and
[decision reconciliation](decisions/release-1-as-built-reconciliation.md) before
using earlier target diagrams as evidence.

Draft submission validates Event and independent Session dates under the Event
and Session locks. Session writers recheck status using the same Event lock, so
queued writes cannot bypass submission. Failed validation rolls back, preserving
the Draft. See [the submission sequence](design/12-sequence-submission.md) and
[date-horizon contract](contracts/event-date-horizon.md).
