# Sprint 4 — Sprint Review & Retrospective

Sprint 4 | 18 – 31 October 2026 (Jira sprint 67)

## Part A — Sprint Review

### 1. Meeting Details

| Field | Details |
| --- | --- |
| Date | 1 November 2026 |
| Time / Duration | ~40 minutes |
| Attendees | 6 / 6 members. Product Owner: Bryan. Scrum Master & Developer: Amareet. Developers: Ji Ning, Aaron, Le Xin, Xiang Ying. |
| Venue | Microsoft Teams (online); recording in the submission `.docx` (start 0:02) |
| Facilitator | Amareet (Scrum Master) |

### 2. Sprint Goal Recap

Complete all remaining Release 1 stories. Focus on the event lifecycle,
venue-booking and registration work: deliver E10-S04 event cancellation to
unblock E06-S04 and its TC_E06S04_07 release audit; complete E06-S03; deliver
E08-S04/E08-S05 lifecycle transitions, attendee registration (E09), and the
Safety Officer check (E08-S06).

### 3. Increment Demo & Completed Stories

Status reflects the Jira-verified state **at the sprint close boundary (1 Nov
00:00 SGT)**. Two stories the team demonstrated as finished (E06-S06, E09-S04)
transitioned to Done just after the boundary (1 Nov 00:11 and 01:00); per the
Product Owner's review note they are recorded as post-close transitions, not
Sprint 4 velocity (see §7).

| Story ID | Title | Jira Key | Points | Status at Close |
| --- | --- | --- | ---: | --- |
| E05-S05 | Apply setup and turnaround time | SCRUM-44 | 5 | Done (22 Oct) |
| E10-S04 | Cancel an event | SCRUM-73 | 5 | Done (20 Oct) |
| E08-S05 | Complete an event | SCRUM-62 | 3 | Done (26 Oct) |
| E09-S06 | Record attendance | SCRUM-68 | 3 | Done (26 Oct) |
| E09-S05 | Withdraw my registration | SCRUM-67 | 3 | Done (28 Oct) |
| E09-S01 | Register for an event | SCRUM-63 | 5 | Done (28 Oct) |
| E09-S02 | Enforce registration capacity | SCRUM-64 | 3 | Done (28 Oct) |
| E09-S03 | Control the registration period | SCRUM-65 | 3 | Done (28 Oct) |
| E10-S05 | Handle a venue lost from a confirmed event | SCRUM-74 | 5 | Done (29 Oct) |
| E06-S02 | Check venue suitability against event requirements | SCRUM-46 | 3 | Done (29 Oct) |
| E06-S03 | Request a venue booking | SCRUM-47 | 3 | Done (29 Oct) |
| E06-S04 | Decide on a venue booking request | SCRUM-48 | 3 | Done (29 Oct) |
| E09-S07 | View registrations for my event | SCRUM-69 | 1 | Done (29 Oct) |
| E05-S06 | Mark a venue temporarily unavailable over existing bookings | SCRUM-152 | 8 | Done (29 Oct) |
| E06-S06 | Prevent double-booking of a venue | SCRUM-50 | 5 | Done **after close** (1 Nov 00:11) — counts in Sprint 5 |
| E09-S04 | Join the waiting list | SCRUM-66 | 5 | Done **after close** (1 Nov 01:00) — counts in Sprint 5 |

Done at close: **14 stories, 53 product-story points.** This completed the
Sprint 3 booking carryovers (E05-S05, E06-S02, E06-S03, E06-S04) and the full
E09 registration set except the waiting list.

### 4. Not Completed / Carried Over

| Story ID | Title | Jira Key | Points | Reason | Action |
| --- | --- | --- | ---: | --- | --- |
| E08-S04 | Revert a confirmed event to planning | SCRUM-61 | 1 | Manual test found late that a date change did not flag Technical Support staff; needed a PO decision (31 Oct) before the fix. | Sprint 5: finish the fix and manual test, then PO acceptance |
| E10-S01 | Request a change after submission | SCRUM-70 | 8 | Bigger than first thought (re-estimated 3→8, new owner 20 Oct); code merged but a PO decision on changes during Safety Review came only 31 Oct. | Sprint 5: manual test, then PO acceptance |
| E10-S02 | Distinguish minor edits from arrangement-affecting changes | SCRUM-71 | 8 | Scope grew 31 Oct (5→8) to re-check Technical Support staff; needs migration 0026 applied to production before the code can merge. | Sprint 5: apply the migration, fix review comments, manual test |
| E11-S01 | Notify users about events they are involved in | SCRUM-75 | 5 | Powers notifications for every other feature; re-estimated 5→13. Carried since Sprint 2. | Sprint 5: finish the remaining notification flows and evidence |
| E08-S06 | Conduct the Operational Safety Check as the Safety Officer | SCRUM-158 | 8 | No owner for most of the sprint; added on 30 Oct and not started. (Reached Done 4 Nov.) | Sprint 5: Aaron picked it up on 1 Nov |
| E06-S06 | Prevent double-booking of a venue | SCRUM-50 | 5 | Built and tested; reached Done at 1 Nov 00:11, just after the close boundary. | Counted in Sprint 5 |
| E09-S04 | Join the waiting list | SCRUM-66 | 5 | Built and tested; reached Done at 1 Nov 01:00, just after the close boundary. | Counted in Sprint 5 |
| E04-S02 | Create a multi-session event | — | 5 | Not formally in Sprint 4; code merged only on 1 Nov, so the manual test could not start before close. | Sprint 5: manual test, then PO acceptance |
| E02-S07 | Validate the event date horizon | SCRUM-180 | 3 | Not formally in Sprint 4; reached review 31 Oct and relied on E04-S02 (merged 1 Nov). | Sprint 5: finish review and manual test, then PO acceptance |

### 5. Stakeholder Feedback

No external stakeholder feedback was received this sprint. The Product Owner
reviewed the increment and accepted the completed stories; the remaining items
moved into a short Sprint 5 (1–5 Nov) to finish Release 1 before submission.

### 6. Product Backlog Updates

The sprint saw substantial backlog changes, each recorded and traced to a PR and
a team decision:

| Change | Item | Reason |
| --- | --- | --- |
| Re-estimated 3 → 8 points | E10-S01 Request a change after submission | Scope bigger than first thought; split between two owners (21 Oct, #323) |
| Re-estimated 3 → 5 points | E10-S05 Handle a venue lost from a confirmed event | More work than first estimated (26 Oct, #356) |
| Estimated at 8 points | E05-S06 Mark a venue temporarily unavailable | Release 1 story with no estimate yet (28 Oct, #364) |
| Estimated at 3 points | E02-S07 Validate the event date horizon | Release 1 story with no estimate yet (31 Oct, #388) |
| Re-estimated 5 → 8 points, scenarios updated | E10-S02 Distinguish minor edits from arrangement-affecting changes | PO decided a date change must also re-check Technical Support staff (31 Oct, #397) |
| Re-estimated 5 → 13 points | E11-S01 Notify users about events they are involved in | Notifications are shared by every feature; PO approved 13 points via T-105 (1 Nov, #398/#402); the historical sprint ledger is preserved |
| Scenarios rewritten | E06-S06 Prevent double-booking of a venue | PO clarified first accepted booking claims the slot; later overlaps refused (26 Oct, #339) |
| Scenarios rewritten | E05-S06 and E10-S05 (venue loss) | A confirmed event returns to Planning, not cancelled, when its venue becomes unavailable (24 Oct, #344) |
| Rule added | E10-S01 (changes during Safety Review) | An approved change affecting arrangements sends the event back to Planning (31 Oct, #395) |
| Added to Jira, 5 points | E07-S09 Preserve reservation warnings when stock reductions overlap | Was in the Release 1 backlog but had no Jira ticket (1 Nov) |
| Estimated at 8 points, owner assigned | E08-S06 Operational Safety Check | Had no owner or estimate; Aaron picked it up (1 Nov) |
| Labels corrected | E02-S05 (SCRUM-30) and 10 other stories | Some Release 1 stories were wrongly tagged "future backlog" or had no label (1 Nov) |
| Moved into new Sprint 5 | 5 unfinished Sprint 4 stories, plus E02-S07 and E07-S09 | Sprint 4 ended with work left; a short Sprint 5 (1–5 Nov) was opened to finish Release 1 before submission |

### 7. Velocity & Story Points

Per the Week 3 lecture (slides 30–32, 51, 60): velocity counts only fully-Done
product-story points **at the close boundary**; work not Done is reconsidered in
the backlog and does not count. Partial points are not counted.

| Metric | Result |
| --- | --- |
| Committed product-story points | ~64 at planning, grown to ~85 with mid-sprint additions and re-estimations |
| Completed (product stories, Done at 1 Nov 00:00 SGT close) | 53 points across 14 stories |
| Post-close transitions (count in Sprint 5) | E06-S06 (5, Done 1 Nov 00:11) and E09-S04 (5, Done 1 Nov 01:00) |
| Carryover to Sprint 5 | E08-S04 (1), E10-S01 (8), E10-S02 (8), E11-S01 (5 at boundary; 13 after T-105), E08-S06 (8), plus E04-S02 and E02-S07 |
| Velocity (Sprint 4) | 53 product-story points |
| Delivery rate | 53 / ~85 committed-at-close by points |

Reconciliation (verified against the Jira status history, close boundary 1 Nov
00:00 SGT):

- The Product Owner's review comment is confirmed: **E06-S06 / SCRUM-50 and
  E09-S04 / SCRUM-66 both reached Done after the boundary** (1 Nov 00:11 and
  01:00). They are recorded as post-close transitions, not Sprint 4 velocity.
- **Done-at-close velocity is 53 points** across 14 stories, matching the PO's
  "53 of 85 product-story points Done." The exact carryover total depends on
  which estimates are counted for the mid-sprint-resized stories (E10-S01 3→8,
  E10-S02 5→8, E11-S01 5→13); the historical 32-point carryover must not be inflated using later estimates
  (T-105). [CONFIRM: reconcile the carryover story list with that historical ledger.]
- The live Jira board shows all 16 sprint-67 stories Done, but E06-S06 and
  E09-S04 only reached Done after the close; the other 14 were Done between
  20 and 29 October.

The recorded product-story velocity trend is Sprint 1 = 24, Sprint 2 = 37,
Sprint 3 = 34, Sprint 4 = 53. The recorded planning reference was their average
of about 37. [CONFIRM: Sprint 2's 37-point summary conflicts with its Done-story
table; reconcile that record before presenting this series as final.]

### 8. Definition of Done (current version)

The 6 October instructor guidance applies to this sprint
(`docs/plans/instructor-guidance-2026-10-06.md`):

- Acceptance criteria are satisfied.
- Automated tests pass; changed code has 100% unit coverage, including boundary
  and error cases, or an explicit justification reviewed by a human.
- Integration and manual end-to-end tests are run before the Sprint Review,
  using the test-case template, with tester, date and outcome logged.
- Another developer reviews both code and test cases, including AI-generated
  work, and checks that the tests are valid.
- Documentation, architecture views and project logs are updated.
- The item is merged into `main` through the reviewed pull-request process.

Security, accessibility, performance, UI criteria and public deployment are
not mandatory DoD conditions under that guidance. Incomplete work returns to
the Product Backlog. A story already marked Done is not reopened: record the
discrepancy and create a linked follow-up. This corrected summary does not
claim that missing historical acceptance evidence has since been supplied.

## Part B — Sprint Retrospective

Technique: each member reported what went well and what did not, and the team
agreed owned improvement actions (lecture slides 53–55). Where a member did not
record written notes, their blank is preserved rather than invented.

### 1. What Went Well

| Member | Comments |
| --- | --- |
| Bryan | Session-level impact bypass caught on review: in PR #408 both Xiang Ying and Ji Ning flagged that editing a Session's requirements in Planning updated the DB but bypassed arrangement reconfirmation (the impact checker compared fields only at Event level); Amareet patched it before merging. Migration and security guardrails: PR #315 established a protected, audited workflow for applying production migrations with rollback and sanitized execution records, preventing direct destructive runs against the production Supabase database. The team maintained high DoD standards before claiming completion. Fast infrastructure recovery: when migration 0026 was blocked on 31 Oct by Supabase IPv6/pooling issues, the team resolved it via PR #404. |
| Xiang Ying | *(no written note recorded)* |
| Aaron | *(no written note recorded)* |
| Le Xin | Doing manual runs paid off — they caught gaps the automated tests did not. Testing on a real local database first meant most bugs were found before the manual run. The new CI checks catch test-case mistakes automatically. |
| Ji Ning | *(no written note recorded)* |
| Amareet | *(no written note recorded)* |

### 2. What Did Not Go Well

| Member | Comments |
| --- | --- |
| Bryan | Sizing changes (including the later 1 November T-105 decision): E10-S01 re-sized 3→8 as the complexity of multi-session change requests became clear; E11-S01 notifications expanded to 13 points (XXL), needing team-decision record T-105 (#402) to permit stories larger than XL (8 pts). Added stories after sprint start: SCRUM-74 (5), SCRUM-152 (8) and SCRUM-158 were injected into Sprint 4, inflating Jira's scope from 64 to 77+ points and diluting focus from the original commitment. Merge queue and rebase invalidation: strict linear history and require_last_push_approval meant rebasing long-lived branches onto main repeatedly dismissed valid approvals. BDR number collisions: concurrent branches #293 and #316 both allocated T-97, forcing renumbering to T-98/T-99 and regenerating derived Word/Excel exports. |
| Xiang Ying | *(no written note recorded)* |
| Aaron | *(no written note recorded)* |
| Le Xin | New requirements came up mid-sprint, so one story grew and had to be re-estimated. |
| Ji Ning | *(no written note recorded)* |
| Amareet | *(no written note recorded)* |

### 3. Follow-up of Sprint 3 Action Items

| Owner | Action | Due By | Status |
| --- | --- | --- | --- |
| Bryan (PO) | Check story dependencies at planning | Ongoing from Sprint 4 | Done |
| Bryan (PO) | Keep one shared list to reserve migration numbers and decision IDs (T-xx) before use | Ongoing from Sprint 4 | Done |
| All | Put the subtask key in branch names for partial PRs; move stories to Done by hand | Ongoing from Sprint 4 | Done |
| All | Take screenshots in every manual run from the start; answer every review comment before merging | Ongoing from Sprint 4 | Done |

### 4. Action Items for Sprint 5

| Owner | Action | Due By | Status |
| --- | --- | --- | --- |
| Developers | Every story named in a Sprint Goal has an owner and an estimate before the sprint starts | Sprint 5 planning | To Do |
| Bryan | Answer requirement questions within a day, with Developers raising them by 3 Nov | 3 Nov | To Do |
| Developers | Send Bryan each migration request as soon as its PR merges, so none are applied on the last day | Throughout Sprint 5 | To Do |
| Developers | Merge code by 4 Nov, leaving time for manual tests and acceptance | 4 Nov | To Do |
| Amareet | Use the product-story average (about 37–40) at Sprint 5 planning, and check these actions at the next standup | Sprint 5 planning | To Do |
