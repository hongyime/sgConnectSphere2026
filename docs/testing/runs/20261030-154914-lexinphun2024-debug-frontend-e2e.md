---
date: 2026-10-30T15:49:14+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 281026
database: real
commit: 8e2d7ee
---

Manual run of E10-S02 (SCRUM-71, run subtask SCRUM-238) by Le Xin, following
`docs/testing/manual/E10-S02-click-through.md` sections A to G in a browser on the
local stack: native PostgreSQL `connectsphere_dev_stack` (reset, seeded, then
`E10-S02-preconditions.sql` setup), the local API and Vite on 5173. Screenshots
were taken by the tester. Afterwards the read-only `check` stage matched: 5
bookings and 3 projectors flagged, 7 reconfirmation activity entries, one staff
notice each, 100 still Registered for EVT-1024.

Fixture substitutions: seed accounts coord_a, venue_a and tech_a replace the
cases' coordinator_1, venue_staff_1 and tech_support_1, and organiser_a is the
Organiser; separate events EVT-1021 to EVT-1025 replace the single "Tech
Conference 2026" so the cases do not affect each other, keeping each case's
numbers and dates. TC_E10S02_04's capacity drop is made by Venue Staff on the
venue form (E05-S01) because no Coordinator screen changes capacity yet. The
"change one Session out of two" parts of TC_E10S02_01, _05 and _07 cannot be
done on screen until E04-S02 adds a Session edit; they are covered by
`backend/tests/arrangementImpact.integration.test.ts`
(`20261029-204828-lexinphun2024-debug-backend-db.md`).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_01 | Attendance above capacity flags the booking and notifies Venue Staff | PASS | coord_a raised EVT-1022 attendance 200 to 250 (E10 Riverside Hall holds 200). Review box: "E10 Riverside Hall: 250 people for 200 places", Venue Staff only, no equipment. Saved: 1 arrangement flagged, Venue Staff notified; venue_a got the "attendance above capacity" notice. Two-Session part covered by database tests (E04-S02). |
| TC_E10S02_02 | Description-only edit flags nothing | PASS | organiser_a changed only the description of EVT-1021 and saved. Saved message shown, no review box. Grand Hall still Confirmed, no Needs reconfirmation, nothing flagged. |
| TC_E10S02_03 | Affected arrangements shown before the change takes effect | PASS | coord_a changed EVT-1021 date 15 Nov to 20 Nov and clicked Save. Review box listed E10 Grand Hall and E10 Projector (date or time changed); event still 15 Nov, nothing saved yet. Cancel kept the new dates. |
| TC_E10S02_04 | Over-subscription warns without removing or waitlisting anyone | PASS | venue_a lowered E10 Auditorium 120 to 80 (no Coordinator screen changes capacity yet). coord_a then saved a description edit on EVT-1024: warning "A Session: 100 registered for 80 places. The whole event: 100 registered for 80 places", no one removed. organiser_a still sees 100 registered (100 of 80 taken, Full). |
| TC_E10S02_05 | Date change flags the venue booking and equipment | PASS | coord_a saved the 20 Nov date with "Save and ask staff to reconfirm". Message: 2 arrangements flagged, Venue Staff and Technical Support Staff notified. Grand Hall shows Needs reconfirmation (booking still 15 Nov, flagged not moved). Two-Session part covered by database tests (E04-S02). |
| TC_E10S02_06 | Technical Support Staff notified as well as Venue Staff | PASS | After the 20 Nov date change, venue_a and tech_a each got one "Event update" for Tech Conference 2026 saying venue bookings or equipment need reconfirmation. tech_a's equipment page shows E10 Projector as Reserved with Needs review. |
| TC_E10S02_07 | Booking's own headcount governs over Session attendance | PASS | coord_a raised EVT-1023 attendance 50 to 100; E10 Studio holds 80 and the booking's own headcount is 60. Saved straight away, no review box, nothing flagged. Studio shows Booking headcount: 60, no Needs reconfirmation. Two Sessions in one event covered by database tests (E04-S02). |
| TC_E10S02_08 | Event-wide date change flags every Session's arrangements | PASS | coord_a moved EVT-1025 (2 Sessions) start from 25 Nov to 24 Nov. Review box listed Seminar Room A, Seminar Room B and both E10 Projectors (date or time changed). After saving, both Seminar Rooms show Needs reconfirmation. |
| TC_E10S02_09 | Description-only edit flags no Session arrangement | PASS | coord_a changed only the description of EVT-1025 (2 Sessions, 25 and 26 Nov). Saved straight away, no review box. Seminar Room A and B still Confirmed, no Needs reconfirmation; nothing flagged. |

## Screenshots

- [TC_E10S02_01-1](evidence/20261030-154914-lexinphun2024-debug-frontend-e2e/TC_E10S02_01-1.png): coord_a's review box, E10 Riverside Hall 250 people for 200 places, Venue Staff only
- [TC_E10S02_01-2](evidence/20261030-154914-lexinphun2024-debug-frontend-e2e/TC_E10S02_01-2.png): saved message, 1 arrangement flagged, Venue Staff notified, attendance 250
- [TC_E10S02_01-3](evidence/20261030-154914-lexinphun2024-debug-frontend-e2e/TC_E10S02_01-3.png): venue_a's Riverside Summit "attendance above capacity" notice
- [TC_E10S02_02-1](evidence/20261030-154914-lexinphun2024-debug-frontend-e2e/TC_E10S02_02-1.png): organiser_a's saved message for the description only
- [TC_E10S02_02-2](evidence/20261030-154914-lexinphun2024-debug-frontend-e2e/TC_E10S02_02-2.png): coord_a's venue bookings, Grand Hall Confirmed, no Needs reconfirmation
- [TC_E10S02_03-1](evidence/20261030-154914-lexinphun2024-debug-frontend-e2e/TC_E10S02_03-1.png): review box listing Grand Hall and Projector, summary still 15 Nov
- [TC_E10S02_03-2](evidence/20261030-154914-lexinphun2024-debug-frontend-e2e/TC_E10S02_03-2.png): form after Cancel, 20 Nov dates still filled in
- [TC_E10S02_04-1](evidence/20261030-154914-lexinphun2024-debug-frontend-e2e/TC_E10S02_04-1.png): venue_a's inventory, E10 Auditorium Max capacity 80
- [TC_E10S02_04-2](evidence/20261030-154914-lexinphun2024-debug-frontend-e2e/TC_E10S02_04-2.png): coord_a's warning, 100 registered for 80 places, no one removed
- [TC_E10S02_04-3](evidence/20261030-154914-lexinphun2024-debug-frontend-e2e/TC_E10S02_04-3.png): saved message, no one was removed or moved to the waiting list
- [TC_E10S02_04-4](evidence/20261030-154914-lexinphun2024-debug-frontend-e2e/TC_E10S02_04-4.png): organiser_a's registrations, 100 of 80 taken, 100 registered
- [TC_E10S02_05-1](evidence/20261030-154914-lexinphun2024-debug-frontend-e2e/TC_E10S02_05-1.png): saved message, 2 arrangements flagged, event now 20 Nov
- [TC_E10S02_05-2](evidence/20261030-154914-lexinphun2024-debug-frontend-e2e/TC_E10S02_05-2.png): Grand Hall with Needs reconfirmation
- [TC_E10S02_06-1](evidence/20261030-154914-lexinphun2024-debug-frontend-e2e/TC_E10S02_06-1.png): venue_a's Tech Conference 2026 reconfirmation notice
- [TC_E10S02_06-2](evidence/20261030-154914-lexinphun2024-debug-frontend-e2e/TC_E10S02_06-2.png): tech_a's same reconfirmation notice
- [TC_E10S02_06-3](evidence/20261030-154914-lexinphun2024-debug-frontend-e2e/TC_E10S02_06-3.png): tech_a's equipment page, E10 Projector Reserved and Needs review
- [TC_E10S02_07-1](evidence/20261030-154914-lexinphun2024-debug-frontend-e2e/TC_E10S02_07-1.png): saved message for attendance 100, nothing flagged
- [TC_E10S02_07-2](evidence/20261030-154914-lexinphun2024-debug-frontend-e2e/TC_E10S02_07-2.png): E10 Studio, Booking headcount 60, no Needs reconfirmation
- [TC_E10S02_08-1](evidence/20261030-154914-lexinphun2024-debug-frontend-e2e/TC_E10S02_08-1.png): review box listing both Seminar Rooms and both Projectors
- [TC_E10S02_08-2](evidence/20261030-154914-lexinphun2024-debug-frontend-e2e/TC_E10S02_08-2.png): both Seminar Rooms with Needs reconfirmation
- [TC_E10S02_09-1](evidence/20261030-154914-lexinphun2024-debug-frontend-e2e/TC_E10S02_09-1.png): saved message for the description only, no review box
- [TC_E10S02_09-2](evidence/20261030-154914-lexinphun2024-debug-frontend-e2e/TC_E10S02_09-2.png): both Seminar Rooms Confirmed, no Needs reconfirmation
