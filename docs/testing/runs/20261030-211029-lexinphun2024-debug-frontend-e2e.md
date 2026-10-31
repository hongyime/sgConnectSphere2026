---
date: 2026-10-30T21:10:29+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "301026"
database: real
commit: c7705e3
---

Story owner's manual run of E06-S06 "Prevent double-booking of a venue"
(story SCRUM-50, manual acceptance subtask SCRUM-232) at `c7705e3`, following
`docs/testing/manual/E06-S06-click-through.md`. Le Xin ran it by hand in a
real browser, signing in through the login page as `coord_b` (TC_02, TC_05)
and then `venue_a` (TC_04, TC_01, TC_06, TC_07). Every screenshot below was
taken by Le Xin by hand (T-93).

The stack, all from the working tree at `c7705e3`:

- the frontend (Vite, 127.0.0.1:5173)
- the local API (`backend/src/dev.ts`) started with only `DATABASE_URL`
  (no `DATABASE_POOLER_URL`), so nothing reached the shared database
- native PostgreSQL 17 on this machine (127.0.0.1:5432; no Docker Desktop),
  `connectsphere_dev_stack` reset and seeded with
  `npx tsx src/database/cli.ts reset`, then
  `docs/testing/manual/E06-S06-preconditions.sql` loaded, before the run

Claude reset and loaded the data, started the API and the frontend, saved
each screenshot Le Xin pasted into the session under its TC_ID, and ran a
read-only database check straight after the last one. That check matched the
screens: EVT-2003 and EVT-3002 had no booking; Maple Room's EVT-3005 stayed
Pending and flagged; Jasmine Hall's EVT-3001 was rejected with the reason
given and EVT-3005 confirmed; EVT-3003 was confirmed at Orchid Hall and Cedar
Auditorium; decision times 20:57 to 21:09.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S06_02 | Verify a later overlapping request is refused while the first claim remains active | PASS | Coordinator B submitted EVT-2003 for Lotus Room, 1 Feb 2027 10:00–12:00. Refused with "This venue is unavailable from 1 Feb 2027, 8:30 am to 1 Feb 2027, 11:45 am, including setup and turnaround." No other event name shown, no request submitted. EVT-2003's venue bookings page says "No venue bookings recorded". |
| TC_E06S06_05 | Verify a one-minute overlap is refused before an impossible fixture is inserted | PASS | Coordinator B submitted EVT-3002 for Orchid Hall, 2 Feb 2027 10:59–13:00 (one minute into EVT-3001's 09:00–11:00 booking). Refused with "This venue is unavailable from 2 Feb 2027, 9:00 am to 2 Feb 2027, 11:00 am, including setup and turnaround." No other event name shown. EVT-3002's venue bookings page says "No venue bookings recorded". |
| TC_E06S06_04 | Verify exact half-open buffered adjacency is allowed with zero buffers | PASS | EVT-3005's Pending request at Orchid Hall, 3 Feb 11:00–13:00, right after EVT-3001's Confirmed 09:00–11:00 (buffers 0). No Booking Conflict box, Approve clickable. Approved: "Approved. The booking is confirmed. Coordinator B has been notified." Calendar for 3 Feb shows 09:00–11:00 Confirmed EVT-3001 and 11:00–13:00 Confirmed EVT-3005. |
| TC_E06S06_01 | Verify approval rechecks a confirmed booking after buffer growth | PASS | Changed Maple Room's setup to 30. Saved with "Changes saved, and some bookings now conflict", listing only EVT-3005, 4 Feb 11:00 am – 1:00 pm: conflicts with EVT-3001. EVT-3005's decision page shows "Booking Conflict: overlaps with confirmed booking [EVT-3001]" and "Approval is blocked until this venue conflict is resolved"; Approve greyed out, Reject clickable. Calendar keeps both: EVT-3001 Confirmed with no flag, EVT-3005 Tentative with "Buffer conflict — needs review". |
| TC_E06S06_06 | Verify buffer-growth conflicts block approvals until an explicit resolution | PASS | Changed Jasmine Hall to setup 30, turnaround 45; EVT-3005 (5 Feb 12:00–2:00 pm) listed as conflicting with EVT-3001, both kept Pending. Both decision pages blocked, naming each other ([EVT-3005] / [EVT-3001]), Approve greyed out. Rejected EVT-3001 with "Overlaps another request after the buffer change": "Rejected. Coordinator A has been notified, with your reason." Its page shows Rejected, decided by Venue Staff A, no Decide on request button. Then EVT-3005 approved: "Approved. The booking is confirmed. Coordinator B has been notified." |
| TC_E06S06_07 | Verify one event may confirm overlapping bookings at different venues | PASS | EVT-3003 approved at Orchid Hall and then Cedar Auditorium for the same time, 8 Feb 2:00–4:00 pm. Both said "Approved. The booking is confirmed. Coordinator A has been notified." Both calendars for 8 Feb show "14:00–16:00 Confirmed EVT-3003 Planning Phase Gala". |
| TC_E06S06_03 | Verify concurrent overlapping new claims accept only one request | N/A | Automated only: two requests at the same instant cannot be clicked. Covered by the backend database test (`20261030-201757-lexinphun2024-debug-backend-db.md`). |

Known follow-up, not part of these cases: Jasmine Hall's EVT-3005 is
Confirmed but keeps its `buffer_conflict` flag until the venue's buffers are
next saved. The flag no longer blocks approval (step 7 of TC_06 above).

Timing: the frontmatter `date` and the filename are when the run finished,
21:10:29 Singapore time, when the last screenshot (`TC_E06S06_07-4`) reached
the session. Screenshot times are when each image was saved into the session,
not the moment it was taken.

## Screenshots

- [TC_E06S06_02-1](evidence/20261030-211029-lexinphun2024-debug-frontend-e2e/TC_E06S06_02-1.png): EVT-2003's Lotus Room request refused with the 8:30 am to 11:45 am window and no other event name
- [TC_E06S06_02-2](evidence/20261030-211029-lexinphun2024-debug-frontend-e2e/TC_E06S06_02-2.png): EVT-2003's venue bookings page, "No venue bookings recorded"
- [TC_E06S06_05-1](evidence/20261030-211029-lexinphun2024-debug-frontend-e2e/TC_E06S06_05-1.png): EVT-3002's Orchid Hall request refused with the 9:00 am to 11:00 am window
- [TC_E06S06_05-2](evidence/20261030-211029-lexinphun2024-debug-frontend-e2e/TC_E06S06_05-2.png): EVT-3002's venue bookings page, "No venue bookings recorded"
- [TC_E06S06_04-1](evidence/20261030-211029-lexinphun2024-debug-frontend-e2e/TC_E06S06_04-1.png): EVT-3005's adjacent Orchid Hall request, no Booking Conflict, Approve clickable
- [TC_E06S06_04-2](evidence/20261030-211029-lexinphun2024-debug-frontend-e2e/TC_E06S06_04-2.png): "Approved. The booking is confirmed. Coordinator B has been notified."
- [TC_E06S06_04-3](evidence/20261030-211029-lexinphun2024-debug-frontend-e2e/TC_E06S06_04-3.png): Orchid Hall calendar for 3 Feb, two Confirmed bookings touching at 11:00
- [TC_E06S06_01-1](evidence/20261030-211029-lexinphun2024-debug-frontend-e2e/TC_E06S06_01-1.png): Maple Room saved with setup 30, EVT-3005 listed as conflicting with EVT-3001
- [TC_E06S06_01-2](evidence/20261030-211029-lexinphun2024-debug-frontend-e2e/TC_E06S06_01-2.png): EVT-3005's decision page, "overlaps with confirmed booking [EVT-3001]", Approve greyed out
- [TC_E06S06_01-3](evidence/20261030-211029-lexinphun2024-debug-frontend-e2e/TC_E06S06_01-3.png): Maple Room calendar for 4 Feb, EVT-3005 flagged "Buffer conflict — needs review", EVT-3001 not
- [TC_E06S06_06-1](evidence/20261030-211029-lexinphun2024-debug-frontend-e2e/TC_E06S06_06-1.png): Jasmine Hall saved with 30/45, EVT-3005 listed as conflicting with EVT-3001
- [TC_E06S06_06-2](evidence/20261030-211029-lexinphun2024-debug-frontend-e2e/TC_E06S06_06-2.png): EVT-3001's decision page blocked, naming [EVT-3005]
- [TC_E06S06_06-3](evidence/20261030-211029-lexinphun2024-debug-frontend-e2e/TC_E06S06_06-3.png): EVT-3005's decision page blocked, naming [EVT-3001]
- [TC_E06S06_06-4](evidence/20261030-211029-lexinphun2024-debug-frontend-e2e/TC_E06S06_06-4.png): EVT-3001 rejected, "Coordinator A has been notified, with your reason."
- [TC_E06S06_06-5](evidence/20261030-211029-lexinphun2024-debug-frontend-e2e/TC_E06S06_06-5.png): EVT-3001's request page, Rejected with the reason and no Decide on request button
- [TC_E06S06_06-6](evidence/20261030-211029-lexinphun2024-debug-frontend-e2e/TC_E06S06_06-6.png): EVT-3005 approved after the rejection, "Approved. The booking is confirmed."
- [TC_E06S06_07-1](evidence/20261030-211029-lexinphun2024-debug-frontend-e2e/TC_E06S06_07-1.png): EVT-3003 approved at Orchid Hall, 8 Feb 2:00–4:00 pm
- [TC_E06S06_07-2](evidence/20261030-211029-lexinphun2024-debug-frontend-e2e/TC_E06S06_07-2.png): EVT-3003 approved at Cedar Auditorium for the same period
- [TC_E06S06_07-3](evidence/20261030-211029-lexinphun2024-debug-frontend-e2e/TC_E06S06_07-3.png): Orchid Hall calendar for 8 Feb, 14:00–16:00 Confirmed EVT-3003
- [TC_E06S06_07-4](evidence/20261030-211029-lexinphun2024-debug-frontend-e2e/TC_E06S06_07-4.png): Cedar Auditorium calendar for 8 Feb, 14:00–16:00 Confirmed EVT-3003
