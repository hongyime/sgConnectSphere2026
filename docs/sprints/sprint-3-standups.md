# Sprint 3 — Daily Standups

> **Evidence basis.** Dates and attendance are accurate; stand-ups were mostly asynchronous and not video-recorded, so times are not logged and no links exist.

Sprint 3 | 4 – 17 October 2026 | Format: Async written updates

Four standups were held on 8, 11, 14 and 17 October 2026. All updates were
submitted asynchronously in writing (endorsed for distributed teams, lecture
slide 48). All 6 members participated in each standup. Bryan participated as
Product Owner and contributing developer.

## Daily Standup — 8 October 2026

### 1. Meeting Details

| Field | Details |
| --- | --- |
| Date | 8 October 2026 |
| Duration | 30 minutes (timebox) |
| Format | Async written updates |
| Attendees | 6 / 6 members: Bryan (PO, contributing dev), Amareet (SM), Ji Ning, Aaron, Le Xin, Xiang Ying |

### 2. Per-Person Update

| Member | What I completed | What I am doing next |
| --- | --- | --- |
| Xiang Ying | Completed implementation and manual testing for E07-S01; recorded manual validation results and addressed PR review feedback | Check remaining PR approvals, CI results and Jira statuses; review teammates' PRs |
| Aaron | Completed E07-S04; did PR approvals for groupmates | Review current PRs; plan E07-S05 |
| Le Xin | E14-S02: Coordinators can now read the Activity log on their event page (backend + screen), access-denied entries hidden; fixed Coordinators showing as long IDs; added TC_E14S02_08 from Aaron's review, wrote tests and recorded a manual run (all passed); PR #240 open; reviewed/approved #225, #227, #238, #239 | Get #240 reviewed and merged; start E06-S04 once E06-S03 and Bryan's buffers (#231) are in |
| Ji Ning | E06-S02: implemented advisory suitability checks, completed automated/manual testing with screenshots, opened #242; reviewed/approved #226 | E06-S02 peer review; E06-S03 clarify booking rules and shared buffer/hold dependencies |
| Amareet | E07-S06 Done (backend, screens, manual test merged: #222, #225, #226); E07-S07 backend and screens merged (#227, #228); fixed a technician-assignment deadlock causing flaky CI (#239); fixed the shared form-field alignment bug Aaron reported (#238); reviewed #229–#236 | Run the E07-S07 manual test and record it (#237), then merge; start E06-S05 once Bryan's E05-S05 (#231) is in |

### 3. Blockers

| Blocker | Raised By | Owner to Resolve | Status |
| --- | --- | --- | --- |
| E06-S05 Scenario 5 needs E05-S05's setup/turnaround buffers and the shared occupied_window function (#231) | Amareet | Bryan (#231 merge); Xiang Ying (re-review) | Open; fix in PR, awaiting merge |
| Production DB missing migrations 0009–0010 (activity-log protection); 0011–0013 coming; no agreed way to apply them | Aaron (#235) | Team, to decide an owner (Bryan as deploy owner?) | Open; needs a decision |
| Flaky CI: a deadlock in the technician-assignment test could randomly fail any build | Amareet | Amareet (#239) | Resolving; fix approved, merging |
| E06-S04 needs E06-S03 (booking requests) before it can decide on them | Le Xin | Ji Ning (E06-S03) | Open |
| E06-S04's clash check needs setup/turnaround buffers (#231) | Le Xin | Bryan (#231) | Open |

### 4. Sprint Backlog Snapshot

| Story ID | Title | Points | Assigned To | Status |
| --- | --- | ---: | --- | --- |
| E06-S05 | Hold a venue tentatively | 5 | Amareet | To Do |
| E07-S06 | Request technical support for an event | 1 | Amareet | Done |
| E07-S07 | Assign and manage technical staff for an event | 3 | Amareet | In Progress |
| E07-S04 | Reserve equipment for an event | 5 | Aaron | In Review |
| E07-S05 | Mark equipment as unavailable | 1 | Aaron | To Do |
| E08-S03 | Confirm an event | 5 | Aaron | To Do |
| E07-S01 | Maintain the equipment catalogue | 3 | Xiang Ying | Done |
| E07-S02 | Request equipment for an event | 3 | Xiang Ying | To Do |
| E07-S03 | Check equipment availability | 5 | Xiang Ying | To Do |
| E06-S02 | Check venue suitability against event requirements | 3 | Ji Ning | In Progress |
| E06-S03 | Request a venue booking | 3 | Ji Ning | To Do |
| E11-S01 | Notify users about events they are involved in | 5 | Ji Ning | In Progress |
| E06-S04 | Decide on a venue booking request | 3 | Le Xin | To Do |
| E06-S06 | Prevent double-booking of a venue | 5 | Le Xin | To Do |
| E14-S02 | Record significant actions in an activity log | 3 | Le Xin | In Review (PR #240) |
| E05-S05 | Apply setup and turnaround time | 5 | Bryan | To Do |

## Daily Standup — 11 October 2026

### 1. Meeting Details

| Field | Details |
| --- | --- |
| Date | 11 October 2026 |
| Duration | 30 minutes (timebox) |
| Format | Async written updates |
| Attendees | 6 / 6 members: Bryan (PO, contributing dev), Amareet (SM), Ji Ning, Aaron, Le Xin, Xiang Ying |

### 2. Per-Person Update

| Member | What I completed | What I am doing next |
| --- | --- | --- |
| Xiang Ying | Completed E07-S02 and E07-S03, including testing and manual validation documentation; no blockers, available to support teammates | Follow up on outstanding PR reviews and blockers; check whether integration support is needed for the equipment features |
| Aaron | Completed E07-S05 | Begin work on E08-S03 |
| Le Xin | E06-S04 started earlier than planned: Venue Staff can approve/reject a pending request with a reason and optional suggested venue (backend), and see the pending list, details and decision screen; fixed the Organiser edit form (registration setup editable, dates display correctly); reviewed/approved #246 | E06-S04: plan the clash check with setup/turnaround time once Bryan's buffers PR (#261) is in; track the Organiser edit-form fix as its own story (E03-S11) |
| Ji Ning | E06-S02: addressed #242's assigned-Coordinator access finding and passed the database regression; E06-S03: recorded PO-confirmed booking rules in merged #243 and coordinated the shared contract on #231 | E06-S02 finish review follow-ups; start E06-S03 once #244/#242/#231 are approved and merged; build the booking-status foundation |
| Amareet | E07-S07 manual test run recorded: 7/7 pass (#237); merged the technician-assignment deadlock fix (#239) and form-field alignment fix (#238); E06-S05 backend built (#245) — place, convert, release, extend holds, the expiry job and notice, calendar/search treat holds as taken; migration 0013 merged on its own (#246); fixed 3 timing bugs from Bryan's PO review of #245; recorded Bryan's hold decisions as T-79 | Get #245 and #237 re-reviewed by Bryan and merged, then move E07-S07 to Done; start the E06-S05 hold screens (SCRUM-143); add setup/turnaround buffers to holds once #231 merges |

### 3. Blockers

| Blocker | Raised By | Owner to Resolve | Status |
| --- | --- | --- | --- |
| None | — | — | — |

### 4. Sprint Backlog Snapshot

| Story ID | Title | Points | Assigned To | Status |
| --- | --- | ---: | --- | --- |
| E06-S05 | Hold a venue tentatively | 5 | Amareet | In Progress |
| E07-S06 | Request technical support for an event | 1 | Amareet | Done |
| E07-S07 | Assign and manage technical staff for an event | 3 | Amareet | In Progress |
| E07-S04 | Reserve equipment for an event | 5 | Aaron | Done |
| E07-S05 | Mark equipment as unavailable | 1 | Aaron | In Review |
| E08-S03 | Confirm an event | 5 | Aaron | To Do |
| E07-S01 | Maintain the equipment catalogue | 3 | Xiang Ying | Done |
| E07-S02 | Request equipment for an event | 3 | Xiang Ying | Done |
| E07-S03 | Check equipment availability | 5 | Xiang Ying | Done |
| E06-S02 | Check venue suitability against event requirements | 3 | Ji Ning | In Review |
| E06-S03 | Request a venue booking | 3 | Ji Ning | To Do |
| E11-S01 | Notify users about events they are involved in | 5 | Ji Ning | In Progress |
| E06-S04 | Decide on a venue booking request | 3 | Le Xin | In Progress |
| E06-S06 | Prevent double-booking of a venue | 5 | Le Xin | To Do |
| E14-S02 | Record significant actions in an activity log | 3 | Le Xin | Done |
| E05-S05 | Apply setup and turnaround time | 5 | Bryan | To Do |

## Daily Standup — 14 October 2026

### 1. Meeting Details

| Field | Details |
| --- | --- |
| Date | 14 October 2026 |
| Duration | 30 minutes (timebox) |
| Format | Async written updates |
| Attendees | 6 / 6 members: Bryan (PO, contributing dev), Amareet (SM), Ji Ning, Aaron, Le Xin, Xiang Ying |

### 2. Per-Person Update

| Member | What I completed | What I am doing next |
| --- | --- | --- |
| Xiang Ying | Followed up on PR reviews and resolved merge conflicts for E05-S05 (#261); rechecked #232's role migration and test evidence; completed E07-S01 manual checks (creation, editing, stock-reduction warnings, Coordinator notifications, retirement with retained history); uploaded screenshots and validation docs in PR #281; added #232's PostPlan and coverage exception, then approved it | Follow up on review and merge of #281; collect screenshot-backed manual evidence for E07-S02 and E07-S03; organise equipment-story evidence for the review |
| Aaron | E07-S04, E07-S05 merged after PR fixes | Review and fix merge conflicts in PRs; continue planning E08-S03 implementation |
| Le Xin | E03-S11 (Organiser edits registration setup): linked the edit-form fix to its own story (SCRUM-176) and updated the coverage list; reviewed/approved #253, reviewed #254/#255/#245 with notes | E06-S04: show Venue Staff approvals/rejections in the Coordinator's Activity log; SCRUM-189: per-venue assigned Venue Staff so booking notices go only to that venue's staff; re-run E03-S11 tests after bringing in main |
| Ji Ning | E06-S02: merged #242 (booking/staff-view integration pending); E06-S03: merged booking-status foundation #256 with review fixes and regression evidence | E06-S03: implement submission, buffered conflict checks, hold conversion and transactional audit/notifications; prepare submission tests and manual verification |
| Amareet | E07-S06 (SCRUM-56) and E07-S07 (SCRUM-57) both Done, all subtasks closed (SCRUM-145–151); E06-S05 backend holds (#245, SCRUM-138–140) built and approved; hold screens (#252, SCRUM-143) built; real-database Playwright journey and manual script (SCRUM-144) written; approved the Week 9 backlog/test-case update (#254) and architecture update (#255) | Merge E06-S05 backend (#245); do the E06-S05 manual run on the real database (16/16 PASS); update hold screens (#252) with main and merge; reviews (#258, #248, #256, #259). Still open: hold-expiry job (SCRUM-141) and setup/turnaround buffer for holds (SCRUM-142) |

### 3. Blockers

| Blocker | Raised By | Owner to Resolve | Status |
| --- | --- | --- | --- |
| E06-S04's clash check needs Bryan's buffers | Le Xin | Bryan | Resolved (#261 merged) |

### 4. Sprint Backlog Snapshot

| Story ID | Title | Points | Assigned To | Status |
| --- | --- | ---: | --- | --- |
| E06-S05 | Hold a venue tentatively | 5 | Amareet | In Progress — C-68 (Week 7): holds must expire; added expiry, job, notice and Venue Staff extensions (T-69), 48h default confirmed 7 Oct. Week 9 Q&A refinements apply in Sprint 4 (T-84); Sprint 3 keeps the Week 7 build (T-73). |
| E07-S06 | Request technical support for an event | 1 | Amareet | Done |
| E07-S07 | Assign and manage technical staff for an event | 3 | Amareet | Done |
| E07-S04 | Reserve equipment for an event | 5 | Aaron | Done — Session-linking became a new story E07-S08 (T-79); this story stays Done. |
| E07-S05 | Mark equipment as unavailable | 1 | Aaron | Done |
| E08-S03 | Confirm an event | 5 | Aaron | In Progress — C-132/C-101/C-131: Safety Review status sits between Planning and Confirmed; auto-start is follow-up after Sprint 3 (T-82); Sprint 3 keeps the Week 7 build with the Coordinator submit step (T-73). |
| E07-S01 | Maintain the equipment catalogue | 3 | Xiang Ying | Done |
| E07-S02 | Request equipment for an event | 3 | Xiang Ying | Done |
| E07-S03 | Check equipment availability | 5 | Xiang Ying | Done |
| E06-S02 | Check venue suitability against event requirements | 3 | Ji Ning | In Review |
| E06-S03 | Request a venue booking | 3 | Ji Ning | In Progress — C-67: an event may hold several venue bookings, each checked separately (T-68). |
| E11-S01 | Notify users about events they are involved in | 5 | Ji Ning | In Progress |
| E06-S04 | Decide on a venue booking request | 3 | Le Xin | In Progress — C-65: every clash check includes setup/turnaround time (T-66). |
| E06-S06 | Prevent double-booking of a venue | 5 | Le Xin | To Do — C-65 (T-66). |
| E14-S02 | Record significant actions in an activity log | 3 | Le Xin | Done |
| E03-S11 | Let the Organiser edit registration setup and fix the date layout | Not estimated (added mid-sprint) | Le Xin | In Progress — fix story added by the PO on 12 Oct after the E14-S02 run found two gaps in E03-S07; E03-S07 stays Done (T-74). |
| E05-S05 | Apply setup and turnaround time | 5 | Bryan | In Review — C-65 brought this back into Release 1 (T-66). |

## Daily Standup — 17 October 2026

### 1. Meeting Details

| Field | Details |
| --- | --- |
| Date | 17 October 2026 |
| Duration | 30 minutes (timebox) |
| Format | Async written updates |
| Attendees | 6 / 6 members: Bryan (PO, contributing dev), Amareet (SM), Ji Ning, Aaron, Le Xin, Xiang Ying |

### 2. Per-Person Update

| Member | What I completed | What I am doing next |
| --- | --- | --- |
| Xiang Ying | Completed screenshot-backed manual checks for E07-S01/S02/S03; updated validation docs and submitted evidence PRs #281, #301, #302; reviewed seven teammate PRs and tagged authors with findings | Follow up on feedback and CI for the evidence PRs; recheck review amendments; organise completed work and evidence for the review |
| Aaron | E07-S04 merged (#236); E07-S05 merged (#249); E08-S03 merged (#282, #283); took T-93 screenshots of the E08-S03 pages | Reply to review comments; approve teammates' PRs; do E07-S04 and E07-S05 re-runs with screenshots before close |
| Le Xin | E03-S11 merged (#247) with acceptance criteria, test cases and first manual run (#292); SCRUM-189 merged (#271, #272) with a manual run and screenshots; T-93 (manual-run screenshots in the repo) merged (#279); E14-S02 re-ran with screenshots (#297); E06-S04 approval now blocked on clash with buffers/maintenance, first approved venue becomes main venue, TC_01–06 passed, PR #298 open; reviewed/approved #286, #287, #290, #291 | E06-S04: add Ji Ning's review point; PO decided TC_07 stays in E06-S04 so it moves to Sprint 4 (needs E10-S04 cancellation); build E03-S12 and E14-S03 (added by PO 16 Oct), open PRs #303/#304; pause E06-S06 and move to Sprint 4 |
| Ji Ning | E06-S03: merged submission #274 and withdrawal decisions #280; opened #299 for withdrawal, replacement retry and primary selection with evidence; E06-S02: completed remaining manual checks and opened evidence PR #300; archived venue screenshots (#294); reviewed/approved #249, #252, #271, #272, #279 | E06-S02/S03: follow up on #298 integration and reviews for #299, #300; E11-S01: implement self-notification suppression and prepare manual checks; clarify equipment recipients with Bryan/Aaron |
| Amareet | E06-S05 hold-expiry cron fix (#276, SCRUM-141); notes on what Sprint 3 shipped for holds (#275); reviewed T-93 (#279) and Ji Ning's E06-S03 submission (#274) | Re-ran E06-S05, E07-S07 and E07-S06 by hand with screenshots (T-93): 18/18 PASS, all merged (#286, #290, #291); reviews (#297, #292, #294, #289, #268, #267, #293, #295); left notes on #283 and #281 |

### 3. Blockers

| Blocker | Raised By | Owner to Resolve | Status |
| --- | --- | --- | --- |
| E06-S04's TC_07 (a released booking is logged) needs event cancellation (E10-S04), not built yet | Le Xin | Bryan | Open. PO decided TC_07 stays in E06-S04, so E06-S04 cannot close until E10-S04 is done |
| E06-S06 builds on E06-S04's code (#298), which cannot merge yet | Le Xin | Le Xin | Open. E06-S06 paused until E06-S04 can merge |
| E06-S02/S03 require E06-S04's staff decision and integration code in #298 before full completion | Ji Ning | Le Xin; Bryan (TC_07 scope/dependency decision) | Open. Integration tested against #298, but the dependency remains unmerged; PRs #299, #300 await a reviewed merge |

### 4. Sprint Backlog Snapshot

| Story ID | Title | Points | Assigned To | Status |
| --- | --- | ---: | --- | --- |
| E06-S05 | Hold a venue tentatively | 5 | Amareet | Done |
| E07-S06 | Request technical support for an event | 1 | Amareet | Done |
| E07-S07 | Assign and manage technical staff for an event | 3 | Amareet | Done |
| E07-S04 | Reserve equipment for an event | 5 | Aaron | Done |
| E07-S05 | Mark equipment as unavailable | 1 | Aaron | Done |
| E08-S03 | Confirm an event | 5 | Aaron | Done — C-70: new Safety Review status between Planning and Confirmed; only the Safety Officer confirms (T-71). |
| E07-S01 | Maintain the equipment catalogue | 3 | Xiang Ying | Done |
| E07-S02 | Request equipment for an event | 3 | Xiang Ying | Done |
| E07-S03 | Check equipment availability | 5 | Xiang Ying | Done |
| E05-S05 | Apply setup and turnaround time | 5 | Bryan | Done |
| E06-S02 | Check venue suitability against event requirements | 3 | Ji Ning | In Review (integration depends on E06-S04 #298) |
| E06-S03 | Request a venue booking | 3 | Ji Ning | In Progress — C-67 (T-68). |
| E11-S01 | Notify users about events they are involved in | 5 | Ji Ning | In Progress |
| E06-S04 | Decide on a venue booking request | 3 | Le Xin | In Review (PR #298, on hold for TC_07) — C-65 (T-66). |
| E06-S06 | Prevent double-booking of a venue | 5 | Le Xin | To Do (paused, depends on E06-S04) — C-65 (T-66). |
| E14-S02 | Record significant actions in an activity log | 3 | Le Xin | Done |
| E03-S11 | Let the Organiser edit registration setup and fix the date layout | Not estimated (added mid-sprint) | Le Xin | Done — E03-S07 stays Done (T-74). |
| E03-S12 | Show consistent Organiser save success status | Not estimated (added mid-sprint) | Le Xin | Done — small follow-up added by the PO 16 Oct (T-97). |
| E14-S03 | Read edited Activity log dates and times in Singapore time | Not estimated (added mid-sprint) | Le Xin | Done — small follow-up added by the PO 16 Oct (T-97). |

### 5. Additional Notes

Several Week 7/Week 9 client answers (C-65 to C-70, C-67, C-68, C-107, C-132)
arrived after Sprint 3 was planned. Under T-73 the team kept active Sprint 3
acceptance criteria stable and scheduled the new Week 9 behaviour as follow-up
work, so some stories were built to the Week 7 version. Three small follow-up
stories (E03-S11, E03-S12, E14-S03) were added mid-sprint by the PO and
completed; they were unestimated and do not count toward Sprint 3 velocity.
