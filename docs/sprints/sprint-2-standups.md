# Sprint 2 — Daily Standups

Sprint 2 | 21 September – 3 October 2026 | Format: Async written updates

Four standups were held on 23, 26, 29 September and 2 October 2026. All updates
were submitted asynchronously in writing (endorsed for distributed teams,
lecture slide 48). All 6 members participated in each standup. Bryan participated
as Product Owner and contributing developer.

## Daily Standup — 23 September 2026

### 1. Meeting Details

| Field | Details |
| --- | --- |
| Date | 23 September 2026 |
| Duration | 30 minutes (timebox) |
| Format | Async written updates |
| Attendees | 6 / 6 members: Bryan (PO, contributing dev), Amareet (SM), Ji Ning, Aaron, Le Xin, Xiang Ying |

### 2. Per-Person Update

| Member | What I completed | What I am doing next |
| --- | --- | --- |
| Xiang Ying | Sprint 2 allocation planning (which stories to take) | Complete E03-S05 (track event status) |
| Aaron | Re-examined and fixed Sprint 1 stories moved Done → In Review (SCRUM-26, SCRUM-27) | Start E03-S01 (assign Event Coordinator, SCRUM-32) |
| Le Xin | Sprint 2 allocation planning | Start E05-S03 (view venue availability calendar) |
| Ji Ning | Completed E01-S04 (update account details), carried over from Sprint 1 | Start E06-S01 (search for suitable venues) |
| Amareet | Logged E05-S03 as a Jira subtask under SCRUM-42; found and fixed a Sprint 1 bug where organiser login routed to `/events`, leaving `/organiser/requests` silently on fixture data; removed misleading test IDs that falsely marked E03-S02 as covered | Finish and merge the organiser requests/dashboard fix; continue Sprint 2 stories once backend work starts |

### 3. Blockers

| Blocker | Raised By | Owner to Resolve | Status |
| --- | --- | --- | --- |
| None | — | — | — |

### 4. Sprint Backlog Snapshot

| Story ID | Title | Points | Assigned To | Status |
| --- | --- | ---: | --- | --- |
| E01-S04 | Update my account details | 1 | Ji Ning | Done |
| E06-S01 | Search for suitable venues | 5 | Ji Ning | To Do |
| E11-S01 | Notify users about events they are involved in | 13 | Ji Ning | To Do |
| E02-S01 | Submit an event request | 5 | Aaron | Done |
| E02-S02 | Save a draft event request | 3 | Aaron | Done |
| E03-S01 | Assign an Event Coordinator to a request | 3 | Aaron | To Do |
| E03-S02 | Request clarification from the Event Organiser | 3 | Aaron | To Do |
| E03-S03 | Decide on an event request | 3 | Aaron | To Do |
| E03-S05 | Track the status of my event | 1 | Xiang Ying | To Do |
| E03-S06 | Discuss an event through comments | 3 | Xiang Ying | To Do |
| E03-S07 | View and update event information | 5 | Xiang Ying | To Do |
| E05-S03 | View the venue availability calendar | 5 | Le Xin | To Do |
| E05-S04 | Block a venue for maintenance | 3 | Le Xin | To Do |
| E14-S02 | Record significant actions in an activity log | 3 | Le Xin | To Do |

## Daily Standup — 26 September 2026

### 1. Meeting Details

| Field | Details |
| --- | --- |
| Date | 26 September 2026 |
| Duration | 30 minutes (timebox) |
| Format | Async written updates |
| Attendees | 6 / 6 members: Bryan (PO, contributing dev), Amareet (SM), Ji Ning, Aaron, Le Xin, Xiang Ying |

### 2. Per-Person Update

| Member | What I completed | What I am doing next |
| --- | --- | --- |
| Xiang Ying | Completed E03-S05 | Start E03-S06 (comments) and E03-S07 (view/update event info) |
| Aaron | Completed E03-S01 backend | Start E03-S02 (SCRUM-33) |
| Le Xin | Completed E05-S03 (venue availability calendar) | Break down E05-S04 (venue maintenance blocks) |
| Ji Ning | Completed E06-S01 (search for suitable venues) | Clarify and start E11-S01 (notifications) |
| Amareet | Confirmed an E01-S11 / E02-S03 sprint-tagging discrepancy (backlog vs retro); audited all 58 routes — found a focus-outline contrast fail, missing app nav, dead-end error states, 7 left-hugging forms; reviewed Bryan's fixes on #136/#137; flagged STATE.md / JOURNAL.md placement as a recurring conflict risk | Push the duplicate-key fix to #136; upload PostPlans + review comments on #139/#140; raise the state/journal conflict with the team |

### 3. Blockers

| Blocker | Raised By | Owner to Resolve | Status |
| --- | --- | --- | --- |
| None | — | — | — |

### 4. Sprint Backlog Snapshot

| Story ID | Title | Points | Assigned To | Status |
| --- | --- | ---: | --- | --- |
| E01-S04 | Update my account details | 1 | Ji Ning | Done |
| E06-S01 | Search for suitable venues | 5 | Ji Ning | Done |
| E11-S01 | Notify users about events they are involved in | 13 | Ji Ning | In Progress |
| E02-S01 | Submit an event request | 5 | Aaron | Done |
| E02-S02 | Save a draft event request | 3 | Aaron | Done |
| E03-S01 | Assign an Event Coordinator to a request | 3 | Aaron | Done |
| E03-S02 | Request clarification from the Event Organiser | 3 | Aaron | Backend done, frontend in review |
| E03-S03 | Decide on an event request | 3 | Aaron | To Do |
| E03-S05 | Track the status of my event | 1 | Xiang Ying | Done |
| E03-S06 | Discuss an event through comments | 3 | Xiang Ying | In Progress |
| E03-S07 | View and update event information | 5 | Xiang Ying | In Progress |
| E05-S03 | View the venue availability calendar | 5 | Le Xin | Done |
| E05-S04 | Block a venue for maintenance | 3 | Le Xin | To Do |
| E14-S02 | Record significant actions in an activity log | 3 | Le Xin | To Do |

## Daily Standup — 29 September 2026

### 1. Meeting Details

| Field | Details |
| --- | --- |
| Date | 29 September 2026 |
| Duration | 30 minutes (timebox) |
| Format | Async written updates |
| Attendees | 6 / 6 members: Bryan (PO, contributing dev), Amareet (SM), Ji Ning, Aaron, Le Xin, Xiang Ying |

### 2. Per-Person Update

| Member | What I completed | What I am doing next |
| --- | --- | --- |
| Xiang Ying | Completed E03-S06 (comments) and E03-S07 (view/update event info) | Raised PRs on both stories for team review before merge |
| Aaron | Completed E03-S02 backend and frontend | E03-S02 frontend follow-up and E03-S03 backend + frontend |
| Le Xin | Completed E05-S04 (venue maintenance blocks) | Raised PR on E05-S04 for review before merge |
| Ji Ning | Partial completion of E11-S01 (notifications) | Check progress of teammates' stories to determine whether E11-S01 integration can continue |
| Amareet | Recorded ADR-017; merged E03-S07 Coordinator editing of approved event details (#148); merged the shared app shell and single route table for every signed-in page (#171) | Finish the shared building blocks for all screens (#172); build the page templates and frontend guide for backend devs (#173) |

### 3. Blockers

| Blocker | Raised By | Owner to Resolve | Status |
| --- | --- | --- | --- |
| E11-S01 (notifications) depends on trigger points from other in-progress stories (E03-S02, E03-S03, etc.); unclear which are ready to integrate against | Ji Ning | Ji Ning, with Aaron / Xiang Ying / Le Xin to confirm which stories are ready to trigger notifications | In progress |

### 4. Sprint Backlog Snapshot

| Story ID | Title | Points | Assigned To | Status |
| --- | --- | ---: | --- | --- |
| E01-S04 | Update my account details | 1 | Ji Ning | Done |
| E06-S01 | Search for suitable venues | 5 | Ji Ning | Done |
| E11-S01 | Notify users about events they are involved in | 13 | Ji Ning | In Progress |
| E02-S01 | Submit an event request | 5 | Aaron | Done |
| E02-S02 | Save a draft event request | 3 | Aaron | Done |
| E03-S01 | Assign an Event Coordinator to a request | 3 | Aaron | Backend done, frontend unconfirmed |
| E03-S02 | Request clarification from the Event Organiser | 3 | Aaron | In Progress |
| E03-S03 | Decide on an event request | 3 | Aaron | To Do |
| E03-S05 | Track the status of my event | 1 | Xiang Ying | Done |
| E03-S06 | Discuss an event through comments | 3 | Xiang Ying | Done |
| E03-S07 | View and update event information | 5 | Xiang Ying | In Progress |
| E05-S03 | View the venue availability calendar | 5 | Le Xin | Done |
| E05-S04 | Block a venue for maintenance | 3 | Le Xin | Done |
| E14-S02 | Record significant actions in an activity log | 3 | Le Xin | To Do |

## Daily Standup — 2 October 2026

### 1. Meeting Details

| Field | Details |
| --- | --- |
| Date | 2 October 2026 |
| Duration | 30 minutes (timebox) |
| Format | Async written updates |
| Attendees | 6 / 6 members: Bryan (PO, contributing dev), Amareet (SM), Ji Ning, Aaron, Le Xin, Xiang Ying |

### 2. Per-Person Update

| Member | What I completed | What I am doing next |
| --- | --- | --- |
| Xiang Ying | Worked on E03-S07 handoff note: Organiser edit form not yet built | — |
| Aaron | Completed E03-S02 frontend and E03-S03 backend | E03-S03 frontend |
| Le Xin | Fixed the E05-S03 venue calendar frontend to follow `design.md` (shared form fields and card, banned colours and corner sizes) and tested all 5 test cases; made activity-log entries immutable for E14-S02 Scenario 5 (database rule and tests) | E14-S02 carried to Sprint 3: awaiting team decision on who can read the activity log (no Administrator role yet); Scenario 3 depends on E06-S04 booking decisions |
| Ji Ning | Fixed E06-S01 venue search frontend to align with the shared design | E11-S01 carried to Sprint 3 |
| Amareet | Completed the frontend skeleton (shared blocks and page templates with the frontend guide); moved the Sprint 2 pages (coordinator, venue, organiser) onto the skeleton and aligned them with `design.md`; fixed the listed skeleton gaps; reviewed and merged `design.md` | — |

### 3. Blockers

| Blocker | Raised By | Owner to Resolve | Status |
| --- | --- | --- | --- |
| E11-S01 (notifications) depends on trigger points from other in-progress stories (E03-S02, E03-S03, etc.); unclear which are ready to integrate against | Ji Ning (from 29 Sep) | Ji Ning, with Aaron / Xiang Ying / Le Xin | Partially complete; remainder blocked on dependency timing — carried to Sprint 3 |
| E14-S02 (activity log): (1) no Administrator role exists to view the log, so the team must decide who can read it; (2) Scenario 3 depends on E06-S04 booking decisions, not yet built | Le Xin | Team (reader-role decision); E06-S04 owner (booking decisions), with Le Xin | Resolved with team (scope moved to Sprint 3 under T-75/T-76) |

### 4. Sprint Backlog Snapshot

| Story ID | Title | Points | Assigned To | Status |
| --- | --- | ---: | --- | --- |
| E01-S04 | Update my account details | 1 | Ji Ning | Done |
| E06-S01 | Search for suitable venues | 5 | Ji Ning | Done |
| E11-S01 | Notify users about events they are involved in | 13 | Ji Ning | In Progress (carried to Sprint 3) |
| E02-S01 | Submit an event request | 5 | Aaron | Done |
| E02-S02 | Save a draft event request | 3 | Aaron | Done |
| E03-S01 | Assign an Event Coordinator to a request | 3 | Aaron | Done |
| E03-S02 | Request clarification from the Event Organiser | 3 | Aaron | Done |
| E03-S03 | Decide on an event request | 3 | Aaron | Done |
| E03-S05 | Track the status of my event | 1 | Xiang Ying | Done |
| E03-S06 | Discuss an event through comments | 3 | Xiang Ying | Done |
| E03-S07 | View and update event information | 5 | Xiang Ying | Done for Sprint 2 — the E10-S01 change-request form remains a separate dependency; restricted edits currently link to a placeholder |
| E05-S03 | View the venue availability calendar | 5 | Le Xin | Done |
| E05-S04 | Block a venue for maintenance | 3 | Le Xin | Done |
| E14-S02 | Record significant actions in an activity log | 3 | Le Xin | In Progress at close — immutability (Scenario 5) done; reader-role decision and Scenario 3 booking logging carried to Sprint 3 (T-75/T-76). Counted as a carryover at the Sprint 2 review. |

### 5. Additional Notes

Some stories were tagged inconsistently between the backlog and retro snapshots
(E01-S11 / E02-S03 belong to Sprint 1, not Sprint 2). The Sprint 2 scope above
reflects the live Jira sprint-35 board.
