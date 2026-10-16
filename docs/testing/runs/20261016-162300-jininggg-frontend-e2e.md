---
date: 2026-10-16T17:17:48+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 161026
database: real
commit: 8599ad2
---

E06-S03 / SCRUM-47: human-driven local browser execution guided through chat.
The human supplied observations and saved the 24 hand-taken PNGs linked below.
The agent transcribed those observations and performed the explicitly separate
read-only database corroboration. No automated screenshots substitute for them.
Runner was derived from the authenticated GitHub login for this working session.
Filename uses the session's setup time; frontmatter records verification completion.

Code under test: `feature/e06-s03-pending-withdrawal`, HEAD `8599ad2` plus
uncommitted withdrawal/replacement implementation. The SHA alone does not
contain the implementation. Same-page switch-list refresh and Coordinator
event-page navigation fixes were made during the session and manually retested
after hot reload. Their separate automated records are
[refresh regression](20261016-165058-jininggg-frontend-vitest.md) and
[workspace regression](20261016-171305-jininggg-frontend-vitest.md).

Setup: fresh disposable native loopback PostgreSQL, migrated through 0020 and
seeded with synthetic accounts/events/assignments; API and Vite ran locally.
No Docker, shared Supabase mutation or production migration. An old helper's
Vite path failed during setup; frontend was then started separately before
the human run. No deployment or whole-story Done claim.

For switching, the agent prepared a synthetic Rejected Cedar booking on
EVT-3003, suggesting Maple for 25 October 18:00-20:00 SGT. Seeded Orchid was
already Pending, so Maple was selected as the free suggestion. Later the agent
changed the latest Pending Maple replacement to a synthetic rejection suggesting
Lotus. Those are fixture setup writes, not human execution of Venue Staff's
decision workflow. Existing Released/rejected rows were retained.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_01 | Pending submission with advisory and staff inbox receipt | PASS | EVT-3001 Cedar submitted Main programme / 500, retained Capacity 450 is below the required 500 places, and showed Pending success. Venue Staff private-window inbox later displayed new-request notices for EVT-3003 and EVT-3001. This covers submission/inbox receipt, not calendar or email-provider delivery in this run. |
| TC_E06S03_02 | First request moves event to Planning | PASS | Before submission the human showed EVT-3001 Approved; after submission the list showed Planning with Cedar Pending and the entered metadata. |
| TC_E06S03_05 | Discoverable booking list from Confirmed event | PASS | Human found no event-page booking-list link initially. A Venue bookings link was added beside Equipment requests; screenshot shows it on EVT-2001 Confirmed. Human explicitly confirmed clicking it opened the correct booking list. Earlier direct-link access did not establish discoverability. |
| TC_E06S03_07 | Independent requests and metadata | PASS | EVT-3001 Orchid Breakout session / 100 and Cedar Main programme / 500 appeared as separate Pending cards; event stayed Planning. |
| TC_E06S03_08 | Withdraw one request, retain others and free its period | PASS | Orchid confirmation Cancel left both requests unchanged, as explicitly confirmed by the human. Confirm withdrawal showed Orchid Released, Cedar Pending and event Planning. Requesting Orchid again for the same period succeeded as a new Pending Breakout retry / 100, with old Released history retained. Mobile confirmation/cancel remained usable; human explicitly confirmed no sideways scrolling. Period-boundary clause was not rerun in this session. |
| TC_E06S03_09 | Foreign list privacy and Confirmed UI protection | PASS | Coordinator B's direct EVT-3001 booking-list URL showed Event not found without private cards. EVT-2001 showed Confirmed Orchid with no withdrawal action. These are list/UI assertions; direct mutation refusal and Confirmed-primary persistence were not human API tests. |
| TC_E06S03_11 | Withdrawal staff receipt and converted-hold history | PASS | Venue Staff inbox showed the EVT-3001 withdrawal notice. Human held EVT-3003 Cedar 20:00-21:00, saw expiry, converted it, and saw The hold no longer expires with hold card gone. Withdrew that Pending row: Released and Planning displayed; returning to Venue holds showed No venue is held for this event. Separate agent DB check below corroborates null expiry/audit/outbox; this is not manual rollback/provider verification. |
| TC_E06S03_12 | Fresh suggested replacement after withdrawal | PASS | Cedar rejection's Maple switch prefilled 18:00-20:00 / Suggested-venue test / 100. New Maple Pending retained Cedar Rejected and consumed its suggestion. Withdrawing Maple showed Released and restored Cedar's suggestion action. Fresh submission produced another Pending Maple beside old Released Maple; source stayed consumed. Initial View venue booking requests did nothing because it linked to the current route; after the callback fix the human explicitly confirmed it refreshed without F5 on the fresh attempt. No network replay was manually exercised. |
| TC_E06S03_13 | Follow latest rejection instead of older source | PASS | After synthetic Maple rejection suggested Lotus, its form preserved metadata; submission created Lotus Pending. Maple and Cedar remained Rejected with replacement-already-submitted messages. Human explicitly confirmed list refresh without F5. Covers observed Cedar to Maple to Lotus chain; more than two links and no-suggestion termination were not manually exercised. |
| TC_E06S03_10 | Staff decision/withdrawal race | SKIP | No competing human Venue Staff decision run was performed. Separate PostgreSQL automated records use lock/status-contract decision writers, not the full E06-S04 UI. |
| TC_E06S03_04 | Overlap refusal | SKIP | Not repeated in this manual session; prior manual and separate database evidence must remain separately labelled. |
| TC_E06S03_06 | Buffer-only overlap | SKIP | Not manually exercised in this session; automated real-database regression remains separate. |

## Agent read-only database corroboration

After the human steps, the agent verified the dedicated manual database's
loopback address/name and used `BEGIN READ ONLY`, a five-second statement
timeout and `ROLLBACK`. Queried bookings, withdrawal audits, notifications
and delivery state without printing credentials or querying shared Supabase.

- EVT-3001 remained Planning. Cedar Main programme / 500 was Pending;
  Orchid Breakout session / 100 was Released; the fresh Breakout retry / 100
  was Pending. Seeded Confirmed Jasmine remained present.
- EVT-3003 remained Planning. Original Cedar was Rejected. Two Maple rows
  referenced that same Cedar: first Released, second Rejected. Pending Lotus
  referenced the latest Rejected Maple, not original Cedar. All retained rows
  were non-primary; seeded Pending Orchid remained present.
- Converted Cedar 20:00-21:00 was Released with `expires_at` null. This query
  alone does not establish its pre-conversion UUID identity or worker races.
- Three Booking Withdrawn audits corresponded to Orchid, first Maple and
  converted Cedar, with `entity_type=venue_booking`, booking entity ID,
  `field_changed=status`, old pending and new released.
- Ten new request/withdrawal notification rows selected by message had
  Venue Staff recipients and linked delivery rows with `delivery_status=queued`
  and `dispatch_state=pending`. Human inbox evidence establishes the notices
  actually opened above. Queued is not email-provider receipt; this query does
  not prove recipient exclusivity against every assignment boundary or atomic
  rollback. Those have separate automated tests.
- Seeded EVT-2001 Orchid remained Confirmed. It was not primary in the fixture,
  so no manual cancelled-primary claim is made.

## Screenshots

All files are human-supplied PNG originals, individually below 1000 KB.
Multiple screenshots per case are intentional. No screenshot of the original
unresponsive control was saved; its reported failure and successful retest
are recorded honestly above. No initial-failure image is fabricated.

- [TC_E06S03_01-1](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_01-1.png): Pending submission and capacity advisory.
- [TC_E06S03_01-2](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_01-2.png): EVT-3003 new-request notice in Venue Staff inbox.
- [TC_E06S03_01-3](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_01-3.png): EVT-3001 new-request notice in Venue Staff inbox.
- [TC_E06S03_02-1](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_02-1.png): Planning, Pending Cedar and entered metadata.
- [TC_E06S03_05-1](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_05-1.png): Confirmed event page with new Venue bookings link.
- [TC_E06S03_07-1](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_07-1.png): independent Orchid and Cedar Pending requests.
- [TC_E06S03_08-1](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_08-1.png): withdrawal confirmation before cancellation.
- [TC_E06S03_08-2](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_08-2.png): Released Orchid, unchanged Pending Cedar and Planning event.
- [TC_E06S03_08-3](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_08-3.png): fresh Pending Orchid beside Released history and Pending Cedar.
- [TC_E06S03_08-4](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_08-4.png): mobile withdrawal confirmation controls.
- [TC_E06S03_09-1](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_09-1.png): other Coordinator receives Event not found.
- [TC_E06S03_09-2](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_09-2.png): Confirmed booking without withdrawal action.
- [TC_E06S03_11-1](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_11-1.png): Venue Staff withdrawal inbox notice.
- [TC_E06S03_11-2](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_11-2.png): live Cedar hold with expiry and 20:00-21:00 period.
- [TC_E06S03_11-3](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_11-3.png): conversion success and no remaining hold.
- [TC_E06S03_11-4](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_11-4.png): converted Cedar Released, event Planning.
- [TC_E06S03_11-5](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_11-5.png): no hold resurrection after withdrawal.
- [TC_E06S03_12-1](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_12-1.png): prefilled Maple replacement from Cedar rejection.
- [TC_E06S03_12-2](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_12-2.png): Maple Pending and Cedar suggestion consumed.
- [TC_E06S03_12-3](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_12-3.png): Released Maple restores Cedar suggestion.
- [TC_E06S03_12-4](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_12-4.png): fresh Pending Maple and Released history after refresh fix retest.
- [TC_E06S03_13-1](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_13-1.png): latest Maple rejection suggests Lotus and prefills form.
- [TC_E06S03_13-2](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_13-2.png): Lotus Pending and Maple rejection consumed.
- [TC_E06S03_13-3](evidence/20261016-162300-jininggg-frontend-e2e/TC_E06S03_13-3.png): original Cedar remains Rejected and consumed.

## Remaining verification boundary

This session is a partial acceptance run, not every E06-S03 criterion passing.
Direct authenticated API attempts by a foreign Coordinator or against Confirmed
bookings, double submissions/replay, expiry workers, buffer-only collisions,
outbox rollback and more-than-two-link/no-suggestion cases were not human-tested.
Separate automated evidence exists for these where stated in the testing guide.
Full E06-S04 staff decision integration and human peer review remain necessary.
Production deployment/migration, provider receipt and Jira completion are not
claimed. Local manual servers remain running for any further checks.
