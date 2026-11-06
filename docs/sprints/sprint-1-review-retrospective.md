# Sprint 1 — Sprint Review & Retrospective

Sprint 1 | 14 – 19 September 2026 (Jira sprint 34)

## Part A — Sprint Review

### 1. Meeting Details

> **Evidence basis.** Dates and attendance are accurate; times and durations are approximate. The session was recorded (Sprint 4 links are in the submission `.docx`; other sprints [CONFIRM: Amareet]).

| Field | Details |
| --- | --- |
| Date | 20 September 2026 |
| Time / Duration | 10:30 am – 12:30 pm (2 hours) |
| Attendees | 5 / 6 members in live meeting. Product Owner: Bryan. Scrum Master & Frontend Developer: Amareet. Developers: Aaron, Le Xin, Xiang Ying. Note: Ji Ning submitted updates asynchronously. |
| Venue | Microsoft Teams (online); recording held, link [CONFIRM: Amareet] |
| Facilitator | Amareet (Scrum Master) |

### 2. Sprint Goal Recap

Establish secure, role-based access to ConnectSphere and allow Event Organisers
to submit event requests against a searchable venue catalogue, with all the key
actions captured in an audit log.

### 3. Increment Demo & Completed Stories

The following stories were demonstrated at the Sprint Review. Status reflects the
Jira-verified state at sprint close (project SCRUM, sprint 34).

| Story ID | Title | Jira Key | Points | Status at Close |
| --- | --- | --- | ---: | --- |
| E01-S01 | Log in to the system | SCRUM-16 | 3 | Done |
| E01-S02 | Restrict event visibility to my own client | SCRUM-17 | 5 | Done |
| E01-S03 | Hide internal planning information from Attendees | SCRUM-18 | 3 | Done |
| E01-S08 | Create an account | SCRUM-23 | 3 | Done |
| E01-S11 | Deactivate my account | SCRUM-25 | 3 | Done |
| E02-S03 | Match accessibility requirements to venue features | SCRUM-28 | 1 | Done |
| E05-S01 | Maintain the venue catalogue | SCRUM-40 | 3 | Done |
| E05-S02 | Match layout requirements to venue capacity | SCRUM-41 | 3 | Done |
| E01-S04 | Update my account details | SCRUM-19 | 1 | Done (merged) — evidence gap at close (see §4) |
| E02-S01 | Submit an event request | SCRUM-26 | 5 | Done (merged) — evidence gap at close (see §4) |
| E02-S02 | Save a draft event request | SCRUM-27 | 3 | Done (merged) — evidence gap at close (see §4) |
| E14-S02 | Record significant actions in an activity log | SCRUM-86 | 3 | Done (merged) — evidence gap at close (see §4) |

The eight stories without a gap note (24 points) form the evidence-backed
velocity. The four flagged stories were implemented and merged but retained
scope, review or integration-verification gaps, so they were carried into
Sprint 2 for closure rather than counted toward velocity.

### 4. Carryovers / Not Completed

At sprint close, the following items required follow-up action (evidence-gap
items carried into the Sprint 2 backlog for closure):

| Story ID | Jira Key | Gap / Reason | Action Owner |
| --- | --- | --- | --- |
| E01-S04 | SCRUM-19 | Organisation permission rule (rename/membership) not decided; profile editing works but org scope remained open | Ji Ning + team to clarify the organisation permission rule |
| E02-S01 | SCRUM-26 | Real database-backed persistence not verified end-to-end (live database, not mocked) | Aaron to provide real event-request persistence proof |
| E02-S02 | SCRUM-27 | Implementation merged but had not received a completed peer-review sign-off | Assign a reviewer to complete the draft review and record acceptance |
| E14-S02 | SCRUM-86 | Booking-decision audit logging (approvals, rejections, releases) not yet integrated | Le Xin + future E06 owner to complete the booking-decision audit integration |

### 5. Stakeholder Feedback

No external stakeholder feedback was received this sprint. The Product Owner
reviewed the increment and accepted it subject to the follow-up actions listed
above.

### 6. Product Backlog Updates

No backlog items were added, reprioritised, or removed as a result of this
review. The follow-up gaps on SCRUM-19, SCRUM-26, SCRUM-27 and SCRUM-86 were
noted for Sprint 2 closure.

### 7. Velocity & Story Points

Per the Week 3 lecture (slides 30–32, 51, 60): velocity counts only fully-Done
product-story points; work with an open evidence gap is reconsidered in the
backlog and does not count. Partial points are not counted.

| Metric | Result |
| --- | --- |
| Planned story points | 36 |
| Completed (evidence-backed, strict DoD) | 24 |
| Delivery rate | 66.7% (24 / 36) |
| Carryover points (evidence gaps) | 12 (SCRUM-19, SCRUM-26, SCRUM-27, SCRUM-86) |
| Velocity (Sprint 1) | 24 points (first-sprint baseline) |
| Jira board chart | 31 product-story points; the difference from 24 is the four evidence-gap stories. The board also counts 7 points of non-product technical-enabler stories (SCRUM-95–108, Bryan), which are not product velocity. |

### 8. Definition of Done (current version)

The Definition of Done in effect at the end of Sprint 1 (updated during this
sprint; `CONTRIBUTING.md`):

- Acceptance criteria as stated in the user story are satisfied.
- Automated tests pass, including unit, integration or end-to-end coverage where
  relevant.
- Manual verification passes where the story needs human UI or workflow checking.
- Code has been peer-reviewed by at least one other developer.
- Security, accessibility and UI criteria are satisfied where applicable.
- Documentation and architecture are updated where the change affects setup,
  interfaces, decisions, backlog interpretation or team workflow.
- The item is deployable and integrated into the increment through the reviewed
  pull-request process.
- Peer review was requested only after the PR was review-ready: no merge
  conflicts, up to date with main, and required checks passing or queued for the
  latest commit.

## Part B — Sprint Retrospective

Technique: each member reported what went well and what did not, and the team
agreed owned improvement actions (lecture slides 53–55).

### 1. What Went Well

| Member | Comments |
| --- | --- |
| Bryan | PRs were closed within 24 hours; manual review caught several bugs; CI green checks were a useful quality gate; PostPlan HTML gave a good visual summary of codebase/PR/commit; Markdown sources, TC_ID traceability and PostPlans made requirements and evidence easier to inspect; teammate reviews caught concrete defects (incl. the venue suitability filter running after the 100-result limit); final attribution recognised both feature authors and integration support. |
| Xiang Ying | Jira issues, PRs, testing evidence and decision records were progressively reconciled, making each other's work easier to understand; authentication issues were identified and resolved collaboratively; the PR review process improved traceability between stories, code, tests and docs. |
| Aaron | The team worked together efficiently with clear PR communication; always checked in before committing to one interpretation of ambiguous scope; waited on all CI checks during review, not just required ones; every PR had a PostPlan flagging structural issues and what remained pending. |
| Le Xin | Always checked existing team decisions and documents before implementing, not just the ticket text; cross-checking tickets against BDR and ADR kept implementation aligned; automated tests caught real failure scenarios and confirmed shared code was not broken. |
| Ji Ning | Reusing existing architecture, auth and password hashing kept account features consistent; clarifying business rules before implementation prevented wrong assumptions; recording team decisions gave a clear reference; tracking dependencies explicitly distinguished completed implementation from outstanding integration. |
| Amareet | The team gave quick, useful PR review comments that caught bugs early — worth continuing; AI-assisted code review helped catch bugs and gaps against acceptance criteria and should continue alongside human review. |

### 2. What Did Not Go Well

| Member | Comments |
| --- | --- |
| Bryan | Insufficient communication about friction points and AI findings — members worked in silos; members need to ensure AI agents parse others' code; more comments needed on Jira/PRs/commits; parallel authentication systems and duplicate API routes integrated poorly (mocked screens did not reveal live-flow failures); some merged changes lacked a valid recorded human approval (#79); some acceptance rules remained unclear (organisation editing, DB-backed submission verification, booking-decision audit logs); Jira updates lagged, and the sync script produced a false Done for the venue calendar. |
| Xiang Ying | Some requirements and access-control rules were unclear at the start, needing clarification during implementation; automated coverage was incomplete, with some scenarios dependent on CI or manual verification; a duplicated API route was undetected in review and only became visible after deployment; merge conflicts occurred on overlapping files. |
| Aaron | PR checklists were left unchecked before review even when items were already true (only caught in a retroactive audit); code was written before pulling from main on the first story, causing a merge conflict. |
| Le Xin | Two of five acceptance-criteria scenarios for one story could not be completed this sprint because dependent features did not exist yet; a bug slipped past initial review and surfaced after merge, needing a follow-up fix. |
| Ji Ning | Some stories lacked implementation-ready rules (deactivation needed clarification of blocking statuses and timing); older documentation conflicted with newer decisions, needing reconciliation; organisation editing was in the backlog without defined permissions, so it was deferred; mocked browser tests verified UI but could not establish the complete frontend-to-database flow; Jira progress needed a separate manual update after merge. |
| Amareet | Not enough visibility into what others were working on day-to-day; some backend/frontend gaps were not discovered until late because updates were not shared frequently enough. |

### 3. Action Items for Sprint 2

| Owner | Action | Due By | Status |
| --- | --- | --- | --- |
| Whole Team | Post quick async updates in the group chat when something important is found or decided (bugs, blockers, decisions) | Ongoing from Sprint 2 | To Do |
| Whole Team | Sync with the latest main before starting any new user story to avoid late merge conflicts | Ongoing from Sprint 2 | To Do |
| Whole Team | Verify PR checklist items are actually true before submitting, not checked as a formality | Ongoing from Sprint 2 | To Do |
| Whole Team | If any portion touches mock data, generate and add real data into Supabase; share in the group chat first (e.g. real users with credentials) to support E02-S01 real-database verification | Ongoing from Sprint 2 | To Do |
| Xiang Ying, Le Xin | Add documentation on why Docker is specifically used | Ongoing from Sprint 2 | To Do |
