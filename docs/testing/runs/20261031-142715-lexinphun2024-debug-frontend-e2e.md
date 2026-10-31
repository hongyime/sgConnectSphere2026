---
date: 2026-10-31T14:27:15+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: 281026
database: real
commit: c568d28
---

Automated click-through of `docs/testing/manual/E08-S04-click-through.md` on the
real local stack: native PostgreSQL 17 `connectsphere_dev_stack` on 127.0.0.1:5432
(reset, seeded, then `E08-S04-preconditions.sql` stage `setup`), the local API
(`backend/src/dev.ts`, `DATABASE_URL` only, `DATABASE_POOLER_URL` empty) and Vite
on 5173, driven by a temporary Playwright script in Chromium (Asia/Singapore),
one sign-in per role. 5 sections (A to E), 5 passed. E08-S04 / SCRUM-61, run
subtask SCRUM-235, code subtasks SCRUM-242 and SCRUM-243. This is the automated
real-stack run before Le Xin's manual run; it is not the manual T-93 evidence.

Fixture substitutions, as the guide lists: the seed accounts `coord_a`,
`venue_a`, `tech_a` and `safety_officer` stand in for the cases' `coordinator_1`,
`venue_staff_1` and `tech_support_1`; separate events (EVT-1081 to EVT-1084)
replace the single "Leadership Summit"; TC_E08S04_04 reads the reversion in the
assigned Coordinator's Activity log, since the app has no System Administrator.

Before the recorded run the script was compared with the guide step by step and
four loose checks were tightened to the guide's exact sentences (the booking
request and approval messages, the attendee notice, the reconfirm-list dates);
one optional click that could pass silently was replaced by its exact link. The
`check` stage afterwards matched the guide: EVT-1081 planning, EVT-1082 and
EVT-1084 safety_review, EVT-1083 confirmed with its E08 AV Projector still
flagged, the Charity Hall booking moved to 12 Dec and unflagged, E08 Seminar Hall
released and E08 Garden Hall confirmed, each earlier approval kept, two "Safety
check needed" notices, and no reason in the attendee's notice.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E08S04_01 | Reverting a Confirmed event to Planning with a reason updates its status and notifies the Organiser with the reason | PASS | EVT-1081: status Planning; organiser_a's notice names the reason "Venue reported a plumbing issue" |
| TC_E08S04_02 | Reverting a Confirmed event with registered Attendees notifies them that arrangements are being revised | PASS | attendee_a: "Leadership Summit: Previously confirmed arrangements are being revised.", without the reason |
| TC_E08S04_03 | A non-venue arrangement failure is flagged without automatically reverting the Event | PASS | EVT-1083: tech_a marked 1 E08 AV Projector out of service for 8 Dec; readiness shows Confirmed with "E08 AV Projector — needs review"; no status change |
| TC_E08S04_04 | A reversion from Confirmed to Planning is recorded in the activity log | PASS | Coordinator's Activity log: "Reverted to Planning" by coord_a with the time (substitution for the System Administrator in the case) |
| TC_E08S04_05 | A reverted Event enters Safety Review automatically after all arrangements are reconfirmed | PASS | EVT-1082: reverted, date moved to 12 Dec (booking and projector flagged); venue_a reconfirmed the booking, still Planning; tech_a re-saved the projector, then Safety Review with no Submit button; safety_officer told the earlier approval does not carry over |
| TC_E08S04_06 | A venue block affecting a Confirmed Event returns it to Planning and notifies its Coordinator | PASS | EVT-1084: block on E08 Seminar Hall listed it "Returned to Planning", "Coordinator notified"; status Planning, not Cancelled; coord_a's "Venue unavailable" notice ends "The event has returned to Planning." |
| MULTIPLE | After a venue loss, a confirmed replacement and the released lost booking put the event back in Safety Review | PASS | EVT-1084: Garden Hall requested and approved, still Planning ("E08 Seminar Hall — Conflicting"); Coordinator cancelled the original booking, then Safety Review; safety_officer notified |
