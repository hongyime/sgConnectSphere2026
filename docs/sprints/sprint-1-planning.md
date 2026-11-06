# Sprint 1 — Sprint Planning

Sprint 1 | 14 – 19 September 2026 (Jira sprint 34)

## 1. Meeting Details

> **Evidence basis.** Sprint and meeting *dates* and *attendance* are accurate
> (recalled and recorded by the Scrum Master). *Times and durations* are
> approximate. This planning session was held live and recorded; the Sprint 4
> recordings are linked in the submission `.docx`, and earlier-sprint recording
> links are [CONFIRM: Amareet]. Any quotations in later sections are summarised
> contributions, not a verbatim transcript.

| Field | Details |
| --- | --- |
| Date | 12 September 2026 |
| Time / Duration | 10:15 am – 12:15 pm (approx. 2 hours) |
| Sprint Dates | 14 September 2026 – 19 September 2026 |
| Attendees | 6 / 6 members. Product Owner: Bryan. Scrum Master & Frontend Developer: Amareet. Developers: Ji Ning, Aaron, Le Xin, Xiang Ying. |
| Venue | Microsoft Teams (online); session recorded |
| Facilitator | Amareet (Scrum Master) |

## 2. Sprint Goal

Establish secure, role-based access to ConnectSphere and allow Event Organisers
to submit event requests against a searchable venue catalogue, with all the key
actions captured in an audit log.

## 3. Capacity & Estimation

This is the first sprint; no historical velocity data is available. The team
applied relative story-point estimation (planning poker) following the Week 3
lecture (slides 18–28) to size the backlog items. Stories were sized 1, 3 or 5
points based on complexity, uncertainty and the number of tasks required. The
team committed to 36 story points based on its capacity assessment for this
sprint.

## 4. Sprint Backlog

Stories selected for Sprint 1, ordered by priority:

| Story ID | Title | Story Points | Assigned To | Jira Key |
| --- | --- | ---: | --- | --- |
| E01-S01 | Log in to the system | 3 | Xiang Ying / Ji Ning | SCRUM-16 |
| E01-S02 | Restrict event visibility to my own client | 5 | Xiang Ying / Ji Ning | SCRUM-17 |
| E01-S03 | Hide internal planning information from Attendees | 3 | Xiang Ying / Ji Ning | SCRUM-18 |
| E01-S04 | Update my account details | 1 | Xiang Ying / Ji Ning | SCRUM-19 |
| E01-S08 | Create an account | 3 | Xiang Ying / Ji Ning | SCRUM-23 |
| E01-S11 | Deactivate my account | 3 | Xiang Ying / Ji Ning | SCRUM-25 |
| E02-S01 | Submit an event request | 5 | Aaron | SCRUM-26 |
| E02-S02 | Save a draft event request | 3 | Aaron | SCRUM-27 |
| E02-S03 | Match accessibility requirements to venue features | 1 | Aaron | SCRUM-28 |
| E05-S01 | Maintain the venue catalogue | 3 | Le Xin | SCRUM-40 |
| E05-S02 | Match layout requirements to venue capacity | 3 | Le Xin | SCRUM-41 |
| E14-S02 | Record significant actions in an activity log | 3 | Le Xin | SCRUM-86 |

Total committed story points: 36.

## 5. Risks & Dependencies

| Risk / Dependency | Impact | Mitigation |
| --- | --- | --- |
| E05-S02 (layout/capacity matching) depends on E05-S01 (venue catalogue) being built first | Venue search features cannot be tested until basic venue records exist | Sequence E05-S01 early in the sprint before starting E05-S02 |
| E02-S03 (accessibility matching) depends on E05-S01 venue data for automated filtering | Accessibility filtering cannot be fully verified until venue records exist | Build core accessibility capture first; defer automated filtering verification until E05-S01 is complete |

## 6. Velocity

> **Reading the velocity chart vs the table.** The velocity *chart* plots the
> Jira board story points (all issue types, including technical-enabler stories).
> The velocity *table* below reports strict product-story velocity under the
> Definition of Done (fully-Done product stories only). This is why the chart's
> completed bar (Jira board 31) is higher than the table's 24-point
> evidence-backed velocity for Sprint 1.

| Sprint | Planned Points | Completed Points | Notes |
| --- | ---: | ---: | --- |
| 1 | 36 | 24 (evidence-backed) | First sprint — no prior velocity data available to benchmark against. Velocity established at 24 evidence-backed product-story points. The Jira board showed 31 product-story points; the difference is the four stories (E01-S04, E02-S01, E02-S02, E14-S02) that retained scope, review or integration-verification gaps at close and were carried into Sprint 2 for closure. Technical-enabler stories (SCRUM-95–108, Bryan) are tracked separately and are not product velocity. |
