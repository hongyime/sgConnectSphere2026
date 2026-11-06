# ConnectSphere

ConnectSphere is an event-planning and venue-booking application built for
IS212 Software Project Management, AY2026/27 Term 1, Team 8. It brings event
requests, venue and equipment arrangements, technical staff, safety review and
attendee registration into one shared record.

The client currently coordinates work through email, spreadsheets, calendars and
messages. This creates conflicting versions, missed changes and reservations that
remain occupied after cancellation. ConnectSphere links these activities so users
can see the current status and who changed it. Requirements originate in the
[customer briefing](docs/bdr/customer-sources/README.md) and the clarified
[Release 1 backlog](docs/backlog/release-1/).

## Live demo

**[Open ConnectSphere](https://sgconnectsphere.vercel.app)**.
Use the team's provisioned demo accounts. Local seed credentials are documented
in [the seed specification](tests/seed/SEED_DATA.md); local seed data is not a
production account inventory.

## Release 1 features

- Role-scoped access for Organisers, Coordinators, Coordinator Leads, Venue Staff,
  Technical Support Staff, Attendees and Safety Officers; profile and account flows.
- Event requests, Drafts, reuse, Session authoring and Singapore-local date validation.
- Coordinator assignment, clarification, decisions, discussion and tracking.
- Venue catalogue, layouts/accessibility, suitability, availability, holds,
  setup/turnaround buffers, booking decisions and conflict prevention.
- Equipment requests, reservations, operational shortfalls, Session links and
  Event-level technical-support staffing.
- Readiness and safety decisions, event completion, cancellation/resource release,
  change requests and arrangement reconfirmation.
- Session-selecting registration, capacity/Pending decisions, registration windows,
  waitlists, withdrawal and attendance.
- In-app notifications, durable email delivery plumbing and activity records.

These are implemented areas, **not a declaration that every story is Done**.
At the 6 November Jira refresh, E04-S02, E08-S04 and E10-S02 were In Review;
E10-S01 and E11-S01 were In Progress; E07-S08 was Done. See the
[scope and discrepancy inventory](docs/design/README.md) for the precise snapshot.
Multi-role switching, reporting/exports, SMS and payments are not claimed as built.

## Tech stack

| Layer | Implementation |
| --- | --- |
| Browser | React, React Router, TypeScript, Vite, plain CSS and shared UI components |
| Server | Node.js, TypeScript ESM, Vercel Functions in `api/`, domain modules in `backend/src/` |
| Persistence | PostgreSQL through `pg`, parameterized SQL, ranges, constraints and transactions |
| Hosted database | Supabase PostgreSQL; custom cookie sessions, **not Supabase Auth** |
| Notifications | PostgreSQL outbox, Upstash Redis REST transport, Brevo HTTPS email API |
| Testing | Node test runner/c8, Vitest/Testing Library, Playwright, Stryker mutation testing |
| Tooling and delivery | Python repository checks, GitHub Actions, Vercel CLI deployment |

This is **React/Vite, not Next.js**. Repository topics and old proposals do not
change what the manifests and executable code implement. Dependency versions are
locked in `package-lock.json`; the backend uses no ORM and the UI uses no Tailwind.

## Architecture overview

One browser SPA calls same-origin API handlers. Handlers authenticate the caller,
check role/ownership/organisation access, and invoke modules in a modular monolith.
Business changes, audit records and eligible notification rows commit in one SQL
transaction. Relay and worker handler modes deliver committed notifications;
they are not separate always-running processes.

See the [C4 container diagram](docs/design/02-c4-containers.md),
[architecture overview](docs/architecture.md), and
[complete Mermaid design catalogue](docs/design/README.md).

Known target-versus-code differences are explicit: the runtime checks one
`users.role`; initial safety submission is Coordinator-triggered while eligible
re-entry is automatic; `vercel.json` does not declare a frequent email-worker
schedule. Read [the decision reconciliation](docs/decisions/release-1-as-built-reconciliation.md).

## Team members and roles

| Member | Scrum role |
| --- | --- |
| Bryan | Product Owner |
| Amareet | Scrum Master and Developer |
| Aaron | Developer |
| Le Xin | Developer |
| Xiang Ying | Developer |
| Ji Ning | Developer |

Contribution and review history live in GitHub PRs; accountable story owners live
in Jira. [CODEOWNERS](.github/CODEOWNERS) lists the six GitHub accounts. A role
is not a claim that one person wrote every file in that area.

## Prerequisites

- Git and npm 10+.
- **Node.js 22.22.2 or newer compatible 22.x**. The project engine says 22+, but
  current locked browser-test dependencies require a newer patch than 22.20.
  Verification used Node 22.23.4; older patches can emit engine warnings.
- Python 3.12+ for repository tooling (`python3` or `py -3.12` may replace `python`).
- Native PostgreSQL 17 and its `createdb`/`psql` commands for disposable local
  development and real-database tests. Do not start Docker Desktop for this workflow.
- Internet access for initial dependencies, hooks and Playwright browser download.

Redis and email-provider credentials are optional for ordinary local UI work;
provider delivery stays disabled locally. Dedicated live-provider tests require
separate approval and configuration.

## Setup from a fresh clone

The shell examples below use macOS/Linux syntax. On Windows, set the same
variables through PowerShell and use the equivalent native PostgreSQL service.

```bash
git clone https://github.com/hongyime/sgConnectSphere2026.git
cd sgConnectSphere2026
npm ci
python scripts/setup.py
cp .env.template .env
```

`setup.py` creates isolated Python tooling and installs this clone's hooks.
It does not change global Git settings. Keep `.env` private and uncommitted.

Create an empty local database using your native PostgreSQL login:

```bash
createdb connectsphere_local
```

Edit `.env`. Use your local database role/port; these are **examples**, not hosted
credentials:

```dotenv
APP_ENV=development
APP_URL=http://127.0.0.1:5173
PUBLIC_SITE_URL=http://127.0.0.1:5173
ADDITIONAL_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DATABASE_URL=postgresql://localhost:5432/connectsphere_local
DATABASE_POOLER_URL=
NOTIFICATION_RELAY_ENABLED=false
NOTIFICATION_DELIVERY_ENABLED=false
```

Leave `DATABASE_POOLER_URL` empty locally: a nonempty value overrides
`DATABASE_URL`. `.env.template` enumerates all referenced settings; most cloud,
email and Jira values are not needed for local browsing. Never copy hosted
credentials into screenshots or committed files.

Apply migrations and synthetic data **only to that disposable local database**:

```bash
node --env-file=.env --import tsx backend/src/database/cli.ts migrate
node --env-file=.env --import tsx backend/src/database/cli.ts seed
node --env-file=.env --import tsx backend/src/database/cli.ts validate
```

Do not reset/seed shared Supabase or bypass the reset guard. The migration runner
uses its ledger and exact migration filenames; do not infer ordering from numeric
prefixes alone. Hosted migrations follow [the production procedure](docs/ops/production-migrations.md).

## Running locally

Keep these running in separate terminals from the repository root:

```bash
# Terminal 1: API on 127.0.0.1:3001; explicitly loads the root .env
node --env-file=.env --import tsx backend/src/dev.ts
```

```bash
# Terminal 2: browser app on 127.0.0.1:5173
npm run dev
```

Open **http://127.0.0.1:5173**. Vite proxies `/api` to port 3001. If ports are
changed, align the API proxy and allowed origins. `Request origin not allowed`
usually means the backend did not load `.env` or the exact browser origin is
absent from the allowlist; preserve the Origin check rather than disabling it.

The backend npm `dev` script does not itself load the root `.env`; the explicit
Node command above does. Sign in using an account from the local seed specification.

## Running tests

From the root:

```bash
python scripts/check.py
npm run typecheck
npm run build
npm test --workspace backend
npm test --workspace frontend
npm run test:runtime
```

The Python check covers repository hygiene and tooling, not application behavior.
The backend unit command can skip an optional database-contract case when no test
database is supplied. Review the actual summary rather than treating a green exit
as proof of every acceptance criterion.

For real-stack browser tests, create a **separate empty disposable database** with
the required fixture name, then set `TEST_DATABASE_URL` to it:

```bash
createdb connectsphere_notification_test
export TEST_DATABASE_URL=postgresql://localhost:5432/connectsphere_notification_test
npx playwright install chromium
npm run test:e2e:auth
```

That suite creates isolated schemas, starts the API on 3006 and Vite on 5176,
and runs desktop/mobile cases. Keep those ports free. Its database guard requires
loopback and the `connectsphere_notification_test` name or an underscore suffix.
A refusal of an unsafe target is intentional. Never point it at shared Supabase.
The broader `npm run test:e2e` command includes the acceptance scaffold with
fixme/skipped cases; it is not equivalent to the real-stack suite above.

```bash
npm run test:mutation
```

Stryker currently mutates only `eventLifecycle/service.ts` and `status.ts`, using
the configured TAP tests. Reports go to `reports/mutation/`. The configured break
threshold is zero, so successful execution alone is not a quality target; inspect
the mutation score and surviving mutants. The verification snapshot scored 72.73%.

[Testing documentation](docs/testing/README.md) describes case traceability,
manual screenshots and immutable execution records. Record evidence cited in a
PR/demo under `docs/testing/runs/`; never substitute automated screenshots for a
human manual run. [Verification results](docs/testing/runs/20261105-232435-xiangyingg-full-regression.md)
record what was actually run for this README, including failed setup attempts.

## Deployment

The existing `.github/workflows/vercel-deploy.yml` is the single deployment path.
It pulls the configured Vercel environment, builds, and deploys the prebuilt
artifact. Production follows `main`; eligible ready human PRs receive previews.
The Vercel Git deployment integration is disabled in `vercel.json`.

A maintainer provisions Vercel project settings and secrets outside Git. The
workflow uses `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`; application
configuration belongs in the appropriate Vercel environment. No real values are
stored here. Supabase migrations and provider activation are separate controlled
operations; a code deploy is not permission to reset data or enable email.
See [deployment decision 0010](docs/decisions/0010-single-vercel-deploy-path.md),
[production migrations](docs/ops/production-migrations.md), and the
[notification readiness evidence](docs/testing/e11-s01-readiness-20261105.md).
This README verification did not deploy or send live email.

## Project structure

```text
api/                           Vercel route adapters and protected cron modes
frontend/src/app/              Router, session context and application shell
frontend/src/features/         Role/domain screens
frontend/src/shared/           Reusable UI blocks and helpers
backend/src/modules/           Domain logic, repositories and access checks
backend/src/database/          Pool, transaction and migration/seed tooling
backend/src/providers/         Redis and email integration adapters
backend/database/migrations/   Versioned SQL migrations
tests/                        Browser, notification and runtime tests
tooling/                      Python repository tooling and tests
scripts/                      Setup, checks, exports and repository operations
docs/                         Requirements, architecture, testing and decisions
```

## Documentation

- [Release backlog](docs/backlog/release-1/) and [source-of-truth rules](docs/source-of-truth.md).
- [Testing and evidence](docs/testing/README.md).
- [System designs](docs/design/README.md) and [UI design language](design.md).
- [Architecture decisions](docs/adr/README.md) and [decision register](docs/decisions/README.md).
- [Repository setup guide](docs/repository-setup.md) for tooling policy and history.

## Contributing

Follow [CONTRIBUTING.md](CONTRIBUTING.md): short-lived branches, conventional
commits, honest verification evidence and independent human review. Run
`python scripts/check.py` and `python scripts/doc_guard.py` before committing.
A merged code PR and final story acceptance are separate checkpoints.

## License

[Apache License 2.0](LICENSE).
