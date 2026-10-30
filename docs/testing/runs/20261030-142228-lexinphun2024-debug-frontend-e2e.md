---
date: 2026-10-30T14:22:28+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: 281026
database: real
commit: 30dbc92
---

Automated click-through of `docs/testing/manual/E10-S02-click-through.md` on the
real local stack: native PostgreSQL 17 `connectsphere_dev_stack` on 127.0.0.1:5432
(reset, seeded, then `E10-S02-preconditions.sql` stage `setup`), the local API
(`backend/src/dev.ts`, `DATABASE_URL` only) and Vite on 5173, driven by a
temporary Playwright script in Chromium (Asia/Singapore). 14 steps, 14 passed.
Before this run the script was checked against the guide step by step and three
checks were tightened: the saved dates on reopening the form, the venue's saved
capacity of 80, and the exact "100 registered" text on the Organiser's page.
Read-only checks afterwards (stage `check`): 5 bookings and 3 reservations
flagged, 7 reconfirmation audit rows, 5 staff reconfirmation notices, 100
Registered for EVT-1024, EVT-1021 starting 20 Nov 09:00, E10 Auditorium at 80. E10-S02 / SCRUM-71, run subtask SCRUM-238. This is
automated evidence; it does not replace the story owner's manual T-93 run.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_01 | An attendance change should flag only bookings whose governing headcount exceeds capacity | PASS | One-Session form, EVT-1022: attendance 200 to 250 showed "E10 Riverside Hall: 250 people for 200 places", saved "1 arrangement was flagged"; booking flagged, projector not; venue_a got the attendance notice. Change-one-Session-of-two part: database tests only (no Session edit screen, E04-S02) |
| TC_E10S02_02 | Editing only the event description should flag nothing | PASS | organiser_a saved EVT-1021's description; Grand Hall showed no "Needs reconfirmation"; no audit row |
| TC_E10S02_03 | Saving a change that affects confirmed arrangements should show them before it takes effect | PASS | Date 15 to 20 Nov: review listed "E10 Grand Hall" and "E10 Projector: date or time changed"; Cancel kept the new dates; nothing saved before confirming |
| TC_E10S02_04 | Capacity below registrations warns without removing anyone | PASS | venue_a lowered E10 Auditorium 120 to 80 and the form then read 80 (venue form, E05-S01; no Coordinator screen lowers capacity yet); coord_a's next save warned "A Session: 100 registered for 80 places. The whole event: 100 registered for 80 places"; Organiser page showed "100 registered" |
| TC_E10S02_05 | Changing a date should flag its booking and equipment reservation | PASS | One-Session form, EVT-1021: "2 arrangements were flagged"; reopened form showed 20 Nov 09:00 to 17:00; Grand Hall "Needs reconfirmation"; both flags set in the database. Change-one-Session-of-two part: database tests only (E04-S02) |
| TC_E10S02_06 | Technical Support Staff are notified as well as Venue Staff | PASS | venue_a and tech_a each had one Tech Conference 2026 reconfirmation notice; tech_a's equipment page showed "Needs review" |
| TC_E10S02_07 | A booking headcount override governs over Session attendance | PASS | One-Session form, EVT-1023: attendance 50 to 100 with booking headcount 60 at an 80-seat Studio saved with no review step and no flag. Two-Session-in-one-event part: database tests only (E04-S02) |
| TC_E10S02_08 | An Event-wide date change should flag arrangements for every Session | PASS | EVT-1025 (two Sessions) start moved to 24 Nov: review listed both Seminar Rooms and both Projectors; "4 arrangements were flagged"; both rooms "Needs reconfirmation" |
| TC_E10S02_09 | An Event description-only edit should not flag any Session arrangements | PASS | EVT-1025 description saved with no review step; neither Seminar Room flagged |
