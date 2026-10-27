# E06-S03 manual click-through: booking submission

SCRUM-47; follows E06-S02/E07-S06's script format and T-65. This is a script,
not an execution record. Expected messages come from current source; a human
must still run it and record every actual outcome, including passes.

## Set up first

Use fresh disposable **native loopback PostgreSQL**, migrated through this branch's
0020 (including 0018 assignments and 0019 booking fields). Follow the current [seed convention](../../contributing/seed-data-convention.md)
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

SCRUM-189 (#272) is merged. Check Venue Staff inbox receipt using current assignments: a
request for Orchid Hall reaches `venue_a`. Decision presentation remains an
E06-S04 check; mark it blocked until that workflow lands. The
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

The [16 October partial run](../runs/20261016-162300-jininggg-frontend-e2e.md)
subsequently exercised suggested-venue submission/retry/chain, default staff
inbox receipt, withdrawal, converted-hold history and Confirmed-event navigation.
It documents its exact PASS limits/SKIPs and the two UI fixes found and retested;
it does not evidence every preceding step or the actual staff decision UI.

## Withdrawal and replacement follow-up (T-94 to T-96)

These are expected results for a **new human run**, not passing execution claims.
Prepare synthetic local fixtures with two independent bookings, a live hold that
can be converted, and a Rejected request with a suggested venue. Use the seeded
assignment rows for the requested venue. Do not change production data. If the
staff decision UI is unavailable, record that integration as blocked; direct SQL
fixtures and automated competing writers do not prove the complete staff UI.

| Case | Human action | Expected result |
| --- | --- | --- |
| TC_E06S03_08 | Open a Pending card, choose **Withdraw request**, cancel once, then confirm. Refresh the list/calendar. | Cancel changes nothing. Confirmation shows Released; the other bookings and event status stay unchanged. Only this request's occupancy is freed, subject to other bookings/buffers/blocks. |
| TC_E06S03_09 | Check a Confirmed card and sign in as another Coordinator. Attempt the withdrawal API with the other identity. | No Confirmed withdrawal control. Server refuses the foreign request without exposing its details; Confirmed status/primary stay intact. |
| TC_E06S03_10 | With the E06-S04 owner, approve/reject while withdrawing the same Pending request in another browser. | Exactly one wins; losing withdrawal shows a conflict and **Refresh booking list**. Losing staff decision refuses the Released request. An event/account update in progress may also require refresh/retry. |
| TC_E06S03_11 | Withdraw a converted hold. Check the assigned requested-venue staff inbox and authorised local audit/outbox queries. | Booking becomes Released with null expiry; no hold returns. Booking Withdrawn audit is Pending to Released. Only current active staff for that venue receive a notice and queued delivery. Queued email is not provider receipt. |
| TC_E06S03_12 | Request a rejection's suggestion; withdraw that replacement, refresh, request the suggestion again and retry the same network submission. | Old Released row remains. Original suggestion action returns; a fresh submission creates a new Pending row. Network retry reuses its existing result, not another request. |
| TC_E06S03_13 | Reject a replacement and suggest a third venue; follow that latest suggestion, continuing beyond two links if available. Also inspect a rejection without a suggestion. | Old source stays consumed; next request links to the latest rejection only. No fixed two-attempt cap; no suggestion control without a suggestion. Ordinary venue search remains available. |

Record observed outcomes in a fresh T-65 record. Save the tester's hand-taken
images under `runs/evidence/<new-record-basename>/TC_ID-sequence.png` (or JPG),
each below 1000 KB, and link them from the record's `## Screenshots`. Do not
reuse the 15 October archive as proof of these changes. Races and outbox rollback
also have separate automated real-database checks; label those separately.

## Explicit primary selection (Scenario 3c, E06-S03 ownership)

This is a new interaction added after the 16 October partial manual run.
Do not amend that immutable record to claim it was exercised there.

1. In a disposable local setup with E06-S04 available, have staff approve two
   independent venue bookings for the same assigned event. Observe the first
   Confirmed booking become primary automatically (E06-S04 ownership).
2. As the assigned Coordinator, use the event page's **Venue bookings** link.
   The existing primary shows **Primary venue**; another Confirmed booking shows
   **Set as primary venue**. Pending/Released/Rejected bookings offer no such action.
3. Choose the other Confirmed booking and cancel confirmation. Flags and statuses
   remain unchanged. Confirm again using **Set primary venue**; expect the success
   notice, the target's primary label and the old primary's selection action.
4. Refresh and verify exactly one primary, retained booking periods/statuses and
   unchanged event status. Repeat on an assigned Confirmed event; viewing and
   primary selection are allowed even though new booking submission is not.
5. Corroborate the local `Primary Venue Changed` audit if authorised. Direct
   replay of the current choice should create no repeated audit. Another
   Coordinator or a non-Confirmed target must be refused by the API, regardless
   of hidden controls. Label agent/API checks separately from human UI actions.

Record a fresh human run and TC_E06S03_07-sequence screenshots for this Scenario
3c follow-up; do not overwrite earlier images. Real-service approval/withdrawal
races and primary-assignment races also have their separate deterministic
PostgreSQL tests. Coordinate human integration review with Le Xin before sign-off.
