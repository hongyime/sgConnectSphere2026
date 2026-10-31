---
date: 2026-10-30T20:15:27+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: "301026"
database: real
commit: cad7bd7
---

Pre-manual check of E06-S06 (story SCRUM-50) at `cad7bd7`, before the story
owner's T-93 run (subtask SCRUM-232). Native loopback PostgreSQL 17
(`connectsphere_dev_stack`) reset and seeded with `src/database/cli.ts reset`
at 20:14:50, then `docs/testing/manual/E06-S06-preconditions.sql` loaded; API
started with only `DATABASE_URL` (no pooler URL) and the Vite frontend on
127.0.0.1:5173. A temporary, uncommitted Playwright script in headless
Chromium followed `docs/testing/manual/E06-S06-click-through.md` step by step
as `coord_b` (TC_02, TC_05) and `venue_a` (the rest), then a read-only SQL
check. Agent screenshots are not manual evidence (T-93).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S06_02 | A later overlapping request is refused while the first claim remains active | PASS | EVT-2003 at Lotus Room (30/45), period prefilled 1 Feb 2027 10:00-12:00: "This venue is unavailable from 1 Feb 2027, 8:30 am to 1 Feb 2027, 11:45 am, including setup and turnaround."; no EVT-3001 or its title on the page; EVT-2003's list "No venue bookings recorded"; SQL: EVT-2003 0 bookings, EVT-3001 at Lotus still Pending. |
| TC_E06S06_03 | Concurrent overlapping new claims accept only one request | N/A | Automated only: two claims at the same instant cannot be clicked; see the backend/db record of this commit. |
| TC_E06S06_05 | A one-minute overlap is refused before insertion | PASS | EVT-3002 at Orchid Hall, 2 Feb 2027 10:59-13:00: "This venue is unavailable from 2 Feb 2027, 9:00 am to 2 Feb 2027, 11:00 am, including setup and turnaround."; no other event named; SQL: EVT-3002 0 bookings, EVT-3001 still Confirmed. |
| TC_E06S06_04 | Exact half-open buffered adjacency with zero buffers | PASS | EVT-3005 at Orchid Hall, 3 Feb: no Booking Conflict, "Approved. The booking is confirmed."; calendar "09:00–11:00 Confirmed EVT-3001 Approved Annual Conference" and "11:00–13:00 Confirmed EVT-3005 Rejected Budget Review". |
| TC_E06S06_01 | Approval rechecks a confirmed booking after buffer growth | PASS | Maple Room setup 30 saved: "Changes saved, and some bookings now conflict" with "EVT-3005 Rejected Budget Review (EVT-3005), 4 Feb 2027, 11:00 am – 1:00 pm: conflicts with EVT-3001 Approved Annual Conference"; decision page "Booking Conflict: overlaps with confirmed booking [EVT-3001]", Approve disabled, Reject enabled; calendar flags EVT-3005 only; SQL: EVT-3001 confirmed and unflagged, EVT-3005 pending and flagged. |
| TC_E06S06_06 | Buffer-growth conflicts block approvals until explicit resolution | PASS | Jasmine Hall 30/45 saved, EVT-3005 listed; both decision pages blocked, naming [EVT-3005] and [EVT-3001]; EVT-3001 rejected with a reason, its request page shows Rejected and no Decide on request; EVT-3005 then approved. SQL: EVT-3001 rejected with the reason, EVT-3005 confirmed (its flag is still set: known follow-up, it no longer blocks). |
| TC_E06S06_07 | One event may confirm overlapping bookings at different venues | PASS | EVT-3003 approved at Orchid Hall and Cedar Auditorium, 8 Feb 2027 14:00-16:00; each calendar "14:00–16:00 Confirmed EVT-3003 Planning Phase Gala"; SQL: both confirmed. |

Three earlier attempts on the same setup failed in the script's own locators
(the inventory Edit link, then the calendar's From/To labels), not in the
application; the database was reset before each attempt. In one further
attempt the old #378 flag rule was put back in `conflictDetection.ts` on
purpose and TC_06 failed at the final approval, as expected; the file was
restored and this run used the committed code.

`date` is when the browser script finished; the read-only SQL check ran
straight after it.
