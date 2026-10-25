# E05-S05 manual click-through: venue setup and turnaround buffers

Readiness and safe-environment notes for SCRUM-161 / E05-S05 (under parent
story SCRUM-44). The canonical cases are
[TC_E05S05_01–07](../cases/E05.md). This document is not evidence that those
cases have been executed.

## Current readiness

**Update, 19 October 2026 (SCRUM-44):** the branch
`feature/SCRUM-44-venue-buffer-form` adds the venue-form buffer fields
(Bryan's #305 commit) and the case fixtures as setup stages in
[`E05-S05-preconditions.sql`](E05-S05-preconditions.sql). The step-by-step
script, the tester and every run are in
[`docs/plans/scrum-44-implementation-status.md`](../../plans/scrum-44-implementation-status.md).
The readiness table below describes `main` before that branch merges.

The current venue form does not expose setup-time or turnaround-time fields.
Although the backend accepts and stores those fields, there is no supported
browser interaction for changing them. The seeded database also does not
contain the adjacent Orchid Hall bookings described in the cases; its seeded
confirmed Orchid Hall booking is dated 6 October 2026. Do not claim the manual
scenarios passed or improvise API/SQL changes as browser steps.

Until the venue UI and suitable current booking fixtures exist, the following
cases are blocked for this manual click-through:

| TC_ID | Manual status | Blocker |
| --- | --- | --- |
| TC_E05S05_01 | BLOCKED; not run | No venue-form controls to set or save either buffer. |
| TC_E05S05_02 | BLOCKED; not run | No buffer controls and no suitable current confirmed booking fixture. |
| TC_E05S05_03 | BLOCKED; not run | No buffer controls or seeded adjacent confirmed booking pair. |
| TC_E05S05_04 | BLOCKED; not run | No supported browser flow to create the required prospective booking and set its buffer. |
| TC_E05S05_05 | BLOCKED; not run | No supported browser flow for the required booking/block preconditions and buffer setting. |
| TC_E05S05_06 | BLOCKED; not run | The venue form does not expose the values for this browser check. |
| TC_E05S05_07 | BLOCKED; not run | No buffer controls and no suitable current booking fixture. |

These statuses describe readiness only, not test outcomes. Do not create a
manual T-65 run record for these cases unless a tester actually executes them.
Do not change SCRUM-161's Done state; follow the team's rule for follow-up work
on a Done story.

## Safe local environment

Do not use a live deployment, a production URL, or any database whose target is
not positively identified as a local disposable database. A Vercel preview is
not known to use a non-production database and is not an approved target for
these scenarios.

Use an already available native PostgreSQL service listening on loopback; do
not start Docker Desktop for this workflow. In each backend terminal, set
`LOCAL_DB` to that disposable database's connection URL. Before running a
database command, verify that its hostname is `localhost`, `127.0.0.1`, or
`::1` and that the database is dedicated to development/testing (for example,
`connectsphere_dev_stack`). Do not reuse a shared or production `.env` value.

The CLI `reset` command drops and recreates the `public` schema, then applies
migrations and seeds data. It has a reset guard, but the guard also accepts a
database name containing `dev` or `test`; independently verify the target host
is loopback before running it. Never set `ALLOW_DATABASE_RESET` to bypass the
guard. This documentation change did not run reset or seed any database.

Only after the target is verified, initialize the disposable database and
start the API and frontend in separate terminals:

```bash
# Terminal 1, from the repository root. Set LOCAL_DB in this terminal first.
cd backend
DATABASE_URL="$LOCAL_DB" npx tsx src/database/cli.ts reset
# Keep this API process running in this terminal.
DATABASE_URL="$LOCAL_DB" DATABASE_POOLER_URL='' APP_URL=http://127.0.0.1:5173 npx tsx src/dev.ts
```

```bash
# Terminal 2, from the repository root.
cd frontend
npx vite --host 127.0.0.1 --port 5173 --strictPort
```

Open `http://127.0.0.1:5173`. If local setup or the disposable database cannot
be verified, stop; do not substitute a deployed environment. Seeded account
passwords are defined by `seedCredential` in
`backend/src/database/cli.ts`; do not copy the literal credential into this
guide.

## Readiness required before manual execution

Before filling in case-specific browser steps, verify on the implementation
branch that:

1. The venue screen exposes supported controls for editing and saving both
   buffer values.
2. The local fixture or an approved browser flow supplies the required
   confirmed bookings, event times and maintenance block, with the preconditions
   matching the canonical cases.
3. The specific test sequence states the starting value for every edit and
   either restores state between cases or accounts for the value left by the
   previous case. Do not assume a zero-minute starting value after another case
   has set 45 minutes.

An isolated fixture may be prepared with disclosed SQL before execution, without
bypassing booking guards. Record its starting buffers, booking periods and setup
method. That setup alone doesn't invalidate a calendar, search or conflict
consumer check. It never proves the venue-form edit/save action: execute that
action in the browser when the case requires it. For TC_E05S05_03, create both
bookings with setup and turnaround at 0, then change turnaround to 45 through
the venue form. Don't insert already-overlapping active bookings.

Once those prerequisites exist, record only observed results under T-65 using
[`docs/testing/runs/README.md`](../runs/README.md) and the run-record template.
For manual runs, include the actual result for every row. Do not mark this
story complete or claim acceptance from this readiness document.
