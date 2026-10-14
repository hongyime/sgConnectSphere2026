---
date: 2026-10-15T01:47:46+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 141026
database: real
commit: 5c22e26
---

The human tester followed the E06-S03 click-through in a real browser and
supplied screenshots and explicit observations through chat. The agent guided
the steps, transcribed those observations, and performed the read-only database
checks below. The agent did not substitute automated browser tests for this run.
Timestamp records completion. Runner is the authenticated GitHub login obtained
for this working session.

Code under test: `feature/e06-s03-booking-submission`, HEAD `5c22e26` plus
uncommitted E06-S03 implementation and tests. The SHA alone does not contain the
feature. API/Vite ran locally against a freshly created, migrated and seeded
native loopback PostgreSQL database. No shared Supabase writes or Docker Desktop.

Script: [E06-S03 click-through](../manual/E06-S03-click-through.md).
Screenshots were supplied in chat; saved image files/hosted PostPlan links still
need attaching before using this record as durable PR screenshot evidence.
No whole-story Done claim, staff decision presentation or actual email receipt.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Assigned Coordinator opens assessment and request form | PASS | coord_a signed in; EVT-3001 Cedar assessment showed Suitable, 15 Oct 2026 9:00 am–5:00 pm, and Request this venue with blank purpose/headcount. |
| TC_E06S03_01 | Pending request creation and advisory capacity failure | PASS | Submitted Cedar with Main programme / 500. Screen showed Booking request submitted and Your request is Pending. Advisory failure: Capacity 450 is below the required 500 places. This covers creation, not the unfinished Venue Staff notification clause. |
| TC_E06S02_04 | Unsuitable venue may still be requested | PASS | Cedar's capacity failure did not prevent Pending creation; later Lotus's unsupported Theatre layout also did not prevent submission. Staff-screen half remains skipped below. |
| TC_E06S03_02 | First submission moves Approved to Planning | PASS | EVT-3001 booking list displayed Planning after the Cedar submission; read-only DB query confirmed planning and one approved-to-planning audit entry. |
| TC_E06S03_07 | Several requests retain independent purpose/headcount | PASS | Orchid accepted Breakout session / 100 alongside Cedar. Later Lotus appeared above both. All three manual requests stayed Pending; Orchid and Cedar retained their own values and Cedar retained its capacity failure. |
| TC_E06S03_05 | Newest-first status and detail display | PASS | List order was Lotus, Orchid, Cedar, matching DB creation timestamps. Lotus showed its unsupported-layout advisory failure without Purpose or Booking headcount rows. Seeded legacy bookings also remained in the DB. |
| TC_E06S03_04 | Reject overlapping request | PASS | Cedar's duplicate 9:00 am–5:00 pm request showed This venue is unavailable from 15 Oct 2026, 9:00 am to 15 Oct 2026, 5:00 pm, including setup and turnaround. DB had one manual Cedar request and one request audit for EVT-3001, not an extra overlapping row. |
| MULTIPLE | Start before event rejected | PASS | 15 Oct 2026 8:00 am–5:00 pm displayed The booking period must fall within the event. |
| MULTIPLE | Reversed period rejected | PASS | 15 Oct 2026 4:00 pm–3:00 pm displayed The booking must end after it starts. |
| TC_E06S03_08 | End after event rejected | PASS | 15 Oct 2026 9:00 am–6:00 pm displayed The booking period must fall within the event. This covers the period clause only; withdrawal was not tested. |
| MULTIPLE | Blank optional fields and attendance fallback | PASS | Lotus accepted blank purpose/headcount, showing Pending and Required room layout is not supported. DB stored both fields as null; saved assessment's capacity requirement was 150, matching event attendance. |
| MULTIPLE | Other Coordinator cannot read booking list | PASS | coord_b used a private browser window. EVT-3001 was absent from that dashboard; its direct booking-list URL displayed Couldn't load venue booking requests / Event not found. No booking details appeared. |
| MULTIPLE | Other Coordinator cannot read assessment or submit form | PASS | Cedar's direct suitability URL in the private window displayed Couldn't load venue suitability / Event not found. No private requirements or request form appeared. |
| MULTIPLE | Phone-width list and request form | PASS | Screenshots showed single-column cards/controls and wrapped advisory text. Human explicitly confirmed the page does not scroll sideways; the shared top navigation remained separately scrollable. |
| TC_E06S05_04 | Create hold then submit it as a booking request | PASS | EVT-3003 Cedar held for 25 Oct 2026 6:00–10:00 pm, default 48-hour expiry shown as 17 Oct 2026 1:39 am. Conversion showed Booking request submitted for Cedar Auditorium. The hold no longer expires. Hold card disappeared; booking list showed Pending for the same period. |
| MULTIPLE | Converted hold persistence and audit | PASS | Read-only DB check found expiry null, assigned requester, valid Session/Event link and one conversion audit with old_value tentative. created_at matched the hold-placement audit timestamp and preceded requested_at. A pre-conversion UUID was not captured manually; exact before/after UUID identity and retry races are covered by the separate automated DB records. |
| TC_E06S03_01 | Pending request occupies calendar as Tentative | PASS | Human opened Cedar's 15 October calendar details: 08:00–09:00 Free, 09:00–17:00 Tentative linked to EVT-3001, 17:00–22:00 Free. |
| MULTIPLE | Organiser status notice and email outbox persistence | PASS | Agent read-only check found one new event_organiser Event update for the planning transition, with email delivery queued, dispatch_state pending and retained email payload. No new actor/Attendee notice in that query. UI receipt and actual provider delivery were not tested. |
| TC_E06S03_06 | Buffer-only overlap | SKIP | Manual overlap used identical advertised periods and the seeded venue had no expanded buffer window. Do not treat the generic including setup and turnaround wording as proof of a buffer-only conflict. Automated real-DB tests provide that evidence. |
| MULTIPLE | Repeated conversion, retry and expiry-worker race | SKIP | Conversion button disappeared after success; no manual replay or expiry-worker execution performed. Separate real-DB tests cover repeated submission, cleared-expiry worker behaviour and races. |
| TC_E06S03_01 | Responsible Venue Staff receipt | SKIP | SCRUM-189 / #271/#272 resolver integration is pending. No all-staff broadcast or decided_by substitution. |
| TC_E06S02_04 | Advisory failures visible on staff decision screen | SKIP | E06-S04 decision workflow remains pending. |
| MULTIPLE | Confirmation, primary selection and withdrawal | SKIP | Not implemented or exercised in this submission increment. |

## Database verification boundary

The agent loaded only the temporary manual database configuration, checked its
loopback host and dedicated manual-database name, and used BEGIN READ ONLY plus
statement timeout, then ROLLBACK. Queried booking metadata, saved assessment,
audit entries and notification/delivery state for EVT-3001 and EVT-3003.
No token, password, connection string or personal data is recorded here.
