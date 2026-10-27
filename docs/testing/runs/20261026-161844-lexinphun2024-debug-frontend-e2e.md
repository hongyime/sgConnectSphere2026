---
date: 2026-10-26T16:18:44+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "241026"
database: real
commit: 781c974
pr: 349
---

SCRUM-152 / E05-S06 human T-93 run of TC_E05S06_01–08, following
`docs/testing/manual/E05-S06-click-through.md`. Real local stack: frontend on
127.0.0.1:5173, local API (`backend/src/dev.ts`) on 127.0.0.1:3001 started with
only `DATABASE_URL` (`DATABASE_POOLER_URL` empty), and native PostgreSQL
`connectsphere_dev_stack` on 127.0.0.1:5432 (no Docker Desktop, no shared
Supabase). The database was reset and seeded with the CLI (reset guard not
bypassed), then loaded with `docs/testing/manual/E05-S06-preconditions.sql`.
The tester clicked every step and took every screenshot by hand. The `date` is
when the first screenshot was taken.

Cases 01–07 ran from 16:18 to 17:01; Case 08 ran from 21:08 on the same stack
and data. On returning, the Maintenance blocks page had defaulted to the first
venue (Cedar Auditorium), and the Case 08 block was first saved there; it
flagged nothing and was lifted at once, then Case 08 was redone on Orchid Hall.

No email provider was configured, so email deliveries stay queued. After the
run, read-only SQL (`default_transaction_read_only=on`) listed every
"Venue unavailable" / "Venue available again" notification, quoted under
TC_E05S06_03.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S06_01 | Free period saved with a reason category and note; shown as Blocked | PASS | "Unavailability saved."; row 20 Jan 2027, 8:00 am – 6:00 pm · Equipment failure · Projector rig fault; Availability 20 Jan: 08:00–18:00 Blocked "Maintenance block · Equipment failure · Projector rig fault", 18:00–22:00 Free |
| TC_E05S06_02 | Over a Pending request and a primary Confirmed booking: both Conflicting, listed, none released, Confirmed event back to Planning | PASS | "These 2 events have bookings in this period, now marked Conflicting. Nothing was cancelled."; EVT-2003 "Coordinator notified", EVT-2001 "Returned to Planning" + "Coordinator notified"; calendar 15 Jan: Blocked 08:00–18:00 and two Conflicting bookings "Venue unavailable — needs an alternative · Safety concern"; Coordinator A's EVT-2001 page: yellow "Venue unavailable · Orchid Hall — Safety concern", status Planning; venue bookings: Conflicting, "…Before this it was Confirmed.", still "Primary venue" |
| TC_E05S06_03 | Only the affected Coordinators are told, in-app and by email | PASS | Coordinator A: "Venue unavailable" for EVT-2001 ("…The event has returned to Planning."); Coordinator B: same for EVT-2003; organiser_a and attendee_a: no venue notice. SQL: all 8 venue notices of the run went to coord_a / coord_b (event_coordinator), each with one `email:queued` delivery; none to Organisers or Attendees |
| TC_E05S06_04 | No end: unavailable until lifted | PASS | Row 1 Mar 2027, 8:00 am · "Until lifted" · Renovation · Roof works; Availability 1–3 Mar 2027: 1 Mar 08:00–24:00 Blocked, 2 and 3 Mar "All day" Blocked |
| TC_E05S06_05 | Extending flags a booking; shortening restores it | PASS | Rewiring 17 Jan 8:00 am – 12:00 pm saved with no events; edited to 2:00 pm: "1 event is newly marked Conflicting." EVT-3001 "Coordinator notified"; edited back to 12:00 pm: "1 booking has its earlier status back." EVT-3001 "Booking restored" |
| TC_E05S06_06 | E05-S04 block, shorten and remove still work on a free period | PASS | 25 Jan 12:00 am – 26 Jan 12:00 am saved; edited: row ends 25 Jan 2027, 12:00 pm; lifted: "Unavailability lifted. It stays in the history." and the row left the list |
| TC_E05S06_07 | Edits and lifts keep history; affected Coordinators told on lift | PASS | Ceiling inspection edited to 8:00 pm, note "Ceiling inspection, second check"; lifted: "2 bookings have their earlier status back." EVT-2003 and EVT-2001 "Booking restored · Coordinator notified"; Show lifted: "Lifted by Venue Staff A, 26 Oct 2026, 4:46 pm", History only; History: Created 4:24 pm, Edited 4:46 pm (6:00 pm → 8:00 pm, note changed), Lifted 4:46 pm, all by Venue Staff A; the 25 Jan block's history also shows Created, Edited, Lifted; Coordinator B: "Venue available again" for EVT-2003; EVT-2001 stays Planning, activity log "Confirmed → Planning", "Orchid Hall: Confirmed → Conflicting", "Orchid Hall: Conflicting → Confirmed" |
| TC_E05S06_08 | An unexpired hold is flagged, not released, and restored on lift | PASS | Lighting rig repair 22 Jan 12:00 am – 23 Jan 12:00 am on Orchid Hall: "This event has a booking in this period, now marked Conflicting. Nothing was cancelled." EVT-3003 "Coordinator notified"; lifted: "1 booking has its earlier status back." EVT-3003 "Booking restored"; Coordinator A: "Venue unavailable" (21:08) and "Venue available again" (21:09) for EVT-3003 |

Observations outside the cases (no case failed on them): the top menu cuts
off its last item at this window width ("Tentative I" for Venue Staff, "Ve"
for the Coordinator); the affected-events list repeats the event code because
the seeded titles already contain it ("EVT-2003 Client B Isolation Event
(EVT-2003)"); the Maintenance blocks page does not keep the chosen venue after
signing in again.

## Screenshots

- [TC_E05S06_01-1](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_01-1.png): free period saved, row with category and note
- [TC_E05S06_01-2](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_01-2.png): Availability 20 Jan, 08:00–18:00 Blocked
- [TC_E05S06_02-1](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_02-1.png): save lists EVT-2003 and EVT-2001 (Returned to Planning)
- [TC_E05S06_02-2](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_02-2.png): calendar 15 Jan, Blocked plus two Conflicting
- [TC_E05S06_02-3](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_02-3.png): Coordinator A's EVT-2001, Venue unavailable flag, Planning
- [TC_E05S06_02-4](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_02-4.png): venue bookings, Conflicting, "Before this it was Confirmed", Primary venue
- [TC_E05S06_03-1](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_03-1.png): Coordinator A's "Venue unavailable" notice for EVT-2001
- [TC_E05S06_03-2](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_03-2.png): Coordinator B's "Venue unavailable" notice for EVT-2003
- [TC_E05S06_03-3](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_03-3.png): organiser_a, no venue notice
- [TC_E05S06_03-4](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_03-4.png): attendee_a, no venue notice
- [TC_E05S06_04-1](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_04-1.png): open-ended row, "Until lifted"
- [TC_E05S06_04-2](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_04-2.png): Availability 1–3 Mar, all Blocked
- [TC_E05S06_05-1](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_05-1.png): extended, EVT-3001 newly Conflicting
- [TC_E05S06_05-2](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_05-2.png): shortened, EVT-3001 Booking restored
- [TC_E05S06_06-1](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_06-1.png): block shortened to end 25 Jan 12:00 pm
- [TC_E05S06_06-2](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_06-2.png): block lifted and gone from the list
- [TC_E05S06_07-1](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_07-1.png): edited block lifted, two bookings restored
- [TC_E05S06_07-2](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_07-2.jpg): Show lifted row and History (Created, Edited, Lifted) of the 15 Jan block
- [TC_E05S06_07-3](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_07-3.jpg): History of the 25 Jan block (Created, Edited, Lifted)
- [TC_E05S06_07-4](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_07-4.png): Coordinator B's "Venue available again" for EVT-2003
- [TC_E05S06_07-5](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_07-5.png): EVT-2001 still Planning, flag gone
- [TC_E05S06_07-6](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_07-6.png): EVT-2001 activity log, Conflicting → Confirmed
- [TC_E05S06_08-1](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_08-1.png): hold flagged Conflicting, EVT-3003 listed
- [TC_E05S06_08-2](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_08-2.png): lifted, EVT-3003 Booking restored
- [TC_E05S06_08-3](evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/TC_E05S06_08-3.png): Coordinator A's two EVT-3003 notices
