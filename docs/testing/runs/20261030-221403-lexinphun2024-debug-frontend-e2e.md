---
date: 2026-10-30T22:14:03+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: "281026"
database: real
commit: 0632086
pr: 380
---

Re-run of the `docs/testing/manual/E10-S02-click-through.md` click-through on
#380's head after both review fixes (stale-preview guard and preview revision,
then the separate write state). Native PostgreSQL 17 `connectsphere_dev_stack`
on 127.0.0.1:5432 reset, seeded and loaded with `E10-S02-preconditions.sql`
stage `setup`; API with `DATABASE_URL` only; Vite on 5173; a temporary
Playwright script in Chromium (Asia/Singapore) followed sections A to G. All 9
passed on the first attempt. Stage `check` afterwards (read-only): 5 bookings
and 3 reservations flagged, 7 reconfirmation audit rows, 5 staff notices, 100
Registered for EVT-1024. Automated evidence; not a manual T-93 run.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_01 | Attendance above capacity flags only that booking | PASS | EVT-1022 200 to 250: "E10 Riverside Hall: 250 people for 200 places", "1 arrangement was flagged…"; venue_a notice |
| TC_E10S02_02 | Description-only edit flags nothing | PASS | organiser_a saved EVT-1021's description; no review; Grand Hall not flagged |
| TC_E10S02_03 | Affected arrangements shown before the change | PASS | Grand Hall and Projector listed; Cancel kept 20 Nov 09:00 to 17:00 |
| TC_E10S02_04 | Over-subscription warns, removes nobody | PASS | E10 Auditorium cut to 80; "A Session: 100 registered for 80 places. The whole event: …"; 100 registered |
| TC_E10S02_05 | Date change flags booking and equipment | PASS | "2 arrangements were flagged…"; Grand Hall Needs reconfirmation |
| TC_E10S02_06 | Technical Support Staff told as well | PASS | venue_a and tech_a notices; Projector Needs review |
| TC_E10S02_07 | Booking headcount override governs | PASS | EVT-1023 50 to 100: no review, Studio headcount 60 not flagged |
| TC_E10S02_08 | Event-wide date change flags every Session | PASS | four "date or time changed" items; "4 arrangements were flagged"; both rooms flagged |
| TC_E10S02_09 | Description-only edit on two Sessions flags nothing | PASS | no review; neither Seminar Room flagged |
