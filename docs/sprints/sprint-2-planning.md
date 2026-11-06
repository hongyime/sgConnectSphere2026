# Sprint 2 — Sprint Planning

Sprint 2 | 21 September – 3 October 2026 (Jira sprint 35)

## 1. Meeting Details

| Field | Details |
| --- | --- |
| Date | 20 September 2026 |
| Time / Duration | 10:30 am – 12:30 pm (approx. 2 hours) |
| Sprint Dates | 21 September 2026 – 3 October 2026 |
| Attendees | 5 / 6 members in live meeting. Product Owner: Bryan. Scrum Master & Frontend Developer: Amareet. Developers: Aaron, Le Xin, Xiang Ying. Note: Ji Ning (Developer) contributed asynchronously. |
| Venue | Microsoft Teams (online); recording in the submission `.docx` (start 1:23:31) |
| Facilitator | Amareet (Scrum Master) |

## 2. Sprint Goal

Coordinators review, decide on, and discuss event requests against a live venue
availability calendar, with every key action notified to affected users.

## 3. Capacity & Estimation

The team applied relative story-point estimation (planning poker) following the
Week 3 lecture (slides 18–28). Sprint 1 established a baseline velocity of 24
evidence-backed product-story points; the team used this to size Sprint 2 rather
than planning against raw output (lecture slides 30–32, 62).

The earlier planning summary records **13 product stories**, but the table
below contains 14 unique story IDs. [CONFIRM: Amareet/Bryan to reconcile the
original commitment and carryover membership.] Sprint 1 verification gaps
included E01-S04 / SCRUM-19, E02-S01 / SCRUM-26 and E02-S02 / SCRUM-27.
E11-S01 / SCRUM-75 retained its five-point estimate during this sprint.
T-105 approved thirteen points on 1 November 2026 and explicitly preserves
the original commitment and sprint ledger; it does not revise Sprint 2.

Committed product-story points at planning: **[CONFIRM: Amareet/Bryan to
reconcile the original sprint membership and estimates]**. The previous
53-point total incorrectly used E11-S01's later thirteen-point estimate.
Technical-enabler and
documentation stories (SCRUM-90–118, owned by Bryan) are tracked separately and
are not counted as product velocity, consistent with the Sprint 1 record.

## 4. Sprint Backlog

Stories selected for Sprint 2, grouped by owner. Task breakdowns were captured in
Jira; summarised here.

| Story ID | Title | Story Points | Assigned To | Jira Key |
| --- | --- | ---: | --- | --- |
| E01-S04 | Update my account details (Sprint 1 carryover) | 1 | Ji Ning | SCRUM-19 |
| E06-S01 | Search for suitable venues | 5 | Ji Ning | SCRUM-45 |
| E11-S01 | Notify users about events they are involved in | 5 | Ji Ning | SCRUM-75 |
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
| 2 | [CONFIRM: historical commitment] | 37 (recorded at Sprint 2 review; reconciliation pending) | E11-S01 (5) and E14-S02 (3) carried over. The later thirteen-point E11-S01 estimate does not revise this sprint. Jira's board chart shows 82 including technical-enabler stories; product velocity is measured on product stories only. |
