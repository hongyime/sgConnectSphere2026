# Sprint 3 — Sprint Review & Retrospective

Sprint 3 | 4 – 17 October 2026 (Jira sprint 36)

## Part A — Sprint Review

### 1. Meeting Details

| Field | Details |
| --- | --- |
| Date | 18 October 2026 |
| Time / Duration | 8:30 pm – 9:10 pm (40 minutes) |
| Attendees | 6 / 6 members. Product Owner: Bryan. Scrum Master & Developer: Amareet. Developers: Ji Ning, Aaron, Le Xin, Xiang Ying. |
| Venue | Microsoft Teams (online); session recorded |
| Facilitator | Amareet (Scrum Master) |

### 2. Sprint Goal Recap

Coordinators arrange an event's venue booking, equipment and technical staff and
submit it for confirmation, while finishing the notifications and activity log
carried over from Sprint 2.

### 3. Increment Demo & Completed Stories

Status reflects the Jira-verified state **at the 17 October sprint close**
(project SCRUM, sprint 36). Several booking stories were demonstrated as built
and tested but were not yet Done at close because of an unmerged dependency
(see §4); they are listed as carryovers there, not here.

| Story ID | Title | Jira Key | Points | Status at Close |
| --- | --- | --- | ---: | --- |
| E05-S05 | Apply setup and turnaround time | SCRUM-44 | 5 | **Carryover** — see §4 |
| E07-S01 | Maintain the equipment catalogue | SCRUM-51 | 3 | Done |
| E07-S02 | Request equipment for an event | SCRUM-52 | 3 | Done |
| E07-S03 | Check equipment availability | SCRUM-53 | 5 | Done |
| E07-S04 | Reserve equipment for an event | SCRUM-54 | 5 | Done |
| E07-S05 | Mark equipment as unavailable | SCRUM-55 | 1 | Done |
| E07-S06 | Request technical support for an event | SCRUM-56 | 1 | Done |
| E07-S07 | Assign and manage technical staff for an event | SCRUM-57 | 3 | Done |
| E06-S05 | Hold a venue tentatively | SCRUM-49 | 5 | Done |
| E08-S03 | Confirm an event | SCRUM-60 | 5 | Done |
| E14-S02 | Record significant actions in an activity log | SCRUM-86 | 3 | Done |
| E03-S11 | Let the Organiser edit registration setup and fix the date layout | SCRUM-176 | — | Done (added mid-sprint, unestimated) |
| E03-S12 | Show consistent Organiser save success status | SCRUM-196 | — | Done (added mid-sprint, unestimated) |
| E14-S03 | Read edited Activity log dates and times in Singapore time | SCRUM-197 | — | Done (added mid-sprint, unestimated) |

Done at close: 9 estimated product stories (E07-S01 to S07, E06-S05, E08-S03,
E14-S02) plus the three unestimated mid-sprint stories. E14-S02 (the Sprint 2
carryover) was completed this sprint.

### 4. Not Completed / Carried Over

All six were built and largely tested, but were blocked on a chain of unmerged
dependencies at close (E10-S04 cancellation → E06-S04's TC_07 → E06-S04 merge →
E06-S06, E06-S02, E06-S03 integration). They reached Done in Sprint 4.

| Story ID | Jira Key | Points | Reason for Not Completing | Action |
| --- | --- | ---: | --- | --- |
| E05-S05 | SCRUM-44 | 5 | Backend buffers merged (#261); venue form still in open PR #305; manual run for TC_E05S05_01–07 not done as no tester was named. (Reached Done 22 October.) | Carry over to Sprint 4; Aaron owns: finish #305, name a tester, run and record the manual tests |
| E06-S04 | SCRUM-48 | 3 | TC_01–06 passed in the 16 Oct manual run, PR #298 reviewed and green, but TC_07 (a released booking is logged) needs E10-S04 cancellation, not built. PO decided on 17 Oct that TC_07 stays in E06-S04, so it cannot meet DoD this sprint. (Reached Done 29 October.) | Carry over to Sprint 4; keep #298 on hold until E10-S04, then run TC_07 and merge |
| E06-S06 | SCRUM-50 | 5 | Builds on E06-S04's approval code (#298), which cannot merge until E10-S04 is done; paused 17 Oct. (Reached Done 1 November.) | Carry over to Sprint 4 after E06-S04; PO already agreed to rewrite TC_01/02/03/05 to match current clash-blocking (first-come-first-served, C-46) |
| E06-S02 | SCRUM-46 | 3 | Implementation and manual evidence complete (PR #300 merged), but integration depends on E06-S04 (#298) which is on hold. (Reached Done 29 October.) | Carry over to Sprint 4; after #298 merges, verify integrated behaviour before closing |
| E06-S03 | SCRUM-47 | 3 | Submission, withdrawal, replacement and primary-venue selection implemented and tested; follow-up PR #299 subject to migration-release verification and integration with #298. (Reached Done 29 October.) | Carry over to Sprint 4; complete migration verification, resolve review items and merge #299 |
| E11-S01 | SCRUM-75 | 13 | Inbox and shared notification infrastructure implemented; equipment/staff routing and UI fixes in draft PR #313; actual email receipt, production staff assignments and integrations with unfinished workflows remain. | Carry over to Sprint 4; complete CI and review for #313, coordinate production staff assignments and email-delivery verification |

### 5. Stakeholder Feedback

No external stakeholder feedback was received this sprint. The Product Owner
reviewed the increment and accepted the completed stories subject to the
carryover actions above.

### 6. Product Backlog Updates

The Week 9 client answers drove several backlog changes, recorded and traced
into the backlog, test cases, design and Jira:

| Change | Item | Reason |
| --- | --- | --- |
| Restored Sessions under Events; linked venue bookings and equipment requests to Sessions | E04-S02 restored to Release 1 (existing 5-point estimate) | The Week 9 answer reversed the earlier decision to model a multi-session event as separate events |
| Added Session-linked equipment behaviour | E07-S08 added, unestimated, no sprint assignment | The new behaviour needs its own planned story |
| Added a date-horizon rule (no fixed minimum lead time; reject dates more than two years ahead) | E02-S07 added, unestimated, no sprint assignment | New work that needs planning |
| Updated eligible future stories and acceptance cases (Session registration, per-Session/event capacity, multi-role accounts, venue blocks and buffers, holds, Safety Review, assignment, change-request lifecycle) | Release 1 backlog and canonical test catalogue | Reflects accepted Week 9 answers and recorded team decisions |
| Kept Sprint 3 acceptance criteria unchanged while active | Active Sprint 3 stories incl. SCRUM-50 and SCRUM-60 | T-73: preserve planned scope through Sprint 3; Week 9 behaviour is follow-up work |

### 7. Velocity & Story Points

Per the Week 3 lecture (slides 30–32, 51, 60): velocity counts only fully-Done
product-story points at close; work not Done is reconsidered in the backlog and
does not count. Partial points are not counted.

| Metric | Result |
| --- | --- |
| Committed product-story points | 66 (includes the Sprint 2 carryovers E11-S01 at 13 and E14-S02 at 3) |
| Completed (product stories, Done at close) | 34 points across 9 estimated stories |
| Carryover | 32 points: E05-S05 (5), E06-S02 (3), E06-S03 (3), E06-S04 (3), E06-S06 (5), E11-S01 (13) |
| Velocity (Sprint 3) | 34 product-story points |
| Mid-sprint unestimated stories Done | E03-S11, E03-S12, E14-S03 (0 points; not counted) |
| Jira board chart (all issue types) | 66 total / 53 Done on the live board, but the 53 includes five carryover stories completed in Sprint 4 (E05-S05, E06-S02, E06-S03, E06-S04, E06-S06) and unpointed enabler/mid-sprint tasks. The status history confirms those five reached Done on 22 Oct – 1 Nov, after the 17 Oct close. |

Reconciliation (verified against the Jira status history, close date 17 October):

- The review-draft carryover list (SCRUM-44, 46, 47, 48, 50, 75) is correct:
  every one of those stories reached Done **after** the 17 October close
  (22 Oct – 1 Nov), so all six are Sprint 3 carryovers worth 32 points.
- The Product Owner's comment to add **E05-S05 / SCRUM-44** to the carryover list
  is confirmed — it reached Done on 22 October.
- Done-at-close velocity is **34 points** (66 committed − 32 carried), matching
  the product-story title audit. The PO's "34 of 58 Done / 24 carried" figures
  predate E11-S01's re-estimation from 5 to 13 points; using the current
  13-point estimate gives 66 committed and 32 carried.

### 8. Definition of Done (current version)

The Definition of Done in effect at the end of Sprint 3 (`CONTRIBUTING.md`):

- Acceptance criteria as stated in the user story are satisfied.
- Automated tests pass (unit, integration, or end-to-end where relevant); 100%
  unit coverage of changed code, or a stated reason.
- Manual verification passes where the story needs human UI or workflow checking,
  recorded with hand-taken screenshots per test case (T-93).
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
| Bryan | Recorded the Week 9 client answers separately from team decisions, so it is clear which rules came from the client and which were team choices. Traced the accepted changes into the backlog, test cases, design, technical docs and Jira, giving a shared reference for follow-up. Preserved completed-story history and kept Week 9 changes from silently altering active Sprint 3 commitments. Identified unresolved assumptions (O-50, O-51) instead of presenting them as settled requirements. |
| Xiang Ying | Teammates identified missing screenshots, unclear results and documentation issues before merging. Shared guidance on running frontend/backend, resolving conflicts and preparing manual evidence. Discussions clarified how bookings, equipment availability, notifications and status changes connect. Learnt to distinguish automated from manual checks, record the version tested and report limitations honestly. Reviewing and documenting made the team more familiar with the whole application. |
| Aaron | Each story was planned before coding (task list with acceptance criteria, "done when" checks and open decisions, then Jira subtasks). Reused existing code (shared free-stock calculation and locking order; existing API routes to stay under the Vercel function limit). Thorough testing with every run recorded: 100% unit coverage of new code, real-database tests, Playwright, a scripted local run and a manual click-through, plus deliberate mutation checks. Click-throughs found real issues (date-field misalignment, clipped tables) before users did. Took an active part in reviews and fixed teammates' merge conflicts. Responded to the T-93 decision by re-running manual tests with screenshots. The merge queue and auto-merge worked well. |
| Le Xin | Hand-taken screenshots made manual test evidence clear and checkable. Checking results against the real database gave stronger proof than screen-only checks. Asking the PO short, clear questions got quick decisions. Writing decisions down immediately meant carryovers were easy to explain. Thorough peer reviews caught real issues before merge. Recording every test run gave a clear history of what was tested, by whom and when. |
| Ji Ning | Real-database tests verified concurrency, rollback and notification delivery beyond mocked tests. Manual testing with screenshots caught issues automated tests missed (stale notification badge, misleading messages, off-screen confirmations). PR reviews caught issues before merge, clarified ownership and improved migration-release sequencing. |
| Amareet | Confirming open questions with the PO before building meant almost no rework. Putting a database migration in its own PR before the code kept production safe. Peer review on every PR caught real bugs. Logging manual runs with a screenshot per test case made Done easy to prove. One Jira subtask per story, linked from the branch name, made progress easy to track. |

### 2. What Did Not Go Well

| Member | Comments |
| --- | --- |
| Bryan | Week 9 answers affected many parts at once (stories, tests, data model, APIs, design, implementation); docs were updated but application and Figma work still need follow-up. Some answers conflicted (C-111 vs C-119 on venue blocks; recorded as T-80). Two design assumptions (O-50, O-51) remain open. The changes arrived after planning, so the team kept active criteria stable (T-73) and treated Week 9 behaviour as follow-up work. |
| Xiang Ying | Some screenshots were taken on older branches or missed details, causing repeated checks. Documentation formatting needed corrections before approval. Dependencies on unmerged features and shared-code changes delayed integration. Merge-conflict resolution re-ran checks and sometimes renewed approvals. Some steps asked Coordinators to access Technical-Support-only pages, needing reviewer clarification. Missing evidence and coverage explanations surfaced near the deadline. |
| Aaron | Migration numbers and decision IDs clashed between open PRs (two PRs each added a T-93 with no git conflict). Constant merge conflicts on shared generated files (package.json test list, tc-coverage, test-case workbook) — merged main into #249 four times. Approvals were lost to pushes, forcing re-reviews. First manual runs had no screenshots, so all three were repeated after T-93. Jira hygiene slipped (branch keys closing stories early; accidentally moving SCRUM-54's subtasks back). Production DB migrations applied by hand with some unrecorded. Review comments not always followed up; review bots stopped (Copilot quota, Strix trial ended). A shared-layout issue surfaced late in a click-through (recorded as a known limit). |
| Le Xin | Dependencies between stories were not checked at planning; some needed work from other stories or the next sprint and were only found late. Test cases fell out of date when the system changed mid-sprint, needing late PO decisions. New stories were added very late, making the last day rushed. Merge conflicts in shared generated files reset approvals, forcing several review rounds. Flaky CI timing failures caused extra fix-and-wait rounds. Local manual-test database setup was inconsistent. |
| Ji Ning | E06-S02/S03 completion depended on E06-S04 (#298), whose cancellation test needed another unfinished story. Frequent main changes caused repeated conflicts in shared generated files, needing regeneration and re-verification, with new commits dismissing approvals. Some tests passed individually but failed under concurrent load; recurring Windows tooling failures made readiness harder to assess. Delayed PR-owner responses prolonged review cycles. E11-S01 had several owners and deployment dependencies, so finishing the hooks alone could not complete it. |
| Amareet | Merge conflicts on the generated tc-coverage file on every merge into main, forcing re-merge and regeneration. Approvals lost on every update. Parallel PRs claiming the same migration/decision numbers. Windows-only tooling failures (local typecheck and one check.py test fail on a clean main). Flaky tests (e.g. TC_E03S12_01) failed CI at random. Gaps found late (the hold-expiry job was added after the story was built). Jira auto-closing a story on merge nearly closed SCRUM-48 early. |

### 3. Follow-up of Sprint 2 Action Items

| Owner | Action | Due By | Status |
| --- | --- | --- | --- |
| Whole Team | Manual testing must be recorded (steps, expected/actual result, tester, date) before a story is marked Done | Ongoing from Sprint 3 | Done (formalised as T-93) |
| Story owners with cross-cutting work (notifications, activity log) | Confirm dependency readiness with the owning dev before starting integration, not mid-sprint | Ongoing from Sprint 3 | Done |

### 4. Action Items for Sprint 4

| Owner | Action | Due By | Status |
| --- | --- | --- | --- |
| Bryan (PO) | Check story dependencies at planning | Ongoing from Sprint 4 | To Do |
| Bryan (PO) | Keep one shared list to reserve migration numbers and decision IDs (T-xx) before use | Ongoing from Sprint 4 | To Do |
| All | Put the subtask key in branch names for partial PRs; move stories to Done by hand (do not let branch keys auto-close them) | Ongoing from Sprint 4 | To Do |
| All | Take screenshots in every manual run from the start; answer every review comment before merging | Ongoing from Sprint 4 | To Do |
