# Sprint 4 — Sprint Planning

Sprint 4 | 18 – 31 October 2026 (Jira sprint 67)

## 1. Meeting Details

| Field | Details |
| --- | --- |
| Date | 18 October 2026 |
| Time / Duration | ~18 minutes |
| Sprint Dates | 18 October 2026 – 31 October 2026 |
| Attendees | 6 / 6 members. Product Owner: Bryan. Scrum Master & Developer: Amareet. Developers: Aaron, Le Xin, Xiang Ying, Ji Ning. |
| Venue | Microsoft Teams (online); recording in the submission `.docx` (start 0:02) |
| Facilitator | Amareet (Scrum Master) |

## 2. Sprint Goal

Complete all remaining Release 1 stories. Focus on the event lifecycle,
venue-booking and registration work: deliver E10-S04 event cancellation
(SCRUM-73) to unblock E06-S04 (SCRUM-48) and its TC_E06S04_07 release audit;
complete E06-S03 (SCRUM-47); deliver E08-S04/E08-S05 lifecycle transitions,
attendee registration (E09), and the Safety Officer check (E08-S06).

## 3. Capacity & Estimation

The team applied relative story-point estimation (planning poker) per the Week 3
lecture (slides 18–28), calibrated against the Sprint 1–3 velocities of 24, 37
and 34 product-story points (slides 30–32). As the final Release 1 sprint before
the 6 November deadline, Sprint 4 pulled in the remaining lifecycle,
venue-booking and registration stories plus the Sprint 3 carryovers.

Planning flagged a capacity risk up front: 12 Release 1 stories had no owner,
9 had no estimate, and there was no Sprint 5 at the time. The team agreed to
estimate and assign them at once, prioritise the Sprint-goal stories, and move
what could not fit back to the Product Backlog. Several stories were re-estimated
during the sprint as their true complexity emerged (see §6 and the review).

Committed at planning: ~64 product-story points (the figure grew as mid-sprint
stories and re-estimations were added — see the review record).

## 4. Sprint Backlog

The planning table captured the initial committed set; further stories were
pulled in during the sprint (recorded in the standups and review). The committed
Sprint 4 stories, with Jira keys and owners:

| Story ID | Title | Story Points | Assigned To | Jira Key |
| --- | --- | ---: | --- | --- |
| E09-S01 | Register for an event | 5 | Amareet | SCRUM-63 |
| E09-S02 | Enforce registration capacity | 3 | Amareet | SCRUM-64 |
| E09-S03 | Control the registration period | 3 | Amareet | SCRUM-65 |
| E09-S07 | View registrations for my event | 1 | Amareet | SCRUM-69 |
| E09-S05 | Withdraw my registration | 3 | Aaron | SCRUM-67 |
| E09-S04 | Join the waiting list | 5 | Aaron | SCRUM-66 |
| E05-S05 | Apply setup and turnaround time (Sprint 3 carryover) | 5 | Aaron | SCRUM-44 |
| E06-S02 | Check venue suitability against event requirements (Sprint 3 carryover) | 3 | Ji Ning | SCRUM-46 |
| E06-S03 | Request a venue booking (Sprint 3 carryover) | 3 | Ji Ning | SCRUM-47 |
| E10-S01 | Request a change after submission | 8 (re-estimated from 3) | Ji Ning / Xiang Ying | SCRUM-70 |
| E11-S01 | Notify users about events they are involved in (carried since Sprint 2) | 5 | Ji Ning | SCRUM-75 |
| E06-S04 | Decide on a venue booking request (Sprint 3 carryover) | 3 | Le Xin | SCRUM-48 |
| E06-S06 | Prevent double-booking of a venue (Sprint 3 carryover) | 5 | Le Xin | SCRUM-50 |
| E08-S04 | Revert a confirmed event to planning | 1 | Le Xin | SCRUM-61 |
| E10-S02 | Distinguish minor edits from arrangement-affecting changes | 8 (re-estimated from 5) | Le Xin | SCRUM-71 |
| E08-S05 | Complete an event | 3 | Xiang Ying | SCRUM-62 |
| E09-S06 | Record attendance | 3 | Xiang Ying | SCRUM-68 |
| E10-S04 | Cancel an event | 5 | Xiang Ying | SCRUM-73 |

Pulled in mid-sprint (recorded in the standups/review): E10-S05 (SCRUM-74),
E05-S06 (SCRUM-152), E08-S06 (SCRUM-158), plus late review-only items E02-S07
(SCRUM-180) and E04-S02. E09-S07 moved from Ji Ning to Amareet on 20 October.

## 5. Risks & Dependencies

| Risk / Dependency | Impact | Mitigation |
| --- | --- | --- |
| Event cancellation (E10-S04) and completion (E08-S05) depend on migration 0022 being applied to production | Both stories, and E06-S04's release check (TC_E06S04_07), are blocked until it is live | Bryan applies 0022 as a priority; review continues in parallel so both merge straight after |
| All production migrations go through one deploy owner (Bryan); the shared migration workflow (#315) is not approved yet | Bottleneck: 0022, 0023, 0024 queue behind one person | Approve #315 so others can run migrations safely; batch migration requests to Bryan early |
| Attendee registration (E09-S01 to S07) depends on E09 migrations 0023–0024 (#322) being merged and applied | No registration feature can be released until the schema is live | Review #322 first; build stories in parallel on stacked branches, merge after migrations apply |
| E06-S04 (#298) depends on E10-S04 cancellation merging; E06-S06 (#308) is stacked on #298 | Two venue-booking stories wait on a third, with merge conflicts building up | Prioritise E10-S04; Le Xin starts E10-S02 early while blocked; keep #298 updated with main |
| E10-S01 applying arrangement-affecting changes depends on E10-S02's shared function | E10-S01 cannot be Done until E10-S02's apply step exists | Agree the function's shape early so Ji Ning builds in parallel; interim "Approved – waiting for arrangement check" state |
| E09-S06 record attendance depends on E08-S05 completion and on registrations (E09-S01) | Attendance cannot be recorded for real events until both land | Sequence E08-S05 → E09-S06; build against seeded registrations meanwhile |
| Events reach Confirmed through the Safety Officer check (E08-S06), which is unassigned | Completion, registration and attendance need Confirmed events; demos rely on seeded data | Assign E08-S06 early; use seeded Confirmed events for development and testing |
| Team capacity: 12 Release 1 stories have no owner, 9 have no estimate, and there is no Sprint 5 | Release 1 may not be finished by 31 Oct | Estimate and assign at once; prioritise the Sprint-goal stories; move what cannot fit back to the Product Backlog |
| Done needs manual end-to-end runs with tester screenshots (T-93) and human code/test review | Stories stay unfinished late if evidence or reviews lag | Schedule manual runs as soon as each story is merged; tester assigned per story; review open PRs daily |
| Large PRs and shared generated files (backlog spreadsheet, tc-coverage) cause review delays and conflicts | A push to fix a conflict dismisses existing approvals; slower merges | Keep PRs small (migration-only, subtask-sized); whoever merges second regenerates the shared files |

## 6. Velocity

> **Reading the velocity chart vs the table.** The velocity *chart* plots the
> Jira board story points (all issue types, including technical-enabler stories),
> consistent with the Sprint 1 chart. The velocity *table* below reports strict
> product-story velocity under the Definition of Done (fully-Done product stories
> only), counted at the sprint-close boundary. This is why the chart bars can
> differ from the table figures.

| Sprint | Planned Points | Completed Points | Notes |
| --- | ---: | ---: | --- |
| 1 | 36 | 24 | First-sprint baseline. |
| 2 | [CONFIRM: historical commitment] | 37 (recorded; reconciliation pending) | E11-S01 and E14-S02 carried over. |
| 3 | [CONFIRM: historical commitment; 58 at close] | 34 | Six booking/notification stories carried over. |
| 4 | ~64 (grew with mid-sprint additions) | — (recorded at Sprint 4 review) | Final Release 1 sprint. E10-S01 and E10-S02 were re-estimated mid-sprint; E11-S01 remained five points at the boundary (T-105 approved thirteen on 1 November). Mid-sprint stories E10-S05, E05-S06, E08-S06 added. A short Sprint 5 (1–5 Nov) was opened to finish the remainder before submission. |
