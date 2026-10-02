---
date: 2026-10-02T13:04:28+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: regression
test_case_version: 300926
commit: d70c6f7
pr: 177
---

Full `npx playwright test` on Windows against the Vite dev server, desktop and
mobile (Pixel 7) projects, with the specs' in-browser fake API (no database).
Re-run after aligning #177 with design.md. 104 passed, 70 skipped, 0 failed.
Run by Claude for Amareet.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E03S01_01 | Verify that submitting a request should trigger automatic assignment of exactly one Event Coordinator and move its status to Under Review | PASS | Desktop and mobile |
| TC_E03S01_02 | Verify that when several Coordinators are available, the system should assign the one with the fewest active events | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E03S01_03 | Verify that the currently assigned Coordinator should be able to reassign the event to a colleague | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E03S01_04 | Verify that a Coordinator who is not assigned to an event should be refused when attempting to reassign it | PASS | Desktop and mobile |
| TC_E03S01_05 | Verify that when the named colleague declines a reassignment, the original Coordinator should remain assigned and be notified of the refusal | PASS | Desktop and mobile |
| TC_E03S01_07 | Verify that ownership moves only once the incoming Coordinator accepts a reassignment | PASS | Desktop and mobile |
| TC_E03S02_01 | Verify that recording and sending clarification questions on an Under-Review request should move it to Awaiting Clarification and notify the Organiser | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E03S02_02 | Verify that when the Organiser responds and resubmits, the request should return to Under Review and notify the Coordinator | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E03S02_03 | Verify that a request Awaiting Clarification should show its outstanding questions and the date they were raised | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E03S02_04 | Verify that an Event Coordinator should be able to filter their events by clarification status | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E03S03_01 | Verify that approving a request with complete required information should move its status to Approved and notify the Organiser | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E03S03_02 | Verify that approval should be blocked while required information is incomplete, with the missing items listed | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E03S03_03 | Verify that rejecting a request under review with a recorded reason should set its status to Rejected and notify the Organiser | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E03S03_04 | Verify that attempting to reject a request without recording a reason should be blocked | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E03S03_05 | Verify that a rejected request should show its reason and decision date in plain language to the Organiser, and be read-only | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E03S05_01 | Verify that opening an event should show its current status and the date it was reached in plain language | PASS | Desktop and mobile |
| TC_E03S05_02 | Verify that when an event's status changes, the new status should be shown and the change should appear in the event history | PASS | Desktop and mobile |
| TC_E03S05_03 | Verify that an Organiser should be able to see the full status history for their event | PASS | Desktop and mobile |
| TC_E03S06_01 | Verify that posting a comment on an accessible event should show the author, timestamp, and notify the assigned Coordinator | PASS | Desktop and mobile |
| TC_E03S06_02 | Verify that all comments on an event should be shown in chronological order | PASS | Desktop and mobile |
| TC_E03S06_03 | Verify that attempting to post a comment on an event without access should be refused | PASS | Desktop and mobile |
| TC_E03S07_01 | Verify that an Organiser should be able to directly edit any field while the event has not yet been approved | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E03S07_02 | Verify that the assigned Coordinator should be able to edit any field after approval, with the change recorded in the activity log | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E03S07_03 | Verify that an Organiser should be able to directly edit name, description, purpose, or registration dates even after approval | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E03S07_04 | Verify that an Organiser attempting to directly edit a restricted field after approval should be refused and directed to the change request form | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E03S07_05 | Verify that a Coordinator who is not assigned to an approved event should be refused when attempting to edit it | PASS | Desktop and mobile |
| TC_E03S07_06 | Verify that an Organiser's unrestricted post-approval edit should also be recorded in the activity log | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E05S01_01 | Verify that saving a new venue with its full details should make it searchable by Event Coordinators | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E05S01_02 | Verify that reducing a venue's capacity below a confirmed booking's expected attendance should flag that booking and notify the Coordinator | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E05S01_03 | Verify that retiring a venue with no future bookings should remove it from search results while keeping its past bookings | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E05S01_04 | Verify that attempting to retire a venue with future bookings should be blocked with those bookings identified | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E05S01_05 | Verify that updating an existing venue's attributes should save the changes | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E05S01_06 | Verify that reducing venue capacity one below the booked expected attendance flags the booking | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E05S01_07 | Verify that reducing venue capacity to exactly the booked expected attendance does not flag the booking | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E05S02_01 | Verify that adding a supported layout with its maximum capacity should store it against the venue | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E05S02_02 | Verify that a venue whose layout capacity is below a event's required attendance should be excluded or marked unsuitable in search results | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E05S02_03 | Verify that attempting to add a layout that already exists on the venue should be warned without creating a duplicate | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E05S02_04 | Verify that venue Staff should be able to view all layouts supported by a venue and their maximum capacities | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E05S02_05 | Verify that editing the maximum capacity of an existing layout should save the updated value | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E05S02_06 | Verify that removing a layout no longer offered at the venue should delete it from the venue's layout list | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E05S02_07 | Verify that a layout whose capacity exactly equals event attendance is treated as suitable | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E05S02_08 | Verify that a layout one place short of event attendance is excluded or marked unsuitable | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E05S03_01 | Verify that opening a venue's calendar for a period with bookings and blocks should show each entry's state, visually distinguishable | PASS | Desktop and mobile |
| TC_E05S03_02 | Verify that a period the Coordinator is not permitted to view should show as unavailable without revealing the other event's details | PASS | Desktop and mobile |
| TC_E05S03_03 | Verify that a venue blocked for maintenance should be visually distinct from a booked period on the calendar | PASS | Desktop and mobile |
| TC_E05S03_04 | Verify that an Event Coordinator should be able to select a date or date range and navigate to different periods on the calendar | PASS | Desktop and mobile |
| TC_E05S03_05 | Verify that for periods the Coordinator is permitted to view, the calendar should show the event name, event, date and time | PASS | Desktop and mobile |
| TC_E05S04_01 | Verify that blocking a venue for a period with no bookings should make it unavailable for those dates | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E05S04_02 | Verify that attempting to block a venue over a period with a confirmed booking should warn of the conflict before the block takes effect | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E05S04_03 | Verify that creating a block over an upcoming event's dates should notify the affected Coordinators | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| TC_E05S04_04 | Verify that removing or shortening an existing block should restore the venue's availability for the released period | SKIP | Marked `test.fixme` in the spec; not run (desktop and mobile) |
| MULTIPLE | Playwright tests without a TC_ID | PASS | 72/72 passed across desktop and mobile |
