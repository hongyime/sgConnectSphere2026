---
date: 2026-11-03T16:30:00+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "021126"
database: real
commit: a954231
---

Human click-through by jininggg on merged #414 (a954231b), guided in chat.
The timestamp identifies the first submitted request shown in the screenshots
(16:30); terminal checks continued through approximately 17:17 Singapore time.
Application code was unchanged. Preparation used synthetic fixtures in a fresh
native loopback PostgreSQL database/random schema, with local API and frontend.
No remote database mutations, live email sends or mailbox delivery are claimed.
Screenshots were taken and saved by the human tester.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S01_04 | Executed subsets only: safe approval, attendance impact, Session apply and staff reconfirmation | PASS | Screenshots 04-1 through 04-18 show the completed subsets described in the next row. This row does not claim the entire expanded TC_04 passed; Safety Officer UI and other variants remain explicitly incomplete below. |
| TC_E10S01_01 | Submit a change request and notify the assigned Coordinator | PASS | Organiser submitted the synthetic Event name change; the success message and Pending request appeared. Assigned Coordinator received Change requested for EVT-E10-MANUAL. Screenshots 01-1 and 01-2. |
| TC_E10S01_02 | Current confirmed details remain alongside the pending request | PASS | Pending comparison showed current name E10 change request manual test alongside requested name E10 updated manual event. Session Pending comparison also retained Morning 09:00-10:00 alongside requested 10:00-11:00. Evidence 01-1 and 04-6; refresh persistence was requested but not explicitly confirmed by the tester. |
| TC_E10S01_03 | Restricted edit offers a pre-filled change request | PASS | Tester followed the restricted Expected attendance field's Request a change link; form selected that field and pre-filled 40, with no description supplied and submission still explicit. Screenshot 03-1. Concurrent-approval save-refusal variant was not run manually. |
| TC_E10S01_04 | Approve and apply changes, including Session and Safety Review integration | SKIP | Partial execution only: safe name became Applied and Organiser received Change applied; Cancel preserved Pending. Attendance preview listed one booking (60 people for 50 places), Cancel retained 40 (tester confirmed), then approval applied 60 and Venue Staff received a notice. Morning-only request preview listed one booking and one staffed support request; approval changed Morning to 10:00-11:00, retained Afternoon 12:00-13:00 and Event 09:00-13:00, and returned Event to Planning. Venue and support staff received notices. Venue reconfirmation left Planning with only support outstanding; support reconfirmation moved the technician assignment and reported automatic Safety Review re-entry. Safety Officer UI verification was blocked: successful login redirected to public landing because shared frontend role metadata omits safety_officer. Separate agent API inspection found Safety check needed for the account; that is diagnostic evidence, not a human inbox PASS. Expanded variants listed below remain unexecuted. |
| TC_E10S01_05 | Decline and notify without changing current details | PASS | Coordinator declined with Keep the original purpose.; current purpose remained Original manual purpose while requested purpose remained separate. Organiser received Change declined with the reason. Screenshots 05-1 and 05-2. |
| TC_E10S01_06 | Completion makes a pending request Obsolete | PASS | Tester submitted a Pending name request, then used Coordinator Mark complete confirmation. Organiser page showed Event completed, Obsolete, reason Event completed, no submission/decision controls, and original name unchanged. Screenshots 06-1 and 06-2. Detailed history timestamp was not separately inspected. |
| TC_E10S01_07 | Cancellation makes a pending request Obsolete | PASS | Tester submitted a Pending name request and cancelled the Event as Coordinator. Organiser page showed Event cancelled, Obsolete, reason Event cancelled, no submission/decision controls, and original name unchanged. Screenshots 07-1 and 07-2. Detailed history timestamp was not separately inspected. |

## Setup correction and diagnostic limits

Initial Session preview correctly excluded a support request that fixture setup
had mistakenly left Open despite an assigned technician. The agent corrected
only that local synthetic request to Staffed/support required, added its readable
description, and the tester cancelled/refreshed/reopened preview. Screenshot
04-7 is the corrected preview; the earlier zero-support preview is not offered
as final acceptance evidence. No application code changed for that correction.

Safety Officer API login and inbox inspection returned HTTP 200 and an actual
Safety check needed notice for EVT-E10-SESSION. Shared frontend role/navigation
handling prevented the human UI check. Ownership of that fix is unconfirmed;
do not infer a teammate assignment or mark its manual assertion passed.

## Remaining acceptance work

- Fix shared Safety Officer frontend role/session/navigation handling, then
  rerun the human inbox/fresh-review check and capture new hand-taken evidence.
- Complete remaining TC_04 variants: structured layout/accessibility/facilities
  and registration settings, Session-only title, safe/no-impact Safety Review,
  two-booking re-entry, and preservation/fresh use of safety decisions.
- The Session fixture had no equipment reservation; equipment impact was not
  exercised by this human run. The separate Event-wide Safety Review fixture
  was prepared but not exercised.
- Stale/deleted/foreign targets, stale previews, invalid references/dates and
  notification-failure rollback were not manually exercised here. Earlier
  automated evidence must be reviewed explicitly for these assertions; this
  run does not replace it or claim those outcomes.
- Obtain explicit refresh-persistence confirmation for TC_02 and inspect the
  terminal request history/timestamps for TC_06/07 during final acceptance.
- Independent evidence review and PO/delegate acceptance remain open. No story
  or subtask is marked Done by this record.

## Screenshots

- [TC_E10S01_02-1](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_02-1.png): byte-identical copy of the tester's 01-1 screenshot, labelled for the shared Pending comparison assertion; not a separate execution.
- [TC_E10S01_01-1](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_01-1.png): submission success and Pending comparison; also supports TC_02.
- [TC_E10S01_01-2](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_01-2.png): Coordinator request notice.
- [TC_E10S01_03-1](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_03-1.png): pre-filled attendance request form.
- [TC_E10S01_04-1](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_04-1.png): safe name Applied.
- [TC_E10S01_04-2](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_04-2.png): Organiser application notice.
- [TC_E10S01_04-3](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_04-3.png): attendance impact preview.
- [TC_E10S01_04-4](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_04-4.png): attendance 60 Applied.
- [TC_E10S01_04-5](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_04-5.png): Venue Staff attendance notice.
- [TC_E10S01_04-6](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_04-6.png): Pending Session comparison.
- [TC_E10S01_04-7](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_04-7.png): corrected Session preview with venue and support.
- [TC_E10S01_04-8](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_04-8.png): Morning Session Applied.
- [TC_E10S01_04-9](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_04-9.png): Planning and unchanged Event envelope.
- [TC_E10S01_04-10](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_04-10.png): Morning changed, Afternoon unchanged.
- [TC_E10S01_04-11](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_04-11.png): two outstanding arrangements.
- [TC_E10S01_04-12](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_04-12.png): Venue Staff Session notice.
- [TC_E10S01_04-13](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_04-13.png): venue reconfirmation proposal.
- [TC_E10S01_04-14](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_04-14.png): venue reconfirmation success.
- [TC_E10S01_04-15](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_04-15.png): Planning with only support outstanding.
- [TC_E10S01_04-16](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_04-16.png): assigned technician notice.
- [TC_E10S01_04-17](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_04-17.png): support and technician move proposal.
- [TC_E10S01_04-18](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_04-18.png): support reconfirmed and automatic Safety Review message.
- [TC_E10S01_05-1](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_05-1.png): Declined comparison and reason.
- [TC_E10S01_05-2](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_05-2.png): Organiser decline notice.
- [TC_E10S01_06-1](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_06-1.png): Pending before completion.
- [TC_E10S01_06-2](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_06-2.png): Obsolete after completion.
- [TC_E10S01_07-1](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_07-1.png): Pending before cancellation.
- [TC_E10S01_07-2](evidence/20261103-163000-jininggg-frontend-e2e/TC_E10S01_07-2.png): Obsolete after cancellation.
