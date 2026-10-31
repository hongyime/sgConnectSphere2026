---
date: 2026-10-31T17:33:21+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "311026"
database: real
commit: 2d4410b
---

Story owner's manual acceptance run of E08-S04 "Revert a confirmed event to
planning" (story SCRUM-61, run subtask SCRUM-235, code subtasks SCRUM-242 and
SCRUM-243). Le Xin followed `docs/testing/manual/E08-S04-click-through.md`
sections A to E by hand in a real browser on `2d4410b`, the commit that aligned
the six cases with the acceptance criteria. Every screenshot below was taken by
Le Xin by hand (T-93); Claude saved each pasted screenshot under its TC_ID.

The stack: Vite on 127.0.0.1:5173; the local API (`backend/src/dev.ts`) with
only `DATABASE_URL`; native PostgreSQL 17 `connectsphere_dev_stack` on
127.0.0.1:5432, reset, seeded and loaded with `E08-S04-preconditions.sql` stage
`setup` before the run (EVT-1081 to EVT-1084 Confirmed, each with its earlier
submission and Safety Officer approval). The read-only `check` stage afterwards
matched the screens: EVT-1081 planning, EVT-1082 and EVT-1084 safety_review,
EVT-1083 confirmed with its E08 AV Projector still flagged, the Charity Hall
booking on 12 Dec and unflagged, E08 Seminar Hall released and E08 Garden Hall
confirmed, every earlier approval kept, and one "Entered Safety Review after
reconfirmation" each for EVT-1082 and EVT-1084.

Fixture substitutions, as the guide lists: the seed accounts `coord_a`,
`venue_a`, `tech_a` and `safety_officer` stand in for the cases' `coordinator_1`,
`venue_staff_1` and `tech_support_1`; separate events replace the single
"Leadership Summit" (EVT-1083 Leadership Briefing for TC_E08S04_03, EVT-1084
Leadership Seminar for TC_E08S04_06). TC_E08S04_05 was run on two roads back to
Planning: a deliberate reversion (EVT-1082, screenshots 05-1 to 05-8) and a venue
loss (EVT-1084 after TC_E08S04_06, screenshots 05-9 to 05-13). The Safety
Officer has no frontend role or menu yet (E08-S06), so their notifications were
opened at `/notifications` directly.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E08S04_01 | Verify that reverting a Confirmed event to Planning with a recorded reason should update its status and notify the Organiser with the reason | PASS | Reverted Leadership Summit (EVT-1081) with the reason "Venue reported a plumbing issue". Status went from Confirmed to Planning at 4:09 pm and the success message came up. Logged in as the Organiser and got "Event reverted to planning" with the reason shown. |
| TC_E08S04_02 | Verify that reverting a Confirmed event with registered Attendees should notify them that arrangements are being revised | PASS | Logged in as attendee_a and got the "Event update" notice: "Leadership Summit: Previously confirmed arrangements are being revised." No reason shown to the Attendee, as expected. Side note: the notice ends with a raw UTC time (known issue, not this story). |
| TC_E08S04_03 | A non-venue arrangement failure should be flagged without automatically reverting the Event | PASS | As tech_a, marked 1 E08 AV Projector unavailable for 8 Dec 2026 (Lamp failed); EVT-1083 Leadership Briefing's reservation got flagged "Needs review" and the Coordinator was notified. As coord_a, readiness still shows Confirmed, the projector is Outstanding ("needs review: stock changed") and E08 Briefing Room is still Ready. The event page still says Confirmed since 30 Oct 2:29 pm and the "Revert to Planning" button is still there. |
| TC_E08S04_04 | Verify that a reversion from Confirmed to Planning should be recorded in the activity log | PASS | Checked the Activity log on EVT-1081. The new "Reverted to Planning" entry is there, Confirmed → Planning, by Coordinator A at 4:09 pm. The earlier submit and Safety Officer approval are still in the log. |
| TC_E08S04_05 | A reverted Event should enter Safety Review automatically after all arrangements are reconfirmed | PASS | Revert road (Charity Run, EVT-1082): reverted, moved the date to 12 Dec and both the hall and the projector got flagged. venue_a reconfirmed E08 Charity Hall with no Safety Review yet and the event stayed Planning; tech_a re-saved E08 Projector (the last item) and the status changed to Safety Review on its own. No "Submit for safety check" button, safety_officer got "Safety check needed … the earlier approval does not carry over", and the Activity log still has the earlier approval with no new Confirmed. Venue-loss road (Leadership Seminar, EVT-1084): requested and approved E08 Garden Hall, still Planning while E08 Seminar Hall was Conflicting; cancelled the original booking and it went to Safety Review on its own, safety_officer notified at 17:32. Finding: Charity Run's Technical support (Sound desk and timing system) still shows the old date 5 Dec and Ready, because the date change did not flag it. |
| TC_E08S04_06 | A venue block affecting a Confirmed Event should return it to Planning and notify its Coordinator | PASS | As venue_a, saved a Maintenance block on E08 Seminar Hall for 10 Dec 2026 (Burst pipe). Leadership Seminar (EVT-1084) showed "Returned to Planning" and "Coordinator notified", and the message said nothing was cancelled. As coord_a, the event is Planning since 5:20 pm, not Cancelled, with a "Venue unavailable" banner, and the "Venue unavailable … The event has returned to Planning." notice came at 17:20. |

Timing: `date` and the filename are when the last screenshot (`TC_E08S04_05-13`)
reached the session, 17:33:21 Singapore time.

## Finding

- A date change does not flag Technical Support staffing. After EVT-1082 moved
  from 5 Dec to 12 Dec, its "Sound desk and timing system" request kept
  `support_range` 5 Dec 07:00, status `staffed`, and counted as Ready, so the
  event entered Safety Review with its support crew on the old day.
  `tech_support_requests` has no reconfirmation flag, and E10-S02's acceptance
  criteria name only venue bookings and equipment reservations, so no story
  covers it yet. Raised for the PO; not fixed in this story.

## Observations (no case failed on these)

- Event-change notices end with a raw UTC time ("Changed at 2026-10-31T08:09:57.677Z"), as earlier handoffs record.
- The readiness page keeps its "What you're submitting" and "Resolve these before submitting" wording on a Confirmed event and in Safety Review (E08-S03 page).
- A projector flagged by a date change reads "needs review: stock changed".
- The equipment screen's save message does not say the event is now in Safety Review; the Venue Staff reconfirm message does.
- The Activity log shows this story's "Booking reconfirmed" row as "E08 Charity Hall: True → False", and the automatic move to Safety Review as "By Technical Support A" (or the Coordinator), the person whose save triggered it.
- The Safety Officer has no home page, menu or bell yet; sign-in lands on the welcome page (E08-S06).

## Screenshots

- [TC_E08S04_01-1](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_01-1.png): EVT-1081 now Planning since 4:09 pm, revert success message
- [TC_E08S04_04-1](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_04-1.png): Activity log "Reverted to Planning" by Coordinator A, earlier approval kept
- [TC_E08S04_01-2](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_01-2.png): organiser_a's "Event reverted to planning" with the reason
- [TC_E08S04_02-1](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_02-1.png): attendee_a's "arrangements are being revised", no reason
- [TC_E08S04_03-1](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_03-1.png): E08 AV Projector marked unavailable, EVT-1083 reservation flagged
- [TC_E08S04_03-2](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_03-2.png): EVT-1083 readiness still Confirmed, projector Outstanding, venue Ready
- [TC_E08S04_03-3](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_03-3.png): EVT-1083 still Confirmed since 30 Oct, "Revert to Planning" offered
- [TC_E08S04_05-1a](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-1a.png): EVT-1082 reverted, "Check what this change affects" lists the hall and the projector
- [TC_E08S04_05-1](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-1.png): date saved as 12 Dec, "2 arrangements were flagged for reconfirmation"
- [TC_E08S04_05-2](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-2.png): venue_a's "Bookings to reconfirm", 5 Dec to 12 Dec
- [TC_E08S04_05-3](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-3.png): hall reconfirmed, no Safety Review sentence, list empty
- [TC_E08S04_05-4](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-4.png): EVT-1082 still Planning, projector Outstanding
- [TC_E08S04_05-5a](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-5a.png): tech_a's equipment page before the save, projector Needs review
- [TC_E08S04_05-5](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-5.png): projector re-saved, status now Safety Review
- [TC_E08S04_05-6](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-6.png): readiness in Safety Review, no submit button; Technical support still 5 Dec (finding)
- [TC_E08S04_05-7](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-7.png): safety_officer's "Safety check needed" for EVT-1082 at 16:58
- [TC_E08S04_05-8](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-8.png): EVT-1082 Activity log, earlier approval kept, Planning → Safety Review at 4:58 pm
- [TC_E08S04_05-9](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-9.png): EVT-1084 replacement E08 Garden Hall requested, Pending
- [TC_E08S04_05-10](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-10.png): venue_a approved E08 Garden Hall
- [TC_E08S04_05-11](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-11.png): EVT-1084 still Planning, E08 Seminar Hall Conflicting
- [TC_E08S04_05-12](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-12.png): original booking released, EVT-1084 in Safety Review, no submit button
- [TC_E08S04_05-13](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-13.png): safety_officer's "Safety check needed" for EVT-1084 at 17:32
- [TC_E08S04_06-1](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_06-1.png): block on E08 Seminar Hall, Leadership Seminar "Returned to Planning"
- [TC_E08S04_06-2](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_06-2.png): EVT-1084 Planning since 5:20 pm, not Cancelled, "Venue unavailable" banner
- [TC_E08S04_06-3](evidence/20261031-173321-lexinphun2024-debug-frontend-e2e/TC_E08S04_06-3.png): coord_a's "Venue unavailable … The event has returned to Planning." at 17:20
