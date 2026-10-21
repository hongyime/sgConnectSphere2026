---
date: 2026-10-16T00:18:13+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "141026"
database: real
commit: e0959ea
pr: 272
---

SCRUM-189 (subtask of SCRUM-75 / E11-S01) manual end-to-end run, clicked by
hand in Microsoft Edge by Le Xin on the real local stack: the frontend
(`npm run dev`, 5173), the local API (`backend/src/dev.ts`, 3001, started with
only `DATABASE_URL`) and `connectsphere_dev_stack` (PostgreSQL 17), reset and
seeded just before (migrations through 0019, including
`0018_venue_staff_assignments.sql`). Seeded assignments: `venue_a` looks after
Orchid Hall, Lotus Room and Maple Room; `venue_b` looks after Jasmine Hall and
Cedar Auditorium. Run from 23:42 on 15 October to 00:17 on 16 October.
Notifications were checked in the database after each step. Screenshots were
taken by hand (T-93) and are linked below.

Seed substitutions for the placeholder data in `docs/testing/cases/`:
`coordinator_1` -> `coord_a@connectsphere.com`; `venue_staff_1` ->
`venue_a@connectsphere.com` / `venue_b@connectsphere.com`; "Annual Tech
Summit" -> EVT-3003 Planning Phase Gala (Orchid Hall, Pending) and EVT-3001
Approved Annual Conference (Jasmine Hall, Confirmed); "Charity Run" /
"Riverside Hall" -> EVT-3003 / Cedar Auditorium. TC_E11S01_02 changes the
venue; no venue-move workflow exists before E10-S05, so the end time was
changed instead and the venue move is recorded as SKIP. While retaking
screenshot 1, EVT-3003's end was saved three times (10:30 pm at 23:42, back to
10:00 pm at 23:49, 10:30 pm again at 23:50); each save notified the same
recipients, which is why the counts below are 3.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E11S01_02 | Effective date/time change follows the recipient matrix (venue staff by assignment) | PASS | coord_a changed EVT-3003's end to 25 Oct 2026, 10:30 pm and EVT-3001's end to 15 Oct 2026, 5:30 pm ("Saved your changes to the end. They're recorded in the event's activity log."). venue_a: 3 "Event update" notices, "EVT-3003 Planning Phase Gala: Event date, time changed.", none for EVT-3001. venue_b: 1 notice, "EVT-3001 Approved Annual Conference: Event date, time changed.", none for EVT-3003. organiser_a: 4 Event updates (3 EVT-3003, 1 EVT-3001). coord_a, the actor: no new notice (only 3 seeded ones). attendee_i, registered for EVT-3001: no notice, as designed, because EVT-3001 has no public snapshot and attendees receive only public changes |
| TC_E11S01_02 | Venue move notifies Venue Staff of both the old and the new venue | SKIP | No venue-move workflow until E10-S05 |
| TC_E11S01_03 | Description-only change does not notify Venue Staff | PASS | organiser_a added "Updated for manual test." to EVT-3003's description only; the page showed "Saved your changes to the description. The activity log has been updated."; 0 new notices for anyone; venue_a still had the same 3 notices |
| TC_E06S03_01 | Booking request notifies the requested venue's Venue Staff (Venue Staff part only) | PASS | coord_a requested Cedar Auditorium for EVT-3003, 25 Oct 2026, 7:00 to 9:00 pm, purpose "Manual test SCRUM-189": "Booking request submitted" / "Your request is Pending. The venue is reserved tentatively while a decision is outstanding." Only venue_b was notified: "EVT-3003 Planning Phase Gala: A venue booking request needs a decision."; venue_a, who looks after EVT-3003's other venue Orchid Hall, got nothing. The rest of TC_E06S03_01 belongs to E06-S03 |

Findings outside SCRUM-189, not failures of these cases:

- The event Activity log shows a changed end time as a raw UTC string
  ("End: 2026-10-15T09:30:00.000Z") instead of the local date and time.
- Notification messages end with a raw UTC time ("Changed at
  2026-10-15T15:50:00.833Z.").
- The Organiser's edit confirmation is plain text, while the Coordinator's is
  a green alert.

## Screenshots

- [TC_E11S01_02-1](evidence/20261016-001813-lexinphun2024-debug-frontend-e2e/TC_E11S01_02-1.png): EVT-3003 now 25 Oct 2026, 6:00 pm to 10:30 pm, saved
- [TC_E11S01_02-2](evidence/20261016-001813-lexinphun2024-debug-frontend-e2e/TC_E11S01_02-2.png): EVT-3001 now 15 Oct 2026, 9:00 am to 5:30 pm, saved, with the Activity log row
- [TC_E11S01_02-3](evidence/20261016-001813-lexinphun2024-debug-frontend-e2e/TC_E11S01_02-3.png): venue_a's 3 EVT-3003 notices
- [TC_E11S01_02-4](evidence/20261016-001813-lexinphun2024-debug-frontend-e2e/TC_E11S01_02-4.png): venue_b's 1 EVT-3001 notice
- [TC_E11S01_02-5](evidence/20261016-001813-lexinphun2024-debug-frontend-e2e/TC_E11S01_02-5.png): organiser_a's notices for both events
- [TC_E11S01_02-6](evidence/20261016-001813-lexinphun2024-debug-frontend-e2e/TC_E11S01_02-6.png): attendee_i, no EVT-3001 notice
- [TC_E11S01_02-7](evidence/20261016-001813-lexinphun2024-debug-frontend-e2e/TC_E11S01_02-7.png): coord_a, only seeded notices
- [TC_E11S01_03-1](evidence/20261016-001813-lexinphun2024-debug-frontend-e2e/TC_E11S01_03-1.png): EVT-3003 description saved by organiser_a
- [TC_E11S01_03-2](evidence/20261016-001813-lexinphun2024-debug-frontend-e2e/TC_E11S01_03-2.png): venue_a, no new notice
- [TC_E06S03_01-1](evidence/20261016-001813-lexinphun2024-debug-frontend-e2e/TC_E06S03_01-1.png): Cedar Auditorium request submitted as Pending
- [TC_E06S03_01-2](evidence/20261016-001813-lexinphun2024-debug-frontend-e2e/TC_E06S03_01-2.png): venue_b's booking-request notice
- [TC_E06S03_01-3](evidence/20261016-001813-lexinphun2024-debug-frontend-e2e/TC_E06S03_01-3.png): venue_a, no booking-request notice
