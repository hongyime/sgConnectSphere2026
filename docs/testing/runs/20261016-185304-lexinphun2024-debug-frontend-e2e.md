---
date: 2026-10-16T18:53:04+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "161026"
database: real
commit: b3802d5
---

First manual run of E06-S04 "Decide on a venue booking request" (story
SCRUM-48), before the Sprint 3 Review. Le Xin ran
`docs/testing/manual/E06-S04-click-through.md` by hand in a real browser,
using a normal window for Venue Staff (`venue_a`, then `venue_b`) and a
private window for `coord_a`, signing in through the login page. Every
screenshot below was taken by Le Xin by hand (T-93).

The stack was:

- the frontend (Vite, 127.0.0.1:5173)
- the local API (`backend/src/dev.ts`, 3001) started with only `DATABASE_URL`
  (no `DATABASE_POOLER_URL`), so nothing reached the shared database
- a freshly reset and seeded local PostgreSQL 17 database
  (`connectsphere_dev_stack`, every migration through 0019)

The code under test is branch `feature/SCRUM-48-decide-venue-request` at
`b3802d5`. Claude reset the database, started the API and the frontend, checked
each screenshot as it arrived and read the database after each step; the
database facts below come from those read-only checks.

Timing: the frontmatter `date` and the filename are when the first screenshot
(`TC_E06S04_03-1`) reached the session, 18:53:04; the run finished with the
database output (`TC_E06S04_05-2`) at 19:27:29, Singapore time. Screenshot
times are when each image was saved into the session, not the moment it was
taken.

Seeded names replace the placeholders in the test cases until #230 merges:
`venue_staff_1` → `venue_a`; `coordinator_1` → `coord_a`; "Riverside Hall" /
"Charity Run" → the seeded Orchid Hall request for EVT-3003 Planning Phase
Gala; "Small Room" / "Product Expo 2026" → a Lotus Room request for EVT-3003;
suggested "Riverside Hall" → Jasmine Hall; TC_04's "Riverside Hall" pair →
two Cedar Auditorium requests for EVT-3003; "Venue Z" → Orchid Hall (TC_05)
and Cedar Auditorium (TC_06).

Deviations from the script, both in TC_04: (1) the first Cedar request was
submitted as 7:30–10:00 pm instead of 6:00–7:30 pm (the start field was
changed instead of the end field), so the second request at 8:00–10:00 pm was
correctly refused by the submission availability check
(`TC_E06S04_04-2`). The 7:30–10:00 pm request was kept as the request under
test and a new 6:00–7:00 pm request was submitted to approve first. (2) The
setup and turnaround precondition was applied by Claude, not typed by the
tester, at 19:19:25 with `UPDATE venues SET setup_time_minutes = 30,
turnaround_time_minutes = 45 WHERE name = 'Cedar Auditorium'` (`UPDATE 1`),
because the venue form has no buffer fields yet (E05-S05). It is a
precondition; the behaviour under test was clicked in the browser.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S04_03 | Rejecting a request without a reason is blocked | PASS | As venue_a, opened the Orchid Hall / EVT-3003 request (25 Oct 2026, 6:00–10:00 pm), Reject… with Reason empty, Reject request: "Add a reason for rejecting this request." shown under the empty Reason box. Database afterwards: status pending, no decision reason, 0 booking audit rows. |
| TC_E06S04_01 | Approving a pending request for a free venue confirms it, updates the calendar and notifies the Coordinator | PASS | Approve request on the same booking: green "Approved. The booking is confirmed. Coordinator A has been notified." and pill Confirmed. Availability calendar, Sun 25 Oct 2026: 08:00–18:00 Free, 18:00–22:00 Confirmed "EVT-3003 Planning Phase Gala" (the venue picker is above the captured area). coord_a's notice "Venue booking approved", 18:54: "Venue Staff A approved your request for Orchid Hall for "EVT-3003 Planning Phase Gala" (25 Oct 2026, 6:00 pm – 10:00 pm). The booking is now Confirmed." coord_a's venue booking requests list Orchid Hall Confirmed and "Primary venue"; the event stays Planning. Database: confirmed, is_primary true, decided by Venue Staff A. |
| TC_E06S04_05 | An approval is recorded with the actor, action, affected records and time | PASS | coord_a's EVT-3003 Activity log: "Booking approved · Orchid Hall: Pending → Confirmed · Venue Staff A · 16 Oct 2026, 6:54 pm". Database row: 18:54:27, Venue Staff A, Booking Approved, Orchid Hall, EVT-3003, pending → confirmed (`TC_E06S04_05-2`). |
| TC_E06S04_02 | Rejecting with a reason and a suggested venue notifies the Coordinator with both, who can switch without a new search | PASS | coord_a requested Lotus Room for EVT-3003, 6:00–10:00 pm ("Booking request submitted", suitability advisory: "Required room layout is not supported."). venue_a rejected it with "Capacity too small for expected attendance" and suggested Jasmine Hall: "Rejected. Coordinator A has been notified, with your reason." coord_a's notice, 19:04: "…Reason: Capacity too small for expected attendance Suggested alternative: Jasmine Hall" (the line breaks between the parts show as spaces). The request list showed Lotus Room Rejected, "Suggested venue: Jasmine Hall", "Decision reason: …" and a "Request suggested venue" button; it opened the form with the same times and submitted without a search. After F5: Lotus Room still Rejected with "A replacement request has already been submitted.", Jasmine Hall Pending 6:00–10:00 pm (advisory: "Capacity 150 is below the required 200 places."). Database: Jasmine Hall replaces_booking_id → the Lotus Room booking. |
| TC_E06S04_04 | Approval is blocked when the buffered windows overlap a confirmed booking, which is named | PASS | Cedar Auditorium requests for EVT-3003 at 6:00–7:00 pm and 7:30–10:00 pm, both accepted with 0 buffers (see deviation 1). venue_b approved 6:00–7:00 pm (Confirmed, not primary, since Orchid Hall is). Buffers set to 30/45 by the precondition SQL (deviation 2). Approving 7:30–10:00 pm was refused: "This can't be approved: with setup and turnaround time it overlaps the confirmed booking for "EVT-3003 Planning Phase Gala" (25 Oct 2026, 6:00 pm – 7:00 pm) at Cedar Auditorium." The pill stayed Pending; database status pending and no new audit row. |
| TC_E06S04_06 | A rejection is recorded with the actor, action, affected records and time | PASS | venue_b rejected the same 7:30–10:00 pm request with "Venue unavailable for maintenance", no suggestion: "Rejected. Coordinator A has been notified, with your reason." coord_a's Activity log: "Booking rejected · Cedar Auditorium: Pending → Rejected · Venue Staff B · 16 Oct 2026, 7:21 pm". Database row: 19:21:39, Venue Staff B, Booking Rejected, Cedar Auditorium, EVT-3003, pending → rejected. The database lists exactly 4 booking decisions, matching the Activity log (`TC_E06S04_05-2`). |
| TC_E06S04_07 | A released booking is recorded with the actor, action, affected records and time | N/A | Not run: releasing a booking needs E10-S04 event cancellation (SCRUM-73, Sprint 4). Awaiting the Product Owner's decision on whether this case moves to E10-S04 (T-76). |

Observations outside this story, for follow-up: the Event line reads
"EVT-3003 · EVT-3003 Planning Phase Gala" because the seeded title already
starts with its code; the bell badge showed 4 while the notifications page
said 3 unread until the next page load (E11); the Pending pill on the
Coordinator's venue booking list has no background colour, unlike Confirmed
and Rejected (E06-S03).

## Screenshots

- [TC_E06S04_03-1](evidence/20261016-185304-lexinphun2024-debug-frontend-e2e/TC_E06S04_03-1.png): "Add a reason for rejecting this request." under the empty Reason box
- [TC_E06S04_01-1](evidence/20261016-185304-lexinphun2024-debug-frontend-e2e/TC_E06S04_01-1.png): "Approved. The booking is confirmed. Coordinator A has been notified." and pill Confirmed
- [TC_E06S04_01-2](evidence/20261016-185304-lexinphun2024-debug-frontend-e2e/TC_E06S04_01-2.png): availability calendar, 25 Oct 18:00–22:00 Confirmed for EVT-3003
- [TC_E06S04_01-3](evidence/20261016-185304-lexinphun2024-debug-frontend-e2e/TC_E06S04_01-3.png): coord_a's "Venue booking approved" notice
- [TC_E06S04_01-4](evidence/20261016-185304-lexinphun2024-debug-frontend-e2e/TC_E06S04_01-4.png): Orchid Hall Confirmed and "Primary venue"
- [TC_E06S04_05-1](evidence/20261016-185304-lexinphun2024-debug-frontend-e2e/TC_E06S04_05-1.png): Activity log "Booking approved · Orchid Hall: Pending → Confirmed · Venue Staff A · 6:54 pm"
- [TC_E06S04_02-5](evidence/20261016-185304-lexinphun2024-debug-frontend-e2e/TC_E06S04_02-5.png): coord_a's Lotus Room request submitted, with the advisory suitability result
- [TC_E06S04_02-1](evidence/20261016-185304-lexinphun2024-debug-frontend-e2e/TC_E06S04_02-1.png): "Rejected. Coordinator A has been notified, with your reason." for Lotus Room
- [TC_E06S04_02-2](evidence/20261016-185304-lexinphun2024-debug-frontend-e2e/TC_E06S04_02-2.png): coord_a's "Venue booking rejected" notice with the reason and "Suggested alternative: Jasmine Hall"
- [TC_E06S04_02-3](evidence/20261016-185304-lexinphun2024-debug-frontend-e2e/TC_E06S04_02-3.png): Lotus Room Rejected, suggested venue, decision reason and "Request suggested venue"
- [TC_E06S04_02-4](evidence/20261016-185304-lexinphun2024-debug-frontend-e2e/TC_E06S04_02-4.png): Jasmine Hall Pending; Lotus Room Rejected with "A replacement request has already been submitted."
- [TC_E06S04_04-2](evidence/20261016-185304-lexinphun2024-debug-frontend-e2e/TC_E06S04_04-2.png): deviation 1, the 8:00–10:00 pm request refused at submission against the mistyped 7:30–10:00 pm request
- [TC_E06S04_04-3](evidence/20261016-185304-lexinphun2024-debug-frontend-e2e/TC_E06S04_04-3.png): the replacement 6:00–7:00 pm Cedar request submitted
- [TC_E06S04_04-4](evidence/20261016-185304-lexinphun2024-debug-frontend-e2e/TC_E06S04_04-4.png): venue_b approved Cedar Auditorium 6:00–7:00 pm
- [TC_E06S04_04-1](evidence/20261016-185304-lexinphun2024-debug-frontend-e2e/TC_E06S04_04-1.png): approval of Cedar 7:30–10:00 pm refused, naming the confirmed 6:00–7:00 pm booking
- [TC_E06S04_06-1](evidence/20261016-185304-lexinphun2024-debug-frontend-e2e/TC_E06S04_06-1.png): "Rejected. Coordinator A has been notified, with your reason." for Cedar 7:30–10:00 pm
- [TC_E06S04_06-2](evidence/20261016-185304-lexinphun2024-debug-frontend-e2e/TC_E06S04_06-2.png): Activity log with every request and decision; last row "Booking rejected · Cedar Auditorium: Pending → Rejected · Venue Staff B · 7:21 pm"
- [TC_E06S04_05-2](evidence/20261016-185304-lexinphun2024-debug-frontend-e2e/TC_E06S04_05-2.png): read-only database query, 4 booking decisions matching the Activity log
