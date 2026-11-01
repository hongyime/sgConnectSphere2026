---
date: 2026-10-31T21:13:33+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: 311026
database: real
commit: e2b82a8
---

Automated click-through of sections H to J of
`docs/testing/manual/E10-S02-click-through.md` on the real local stack: native
PostgreSQL 17 `connectsphere_dev_stack` on 127.0.0.1:5432 (reset and seeded with
every migration including 0026, then `E10-S02-preconditions.sql` stage `setup`),
the local API (`backend/src/dev.ts`, `DATABASE_URL` only, `DATABASE_POOLER_URL`
empty) and Vite on 5173, driven by a temporary Playwright script in Chromium
(Asia/Singapore), one sign-in per role. 3 sections, 3 passed. E10-S02 follow-up
T-103, story SCRUM-71, subtask SCRUM-244. This is the automated real-stack run
before Le Xin's manual run; it is not the manual T-93 evidence. Start time is
taken from the run log (33 s run, log written 21:14:06).

Fixture substitutions, as the guide lists: the seed accounts `coord_a`,
`venue_a`, `tech_a` (shown as "Technical Support A") and `safety_officer` stand in
for the cases' `coordinator_1`, `venue_staff_1` and `tech_support_1`; EVT-1026 to
EVT-1028 replace the cases' events; the earlier Confirmed status and reversion of
EVT-1026 are setup rows. Notices were read on `/notifications` rather than the
bell's popover (same data). The single-Session parts of TC_E10S02_05 and the
whole of TC_E10S02_10 are database-only (no screen edits one Session) and are not
in this run.

The first attempt, on the same data, stopped at section J step 4: the
Coordinator's Activity log did not list "Support reconfirmed", although the row
was saved (a real defect: `listEventActivity` read only event and venue-booking
entries). It was fixed in e2b82a8 with a database check that fails without the
fix; the data was then reset, the API restarted, and the recorded run made from
the start. Before it, one loose check was tightened (after re-saving the
projector, the equipment page is reopened and must show Reserved without Needs
review, instead of only "no Needs review" on whatever page followed). The `check`
stage afterwards matched the guide: EVT-1026 Sound desk unflagged at 12 Dec 06:00
with tech_a's assignment there, one "Reconfirmation required" and one "Support
Reconfirmed" row (old and new times as UTC ISO), EVT-1026 in safety_review;
EVT-1027 Lighting still flagged at 6 Dec 09:00 moving to 13 Dec 09:00, no
"Support Reconfirmed" row; EVT-1027 and EVT-1028 in planning.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_03 | Saving a change that affects confirmed arrangements shows which arrangements are affected before the change takes effect | PASS | EVT-1026 moved to 12 Dec: review listed E10 Garden Hall and E10 Projector "date or time changed" and, under Technical Support to reconfirm, "Sound desk: 5 Dec 2026, 6:00 am – 12:00 pm → 12 Dec 2026, 6:00 am – 12:00 pm"; nothing saved before confirming |
| TC_E10S02_06 | When a date or time change flags arrangements, the assigned Technical Support Staff are also notified | PASS | tech_a's notice for Charity Run: "… means venue bookings, equipment reservations or Technical Support requests need reconfirmation." |
| TC_E10S02_08 | An Event-wide date change flags arrangements for every Session | PASS | Technical Support part (one Session, one staffed request): "3 arrangements were flagged for reconfirmation and the Venue Staff and Technical Support Staff were notified." |
| TC_E10S02_11 | A flagged Technical Support request keeps a reverted Event out of Safety Review | PASS | venue_a reconfirmed Garden Hall (no Safety Review sentence); tech_a re-saved the projector (Reserved, no Needs review); readiness: Planning, only outstanding item "Technical support — needs reconfirmation at the new time: Sound desk" (Staff assigned, Outstanding); no "Back in Safety Review" notice |
| TC_E10S02_12 | Reconfirming a flagged Technical Support request moves it and its technicians to the new time | PASS | Support to reconfirm: Staffed for 5 Dec 6:00 am – 12:00 pm, Reconfirm for 12 Dec 6:00 am – 12:00 pm; reconfirmed: "… so the event is now in Safety Review."; My schedule 12 Dec; coord_a told "Technical support reconfirmed" and "Back in Safety Review"; status Safety Review; Activity log "Support reconfirmed" by Technical Support A with both times in Singapore time; safety_officer "Safety check needed" |
| TC_E10S02_13 | Reconfirming a Technical Support request is refused when an assigned technician is busy at the new time | PASS | EVT-1027 moved to 13 Dec (review "Lighting: 6 Dec 2026, 9:00 am – 12:00 pm → 13 Dec 2026, 9:00 am – 12:00 pm"); reconfirm refused "Technical Support A is already assigned to EVT-1028 Year-end Gala at an overlapping time."; after Cancel still listed, Staffed for 6 Dec |

Observations (not failures): EVT-1021 to EVT-1025's support requests have tech_a
assigned but status open (earlier fixture), so the staffing queue shows them as
"Needs a technician". The Activity log shows venue-booking flag rows as "E10
Garden Hall: True" and "True → False" (seen before, E08-S04 run).
