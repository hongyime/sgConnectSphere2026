# E06-S02 manual click-through: advisory venue suitability

Follow-up evidence: [combined capacity/accessibility run](../runs/20261017-000020-jininggg-frontend-e2e.md)
and [unsuitable submission to Venue Staff display](../runs/20261017-010257-jininggg-frontend-e2e.md).
The latter used clean PR #298 commit a4b2cf9, not this documentation branch's
runtime. Earlier dependency statements below describe the original partial run;
the follow-up records document the newer observed coverage and its limits.

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

## Set up first (native loopback PostgreSQL)

Use a disposable native loopback PostgreSQL database following
[database safety guidance](../supabase-test-schema.md) and the
[seed convention](../../contributing/seed-data-convention.md). Do not start
Docker Desktop or reset/seed shared Supabase. The old Docker instructions are
superseded. Configure the local API with the disposable database and browser
origin, then start the API and Vite on port 5173. If code changed while the API
was running, restart the API before testing; preserve the database.

Sign in as the seeded Coordinator A. Obtain the synthetic account credential
from the seed implementation; never include it or a connection string in a
committed record. For a fresh full run use the seeded EVT-3001 fixtures below.
If reusing a populated local database, inspect its current data and record
fixture differences instead of assuming defaults or resetting earlier evidence.

For the combined-failure follow-up, use section E below. It uses a separate
synthetic event/venue and leaves earlier booking fixtures intact.

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
   Booking submission is available through E06-S03; this assessment-only check does not prove the staff presentation.
   This case verifies capacity naming, not the canonical case's additional
   missing-wheelchair fixture. Record that limitation, not a full-case claim.

## C. Hours boundaries and E06-S01 regression (TC_E06S02_05)

Use Cedar, which otherwise satisfies EVT-3001, in a fresh disposable database.
Have the local fixture operator change only that synthetic event period for each
row, using parameterised SQL and an explicit loopback/database-name guard. The
operation is `UPDATE events SET event_range=$1::tstzrange WHERE event_code=$2`.
Do not use a shared Supabase connection. These edits arrange fixtures and do
not test the event-edit UI. Restore the original period afterwards.

For each row below, set the fixture period, verify exactly one event changed, then
refresh the saved Cedar assessment URL. Inspect the displayed event period
before judging the result. Record each boundary separately.

| Check | Synthetic event period | Expected assessment |
| --- | --- | --- |
| Fully within | `'[2026-10-15 09:00+08,2026-10-15 11:00+08)'` | Suitable; no hours failure |
| Exact boundaries | `'[2026-10-15 08:00+08,2026-10-15 22:00+08)'` | Suitable; no hours failure |
| Starts before opening | `'[2026-10-15 07:59:59+08,2026-10-15 11:00+08)'` | Unsuitable; `Event is outside operating hours.` |
| Ends after closing | `'[2026-10-15 09:00+08,2026-10-15 22:00:01+08)'` | Unsuitable; same explicit failure |
| Crosses midnight | `'[2026-10-15 21:00+08,2026-10-16 09:00+08)'` | Unsuitable; same explicit failure |

9. While the early-start fixture is active, open the event search in another
   tab, reload defaults, and click **Search venues**. Cedar must remain
   **Suitable** in E06-S01 search, while its E06-S02 assessment is
   **Unsuitable** with the hours failure. Inspect both pages and save a
   screenshot of each. Search operating hours remain display-only.
10. Restore the original fixture period, 15 October 2026 09:00-17:00 SGT,
    using the same guarded local fixture operation.

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
`database: real`, `test_case_version: 161026` (verify still current).
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

## E. Combined accessibility and capacity follow-up (TC_E06S02_02)

This is a plan, not a passing execution claim. The earlier human run covered
capacity alone; retain that immutable record unchanged.

1. In the disposable local database, prepare a separate Approved event assigned
   to Coordinator A: EVT-S02-MANUAL, Theatre, 150 attendees, Wheelchair access,
   15 January 2027 09:00-11:00 Singapore time.
2. Prepare Manual Suitability Room with Theatre capacity 120, opening hours
   08:00-22:00 and no Wheelchair access feature. Ensure no occupancy or block
   overlaps the fixture period; do not alter existing bookings to make it free.
3. Open `/coordinator/events/EVT-S02-MANUAL/venues` as Coordinator A. Search,
   locate Manual Suitability Room and choose Check recorded event requirements.
4. Expect Unsuitable and both named failures: capacity 120 below required 150,
   and missing Wheelchair access. Inspect comparison values and advisory text.
5. Refresh and verify both failures persist. Save original hand-taken PNG/JPG
   evidence under a fresh run folder, named TC_E06S02_02-1, -2, etc., each
   below 1000 KB. Record actual results only after the human performs the steps.

This covers the combined-failure assessment, not TC_E06S02_04 staff display.
Coordinate the latter with E06-S04; API fixtures or Coordinator screenshots
cannot prove what Venue Staff see when deciding.
