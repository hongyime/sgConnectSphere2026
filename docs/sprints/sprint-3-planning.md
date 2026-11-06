# Sprint 3 — Sprint Planning

Sprint 3 | 4 – 17 October 2026 (Jira sprint 36)

## 1. Meeting Details

| Field | Details |
| --- | --- |
| Date | 5 October 2026 |
| Time / Duration | 10:30 am – 12:30 pm (approx. 2 hours) |
| Sprint Dates | 4 October 2026 – 17 October 2026 |
| Attendees | 6 / 6 members. Product Owner: Bryan. Scrum Master & Developer: Amareet. Developers: Aaron, Le Xin, Xiang Ying, Ji Ning. |
| Venue | Microsoft Teams (online); recording in the submission `.docx` (start 11:00) |
| Facilitator | Amareet (Scrum Master) |

## 2. Sprint Goal

Coordinators arrange an event's venue booking, equipment and technical staff and
submit it for confirmation, while finishing the notifications and activity log
carried over from Sprint 2.

## 3. Capacity & Estimation

The team applied relative story-point estimation (planning poker) per the Week 3
lecture (slides 18–28), calibrated against the Sprint 1–2 velocities of 24 and
37 product-story points (slides 30–32). Sprint 3 committed to a large venue-,
equipment- and confirmation-focused backlog plus the E11-S01 notifications
carryover (re-estimated to 13 points) and E14-S02 (3 points) from Sprint 2.

The planning doc flagged an overcommitment risk up front: ~53 new points against
a demonstrated velocity of roughly 28–37, plus two carryovers. The team agreed
that carryovers finish first and that lower-priority stories (for example
E07-S05 or E06-S06's multi-venue scenarios) move to Sprint 4 if needed.

## 4. Sprint Backlog

Stories selected for Sprint 3, with their Jira keys and owners. Full task
breakdowns were captured in Jira.

| Story ID | Title | Story Points | Assigned To | Jira Key |
| --- | --- | ---: | --- | --- |
| E06-S05 | Hold a venue tentatively | 5 | Amareet | SCRUM-49 |
| E07-S06 | Request technical support for an event | 1 | Amareet | SCRUM-56 |
| E07-S07 | Assign and manage technical staff for an event | 3 | Amareet | SCRUM-57 |
| E07-S04 | Reserve equipment for an event | 5 | Aaron | SCRUM-54 |
| E07-S05 | Mark equipment as unavailable | 1 | Aaron | SCRUM-55 |
| E08-S03 | Confirm an event | 5 | Aaron | SCRUM-60 |
| E07-S01 | Maintain the equipment catalogue | 3 | Xiang Ying | SCRUM-51 |
| E07-S02 | Request equipment for an event | 3 | Xiang Ying | SCRUM-52 |
| E07-S03 | Check equipment availability | 5 | Xiang Ying | SCRUM-53 |
| E06-S02 | Check venue suitability against event requirements | 3 | Ji Ning | SCRUM-46 |
| E06-S03 | Request a venue booking | 3 | Ji Ning | SCRUM-47 |
| E11-S01 | Notify users about events they are involved in (Sprint 2 carryover) | 13 | Ji Ning | SCRUM-75 |
| E06-S04 | Decide on a venue booking request | 3 | Le Xin | SCRUM-48 |
| E06-S06 | Prevent double-booking of a venue | 5 | Le Xin | SCRUM-50 |
| E14-S02 | Record significant actions in an activity log (Sprint 2 carryover) | 3 | Le Xin | SCRUM-86 |
| E05-S05 | Apply setup and turnaround time | 5 | Bryan | SCRUM-44 |

Total committed product-story points: 66 (includes the two carryovers:
E11-S01 at 13 and E14-S02 at 3). E05-S05 was pulled into the sprint to supply the
setup/turnaround buffers that several booking stories depend on.

## 5. Risks & Dependencies

| Risk / Dependency | Impact | Mitigation |
| --- | --- | --- |
| Equipment stories (E07-S02/S03/S04/S05) depend on the equipment catalogue (E07-S01) | Xiang Ying's and Aaron's equipment work stalls until it lands | Xiang Ying builds E07-S01 first in week 1; agree item fields and statuses on day 1 |
| Reserve equipment (E07-S04, Aaron) depends on the availability check (E07-S03, Xiang Ying) | Two owners on one chain; mismatched assumptions cause rework | Agree the availability API early; Aaron starts with mocked responses from that contract |
| Booking decisions and tentative holds (E06-S04, E06-S05) depend on booking requests (E06-S03) | Le Xin and Amareet cannot finish until Ji Ning's request flow exists | Ji Ning delivers E06-S03 early; agree booking statuses up front |
| Confirm event (E08-S03) depends on venue booking, equipment and technical support being done | Can only be finished at the end of the sprint; any slip carries it over | Aaron builds the readiness checks against agreed statuses in parallel; Amareet's E07-S06 "no support needed" flag lands early |
| Shared migration 0011 is needed by several stories (hold statuses, expiry columns, buffers) | Conflicting or duplicated migrations break the database | One owner writes 0011 in order; others add to it by PR, never in parallel copies |
| Setup/turnaround buffers come from E05-S05 | E06-S05 (and S03/S04/S06) cannot meet their buffer scenarios | Bryan brought E05-S05 into the sprint to supply the buffers (resolved at planning) |
| Venue Staff notifications have no recipients yet (venue-to-staff assignment, T-64) | Booking/venue-change notices to Venue Staff go nowhere; E11-S01 cannot close | Confirm the assignment approach with Bryan, then add it as a subtask under SCRUM-75 (Le Xin) early |
| Overcommitment: ~53 new points against velocity of ~28–37, plus 2 carryovers | Stories roll over again and the sprint goal is missed | Carryovers finish first; agree up front which stories move to Sprint 4 if needed |
| Hold expiry runs on a scheduled job (outbox-relay cron) | Time-based logic is hard to test; a stalled cron leaves holds unexpired | Make the job's clock injectable and test the exact boundary; check the cron on the deployed site |
| Review bottleneck: approvals dismissed on every push; merge queue required; Vercel free-plan 100-deploys/day limit | PRs wait days for approval; preview links fail | Request review only when ready (DoD); review each other's PRs daily; do not rely on previews late in the day |

## 6. Velocity

> **Reading the velocity chart vs the table.** The velocity *chart* plots the
> Jira board story points (all issue types, including technical-enabler stories),
> consistent with the Sprint 1 chart. The velocity *table* below reports strict
> product-story velocity under the Definition of Done (fully-Done product stories
> only). This is why a sprint's chart bar can be higher than its table figure
> (for example, Sprint 3: Jira board 34 vs strict velocity 34 — equal this
> sprint — while Sprint 2 shows Jira board 66 vs strict velocity 37).

| Sprint | Planned Points | Completed Points | Notes |
| --- | ---: | ---: | --- |
| 1 | 36 | 24 | First-sprint baseline. |
| 2 | 53 | 37 | E11-S01 and E14-S02 carried over. |
| 3 | 66 (incl. 2 carryovers) | — (recorded at Sprint 3 review) | Includes E11-S01 (13) and E14-S02 (3) carried from Sprint 2. Product velocity measured on product stories only; technical-enabler and mid-sprint unestimated stories are excluded. |
