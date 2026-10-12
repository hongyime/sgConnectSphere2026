# E06-S02 manual click-through: advisory venue suitability

Partial acceptance check for SCRUM-46, following the format of
[E07-S06](E07-S06-click-through.md) and the
[T-65 recording rules](../runs/README.md). Source cases:
[TC_E06S02_01–05](../cases/E06.md), with the operating-hours decision T-77.

This is a script, not evidence that a human has run it. Expected messages were
checked against current source code; runtime confirmation is still required.
The seeded names differ from the illustrative Riverside Hall/coordinator_1
names in the cases. Here, coord_a and EVT-3001 provide the real seeded fixtures.
Do not claim full TC_E06S02_04: booking submission and staff presentation await
E06-S03/S04. Checking advisory copy alone does not prove booking acceptance.

## Set up first (Windows PowerShell)

Open Docker Desktop and wait for its engine to be running. Use three terminals
at the repository root. These commands create a dedicated disposable database;
do not load `.env`, use the shared Supabase URL, or set `ALLOW_DATABASE_RESET`.
Replace `<local-password>` with a local-only password suitable for a URL.
Do not put its value in the committed run record.

### Terminal 1: local database

```powershell
docker info --format '{{.ServerVersion}}'
docker run -d --name connectsphere-e06s02-pg -e POSTGRES_PASSWORD=<local-password> -p 127.0.0.1:55434:5432 postgres:17
docker exec connectsphere-e06s02-pg pg_isready -U postgres
docker exec connectsphere-e06s02-pg psql -U postgres -c "CREATE DATABASE connectsphere_e06s02_manual"
$env:DATABASE_URL = 'postgres://postgres:<local-password>@127.0.0.1:55434/connectsphere_e06s02_manual'
npx.cmd tsx backend/src/database/cli.ts reset
```

Wait for `pg_isready` to report accepting connections before creating the DB.
If this dedicated container/database already exists, start it with
`docker start connectsphere-e06s02-pg`, then run the URL assignment and reset
again. Reset destroys data in this dedicated database only. Check the URL
points to `127.0.0.1:55434/connectsphere_e06s02_manual` before executing it.

### Terminal 2: API

```powershell
$env:DATABASE_URL = 'postgres://postgres:<local-password>@127.0.0.1:55434/connectsphere_e06s02_manual'
$env:ADDITIONAL_ALLOWED_ORIGINS = 'http://127.0.0.1:5173'
npx.cmd tsx backend/src/dev.ts
```

Wait for `Local API ready`. Keep this terminal open.

### Terminal 3: frontend

```powershell
npm.cmd exec --workspace frontend -- vite --host 127.0.0.1 --port 5173 --strictPort
```

Use a browser in Singapore timezone. Sign in at
http://127.0.0.1:5173/login as `coord_a@connectsphere.com`, using
`seedCredential` from `backend/src/database/cli.ts`. Do not record the password.
Keep API and browser console errors if a step fails, with secrets removed.

## A. Recorded requirements and a full match (TC_E06S02_01, 03)

1. Open http://127.0.0.1:5173/coordinator/events/EVT-3001/venues.
   The event is **EVT-3001 Approved Annual Conference**. Confirm defaults:
   15 October 2026, 09:00–17:00 Singapore time, attendance 150, Theatre.
2. Click **Search venues**. Locate **Cedar Auditorium**, then click its
   **Check recorded event requirements** link. Save this detail URL for later.
3. Expect **Venue suitability**, **Cedar Auditorium**, **Suitable**, and
   **This venue meets all recorded requirements.** No **Unmet requirements**
   section should appear. Capacity compares 150 required against 450 provided
   for Theatre. Hours are 08:00:00–22:00:00 under
   **Operating hours (Singapore time)**. Inspect the layout, accessibility,
   facilities and availability comparison cards too.
4. Refresh. The same recorded event/venue assessment should return.
5. Click **Back to venue search**. Change search attendance to 500 and search.
   Cedar is now a search near match. Open its assessment again: it must still
   show the recorded requirement 150 and **Suitable**. Search overrides must
   not alter the event or the assessment's authoritative requirements.

## B. A named capacity failure (TC_E06S02_02, partial fixture coverage)

6. Reload the event search to restore defaults; search again. Open
   **Orchid Hall** through **Check recorded event requirements**.
7. Expect **Unsuitable** and under **Unmet requirements**:
   **Capacity 120 is below the required 150 places.** The effective Theatre
   capacity is 120 despite the venue maximum being 200.
8. Confirm the advisory paragraph begins **Suitability is advisory. An
   unsuitable venue may still be requested for Venue Staff to review.**
   There is no implemented booking submission to exercise on this screen.
   This case verifies capacity naming, not the canonical case's additional
   missing-wheelchair fixture. Record that limitation, not a full-case claim.

## C. Hours boundaries and E06-S01 regression (TC_E06S02_05)

Use Cedar, which otherwise satisfies EVT-3001. In terminal 1 define this
local fixture helper. It targets the named Docker container directly; it does
not use `.env`. These SQL edits arrange test data, not an event-edit UI test.

```powershell
function Set-ManualEventPeriod([string]$Period) {
  $sql = "UPDATE events SET event_range = '$Period'::tstzrange WHERE event_code = 'EVT-3001';"
  docker exec connectsphere-e06s02-pg psql -v ON_ERROR_STOP=1 -U postgres -d connectsphere_e06s02_manual -c $sql
}
```

For each row below, call the helper with its period, expect `UPDATE 1`, then
refresh the saved Cedar assessment URL. Inspect the displayed event period
before judging the result. Record each boundary separately.

| Check | Command argument to Set-ManualEventPeriod | Expected assessment |
| --- | --- | --- |
| Fully within | `'[2026-10-15 09:00+08,2026-10-15 11:00+08)'` | Suitable; no hours failure |
| Exact boundaries | `'[2026-10-15 08:00+08,2026-10-15 22:00+08)'` | Suitable; no hours failure |
| Starts before opening | `'[2026-10-15 07:59:59+08,2026-10-15 11:00+08)'` | Unsuitable; `Event is outside operating hours.` |
| Ends after closing | `'[2026-10-15 09:00+08,2026-10-15 22:00:01+08)'` | Unsuitable; same explicit failure |
| Crosses midnight | `'[2026-10-15 21:00+08,2026-10-16 09:00+08)'` | Unsuitable; same explicit failure |

For example:

```powershell
Set-ManualEventPeriod '[2026-10-15 07:59:59+08,2026-10-15 11:00+08)'
```

9. While the early-start fixture is active, open the event search in another
   tab, reload defaults, and click **Search venues**. Cedar must remain
   **Suitable** in E06-S01 search, while its E06-S02 assessment is
   **Unsuitable** with the hours failure. Inspect both pages and save a
   screenshot of each. Search operating hours remain display-only.
10. Restore the original fixture when finished:

```powershell
Set-ManualEventPeriod '[2026-10-15 09:00+08,2026-10-15 17:00+08)'
```

## D. Presentation and access checks

11. Use a narrow browser window/mobile emulation. Confirm comparison values,
    failures and the back link remain readable without horizontal page overflow.
12. In a signed-out private window, open the saved assessment URL. Confirm
    the assessment data is not shown. Record the actual redirect/message.
    Do not mark this as a test of every forbidden role.

## Record the human run

After performing the steps, create a new run file using
`docs/testing/runs/TEMPLATE.md`; never overwrite an existing execution record.
Use the actual Singapore timestamp and your GitHub login, with:
`scope: frontend/e2e`, `environment: local`, `run_type: manual`,
`database: real`, `test_case_version: 081026` (verify still current).
Get the commit using `git rev-parse --short HEAD`. If code is uncommitted,
explicitly state the branch and that the run included working-tree changes;
the SHA alone does not identify those changes. Add the PR number only if known.

Copy the rows below into that record and fill actual observations. Blank
outcomes below are intentional: this file is a plan, not a completed run.
For each hours boundary use its own row. Attach screenshots to the PR and
reference them in Remarks without credentials or personal paths.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S02_01 | Recorded event requirements and refresh | | Steps 1–5: actual event, capacity, result and override behaviour |
| TC_E06S02_03 | All recorded requirements met | | Cedar assessment: actual status/comparisons |
| TC_E06S02_02 | Layout capacity failure named | | Steps 6–8: actual message; capacity-only fixture, missing-wheelchair combination not exercised |
| TC_E06S02_05 | Fully within operating hours | | Actual period, status and absence/presence of failure |
| TC_E06S02_05 | Exact opening and closing boundaries | | Actual period and status |
| TC_E06S02_05 | Before opening | | Actual period and exact failure |
| TC_E06S02_05 | After closing | | Actual period and exact failure |
| TC_E06S02_05 | Overnight interval | | Actual period and exact failure |
| TC_E06S02_05 | Search regression and advisory guidance | | Step 9: actual statuses in both screens and advisory text |
| MULTIPLE | Mobile layout and signed-out access | | Steps 11–12: actual layout and refusal/redirect |
| TC_E06S02_04 | Booking accepted and failures shown to Venue Staff | | Record SKIP if still blocked by E06-S03/S04; advisory copy is not acceptance evidence |

Use PASS/FAIL/SKIP/N/A only, and describe what actually happened even on PASS.
If setup fails, record the blocker rather than inventing browser results.
Run `python scripts/check_test_run_records.py` once the completed record exists.
This run can support review of the partial PR; it does not mark the story Done.
