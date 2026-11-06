# Sprint 4 — Daily Standups

> **Evidence basis.** Stand-up *dates* and *attendance* are accurate. Daily stand-ups were conducted mostly asynchronously and were **not** video-recorded, so no recording links exist and exact clock times are not logged. The notes below summarise each member's reported progress, not a verbatim transcript.


Sprint 4 | 18 – 31 October 2026 | Format: Async written updates (synchronous
check-ins recorded)

Three standups were held on 25, 28 and 31 October 2026. Each ran to a 15-minute
timebox (lecture slide 47) and was recorded. All 6 members participated. Bryan
participated as Product Owner and contributing developer.

## Daily Standup — 25 October 2026

### 1. Meeting Details

| Field | Details |
| --- | --- |
| Date | 25 October 2026 |
| Duration | 15 minutes (timebox) |
| Format | Microsoft Teams (online); session recorded |
| Attendees | 6 / 6 members: Bryan (PO, contributing dev), Amareet (SM), Ji Ning, Aaron, Le Xin, Xiang Ying |

### 2. Per-Person Update

| Member | What I completed | What I am doing next |
| --- | --- | --- |
| Xiang Ying | E08-S05 (complete an event): review findings and conflicts fixed, manual evidence incl. TC06; #324, #325 merged. E09-S06 (record attendance): implemented, 13 screenshots covering TC01–TC04 and the integration flow; #343 merged. Reviewed #299, #326, #327 | Re-reviewed #315 (protected production migration workflow); ran 21 focused tests and backend typecheck; SCRUM-62/68 code and evidence merged but Jira In Review pending PO/delegated DoD acceptance |
| Aaron | E05-S05 (SCRUM-44): buffer form, clash warning after save, reason in venue search; manual run 7/7 with screenshots; PR merged 22 Oct, subtasks Done. Updated Sprint 3 backlog with Week 9 changes. Planned E09-S05 (SCRUM-67) and E09-S04 (SCRUM-66) with subtasks SCRUM-219–224. Reviewed #308, #311, #315, #316, #325, #329, #341 | Check SCRUM-67 dependencies (needs Amareet's #326/#327 merged); agree the "full event, no waiting list → Pending request" change with Amareet; settle SCRUM-67 design points; approve #326 |
| Le Xin | #298 (E06-S04, SCRUM-48) merged after review fixes; #344 merged (E05-S06/E10-S05 backlog aligned to venue-loss decisions); E05-S06 (SCRUM-152) backend opened #345 (migration 0025) and #348 (all 8 test cases on a real database); started E05-S06 frontend | Finish E05-S06 frontend and open #349; fix primary-booking-stays-primary-while-Conflicting; fix failing venue DB tests in CI; write E05-S06 click-through guide |
| Ji Ning | Merged #299 for E06-S03 (withdrawal, replacement retries, primary-venue selection); implemented primary-venue publication fix and venue-change notifications (#347); implemented and merged the E10-S01 foundation (change-request form, comparison/history, Coordinator approve/decline, #341) | Follow up CI/review for #347; coordinate E10-S01 integrations with Le Xin and Xiang Ying; track E11-S01's remaining workflow integrations, production staff roster and email verification |
| Amareet | E09-S01 registration backend (#326) and frontend (#327): fixed Le Xin's review point (separate "no Session chosen" vs "invalid Session" messages); both approved by Le Xin and Xiang Ying. Reviewed #344. Bryan confirmed TC_E09S01_04 rewording | Resolve conflicts on #326/#327 after #343/#325; add the origin check on the registration request; copy the test-case workbook to CAA 251026; get #326/#327 merged; start E09-S02 backend (SCRUM-210) |

### 3. Blockers

| Blocker | Raised By | Owner to Resolve | Status |
| --- | --- | --- | --- |
| SCRUM-62 and SCRUM-68 await DoD acceptance; code and evidence merged | Xiang Ying | Bryan / delegated acceptor | Pending acceptance |
| SCRUM-67's screens cannot start until PR #327 (registration screens) merges | Aaron | Amareet | Open; PR ready, waiting on main sync |
| SCRUM-66 needs Amareet's "event is full" check (E09-S02), not built yet | Aaron | Amareet | Not started |
| PR #348 (E05-S06 backend) cannot merge until #345 (migration 0025) merges and is applied to production | Le Xin | Bryan | Open |

### 4. Sprint Backlog Snapshot (key movements)

| Story ID | Title | Points | Assigned To | Status |
| --- | --- | ---: | --- | --- |
| E10-S04 | Cancel an event | 5 | Xiang Ying | Done (implementation #320, evidence #321) |
| E08-S05 | Complete an event | 3 | Xiang Ying | In Review (#324, #325 merged; awaiting DoD acceptance) |
| E09-S06 | Record attendance | 3 | Xiang Ying | In Review (#343 merged; awaiting DoD acceptance) |
| E05-S05 | Apply setup and turnaround time | 5 | Aaron | Done |
| E09-S01 | Register for an event | 5 | Amareet | In Progress (#326, #327 open) |
| E09-S02 | Enforce registration capacity | 3 | Amareet | To Do |
| E09-S03 | Control the registration period | 3 | Amareet | To Do |
| E09-S07 | View registrations for my event | 1 | Amareet | To Do |
| E09-S04 | Join the waiting list | 5 | Aaron | To Do |
| E09-S05 | Withdraw my registration | 3 | Aaron | To Do |
| E06-S02 | Check venue suitability against event requirements | 3 | Ji Ning | In Review |
| E06-S03 | Request a venue booking | 3 | Ji Ning | In Progress |
| E10-S01 | Request a change after submission | 8 | Ji Ning / Xiang Ying | In Progress |
| E11-S01 | Notify users about events they are involved in | 13 | Ji Ning | In Progress |
| E06-S04 | Decide on a venue booking request | 3 | Le Xin | In Progress (impl. #298; awaiting TC07 rerun and DoD) |
| E06-S06 | Prevent double-booking of a venue | 5 | Le Xin | To Do |
| E08-S04 | Revert a confirmed event to planning | 1 | Le Xin | To Do |
| E10-S02 | Distinguish minor edits from arrangement-affecting changes | 8 | Le Xin | To Do |
| E05-S06 | Mark a venue temporarily unavailable over existing bookings | 8 (set later) | Le Xin | In Progress (backend in review #345, #348; frontend #349) |

### 5. Additional Notes

E10-S01 was re-estimated from 3 to 8 points on 20 October, with Ji Ning as owner
and Xiang Ying taking two subtasks. E09-S07 moved from Ji Ning to Amareet on
20 October. Le Xin is working on E05-S06, pulled in beyond the original Sprint 4
backlog.

## Daily Standup — 28 October 2026

### 1. Meeting Details

| Field | Details |
| --- | --- |
| Date | 28 October 2026 |
| Duration | 15 minutes (timebox) |
| Format | Zoom (online); session recorded |
| Attendees | 6 / 6 members: Bryan (PO, contributing dev), Amareet (SM), Ji Ning, Aaron, Le Xin, Xiang Ying |

### 2. Per-Person Update

| Member | What I completed | What I am doing next |
| --- | --- | --- |
| Xiang Ying | E08-S05 (#324, #325) and E09-S06 (#343) both moved to Done on 26 Oct; E10-S04 (#320, #321) Done. Reviewed #299, #326, #327, #315 | Check remaining scope of subtasks SCRUM-205/206; follow up on teammate reviews (reviewed #389, addressed a merge blocker) |
| Aaron | E09-S05 (SCRUM-67, withdraw a registration): backend and frontend built; attendee can withdraw up to the deadline, after which the page shows who to contact; waiting list told when a place frees; removed the old mock page; settled two design points before coding | Finished SCRUM-67: manual run 5/5 with screenshots, PR #361 (Bryan approved/merged; subtasks SCRUM-219–221 Done); reviewed Bryan's #362; approved #364, #366; next: start SCRUM-66 (waiting list) — dependencies now on main |
| Le Xin | E05-S06 manual E2E run done 8/8 with 25 screenshots; fixed both review blockers on #348; #345, #348, #349 all merged — E05-S06 (SCRUM-152) in main; fixed the repo check script to run on Windows | Opened #364 proposing 8 points for E05-S06; reran TC_E06S04_07 on #335 (passed, recorded in #369); get #369 merged; work on remaining stories such as E10-S02 |
| Ji Ning | Completed E10-S05 integration (replacement retries, block lifting, venue-change notifications); manual testing with screenshots and automated evidence; #355, #367 merged; re-estimated E10-S05 from 3 to 5 points (#356) | Follow up acceptance for E06-S02, E06-S03, E10-S05; continue E10-S01 integration once E10-S02 dependencies land; follow up E11-S01 integrations and verification |
| Amareet | Built E09-S02 (capacity) and E09-S03 (registration period), backend and frontend; fixed Aaron's review point on #327; E09-S01 frontend (#327), E09-S02 (#353), E09-S03 (#354) all merged; reviewed #316, #335, #340 | Ran the E09-S01 to S03 manual tests (21 PASS, 24 screenshots, #366 merged); built E09-S07 and ran its manual test (4 PASS, #368 in review); next: get #368 reviewed and PO acceptance for E09-S01/S02/S03/S07 |

### 3. Blockers

| Blocker | Raised By | Owner to Resolve | Status |
| --- | --- | --- | --- |
| SCRUM-67's screens could not start until PR #327 merged | Aaron | Amareet | Resolved; #327 merged 27 Oct |
| SCRUM-66 needed Amareet's "event is full" check (E09-S02) | Aaron | Amareet | Resolved; built in #353, merged 27 Oct |
| PR #348 (E05-S06 backend) could not merge until #345 (migration 0025) merged and applied | Le Xin | Bryan | Resolved; #345 and #348 merged |
| Two review blockers on #348 (calendar Conflicting state, booking over two blocks) | Ji Ning | Le Xin | Resolved 26 Oct; #348 merged |

### 4. Sprint Backlog Snapshot (key movements)

| Story ID | Title | Points | Assigned To | Status |
| --- | --- | ---: | --- | --- |
| E08-S05 | Complete an event | 3 | Xiang Ying | Done (26 Oct) |
| E09-S06 | Record attendance | 3 | Xiang Ying | Done (26 Oct) |
| E10-S04 | Cancel an event | 5 | Xiang Ying | Done |
| E09-S01 | Register for an event | 5 | Amareet | In Review (subtasks Done; awaiting PO acceptance) |
| E09-S02 | Enforce registration capacity | 3 | Amareet | In Review (subtasks Done; awaiting PO acceptance) |
| E09-S03 | Control the registration period | 3 | Amareet | In Review (subtasks Done; awaiting PO acceptance) |
| E09-S07 | View registrations for my event | 1 | Amareet | In Review (#368 awaiting review) |
| E09-S05 | Withdraw my registration | 3 | Aaron | Done |
| E05-S05 | Apply setup and turnaround time | 5 | Aaron | Done |
| E09-S04 | Join the waiting list | 5 | Aaron | To Do |
| E06-S02 | Check venue suitability against event requirements | 3 | Ji Ning | In Review |
| E06-S03 | Request a venue booking | 3 | Ji Ning | In Review |
| E10-S01 | Request a change after submission | 8 | Ji Ning / Xiang Ying | In Progress |
| E10-S05 | Handle a venue lost from a confirmed event | 5 | Ji Ning | In Review |
| E11-S01 | Notify users about events they are involved in | 13 | Ji Ning | In Progress |
| E06-S04 | Decide on a venue booking request | 3 | Le Xin | In Progress (TC07 rerun being recorded; awaiting DoD) |
| E06-S06 | Prevent double-booking of a venue | 5 | Le Xin | To Do (backend rule/tests merged #340; frontend + evidence remaining) |
| E08-S04 | Revert a confirmed event to planning | 1 | Le Xin | To Do |
| E10-S02 | Distinguish minor edits from arrangement-affecting changes | 8 | Le Xin | To Do |
| E05-S06 | Mark a venue temporarily unavailable over existing bookings | 8 | Le Xin | In Review (merged #345, #348, #349; manual run 8/8; awaiting DoD acceptance) |

## Daily Standup — 31 October 2026

### 1. Meeting Details

| Field | Details |
| --- | --- |
| Date | 31 October 2026 |
| Duration | 15 minutes (timebox) |
| Format | Microsoft Teams (online); session recorded |
| Attendees | 6 / 6 members: Bryan (PO, contributing dev), Amareet (SM), Ji Ning, Aaron, Le Xin, Xiang Ying |

### 2. Per-Person Update

| Member | What I completed | What I am doing next |
| --- | --- | --- |
| Xiang Ying | Completed the Event-level date-horizon implementation for E02-S07 (frontend validation messages, automated tests); documented the remaining Session-date dependency | Prepared #389 for review; fixed the draft-submission API response; verified with unit, frontend and real-database tests; #388 estimate merged; coordinating remaining Session-date integration and manual acceptance |
| Aaron | E09-S04 (SCRUM-66, waiting list): Bryan built most of the code (#379); settled two points — full event with no waiting list saves a Pending request (reworded TC_E09S04_04); the "place free" notice has no claim link (attendees claim from the waiting-list page) | Finishing SCRUM-66: manual run 5/5 with screenshots; fixed a failing real-database deactivation test (released waiting-list place); opened #394 for the rest of SCRUM-66 |
| Le Xin | E06-S06 (SCRUM-50): remaining tests and fixes merged (#385) with manual run/screenshots (#386); E10-S02 (SCRUM-71): the affected-bookings-before-save screen merged (#380), review comments fixed, manual run redone (#381); E08-S04 Scenario 4 (SCRUM-242) finished and merged (#392) with manual run (#393) | PO agreed a date change should also flag Technical Support staffing (T-104), so re-estimated E10-S02 from 5 to 8 points; started SCRUM-244 (Technical Support part of E10-S02); opened #396 (migration 0026) and #397 (T-104 backlog); building backend, screens and tests |
| Ji Ning | Added real browser/API/database tests for E10-S01 (#375); integrated E10-S01 with E10-S02 for atomic preview/apply (#383); improved change-impact descriptions and required consent for late registration closing (#390); audited E11-S01 integrations, fixed private Event titles in attendee notifications (#391); recorded Bryan's Safety Review decision and implemented return-to-Planning then auto Safety Review re-entry (#395); opened #398 proposing E11-S01 re-estimate 5→13 | Follow up remaining Session and Technical Support reconfirmation integrations for E10-S01; prepare the combined E10-S01 manual acceptance run; align E11-S01's provider-failure test wording and coordinate the roster and email-delivery verification; follow up #398 |
| Amareet | Completed E09-S07 (view registrations): built the registered and waiting lists, manual test with screenshots, merged #368 — all four E09 stories (S01/S02/S03/S07) now Done in Jira; recorded the E09-S01 to S03 manual runs (24 screenshots, #366); reviewed many PRs; checked the Release 1 backlog and found 4 missed stories (E03-S08/S09/S10, E01-S13) | Next: do the E04-S02 (multi-session events) manual test with screenshots once Bryan's code is merged, so Bryan can accept the story |

### 3. Blockers

| Blocker | Raised By | Owner to Resolve | Status |
| --- | --- | --- | --- |
| E04-S02 (multi-session events) code not on GitHub, so the manual test cannot start | Amareet | Bryan | Open; code not pushed yet |
| Database change 0026 not applied to the live system, so Le Xin's E10-S02 code cannot merge | Le Xin | Bryan | Open; first attempt failed 31 Oct and needs retrying |
| E11-S01 re-estimate to 13 points needs a PO decision (the scale only went up to 8) | Ji Ning | Bryan | Open; needs a PO decision (#398) |

### 4. Sprint Backlog Snapshot (status at close, 1 Nov 00:00 SGT)

| Story ID | Title | Points | Assigned To | Status |
| --- | --- | ---: | --- | --- |
| E08-S05 | Complete an event | 3 | Xiang Ying | Done (26 Oct) |
| E09-S06 | Record attendance | 3 | Xiang Ying | Done (26 Oct) |
| E10-S04 | Cancel an event | 5 | Xiang Ying | Done (20 Oct) |
| E02-S07 | Validate the event date horizon | 3 | Xiang Ying | In Review (moved to Sprint 5) |
| E09-S01 | Register for an event | 5 | Amareet | Done (28 Oct) |
| E09-S02 | Enforce registration capacity | 3 | Amareet | Done (28 Oct) |
| E09-S03 | Control the registration period | 3 | Amareet | Done (28 Oct) |
| E09-S07 | View registrations for my event | 1 | Amareet | Done (29 Oct) |
| E06-S02 | Check venue suitability against event requirements | 3 | Ji Ning | Done (29 Oct) |
| E06-S03 | Request a venue booking | 3 | Ji Ning | Done (29 Oct) |
| E10-S05 | Handle a venue lost from a confirmed event | 5 | Ji Ning | Done (29 Oct) |
| E10-S01 | Request a change after submission | 8 | Ji Ning / Xiang Ying | In Progress (carried to Sprint 5) |
| E11-S01 | Notify users about events they are involved in | 13 | Ji Ning | In Progress (carried to Sprint 5) |
| E05-S05 | Apply setup and turnaround time | 5 | Aaron | Done (22 Oct) |
| E09-S05 | Withdraw my registration | 3 | Aaron | Done (28 Oct) |
| E09-S04 | Join the waiting list | 5 | Aaron | In Progress (#379 merged, #394 open) — reached Done 1 Nov 01:00, after close |
| E06-S04 | Decide on a venue booking request | 3 | Le Xin | Done (29 Oct) |
| E05-S06 | Mark a venue temporarily unavailable over existing bookings | 8 | Le Xin | Done (29 Oct) |
| E06-S06 | Prevent double-booking of a venue | 5 | Le Xin | In Review (#385, #386 merged) — reached Done 1 Nov 00:11, after close |
| E08-S04 | Revert a confirmed event to planning | 1 | Le Xin | In Progress (carried to Sprint 5) |
| E10-S02 | Distinguish minor edits from arrangement-affecting changes | 8 | Le Xin | In Progress (carried to Sprint 5) |
| E08-S06 | Conduct the Operational Safety Check as the Safety Officer | 8 | (assigned to Aaron 1 Nov) | To Do (joined Sprint 4 on 30 Oct; carried to Sprint 5) |

### 5. Additional Notes

E10-S05 and E05-S06 joined Sprint 4 on 27 October, and E08-S06 joined on
30 October. E10-S05 was re-estimated 3→5, E05-S06 set at 8, and E10-S02 went
5→8 after T-104. E11-S01's change from 5 to 13 points was pending a PO decision
at the final standup (approved at close via T-105). A short Sprint 5 (1–5 Nov)
was opened to finish the remaining Release 1 stories before submission.
