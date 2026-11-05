# Sprint 2 — Sprint Review & Retrospective

Sprint 2 | 21 September – 3 October 2026 (Jira sprint 35)

## Part A — Sprint Review

### 1. Meeting Details

| Field | Details |
| --- | --- |
| Date | 2 October 2026 (ran into the early hours of 3 October) |
| Time / Duration | 11:45 pm – 1:30 am (approx. 1 hour 45 minutes) |
| Attendees | 6 / 6 members. Product Owner: Bryan. Scrum Master & Frontend Developer: Amareet. Developers: Ji Ning, Aaron, Le Xin, Xiang Ying. |
| Venue | Microsoft Teams (online); session recorded |
| Facilitator | Amareet (Scrum Master) |

### 2. Sprint Goal Recap

Coordinators review, decide on, and discuss event requests against a live venue
availability calendar, with every key action notified to affected users.

### 3. Increment Demo & Completed Stories

The following stories were demonstrated as Done at the Sprint Review. Status
reflects the Jira-verified state at sprint close (project `SCRUM`, sprint 35
boundary 3 October 2026 SGT).

| Story ID | Title | Jira Key | Points | Status at Close |
| --- | --- | --- | ---: | --- |
| E01-S04 | Update my account details | SCRUM-19 | 1 | Done |
| E02-S01 | Submit an event request | SCRUM-26 | 5 | Done |
| E02-S02 | Save a draft event request | SCRUM-27 | 3 | Done |
| E03-S01 | Assign an Event Coordinator to a request | SCRUM-32 | 3 | Done |
| E03-S02 | Request clarification from the Event Organiser | SCRUM-33 | 3 | Done |
| E03-S03 | Decide on an event request | SCRUM-34 | 3 | Done |
| E03-S05 | Track the status of my event | SCRUM-35 | 1 | Done |
| E03-S06 | Discuss an event through comments | SCRUM-36 | 3 | Done |
| E03-S07 | View and update event information | SCRUM-37 | 5 | Done for Sprint 2 — Organiser restricted-edit flow depends on E10-S01 (SCRUM-70, delivered later); currently links to a placeholder |
| E05-S03 | View the venue availability calendar | SCRUM-42 | 5 | Done |
| E05-S04 | Block a venue for maintenance | SCRUM-43 | 3 | Done |
| E06-S01 | Search for suitable venues | SCRUM-45 | 5 | Done |
| E14-S02 | Record significant actions in an activity log | SCRUM-86 | 3 | Carried over. At the 3 October close the story was In Progress (it moved Done → In Progress at 2 Oct 22:20 during the review; it only reached Done on 10 October, after the sprint). The Sprint 2 increment logged actions from stories built so far; the reader-role decision and Scenario 3 booking-decision logging were moved to Sprint 3 (T-75/T-76). Not counted toward Sprint 2 velocity. |

### 4. Carryovers / Not Completed

| Story ID | Jira Key | Reason for Not Completing | Action Owner |
| --- | --- | --- | --- |
| E11-S01 | SCRUM-75 | Built against the triggers that existed; the remainder depends on Sprint 3 stories not yet ready. Re-estimated from 5 to 13 points as the cross-cutting scope became clear. | Ji Ning resumes once dependent stories progress |
| E14-S02 | SCRUM-86 | In Progress at close (reached Done 10 October, after the sprint). Reader-role decision settled and Scenario 3 booking-decision logging transferred to E06-S04; remaining work carried to Sprint 3 (T-75/T-76) at the original 3-point estimate. | Le Xin continues in Sprint 3 |

### 5. Stakeholder Feedback

No external stakeholder feedback was received this sprint. The Product Owner
reviewed the increment and accepted it subject to the follow-up actions and the
two `[CONFIRM]` reconciliation items above.

### 6. Product Backlog Updates

No backlog items were added, reprioritised, or removed as a direct result of this
review. The E14-S02 scope decision (reader role settled; booking-decision logging
transferred to E06-S04) was recorded as T-75 / T-76 and carries the remaining
E14-S02 work into Sprint 3 at its original 3-point estimate.

### 7. Velocity & Story Points

Per the Week 3 lecture (slides 30–32, 51, 60): velocity counts only fully-Done
product-story points; work that is not Done is reconsidered in the backlog and
does not count. Partial points are not counted.

| Metric | Result |
| --- | --- |
| Committed product-story points | 53 (40 pts across 12 in-sprint stories + 13 pts E11-S01) |
| Completed (product stories, Done at close) | 37 points across 11 stories |
| Carryover | E11-S01 / SCRUM-75 (13 pts) and E14-S02 / SCRUM-86 (3 pts) |
| Velocity (Sprint 2) | 37 product-story points |
| Jira board chart (all issue types) | 82 points total / 69 Done, including technical-enabler and documentation stories (SCRUM-90–118, Bryan). Reported separately; not product velocity. |
| Delivery rate (product stories) | 37 / 53 = 69.8% by points |

Reconciliation of the Product Owner's review comments (verified against the Jira
status history):

- **E14-S02 / SCRUM-86:** at the 3 October close the story was *In Progress* (it
  moved Done → In Progress at 2 Oct 22:20 during the review and only reached Done
  on 10 October). It is therefore a Sprint 2 carryover and its 3 points do not
  count toward Sprint 2 velocity.
- **Carryover set:** the product carryover is SCRUM-75 (13 pts) and SCRUM-86
  (3 pts). SCRUM-112 was still open at close (it moved To Do → Done on 6 October)
  but is a 0-point technical-enabler task, so it does not affect product velocity.
- **E10-S01 = SCRUM-70** is a separate follow-up (its subtasks SCRUM-202–206 were
  delivered later), not a Sprint 2 carryover. E03-S07's restricted-edit flow
  linked to a placeholder pending it.

### 8. Definition of Done (current version)

The Definition of Done in effect at the end of Sprint 2 (`CONTRIBUTING.md`):

- Acceptance criteria as stated in the user story are satisfied.
- Automated tests pass (unit, integration, or end-to-end coverage where relevant).
- Manual verification passes where the story needs human UI or workflow checking,
  and the manual run is recorded (steps, expected/actual, tester, date).
- Code has been peer-reviewed by at least one other developer.
- Security, accessibility, and UI criteria are satisfied where applicable.
- Documentation and architecture are updated where the change affects setup,
  interfaces, decisions, backlog interpretation, or team workflow.
- The item is deployable and integrated into the increment through the reviewed
  pull-request process (merge-queue on `main`).

## Part B — Sprint Retrospective

Technique: each member reported what went well and what did not, and the team
agreed owned improvement actions (lecture slides 53–55).

### 1. What Went Well

| Member | Comments |
| --- | --- |
| Bryan | Team members helped one another beyond their assigned features — reviewing work, fixing outstanding issues, resolving merge conflicts. Shared frontend components made screens consistent (venue search and maintenance blocks reused common forms, buttons and status labels). Reviews caught specific mistakes before merging (corrected the screen inventory where working features were listed as missing; replaced repeated venue-result alerts with status labels for accessibility). Testing traceability improved — recording commands, results and the code version tested. |
| Xiang Ying | Members reviewed each other's features to find missing requirements and gaps and left PR comments to keep aligned with acceptance criteria; helped each other debug and reviewed changes before approving merges. Improved feature quality and shared understanding — worth continuing. |
| Aaron | The frontend skeleton standardised pages so they stay consistent through development. PR comments and approvals were prompt and detailed enough that changes were easy to understand and implement. |
| Le Xin | The shared frontend skeleton, page templates and `design.md` gave everyone the same building blocks and one checklist to review against. Automated PR checks are worth keeping — PR template, `check.py`, tc-coverage regeneration and security scans (CodeQL, Semgrep) catch problems before a human reviewer has to. |
| Ji Ning | Documented decisions resolved unclear requirements (organisation permissions, notification recipients) without relying on assumptions. Shared UI components kept the frontend consistent; automated tests caught validation, access-control and responsive issues before manual review. |
| Amareet | Running systematic audits (route/accessibility review, screen inventory) as a standing check — not ad hoc — surfaced the stale routing bug and misleading test IDs before demo. Responding to the bottleneck feedback by building shared design infrastructure (not a one-off fix) benefits the whole team going forward. Both are patterns worth repeating. |

### 2. What Did Not Go Well

| Member | Comments |
| --- | --- |
| Bryan | Frequent updates to `main` caused repeated conflicts in shared documentation and handoff files; updating a branch dismissed its previous approval, forcing re-reviews even when the feature had not changed. Some completion rules were clarified late (activity-log reader; booking logging moved to the booking story; Jira marked the activity-log story Done after only part was delivered, needing manual correction). Test evidence was not recorded consistently from the start; some runs had to be reconstructed from PR descriptions, and mocked-API tests had to be distinguished from real-database tests. Vercel's daily deployment quota was hit, so some PR previews could not be refreshed even when required checks passed. |
| Xiang Ying | Some members could review and approve PRs but could not merge them into `main`, so completed changes waited for someone with merge permissions, delaying integration. |
| Aaron | `main` kept conflicting after every PR; PRs need to be approved and merged step by step rather than in parallel to avoid merge conflicts. |
| Le Xin | Missing roles and cross-story dependencies were found mid-sprint instead of at planning (e.g. no Administrator role; stories depending on unbuilt Sprint 3 work). |
| Ji Ning | Some requirements still needed clarification after implementation had started, causing rework and slowing progress. E11-S01 was limited by unfinished dependencies from other stories, so some notification integrations could not be completed within the sprint. |
| Amareet | Was the sole frontend owner for most of Sprint 2, creating a bottleneck for backend developers; should have raised the capacity issue earlier. Manual testing was not recorded consistently. |

### 3. Follow-up of Sprint 1 Action Items

| Owner | Action | Due By | Status |
| --- | --- | --- | --- |
| Whole Team | Post quick async updates in the group chat when something important is found or decided (bugs/blockers/decisions) | Ongoing from Sprint 2 | Done |
| Whole Team | Sync with the latest `main` before starting any new user story to avoid late merge conflicts | Ongoing from Sprint 2 | Done |
| Whole Team | Verify PR checklist items are actually true before submitting, not checked as a formality | Ongoing from Sprint 2 | Done |
| Whole Team | If a portion touches mock data, generate and add real data into Supabase; share in the group chat before adding (e.g. real users with credentials) to support E02-S01 real-database verification | Ongoing from Sprint 2 | Done |
| Xiang Ying, Le Xin | Add documentation on why Docker is specifically used | Ongoing from Sprint 2 | Done |

### 4. Action Items for Sprint 3

| Owner | Action | Due By | Status |
| --- | --- | --- | --- |
| Whole Team | Manual testing must be recorded (steps, expected/actual result, tester, date) before a story is marked Done | Ongoing from Sprint 3 | To Do |
| Story owners with cross-cutting work (notifications, activity log) | Confirm dependency readiness with the owning dev before starting integration, not mid-sprint | Ongoing from Sprint 3 | To Do |
| Whole Team | Agree a backup person with merge permissions and regular review times, keeping the required peer-review checks, so approved PRs are not blocked on a single merger | Sprint 3 | To Do (from Xiang Ying's retro point) |
| Whole Team | Sequence PRs through the merge queue to reduce repeated `main` conflicts and approval dismissals | Sprint 3 | To Do (from Aaron's / Bryan's retro point) |
