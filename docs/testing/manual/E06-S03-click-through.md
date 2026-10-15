# E06-S03 manual click-through: booking submission

SCRUM-47; follows E06-S02/E07-S06's script format and T-65. This is a script,
not an execution record. Expected messages come from current source; a human
must still run it and record every actual outcome, including passes.

## Set up first

Use fresh disposable **native loopback PostgreSQL**, migrated through 0016
including 0015. Follow the current [seed convention](../../contributing/seed-data-convention.md)
and [database safety guidance](../supabase-test-schema.md). Never reset shared
Supabase. The older E06-S02 Docker instructions are superseded by AGENTS.md.

Set `DATABASE_URL` in the API terminal to your local database, seed using the
repository CLI, start `backend/src/dev.ts`, and start Vite on port 5173. Allow
the browser's origin in the local API configuration. Sign in as seeded `coord_a`
using `seedCredential` from `backend/src/database/cli.ts`; open EVT-3001.
Do not write passwords or connection strings in a committed run record.

Check fresh fixture availability. If Cedar Auditorium's period is occupied,
record that discrepancy and select a documented free period within the event;
do not silently mark a changed fixture as the expected result. This run changes data.

## Click-through

| Step / case | Action | Expected result |
| --- | --- | --- |
| 1 / assignment | Open EVT-3001 venue search and Cedar Auditorium's **Check recorded event requirements**. | Recorded assessment, shared shell and controls appear. |
| 2 / TC_E06S03_01 | In **Request this venue**, keep an available period inside the event; enter purpose `Main programme` and headcount `500`; submit. | **Booking request submitted**; **Your request is Pending. The venue is reserved tentatively while a decision is outstanding.** Advisory capacity failures remain visible. |
| 3 / TC_E06S03_02/05 | Follow **View venue booking requests**. | Event is Planning; newest request is Pending, with period, purpose, headcount and advisory failures. |
| 4 / TC_E06S03_07 | Request another free venue for the same event, with distinct purpose/headcount. | Both Pending requests remain, each with its own data. |
| 5 / TC_E06S03_04/06 | Try another request whose advertised or buffered occupancy overlaps the first. | Refusal names the unavailable window and `including setup and turnaround`; no overlapping request is saved. |
| 6 / period | Enter a start before the event, end after it, or a reversed period. | **The booking period must fall within the event.** or **The booking must end after it starts.** No submission. |
| 7 / optional values | On another free period, leave purpose/headcount blank. | Accepted; assessment uses event attendance; optional values remain null. |
| 8 / authorisation | In another browser profile, sign in as coord_b; open the first event's assessment/list URL. | Access refused; private requirements and booking details remain hidden. |
| 9 / mobile | Inspect assessment, form and list at phone width. | Single-column controls/cards, readable failures, no page-level overflow. Shared navigation may scroll inside its own area. |
| 10 / holds | Place a live hold on a free period with the existing hold flow, then convert and retry. | Same row becomes Pending, expiry clears, and request/transition effects occur only once. |
| 11 / calendar | Open the Coordinator availability calendar, select Cedar Auditorium and 15 October 2026 after step 2. | 09:00–17:00 is Tentative and links to EVT-3001; the request list still calls its decision status Pending. |

Check only the disposable DB afterwards: booking identity/status/requester/time,
purpose/headcount, Session link, advisory snapshot, event status, audit and
status-notice inbox/outbox. A converted Pending row must not be expired by the worker.

## Pending checks

Venue Staff email/inbox receipt and decision presentation remain SCRUM-189 and
E06-S04 integration checks. Mark them blocked until those workflows land. The
injected-resolver database tests do not prove production assignments or actual
email-provider receipt. Confirmation/primary selection are not part of this run.

Use the team's PostPlan screenshot convention and link evidence from a fresh
`run_type: manual`, `scope: frontend/e2e` T-65 record. Write actual observations
on every row; do not reuse earlier results or label automated screenshots manual.

## Recorded partial run

[15 October manual run](../runs/20261015-014746-jininggg-frontend-e2e.md)
records the human screenshots/observations and read-only local DB checks.
The actual run used Lotus for blank optional fields and EVT-3003 Cedar for
conversion. Buffer-only overlap and repeated conversion/expiry-worker behaviour
were not manually exercised; their automated evidence is distinct.


## Review follow-up: suggested venue and status timestamp

1. With E06-S04?s owner, prepare a Rejected booking with a reason and an active
   suggested venue. Use an assigned Approved or Planning event.
2. Open the event?s booking requests. Confirm the reason and suggested venue appear.
   Click **Request suggested venue** and check that period, purpose and headcount
   match the rejected booking. Submit; expect a new Pending request, with the
   original still Rejected. Refresh: another switch must not be offered.
3. Repeat submission through a network retry: expect the same replacement, with
   no repeated notifications. An overlapping or blocked suggestion must be refused.
4. On an Approved event?s first submission, verify Planning and a fresh
   `status_changed_at` through an authorised read-only local DB check.
5. After #271/#272 merge and assignments are provisioned in the disposable local
   database, verify only current active Venue Staff for the suggested venue receive
   the request notice. Do not claim this production default integration before then.

These steps are pending human execution; the earlier screenshots predate the fixes.
