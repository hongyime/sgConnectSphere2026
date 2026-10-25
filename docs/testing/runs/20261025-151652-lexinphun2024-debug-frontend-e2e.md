---
date: 2026-10-25T15:16:52+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: "241026"
database: real
commit: 92d8ff9
pr: 349
---

SCRUM-152 / E05-S06 automated run through the **real local stack**: Vite
frontend on 127.0.0.1:5173, local API (`backend/src/dev.ts`) on 127.0.0.1:3001
started with only `DATABASE_URL` (`DATABASE_POOLER_URL` empty), and native
PostgreSQL `connectsphere_dev_stack` on 127.0.0.1:5432 (no Docker Desktop, no
shared Supabase). The database was reset and seeded with the CLI (reset guard
not bypassed), then loaded with `docs/testing/manual/E05-S06-preconditions.sql`.
A temporary, uncommitted Playwright script (desktop Chrome, real sign-in as the
seeded accounts) followed the steps in `docs/testing/manual/E05-S06-click-through.md`.
No email provider was configured, so email deliveries stay queued. This is an
automated run, **not** the human T-93 run, and no screenshot from it is evidence.
The `date` is when the run started.

An earlier attempt at 14:34 (commit `51cd5ea`) passed TC_E05S06_01 and failed at
TC_E05S06_02 with "Service unavailable": setting the event's **primary**
Confirmed booking to Conflicting broke `venue_bookings_primary_confirmed`. Fixed
in #345 (`049c389`) and covered in #348 (`47a268c`); this run is on the merged fix.

After the run, read-only SQL (`default_transaction_read_only=on`) corroborated
the stored outcome, quoted in Remarks.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S06_01 | Free period saved with category and note; calendar shows it Blocked | PASS | Row "Equipment failure · Projector rig fault"; calendar 08:00–18:00 "Maintenance block · Equipment failure · Projector rig fault"; history `created`, created by Venue Staff A |
| TC_E05S06_02 | Over a Pending request and a primary Confirmed booking: both Conflicting, listed, none released, Confirmed event to Planning | PASS | "These 2 events…"; EVT-2001 "Returned to Planning"; two Conflicting calendar entries; audit "Returned to Planning: venue unavailable" confirmed→planning; Coordinator A's event page and venue bookings flag "Safety concern · Ceiling inspection … Before this it was Confirmed." |
| TC_E05S06_03 | Only affected Coordinators told, in-app and email | PASS | Coordinator A (EVT-2001) and Coordinator B (EVT-2003) saw the notice; organiser_a saw none; SQL: "Venue unavailable" rows with email delivery `queued` for both; 0 notices to Organisers or Attendees from the run |
| TC_E05S06_04 | No end: open-ended until lifted | PASS | Row "Until lifted"; Blocked on 1–3 Mar 2027; SQL `upper_inf` true |
| TC_E05S06_05 | Extending flags a booking; shortening restores it | PASS | "1 event is newly marked Conflicting" (EVT-3001), then "1 booking has its earlier status back"; SQL history `created,edited,edited`, EVT-3001 Pending; audit Conflicting/Restored |
| TC_E05S06_06 | E05-S04 block, shorten, remove on a free period | PASS | Saved, edited to end 25 Jan 2027 12:00 pm, lifted and gone from the list; history `created,edited,lifted` |
| TC_E05S06_07 | Edit and lift keep history; affected Coordinators told on lift | PASS | "2 bookings have their earlier status back"; Show lifted "Lifted … by Venue Staff A"; History Created/Edited/Lifted with the new note; Coordinator B "Venue available again"; SQL EVT-2003 Pending, EVT-2001 Confirmed and still primary, event stays Planning |
| TC_E05S06_08 | Unexpired hold flagged, not released, restored on lift | PASS | EVT-3003 listed, then restored; SQL Tentative with the original expiry (07 Nov 15:16), audit tentative→conflicting→tentative |
