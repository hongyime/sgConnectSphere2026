# Sprint 2 — Sprint Planning

Sprint 2 | 21 September – 3 October 2026 (Jira sprint 35)

## 1. Meeting Details

> **Evidence basis.** Dates and attendance are accurate; times and durations are approximate. The session was recorded (Sprint 4 links are in the submission `.docx`; other sprints [CONFIRM: Amareet]).

| Field | Details |
| --- | --- |
| Date | 20 September 2026 |
| Time / Duration | 10:30 am – 12:30 pm (2 hours) |
| Sprint Dates | 21 September 2026 – 3 October 2026 |
| Attendees | 5 / 6 members in live meeting. Product Owner: Bryan. Scrum Master & Frontend Developer: Amareet. Developers: Aaron, Le Xin, Xiang Ying. Note: Ji Ning (Developer) contributed asynchronously. |
| Venue | Microsoft Teams (online); recording held, link [CONFIRM: Amareet] |
| Facilitator | Amareet (Scrum Master) |

## 2. Sprint Goal

Coordinators review, decide on, and discuss event requests against a live venue
availability calendar, with every key action notified to affected users.

## 3. Capacity & Estimation

The team applied relative story-point estimation (planning poker) following the
Week 3 lecture (slides 18–28). Sprint 1 established a baseline velocity of 24
evidence-backed product-story points; the team used this to size Sprint 2 rather
than planning against raw output (lecture slides 30–32, 62).

Sprint 2 committed to **13 product stories**. Eleven were new Sprint 2 stories;
two were Sprint 1 carryover items reopened for closure (E01-S04 / SCRUM-19 and
the already-merged E02-S01 / SCRUM-26 and E02-S02 / SCRUM-27 verification gaps).
The notification story E11-S01 / SCRUM-75 was re-estimated upward during the
sprint from 5 to 13 points once its cross-cutting dependency scope became clear
(lecture slide 60 permits re-estimation if applied consistently).

Committed product-story points at planning: **53** (40 points of work completed
within the sprint, plus the 13-point E11-S01). Technical-enabler and
documentation stories (SCRUM-90–118, owned by Bryan) are tracked separately and
are not counted as product velocity, consistent with the Sprint 1 record.

## 4. Sprint Backlog

Stories selected for Sprint 2, grouped by owner. Task breakdowns were captured in
Jira; summarised here.

| Story ID | Title | Story Points | Assigned To | Jira Key |
| --- | --- | ---: | --- | --- |
| E01-S04 | Update my account details (Sprint 1 carryover) | 1 | Ji Ning | SCRUM-19 |
| E06-S01 | Search for suitable venues | 5 | Ji Ning | SCRUM-45 |
| E11-S01 | Notify users about events they are involved in | 5 → 13 | Ji Ning | SCRUM-75 |
| E02-S01 | Submit an event request (Sprint 1 closure) | 5 | Aaron | SCRUM-26 |
| E02-S02 | Save a draft event request (Sprint 1 closure) | 3 | Aaron | SCRUM-27 |
| E03-S01 | Assign an Event Coordinator to a request | 3 | Aaron | SCRUM-32 |
| E03-S02 | Request clarification from the Event Organiser | 3 | Aaron | SCRUM-33 |
| E03-S03 | Decide on an event request | 3 | Aaron | SCRUM-34 |
| E03-S05 | Track the status of my event | 1 | Xiang Ying | SCRUM-35 |
| E03-S06 | Discuss an event through comments | 3 | Xiang Ying | SCRUM-36 |
| E03-S07 | View and update event information | 5 | Xiang Ying | SCRUM-37 |
| E05-S03 | View the venue availability calendar | 5 | Le Xin | SCRUM-42 |
| E05-S04 | Block a venue for maintenance | 3 | Le Xin | SCRUM-43 |
| E14-S02 | Record significant actions in an activity log | 3 | Le Xin | SCRUM-86 |

The planning doc listed E01-S04 under both Ji Ning's new work and as a carryover;
it is shown once here, attributed to Ji Ning, matching the Jira assignee.

## 5. Risks & Dependencies

| Risk / Dependency | Impact | Mitigation |
| --- | --- | --- |
| E02-S01 (submit event request) is upstream of E03-S01/S02/S03/S05/S06/S07 — all need a submitted event to exist | If Aaron's story slips it blocks Xiang Ying's stories and Aaron's own follow-on work | Aaron prioritises E02-S01 first; others start against mocked event data if it is not ready early |
| E11-S01 (notifications) depends on every story that triggers a notification (submission, clarification, decision, coordinator assignment) being far enough along to fire an event | Notification logic built against incomplete triggers may need rework | Ji Ning builds against a defined trigger-event list agreed up front, not against finished features |
| E14-S02 (activity log) is cross-cutting — depends on actions from E02/E03 stories to have something to log | Integration rework if logging hooks are added late | Le Xin agrees the loggable-action list with Aaron / Xiang Ying early, not at sprint end |
| E06-S01 (venue search) depends on venue data and likely on E05-S03 (availability calendar) for availability filtering | Ji Ning's story cannot be meaningfully tested without Le Xin's calendar data | Sequence or mock: Ji Ning builds search UI against sample venue data while E05-S03 is in progress |
| E03-S07 (view/update event info) may conflict with E03-S02/S03 on which fields are editable while a request is under review | Risk of inconsistent business rules on the same data | Xiang Ying and Aaron agree editable-field rules per event status before building |

## 6. Velocity

> **Reading the velocity chart vs the table.** The velocity *chart* plots the
> Jira board story points (all issue types, including technical-enabler stories),
> consistent with the Sprint 1 chart. The velocity *table* below reports strict
> product-story velocity under the Definition of Done (fully-Done product stories
> only). This is why a sprint's chart bar can be higher than its table figure
> (for example, Sprint 2: Jira board 66 vs strict velocity 37).

| Sprint | Planned Points | Completed Points | Notes |
| --- | ---: | ---: | --- |
| 1 | 36 | 24 (evidence-backed) | First-sprint baseline; no prior velocity data. |
| 2 | 53 (product stories) | 37 (recorded at Sprint 2 review) | Planned figure counts the 12 in-sprint stories (40 pts) plus E11-S01 re-estimated to 13 pts. Completed = 11 stories Done at close; E11-S01 (13) and E14-S02 (3) carried over. Jira's board chart shows 82 including technical-enabler stories; product velocity is measured on product stories only. |
