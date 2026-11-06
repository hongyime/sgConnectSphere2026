# Week 11 presentation: answers for the slide deck

Answers for every question in `Week 11 Presentation.pptx` (17 slides). The team
copies these into Canva by hand. Slide order, slide count and every question are
kept exactly as the template gives them (ground rule on slide 3).

How to read this file:

- **Question** is copied word for word from the template.
- **SLIDE CONTENT** is the short text that goes on the slide.
- **SPEAKER NOTES** are written to be spoken. The team picks the presenter for
  each slide; fill in the `Presenter:` line.
- **SUGGESTED VISUAL** names a diagram, chart or screenshot and its file path.
- **Evidence** is for Q&A: where a marker can check the claim.
- `[REFRESH: source]` marks a number that may change before we present. Re-read
  it from the named source on the day.
- `[CONFIRM]` marks something the repository cannot prove on its own. A named
  person has to confirm it or it comes off the slide.

Latest audit: `origin/main` `a8f2d879` after #450 and #451 merged on
6 November. Lead implementation is now on main; Jira acceptance/status and
manual verification remain separate. Jira was re-read: Release 1 still has
65 stories, 60 Done (227 recorded points) and 5 To Do. Post-merge main Application Checks run 42233620112 passed on
`a8f2d879`; its logs were inspected after completion. Recheck later changes
before presenting. All live figures below are dated snapshots, not a frozen final grade.

Sprint 4 recordings are used on the user's report of a teaching-assistant
clarification; retain that confirmation [CONFIRM: slide 2 recording choice].
Sprint 5 (1 to 5 November) was a short close-out sprint.

How this file was made (task steps 1 to 3):

- Questions were extracted with python-pptx from `Week 11 Presentation.pptx`
  and checked against the untouched instructor template (commit `56672fa3`,
  `Week 11 Slide Template.pptx`). The template has no speaker notes, so all
  speaker notes here are new. The pptx itself is not edited.
- The only earlier answers were typed into the pptx on 29 to 30 October. They
  were the starting point and are corrected here. The source and submission copies are synchronized; no superseded answer
  file was deleted.
- `reports/` (named in the task) does not exist on `main`; test numbers come
  from `docs/testing/` and GitHub Actions logs instead.
- Numbers in the speaker notes repeat the numbers on the slide. When a
  `[REFRESH]` number changes, change it in the notes too.

## Timing plan (20 minutes)

| Slides | Topic | Time |
| --- | --- | --- |
| 1 to 3 | Title, index, ground rules | 1 min |
| 4 to 5 | Week 7 customer changes | 3 min |
| 6 to 8 | CFO update, AI usage, controlling AI | 4 min |
| 9 | Git strategy | 1.5 min |
| 10 to 11 | Testing strategy | 3 min |
| 12 to 14 | CI pipeline | 4 min |
| 15 | Team contribution | 1.5 min |
| 16 to 17 | Anything else, end | 1.5 min |
| | Buffer for slide changes | 0.5 min |

The speaker notes total about 2,200 words, roughly 15 minutes at a normal
speaking pace. That leaves about 5 minutes for switching speakers, pointing at
visuals and slowing down on the tables.

---

## Slide 1: ConnectSphere IS212 Project Presentation

**Question:** None (title slide).

**SLIDE CONTENT:**

- ConnectSphere: Event Planning and Venue Booking System
- IS212 Software Project Management, AY2026/27, Team 8
- Bryan (Product Owner), Amareet (Scrum Master), Aaron, Xiangying, Lexin, Jining (Developers)

**SPEAKER NOTES** (Presenter: ________, about 20 seconds):
"Hi, we're Team 8. Our project is ConnectSphere, an event planning and venue
booking system for the client in the Week 1 briefing. Bryan was our Product
Owner and Amareet our Scrum Master, and all six of us wrote code. We'll go
through the template in order and show you where each claim lives in the repo."

**SUGGESTED VISUAL:** Screenshot of the live site landing page,
https://sgconnectsphere.vercel.app (take a fresh screenshot on the day).

---

## Slide 2: Index

**Question:** This page acts as a "content page" for your project.

**SLIDE CONTENT (table: Item | URL, location or file/folder name in zip file).**
The template table has 8 rows: the first 4 item names are fixed, the last 4
are ours to fill. Keep it to 8 rows.

| Item | URL, location or file/folder name in zip file |
| --- | --- |
| Product backlog | Zip: `1. PRODUCT BACKLOG/`: `ConnectSphere Release 1 Product Backlog.xlsx` (PR #442). Repo: `docs/backlog/release-1/` (one file per epic) |
| Git URL (e.g. GitHub)(remember to add your two instructors to the repository; see instructions) | https://github.com/hongyime/sgConnectSphere2026 (branch `main`). Zip: `6. CODE REPOSITORY/`. Both instructors added (confirmed 6 Nov). |
| Exports of project management tools (e.g. Google Sheets, Jira, Notion docs, …) | Jira export: `1. PRODUCT BACKLOG/Jira-backlog-final-20261106.csv` (259 issues, 6 Nov; packaging PR #451 merged at `c00b9cb4`). Board: https://theprawnworkspace.atlassian.net/jira/software/projects/SCRUM/boards/1 |
| Video recording URLs of sprint 4 scrum ceremonies | Sprint Planning: https://drive.google.com/file/d/1KpmvbnEnyXBcUu3NpOHAAw-THKKRz66F/view?usp=sharing. Daily stand-up: https://drive.google.com/file/d/16CDoyd2Ix-ALtighIaiXpY3E7zcN6zZw/view?usp=sharing. Sprint Review and Retrospective (one recording): https://drive.google.com/file/d/1HkO0yxH7kBRUQqzXZkco-GNWNgbsbIwo/view?usp=sharing |
| Sprint meeting records (all sprints) | Zip: `2. SPRINT MEETINGS/`: 12 Word files, planning, stand-ups and review + retrospective for Sprints 1 to 4. Repo: the same records as Markdown in `docs/sprints/` (PR #440); all 12 Word files are now on `main` under `submission/2. SPRINT MEETINGS/` (PR #449) |
| System designs (C4, class, sequence, database) | Zip: `3. SYSTEM DESIGNS/` (SVG, PNG and PDF renders, plus the combined "System Design - ConnectSphere Release 1.pdf"). Repo: `docs/design/` (13 diagrams: C4 context, containers and components; user journey; event state machine; two data flow diagrams; three ERDs; UML class view; two sequence diagrams; index in `docs/design/README.md`, PR #437), plus `docs/class-diagram.md`, `docs/db_schema.md`, `docs/architecture.md` |
| Test cases and test run records | Zip: `4. TEST CASES/`: `ConnectSphere Release 1 Test Cases.xlsx`, Playwright HTML reports, screenshots and the Stryker mutation report (PR #447). Repo: `docs/testing/cases/` (394 IDs: 391 story cases and 3 performance cases), `docs/testing/runs/` (967 execution records on `main` `a8f2d879`) [REFRESH: docs/testing after later merges] |
| Slide deck, README, decisions | Zip: `5. SLIDE DECK/`, `7. README/`. Repo: `docs/bdr/` (customer clarifications and team decisions) |

**SPEAKER NOTES** (Presenter: ________, about 25 seconds):
"This is our index. Every row points to a folder in the zip and, where it
helps, to the same thing in the repo. The three ceremony videos are Sprint 4,
our last full sprint: planning, one daily stand-up, and the review and
retrospective, which we recorded back to back in one video. Jira is linked too,
and the dated CSV export is in folder 1. The recording links require Google
sign-in; instructor access still needs checking."

**SUGGESTED VISUAL:** None. The table fills the slide.

**Evidence:** Week 4 Project Instructions (`docs/bdr/customer-sources/Week 4 Project Instructions.docx`,
Documents and Videos table) asks for final-sprint recordings of planning,
review, retro and one daily stand-up, as unlisted links.

**Recording access (reported by the user, 6 Nov):** All three Sprint 4 links
require Google sign-in when opened in an incognito window. The available
sharing settings do not offer access without signing in; this is the widest
access available to the team. This records the reported check, not an access
check performed by this agent. Instructor access after sign-in is still
unverified and should be checked before submission.

---

## Slide 3: Ground Rules

**Question:** None. The slide lists the template's rules; nothing to answer.

**SLIDE CONTENT:** Keep the template text unchanged.

**SPEAKER NOTES:** Skip it, or say one line (Presenter: ________, about 10 seconds):
"We kept every slide and question. Where something didn't apply we've said so,
and where we fell short we've said that too."

**SUGGESTED VISUAL:** None.

---

## Slide 4: Handling the Customer Change (i)

**Question 1:** Which of the changes in Week 7 had the most impact and why?

**SLIDE CONTENT:**

- **Our assessment: Change 6, Operational Safety Check (Safety Officer)**
- New role (7 roles now, T-72) and a new event status, Safety Review, between Planning and Confirmed (T-71, migration `0017`)
- Rewrote the Confirm story (E08-S03) before it was built: complete arrangements now send the event to Safety Review, and only the Safety Officer's approval sets Confirmed (T-71, T-107). Added the Safety Officer review (E08-S06, 8 points) and a "send back to planning" path (E08-S04)
- The only change that added a status to the event lifecycle, so every status rule, screen and notification around Confirm had to be rechecked
- Week 9 answers changed it again: rejection returns the event to planning (C-133), and the review should start automatically (C-132, T-82)
- Revert to planning (E08-S04) Done on 6 Nov in Sprint 5 [REFRESH: Jira SCRUM-61]. Not finished: a first-time event is still submitted by the Coordinator rather than entering review on its own (known gap: T-82 on 13 Oct says the Coordinator does not submit, but E08-S03 was built on 17 Oct, #283, to its written criteria, which still say "When I submit"; eligible re-entry is automatic (#392, #395); a Safety Officer send-back still needs Coordinator resubmission (D118))

**Question 2:** Describe how you handled these changes, and which components of your project were affected and how.

**SLIDE CONTENT:**

- Process (Week 7 "Managing Changes" guide): each change got a customer clarification row (C-65 to C-70) and a team decision (T-66 to T-74)
- Done stories stayed Done; new behaviour became new stories with their own points (T-74, guide Scenario 2)
- Backlog, acceptance criteria, test cases and C4 diagrams were all updated in one PR (#205)
- Backend: `backend/src/modules/eventReadiness/` (`safetyCheck.ts`, `submission.ts`, `autoSafetyReview.ts`), role list in `backend/src/modules/shared/roles.ts`, migration `0017` adds the status
- Frontend: Safety Officer queue `SafetyQueue` in `frontend/src/features/roleQueues/RoleQueues.tsx`; review and decision screen in `frontend/src/features/roleQueues/SafetyReview.tsx`
- Tests: `safetyReview.integration.test.ts` on real PostgreSQL in CI

**SPEAKER NOTES** (Presenter: ________, about 1.5 minutes):
"Week 7 gave us six changes, and the Safety Officer check hit us hardest. It
wasn't only a new screen. It added a seventh role and a new status in the
middle of our event lifecycle, between Planning and Confirmed. The Confirm
story wasn't built yet, so we rewrote it first: an event now goes through a
safety check before it can be confirmed. And the Safety Officer
can send an event back to planning, which means venue and equipment
arrangements may need another look. Then the Week 9 answers moved it again,
for example the review should start automatically. We haven't finished all of
it: the 'revert to planning' story only closed in Sprint 5, and a first-time
event still needs the Coordinator to submit it. Automatic re-entry is limited
to eligible interruptions; a Safety Officer send-back waits for resubmission.

For all six changes we followed the Week 7 guide. Each change became a
customer clarification row and a team decision. A Done story stayed Done, and
the new behaviour went into a new story with its own estimate, so our velocity
history stayed honest. We updated the backlog, the test cases and the C4
diagrams together in one PR, number 205."

**SUGGESTED VISUAL:** The event lifecycle state machine with the Safety Review
status, `docs/design/05-event-state.md` (a render is in `3. SYSTEM DESIGNS/`). Or a
Safety Officer screen from a manual run:
`docs/testing/runs/evidence/20261103-173700-Bl0oper-frontend-e2e/TC_E08S06_03-requested.png`.

**Evidence:** `docs/bdr/customer-sources/Week 7 Customer Changes.pdf` p. 2
item 6; `docs/bdr/customer-sources/G1G2 Week9 Clarification.xlsx` (safety
rows, O-39, O-40); `docs/bdr/A-customer-clarifications.md` C-70, C-132;
`docs/bdr/B-team-decisions.md` T-71, T-72, T-74, T-82; Jira SCRUM-158 (Done),
SCRUM-61 (Done 6 Nov); `docs/db_schema.md` (migration 0017); header comment
of `backend/src/modules/eventReadiness/autoSafetyReview.ts`.

---

## Slide 5: Handling the Customer Change (ii)

**Question 1:** Which of the changes in Week 7 had the least impact and why?

**SLIDE CONTENT:**

- **Our assessment: Change 3, Multiple Venues for One Event**
- Each booking row already belonged to one event, and conflicts were already checked per venue
- So the change mostly removed a rule: "one pending venue request per event" (T-20 retired, T-68)
- Migration `0019` only added columns (purpose, headcount, primary venue); old bookings stayed valid
- No new story and no new points: E06-S03 wasn't Done yet, so it was updated in place (T-74). Every other change needed at least one new story

**Question 2:** Describe how you handled these changes, and which components of your project were affected and how.

**SLIDE CONTENT:**

- Backlog: E06-S03 amended (it was not Done yet), rule B for two claims on one slot (T-100, E06-S06)
- Backend: `backend/src/modules/venueBooking/bookingSubmission.ts` creates a second booking as Pending next to the first; row locks (`FOR UPDATE`) stop two claims on the same slot both winning
- Frontend: `frontend/src/features/venue/VenueBookingForm.tsx` takes a purpose and headcount for each venue request on the same event
- Tests: `TC_E06S03_*` cases on real PostgreSQL (`test:venue-booking-requests:db`, 107 tests in CI) [REFRESH: CI]

**SPEAKER NOTES** (Presenter: ________, about 1.5 minutes):
"The change with the least impact was letting one event use several venues.
That sounds big, but our data model already linked each booking to one event,
and we already checked conflicts venue by venue. What blocked it was a
rule we had made ourselves: only one pending venue request per event. So most
of the work was retiring that rule and adding a few optional columns, like
purpose, headcount and which venue is the primary one. Old bookings stayed
valid, and the booking states didn't change.

The part that needed care was when two requests claim the same slot. Our
Product Owner decided on rule B: the first accepted claim wins. We enforce it
with a database row lock, so two people submitting at the same moment can't
both succeed. That's covered by the real-database booking suite, which runs in
CI on every PR."

**SUGGESTED VISUAL:** Hand-taken screenshot of a Coordinator switching the
primary venue on an event with two bookings:
`docs/testing/runs/evidence/20261024-212800-jininggg-frontend-e2e/TC_E06S03_07_coordinator-primary-switched.png`.

**Evidence:** Week 7 Customer Changes p. 1 item 3; Week 9 Clarification
(multiple-venue rows: each venue checked and approved on its own); C-67;
T-20 (retired), T-68, T-74, T-100; Jira SCRUM-47 (E06-S03, Done 29 Oct, after
Week 7); `docs/plans/venue-claim-rule-b-20261022.md`; PRs #339, #378, #385.

**Known shortcoming to say if asked** (all six changes, honest status):

| Week 7 change | Story | Status |
| --- | --- | --- |
| 1 Setup and turnaround time | E05-S05 | Done |
| 2 Venue unavailable after booking | E05-S06, lost-venue recovery #355 | Done |
| 3 Multiple venues | E06-S03, E06-S06 | Done |
| 4 Tentative holds expire | E06-S05 | Done with a fixed 48-hour expiry; Week 9 asks for staff-set expiry and warnings (T-84), not built yet. Follow-up story E06-S07 (SCRUM-260) added on 6 Nov (To Do) |
| 5 Event Coordinator Lead | E01-S13; E03-S08 to S10; SCRUM-261 | Implementation merged in #450 (`a8f2d879`): submitted events remain unassigned; Leads assign/reassign and see oversight. Focused real-DB/API regressions are recorded. Jira SCRUM-256 to 258 and SCRUM-261 remain To Do; manual acceptance and PO reconciliation are not inferred from merge [CONFIRM: slide 5 acceptance]. |
| 6 Safety Officer | E08-S03, E08-S06, E08-S04 | Review, decisions and revert to planning Done; first entry into review not yet automatic (C-132, T-82), disclosed as a known gap with no follow-up story |

Note for the team (not on the slide): #450 merged at 22:24 SGT on 6 Nov.
Remove the old "no open PR" and "not on main" claims. Describe the code as
merged, while retaining the missing acceptance/status reconciliation. The
historical 17-point gap is now 14 Lead points with merged implementation and
3 reuse points still absent. Do not mark the original or follow-up stories
accepted solely because this recovery merged.

---

## Slide 6: CFO Update

**Question:** Provide THREE concrete examples from your project where you added value on top of what AI did:

Source: "IS212 (AY 2026/27 T1) Week 10 CFO Update: Demonstrating Value Beyond
AI-Generated Code" (eLearn). The CFO asks: "If AI can generate so much of the
code, what value are our software development teams adding beyond simply
asking AI to build the system?", and wants each team to "explain and
demonstrate how the team has added value on top of what could reasonably be
produced by AI-assisted coding tools alone". The three examples below answer
that: judgement on what the customer meant (1), checking the evidence (2), and
design that holds under real timing (3).

**SLIDE CONTENT (table: Example | What AI Could / Did Do | What Your Team Added | Why Did This Add Value? | Evidence):**

| Example | What AI Could / Did Do | What Your Team Added | Why Did This Add Value? | Evidence |
| --- | --- | --- | --- | --- |
| 1. Reading the Week 7 changes | AI could apply a change by editing the acceptance criteria of a story that was already Done, which is the quickest way to make the backlog "match" | We decided a Done story stays Done and new behaviour becomes a new story with its own points, following the Week 7 guide (T-74) | Sprint velocity still shows what was finished in each sprint, and old acceptance evidence still matches the story it tested | `docs/bdr/B-team-decisions.md` T-74; E03-S01 kept Done, E03-S08 added |
| 2. Manual test evidence | Agent browser runs produced screenshots that were first offered as manual evidence | Decision T-93: a manual run counts only with screenshots a person took by hand, logged in a run record | Hand-run sessions found real bugs that the automated runs missed, e.g. header clipping and the unread count (#309) | 122 manual-labeled session records; 249 unique case IDs have PASS/FAIL hand-run records (recorded evidence, not proof of complete human review) [REFRESH: docs/testing/runs] |
| 3. Two organisers booking the same slot | AI could write a booking route that saves whatever arrives, so two overlapping claims both succeed | Rule B (T-100): first accepted claim wins, enforced with PostgreSQL row locks (`FOR UPDATE`) | A double booking can't happen even when two people press submit together | PRs #339, #340, #378, #385; `backend/src/modules/venueBooking/`; T-100 |

**SPEAKER NOTES** (Presenter: ________, about 1.5 minutes):
"The CFO asked: if AI can generate so much of the code, what value are we
adding beyond asking AI to build the system? Here are three places where
the answer is in the repo. First, when the Week 7 changes came in, the quick
fix would have been to edit stories we had already finished. We decided
against it. Done stays Done, and new behaviour gets a new story and a new
estimate, the way the Week 7 guide says. Our velocity numbers mean something
because of that.

Second, evidence. Early on, an agent took screenshots in the browser and they
were offered as manual testing. We decided that doesn't count. A manual run
needs a person clicking through and taking the screenshots. Those runs found
real bugs, like the header clipping in PR 309.

Third, concurrency. A booking endpoint without concurrency protection can accept two
overlapping requests. We chose the rule, first accepted claim wins, and put a
row lock in the database so it holds under real timing."

**SUGGESTED VISUAL:** A hand-taken screenshot from the manual run that noted
the clipped header (the #309 follow-up):
`docs/testing/runs/evidence/20261021-180929-Bl0oper-frontend-e2e/TC_E05S05_07-1.png`,
with its run record `docs/testing/runs/20261021-180929-Bl0oper-frontend-e2e.md`
("Seen outside this story").

---

## Slide 7: AI Usage

**Question 1:** Did using AI cause any rework? If so, what happened?

**SLIDE CONTENT:**

- Yes, two cases we recorded:
- Agent screenshots offered as manual evidence; redone by hand after T-93 (15 Oct)
- Agent test setup in SCRUM-51's manual run inserted an extra Session, so the first request failed; removed and rerun (`docs/plans/scrum-51-equipment-catalogue.md`)

**Question 2:** Which part of the final system contains the clearest evidence that your team contributed more than simply prompting an AI tool? Why?

**SLIDE CONTENT:**

- Venue booking: the booking states and rule B (T-100)
- Our call on what the customer meant, enforced with row locks so two claims on one slot can't both win
- Covered by 107 real-PostgreSQL booking tests in CI [REFRESH: CI]

**Question 3:** What decision required human judgement rather than simply code generation? Why?

**SLIDE CONTENT:**

- Near-match venue search (T-63): the customer gave no thresholds (C-27, C-64)
- We didn't invent relaxation rules. We show every venue with its mismatches flagged (capacity, layout, accessibility) and let the Coordinator choose
- Rule B (T-100): the Product Owner's 22 Oct reading of earlier customer answers

**Fill-in sentence on the slide:**
"The most important value our team added beyond AI was deciding what the
customer meant and checking our own evidence, because AI wrote code
that looked right but sometimes answered a question nobody asked."

**AI tools we used (disclosure):** Coding agents for code, tests and docs:
Bryan, Jining and Xiangying used OpenAI Codex; Lexin, Amareet and Aaron used
Claude Code. We also used GitHub's
Copilot pull request reviewer, which has review records on 210 of
453 PRs [REFRESH: GitHub PR reviews]. Copilot comments were a second
opinion only and Copilot was never an approving reviewer. The rules require
a different account to approve the latest push. An approval state alone is
not proof of human code/test review or Product Owner acceptance. Lexin also
used Codex for this final Markdown audit and Canva edits; the earlier tool
list is the team-confirmed development snapshot.

**SPEAKER NOTES** (Presenter: ________, about 1.5 minutes):
"Yes, AI caused rework, and we logged it. Agent screenshots had to be redone by
hand. An agent's test setup broke one of our manual runs by adding data we
didn't ask for. Those examples are recorded in our decisions and test logs.

The clearest human part of the system is venue booking. The rule for two
claims on the same slot came from us reading the customer's answers, and we
enforced it in the database, not just in the screen.

The decision that most needed judgement was near-match search. The customer
never said how close is close enough. Instead of making up thresholds, we show
every venue and flag what doesn't match, so the Coordinator decides.

One more thing to be upfront about. GitHub's Copilot reviewer has review records on 210 PRs. We treated its
output as a second opinion. These records and account approvals do not prove
that a person reviewed the code or accepted a story; those receipts are separate."

**SUGGESTED VISUAL:** The booking conflict proof from rule B's manual run:
`docs/testing/runs/evidence/20261030-211029-lexinphun2024-debug-frontend-e2e/TC_E06S06_07-4.png`.
There is no hand-taken screenshot of near-match search (E06-S01) in the repo;
take one from the live site if you want to show T-63 instead.

**Evidence:** `docs/bdr/B-team-decisions.md` T-63, T-93, T-100;
`docs/plans/scrum-51-equipment-catalogue.md`; issue #372, PR #373; GitHub
Actions run 42039785462 (5 Nov, `main`, frontend component tests).

---

## Slide 8: Controlling what AI produced

**Question:** For each of the points below, explain what you did when using LLMs: Delegate, Constrain, Verify, Own

**SLIDE CONTENT:**

- **Delegate:** Well-specified work only: a Jira story with acceptance criteria and test case IDs, boilerplate routes and forms, first drafts of tests and docs. Not product decisions: those went to the Product Owner as decisions (T-xx)
- **Constrain:** `AGENTS.md` instructions every agent reads first; pre-commit and CI checks (`scripts/check.py`, secret scanning); at most 40 files per PR (submission-only files are exempt from size budgets) and 15 open PRs across the team (`scripts/check_pr_guardrails.py`); hard rules such as never resetting the shared Supabase database (T-59)
- **Verify:** Four required checks (repository-checks, pr-conventions, lfs-guard, application-checks); another account's latest-push approval. Human code/test review, recorded manual runs and PO acceptance are separate DoD evidence; GitHub approval alone establishes none of them (T-65, T-93)
- **Own:** Every story has a named human owner in Jira. The person who pushes can't approve their own last push. Product Owner acceptance is part of the Definition of Done

**SPEAKER NOTES** (Presenter: ________, about 1 minute):
"We used the Week 10 frame. We delegated tasks that were already well defined,
a story with acceptance criteria and test IDs, and kept product decisions for
the Product Owner. We constrained agents with an instructions file every agent
reads, repository checks, size limits on PRs, and a few hard 'never do this'
rules, like never resetting the shared database. We verified with four
required CI checks, a teammate's approval on the latest push, and manual runs
done by a person. And ownership stayed human: each story has an owner, you
can't approve your own push, and Done needs the Product Owner's acceptance."

**SUGGESTED VISUAL:** Screenshot of a PR's checks list showing the four
required checks green, e.g. PR #355 after the fix.

**Evidence:** Week 10 lecture pp. 10, 16, 33 (`docs/slides/lecture/Week10-AgenticAI-Software-Team.pdf`);
`AGENTS.md`; `CONTRIBUTING.md` (Definition of Done); live ruleset
`main-protection` (required checks, last-push approval).

---

## Slide 9: Git Strategy

**Question:** How did your team use Git to support collaboration throughout the project, rather than simply using it as a place to store code? We are particularly interested in whether your Git strategy evolved over the project, how consistently it was followed, and how it worked together with your CI process to ensure that changes were reviewed and verified before being integrated. Note: Your branching, pull request, review and merge practices should help the team work in parallel, reduce integration problems, and protect the stability of the main branch. Describe below:

**SLIDE CONTENT:**

- **Trunk-based with short-lived branches** (Week 5): one branch per story, named `feature/SCRUM-xx-...`, merged into `main` by PR. 401 PRs merged [REFRESH: GitHub]
- **How it evolved:**
  - Sprint 1: rules were advice only; 36 PRs merged without an approval (14 Sep to 1 Oct)
  - 3 Oct (after the Sprint 2 retro): ruleset on `main` with required checks, approval of the latest push, squash merges through a merge queue (#195, decision 0012). No bypass actors
  - Same day: shared `STATE.md`/`JOURNAL.md` edits banned in PRs, per-task handoff files instead, because they caused conflicts on every merge (decisions 0013, 0014)
  - 27 Oct: PR guardrails, max 40 files and 2 open PRs per author, 10 team-wide
  - 6 Nov: for the submission push, the per-author cap was removed and the team-wide cap raised to 15 (#446, decision 0017)
- **How consistently:** no PR has reached `main` without approval since 3 Oct
- **Deployment update (6 Nov, #445):** Vercel Git integration handles deployments; GitHub Actions remains the CI build and test gate. The Actions deployment workflow was removed to keep one automatic deploy path.
- **Where we slipped:** some branches lived too long. The Lead stories' work stayed outside `main`; recovery PR #450 merged on 6 Nov after delayed integration

**SPEAKER NOTES** (Presenter: ________, about 1.5 minutes):
"We worked trunk-based, like Week 5 recommends: one short branch per story,
merged by PR into main. But we didn't start out strict. In Sprint 1 the rules
were only advice, and 36 PRs went in without anyone approving them. In the
Sprint 2 retro we fixed that. From 3 October main has a ruleset: four checks
must pass, someone other than the pusher must approve the latest push, and
merges go through a merge queue that re-runs the checks on top of the newest
main. Nobody can bypass it, admins included.

We also stopped all PRs editing two shared notes files, which had been causing
a conflict on every merge. Later we added limits on PR size and how many PRs
one person can have open.

Where we fell short: Lead work stayed on branches since 1 November and only
merged through recovery PR 450 on 6 November. That delay is the integration
problem Week 5 warns about; merging it now does not rewrite the sprint history."

**SUGGESTED VISUAL:** Timeline graphic: Sprint 1 to 5 with the 3 Oct ruleset
and 27 Oct guardrails marked. Data: `docs/decisions/0012-merge-queue.md`,
`docs/decisions/0013-per-task-handoff-files.md`,
`docs/decisions/0014-pull-requests-do-not-edit-state-or-journal.md`.

**Evidence:** GitHub ruleset `main-protection` (created 3 Oct 2026);
PRs #148, #165, #166, #167 (merged 1 Oct without approval); `scripts/check_metadata.py`;
`scripts/check_pr_guardrails.py` (added 27 Oct); deployment decision
`docs/decisions/0010-single-vercel-deploy-path.md` (superseded operating model,
6 Nov, PR #445). PR #334 (24 Oct) had no
approval but merged into a feature branch, not `main`, so it is not a bypass.

---

## Slide 10: Testing Strategy (i)

**Question 1:** Complete the following table on tests (at the time of your project submission):

**SLIDE CONTENT:**

| Metric | Result |
| --- | --- |
| Number of manual e2e test cases using Wk4 template | 394 test cases (391 story + 3 performance): 382 active, 12 retired. 6 Nov runs (`1ca12c5` / `f778c77`), 382 active cases: 363 Pass, 10 Fail, 9 Not Executed. All 10 Fails are expected failures for the 4 known defects D-01 to D-04 (SCRUM-256 to 259). |
| Number of unit tests | 1,567: 726 backend + 841 frontend component passes in main CI run 42233620112 (`a8f2d879`); 1 backend skip. Six additional backend pretest checks pass and are excluded from this unit total [REFRESH: CI] |
| Number of integration tests (if any) | 390 passing tests in 27 PostgreSQL-labelled steps in main CI run 42233620112; former Lead TODO cases now run. Runtime/Redis excluded; no claim every repository integration file is wired into CI |
| Number of automated e2e tests (if any) | 58 real-stack auth passes; browser runner reports 476 successful outcomes and 14 skips in main CI run 42233620112. Six outcomes are expected failures for reuse (3 cases on 2 projects), leaving 470 ordinary passes. API-stubbed UI tests are not full-stack E2E |
| Coverage (explain why if not 100%) | DoD requires 100% changed-code unit coverage or a human-reviewed justification; review receipts must establish compliance. Recorded 6 Nov submission run: frontend 88.3% lines, backend unit 75.8% lines and integration 94.5% lines (`20261106-075740-Bl0oper-full-regression.md`). These are different suite scopes, not a combined coverage figure. CI does not enforce a threshold, so older code has gaps |
| Current passing tests | Submitted workbook, 6 Nov runs: 363 of 382 active cases Pass. This is a case-level result, not a count of individual automated assertions. |
| Current failing tests | Submitted workbook, 6 Nov runs: 10 Fail, all expected failures for D-01 to D-04; 9 Not Executed, including all 3 performance cases. Later main CI passed, but does not overwrite this dated workbook snapshot. |
| CI status | PASS: main `a8f2d879` full Application Checks run 42233620112; unexpected failures 0, expected failures disclosed separately [REFRESH: CI] |
| Number of known unresolved defects | Registry still lists D-01 to D-04 Open. #450 implements the three Lead gaps, but registry/Jira acceptance reconciliation is pending. Reuse D-04 remains unbuilt (3 expected-failure cases); staff-set expiry and initial automatic safety entry remain gaps [REFRESH: `docs/testing/defects.md`, merged in #443] |

**Question 2:** Which type of testing provided the least value to your team, and why?

**SLIDE CONTENT:**

- Unit tests that mocked the database
- A mock can't notice when the real schema has moved on
- In #355 the mocked tests passed; only the real-PostgreSQL suite caught a missing column
- We require real-database or real-stack evidence for persistence changes (Definition of Done); API-stubbed browser tests alone are insufficient

**SPEAKER NOTES** (Presenter: ________, about 1.5 minutes):
"Our submitted workbook has 394 cases: 391 story cases and three performance
cases. Twelve are retired. For the 382 active cases, the 6 November submission
runs at 1ca12c5 and f778c77 recorded 363 Pass, 10 Fail and nine Not Executed.
All ten failures were expected failures for the four known defects D-01 to D-04
(SCRUM-256 to 259). These are observed case results, not acceptance sign-offs.
The nine Not Executed cases include TC_PERF_01 to 03, TC_E03S09_02 and 03,
and TC_E10S03_01 to 04. So all three performance cases were not executed.

Automation status on 6 Nov (#443's tc-coverage.md): 366 automated, 10
known-defect, 5 scaffold, 13 without a test, over all 394. This is an automation
inventory, not a Pass/Fail breakdown. After the Lead recovery merge, main
changed to 371 automated, 3 known-defect, 7 scaffold and 13 without a test.

Separately, recorded hand-runs contain PASS or FAIL for 249 unique cases.
That does not establish complete human review of every case.

The successful post-merge main CI run has 726 backend and 841 frontend
component passes. Its PostgreSQL steps have 390 passes. The browser runner
reports 476 successful outcomes, but six are expected failures for reuse, so
470 are ordinary passes; 14 are skipped. Another 58 real-stack auth tests pass.
We label API-stubbed UI tests separately from real-stack tests.

Lead implementation is merged, but the defects file and Jira still need
acceptance reconciliation. Reuse, configurable hold expiry and initial automatic
safety entry remain gaps. The post-merge main run passed. That confirms the automated run, not
manual acceptance or resolution of every listed defect.

Coverage figures come from the earlier 6 November submission run and cover
different scopes. They are not new coverage measurements for Lead recovery.
Mock-only database tests gave us the least value for schema integration: PR 355
passed mocks but the real database exposed a missing column."

**SUGGESTED VISUAL:** Bar chart of the test counts by type (unit, real-DB,
Playwright, manual). Data source: this table.

**Evidence:** main full CI run 42233620112 (`a8f2d879`): backend 726,
frontend 841, 27 PostgreSQL-labelled steps totalling 390 passes, auth 58,
browser 476 runner successes and 14 skips. Source `tests/e2e/e02.spec.ts`
contains three reuse expected-failure tests, run on two browser projects.
Current generated inventory on main: 371 automated cases, 3 known-defect cases,
7 scaffold and 13 without a test, 394 total. Inventory, execution counts and
story acceptance are separate. Main run 42233620112 completed successfully; its log was inspected.

---

## Slide 11: Testing Strategy (ii)

**Question 1:** Describe: How you identified edge-cases in testing

**SLIDE CONTENT:**

- Boundary-value analysis and equivalence partitioning (Week 4): just below, exactly at, just above
  - e.g. TC_E05S05_04: one booking's buffered window starts exactly when the other's ends
- State transitions: actions from each status, including ones that must be refused
- Concurrency: two claims on one slot at the same time (rule B)
- Roles: access-denied cases for the wrong role on protected screens

**Question 2:** How the customer change and/or CFO statement affected testing

**SLIDE CONTENT:**

- Week 7 guide step 6: retire or replace the affected test cases in the same PR as the backlog change (`scripts/check_test_case_references.py` fails CI otherwise)
- New roles meant new permission tests (Lead, Safety Officer)
- Buffers changed what "overlap" means, so old conflict tests were rewritten around the buffered window (9:30 to 12:45 for a 10:00 to 12:00 event)
- Regression: re-ran earlier stories' cases before the Sprint Review (T-93)
- AI side (the CFO's theme): agent screenshots no longer count as manual evidence, so every manual run needs a person and hand-taken screenshots (T-93)

**Question 3:** Has every test case been verified by a human? If not, why? If so, what was the process/challenges?

**SLIDE CONTENT:**

- **Complete human review is not established.** 249 of 394 catalogue IDs have manual-labeled PASS/FAIL records. This does not prove each case was reviewed for correctness [CONFIRM: slide 11 human review receipts] [REFRESH: docs/testing/runs]
- Process: tester sets up data with the SQL preconditions, follows the steps, takes their own screenshots, logs a run record (T-65, T-93)
- 122 manual-labeled sessions: 416 PASS, 9 FAIL, 30 SKIP and 3 N/A rows with explicit TC IDs; summary rows without TC IDs excluded [REFRESH: docs/testing/runs]
- Challenge: keeping test accounts for seven roles in the right state without breaking each other's runs

**SPEAKER NOTES** (Presenter: ________, about 1.5 minutes):
"For edge cases we used what Week 4 taught: boundary values and equivalence
partitions. With turnaround buffers, for example, we test a booking that starts
exactly when the previous one's buffer ends. We also tested status changes,
including ones that should be refused, and we logged in as the wrong role to
check we get access denied.

The Week 7 changes forced us to rewrite tests, not just add them. When buffers
arrived, 'overlap' meant something new, so the old conflict tests changed. We
have a CI check that fails if a test case points at a scenario that no longer
exists, so broken references are caught. A reviewer still checks whether the steps
and expected results match the changed requirement.

Has every case been reviewed by a person? We cannot establish that from
execution logs alone. They show PASS or FAIL for 249 unique catalogue IDs;
independent human-review receipts for every case still need confirmation. Those runs logged nine failures, and each one stays in the record as a
FAIL. The hardest part was test data: seven roles, shared accounts, and runs
that change state."

**SUGGESTED VISUAL:** The boundary case TC_E05S05_04 as a manual run: its row
in `docs/testing/runs/20261021-180929-Bl0oper-frontend-e2e.md` next to
`docs/testing/runs/evidence/20261021-180929-Bl0oper-frontend-e2e/TC_E05S05_04-1.png`.

**Evidence:** Week 4 lecture p. 32 (boundary testing) and p. 42 (regression);
`docs/testing/cases/E05.md` (TC_E05S05_04); Week 7 Guide to Managing Changes
p. 1 step 6; `CONTRIBUTING.md` (retire test cases in the same PR).

---

## Slide 12: CI Pipeline (i)

**Question:** Complete:

**SLIDE CONTENT (table: CI Question | Your Team's Answer):**

| CI Question | Your Team's Answer |
| --- | --- |
| What events trigger your CI pipeline? | Pull requests to `main` (opened, synchronize, reopened, edited, ready for review), the merge queue, pushes to `main`, and manual runs |
| What checks/tests are run automatically? | repository-checks (`scripts/check.py`, test-case coverage audit), pr-conventions, lfs-guard, application-checks (typecheck, backend and frontend unit tests, real-PostgreSQL suites, Playwright, C4 diagram render). Also pr-guardrails and security scans (CodeQL, Semgrep, TruffleHog) |
| Is CI required to pass before code can be merged into main? | Yes. Since 3 Oct 2026 four checks are required (repository-checks, pr-conventions, lfs-guard, application-checks), and the merge queue re-runs them before anything lands |
| How many CI failures (CI going red) did your team encounter during the project? | 370 failed runs of selected workflows: CI 185, Application Checks 113, LFS Guard 38, PR guardrails 34. Events: 356 pull_request, 9 merge_group, 3 push (main), 2 workflow_dispatch. Counted 6 Nov, 22:33 SGT; reruns can change totals [REFRESH: GitHub Actions] |
| What was the most meaningful CI failure you encountered? | A flaky focus check in our frontend tests (issue #372, `RefusedEdit.navigation.test.tsx`, TC_E10S01_03) |
| What caused it, and how was it resolved? | The test checked focus right away, before React had moved focus. PR #373 waits for it instead (`waitFor`). The same pattern failed again on `main` on 5 Nov in another file (`SessionEditor.test.tsx`); PR #436 fixed it the same way on 6 Nov. Lesson: fix the pattern, not the file |
| Did CI ever prevent faulty code from being merged? Give one example. | Yes. PR #320 (event cancellation): Typecheck failed on commit `cc7322f` (run 39831097976) because a test used an option `ByRoleOptions` doesn't have. A cached local check had missed it. Fixed before merge |
| Did you ever need to bypass CI (e.g. git force push / move code from local main to local branch)? Why? What did you do? | No. The ruleset blocks force pushes and has no bypass actors. Before it existed, four PRs (#148, #165, #166, #167) merged on 1 Oct without approval |

**SPEAKER NOTES** (Presenter: ________, about 1.5 minutes):
"CI runs on every PR, in the merge queue and on main. Four checks are required.
The biggest is application-checks, which runs typecheck, all the unit tests,
the real-database suites and Playwright.

We went red a lot: 370 failed runs in the selected workflows. Almost all were on PR branches, which is
where you want them. Nine were caught in the merge queue, after approval but
before main. Three were main push failures, and two were manual dispatches.
These are failed workflow runs, not 370 distinct application defects.

The most useful failure was one of those flaky tests. It checked focus before
React had moved it, so it passed on our laptops and failed in CI under load. We
fixed it with a wait, but the same pattern came back in another file on
5 November. Lesson: fix the pattern, not the file.

And CI did stop real bugs. PR 320 failed typecheck because a test used an
option that doesn't exist. Someone's cached local check had missed it."

**SUGGESTED VISUAL:** Screenshot of GitHub Actions run 39831097976 showing the
failed Typecheck step.

**Evidence:** `.github/workflows/ci.yml` (`on:` block); ruleset
`main-protection` required checks; issue #372; PR #373; PR #436; PR #320; Actions
runs 39831097976 and 42039785462.

---

## Slide 13: CI Pipeline (ii)

**Question:** What are the most interesting things in your CI Pipeline that you wish to highlight? Why? Where did you get the idea from, and what benefits do you get from this?

**SLIDE CONTENT:**

1. **Backlog to test drift check:** `scripts/tc_coverage_audit.py` and `scripts/check_test_case_references.py` check TC-ID inventory drift and missing or superseded story/scenario references; explicitly allowlisted supersessions can remain pending replacement
2. **Merge queue:** checks re-run on top of the latest `main` plus every PR ahead in the queue, so you don't need to "update branch" and get re-approved
3. **Diagrams render in CI:** the C4 Mermaid file must render (`mmdc`), so a broken architecture diagram fails the build (it caught one on `main` on 30 Oct)
4. **Evidence hygiene:** new manual PASS/FAIL records and their screenshots must land together; detect-secrets and TruffleHog scan outside `submission/` (#448)

- Where the ideas came from: our own Sprint 2 retro (merge conflicts, stale approvals), Week 6 and 9 lectures (CI, regression), and GitHub's merge queue docs
- Benefit: broken backlog references are caught, and merge-queue integration reduces repeated branch updates and re-approvals. Human review still checks whether tests match the requirements

**SPEAKER NOTES** (Presenter: ________, about 1 minute):
"Four things we're proud of. First, a drift check: CI catches test cases that cite a missing or superseded
backlog scenario, unless the supersession is explicitly allowlisted. It does
not prove that every requirement change has a matching test; we still review that. Second, the merge queue. Before it, every
time main moved you had to update your branch, and that wiped your approval. The
queue tests your PR on top of the latest main for you. Third, our C4 diagrams
are code, and CI renders them, so a broken diagram is a broken build. That
happened once on main. Fourth, evidence: a run record and its
screenshots go in together. Secret scanners cover the source paths; the
submission package has an explicit exception from two scanners. Most of
these came from our Sprint 2 retrospective, where merge conflicts and repeat
approvals were the top complaints."

**SUGGESTED VISUAL:** Simple pipeline diagram: PR, then four required checks,
then review, then merge queue, then `main`. Source: `.github/workflows/`
Draw it in Canva: the design pack (`docs/design/`) has no CI diagram.

**Evidence:** `scripts/tc_coverage_audit.py`; `scripts/check_test_case_references.py`;
`docs/decisions/0012-merge-queue.md`; PRs #406 (reference guard) and #448 (submission scanner exception);
Actions run 41078692527 (30 Oct, C4 render gate); `docs/sprints/sprint-2-review-retrospective.md` (PR #440), Part B
"What Did Not Go Well" (repeated `main` conflicts; updating a branch dismissed
its approval) and the Sprint 3 action item to sequence PRs through the merge
queue.

---

## Slide 14: CI Pipeline (iii)

**Question:** Show ONE concrete example of CI providing value: Change being integrated: What feature/fix was the team trying to merge?

**SLIDE CONTENT:** PR #355 (Jining): lost-venue replacement recovery (Week 7 change 2), commit `b0f0dc6`, 26 Oct 2026.

**Question:** What failed: Which automated check or test failed?

**SLIDE CONTENT:** application-checks, step "E06-S03 booking submission and status PostgreSQL acceptance": TC_E06S03_05 failed because column `b.conflict_block_id` did not exist (Actions run 40331728045).

**Question:** Why it failed: What problem in the implementation was detected?

**SLIDE CONTENT:** The booking list query reads `conflict_block_id`, added by migration `0025` (venue unavailability, #348). But that suite built its test database from only migrations `0001` and `0019`. The code and the schema it was tested against had drifted apart.

**Question:** What the team did: How did you resolve the issue?

**SLIDE CONTENT:** Commit `2e7b580` made the test database apply every current migration, while keeping its old rows and the `0019` backfill check. CI passed and #355 merged on 27 Oct 2026. Run record: `docs/testing/runs/20261026-215233-jininggg-backend-api.md`.

**SPEAKER NOTES** (Presenter: ________, about 1 minute):
"One concrete example. Jining was merging the fix for Week 7 change 2: when a
venue becomes unavailable, the Coordinator finds a replacement. All the mocked
tests passed. But the real-PostgreSQL step failed with 'column does not
exist'. The query used a column from a newer migration, and that test suite was
still building its database from two old migrations. So the code was right and
the test setup was stale, and only a real database could tell. We changed the
suite to apply every migration, CI went green, and it merged the next day.
CI caught drift between the integration-test schema and the current
application query before merge."

**SUGGESTED VISUAL:** Screenshot of Actions run 40331728045 with the red step
and the error line.

**Evidence:** PR #355; Actions run 40331728045; commit `2e7b580`;
`docs/testing/runs/20261026-215233-jininggg-backend-api.md`.

---

## Slide 15: Team Contribution and Ownership

**Question:** Complete: (add/delete rows based on no. of team members)

**SLIDE CONTENT (table: Team Member | Main Areas Worked On | Approx. Contribution | Code/PR Examples | Other Contributions).**
Keep the template's column header "Approx. Contribution". Put the "share of commits" explanation in the cell text.

Approx. Contribution = share of commits on `main` per mapped Git author, out of
396 human commits (Dependabot excluded). Squash merges make this close to a
count of merged PRs. It is not a measure of effort, so the last column adds
Jira points and reviews. [REFRESH: `git shortlog -sne origin/main`]

| Team Member | Main Areas Worked On | Approx. Contribution | Code/PR Examples | Other Contributions |
| --- | --- | --- | --- | --- |
| Bryan (Product Owner) | CI/CD, repository tooling, Git rules and merge queue, architecture docs; Jira stories: Coordinator scope (E01-S12), Lead and Safety Officer sign-in (E01-S13), reuse a previous event (E02-S05), Lead queue, assign, reassign, oversight (E03-S08 to S10) | 46% (182 commits) | #96, #108, #195, #205, #232, #339, #378, #379 | Product Owner: backlog order, decisions (T-xx), acceptance; Week 7 change analysis (#205); PostPlan dashboards. 6 product stories Done in Jira (27 recorded pts). Lead implementation (14 historical pts) merged in #450; acceptance reconciliation is pending. Reuse E02-S05 (3 pts) is still absent. SCRUM-256 to 259 remain To Do; recovery SCRUM-261 is also To Do |
| Amareet (Scrum Master) | Frontend skeleton and shared shell; tentative holds (E06-S05); technical support requests and staffing (E07-S06, E07-S07); attendee registration, capacity, period and list (E09-S01, S02, S03, S07); multi-session events (E04-S02) | 15% (61 commits) | #171, #172, #173, #245, #252, #326, #327, #353, #366, #368 | Scrum Master: Scrum events and Jira board; 114 PRs with a retained APPROVED review from the account; Definition of Done update for Week 7 guidance (#215); re-estimation (#213, #323); 14 manual run sessions. 8 stories Done (26 pts) |
| Lexin | Venue catalogue and layouts (E05-S01, S02), availability calendar and blocks (E05-S03, S04), venue unavailable over bookings (E05-S06), booking decisions (E06-S04), double-booking prevention (E06-S06), activity log (E14-S02, S03), Organiser registration fixes (E03-S11, S12); revert to planning (E08-S04), including automatic re-entry into Safety Review (#392); minor vs major edits (E10-S02); Venue Staff notification routing for E11-S01 (#271, #272) | 11% (44 commits) | #88, #134, #151, #190, #272, #298, #348, #349, #385, #392 | Migration 0025; 22 manual-labeled sessions; 53 PRs with a retained APPROVED review. 13 stories Done (42 pts) |
| Aaron | Event request submit, draft and accessibility (E02-S01 to S03); auto-assignment, clarification and decision (E03-S01 to S03); setup and turnaround buffers (E05-S05); equipment reservation, unavailability, Sessions and warnings (E07-S04, S05, S08, S09); safety submission and Safety Officer check (E08-S03, E08-S06); waiting list and withdrawal (E09-S04, S05) | 11% (42 commits) | #24, #174, #236, #282, #283, #328, #412, #413, #426, #427 | Migration 0017, the Safety Review status (#282); C4 diagrams (#24); "4. TEST CASES" deliverable (#441, #443 and #447 merged 6 Nov): 45 cases newly automated, 8 new cases, runs locally and on Vercel plus Stryker, which found the gaps behind SCRUM-256 to 259 [REFRESH: after later test changes]; assigned the Release 1 follow-ups SCRUM-256 to 259 (To Do); 24 manual-labeled sessions; 80 PRs with a retained APPROVED review. 15 stories Done (60 pts), the most in the team |
| Jining | Account create, update and deactivate (E01-S04, S08, S11); venue search, near-match results and suitability (E06-S01, S02, T-63); booking requests and multiple venues (E06-S03); lost-venue recovery (E10-S05); primary-venue publication (#347); change requests for Events and Sessions (E10-S01, #383, #414); notifications (E11-S01); initial database schema documentation (#7) | 9% (35 commits) | #7, #143, #242, #299, #347, #355, #367, #383, #414 | 18 manual-labeled sessions; 51 PRs with a retained APPROVED review. 9 stories Done (44 pts) |
| Xiangying | Early user flows and architecture (#9); log in and access control (E01-S01 to S03); Organiser event editing (#175); event and Session date validation (E02-S07); status tracking, comments and event details (E03-S05 to S07); equipment catalogue, requests and availability (E07-S01 to S03), including the stock and withdrawal fix (#265); automatic completion (E08-S05); attendance (E09-S06); event cancellation (E10-S04), which makes open change requests Obsolete and prefills a change request after a refused edit (#319, #363, #365) | 8% (32 commits) | #9, #175, #214, #216, #229, #265, #319, #320, #324, #343, #363, #365, #389, #420 | 26 manual-labeled sessions, the most in the team; 32 PRs with a retained APPROVED review. 13 stories Done (45 pts) |

Approval figures count distinct PRs with a currently retained APPROVED review
from each account. They exclude dismissed review states and do not prove human
inspection. Lexin's figure includes two explicitly disclosed agent approvals
(#443 and #450). Product-story counts exclude technical enablers. Lexin's 42
recorded points cover 10 estimated stories; three Done stories are unestimated.
Manual session counts use run_type: manual, not verified screenshot completeness;
see `docs/testing/run-record-corrections.md` for the two unevidenced T-93 records.

Areas come from the Jira stories each person owns (assignee) plus their own
PRs. A story owner is not always the only author: for example the waiting list
(E09-S04, Aaron's story) was built in Bryan's #379. All counts
[REFRESH: Jira assignees, GitHub PR reviews, docs/testing/runs].

All six members confirmed their contribution areas earlier on 6 Nov. Later
refreshed counts are evidence-derived snapshots, not new owner sign-offs.

**SPEAKER NOTES** (Presenter: ________, about 1.5 minutes):
"This is who did what, from git and Jira. The commit share is lopsided. Bryan
has 46%, partly because he owned the tooling, CI and docs, which come as lots of
small PRs. That's why we also show story points Done and reviews: Aaron
finished the most product points, Xiangying ran the most manual test sessions,
and Amareet has the most retained account approval records, over a hundred. All six accounts have feature and review evidence. These account-level
counts do not establish human inspection of every AI-generated change.
The team confirmed the areas earlier; refreshed numbers remain dated snapshots."

**SUGGESTED VISUAL:** Three separate bar charts for commits, account approval records and
recorded Done-story points. Label each unit; do not stack unlike units. Data: this table.

**Evidence:** `git shortlog -sne origin/main`; GitHub PR list (authors and
approvals); Jira board 1 (assignee and points of Done product stories).

---

## Slide 16: Anything Else?

**Question:** Anything else you would like us to know about your project, process, or otherwise? (It's OK to put "N/A" here.)

**SLIDE CONTENT:**

- **Velocity (Jira, product story points Done at each sprint's end date):** S1 66 (one-week sprint), S2 66, S3 34, S4 53, S5 38 (1 to 5 Nov, short close-out; points Done by 5 Nov 23:59 SGT). Jira closed Sprint 5 on 6 Nov with all 14 stories Done; its 78-point close-date total includes 40 points moved to Done on 6 Nov, so 78 is not velocity (Product Owner confirmed 6 Nov)
- **Sprint Goal check:** Sprint 4's goal was to complete all remaining Release 1 stories. We didn't meet it: 53 of 85 points Done at the sprint end (62%), 32 points carried over to Sprint 5. Sprint 5's goal (finish E08-S04, E10-S01, E10-S02, E11-S01 and unblock E08-S06) was met when Jira closed it on 6 Nov, one day after its end date. E11-S01 had been carried since Sprint 2
- Release 1 in Jira: 65 stories, 60 Done (227 points) and 5 To Do. The earlier 17-point code gap has changed: 14 points of Lead implementation merged in #450; reuse E02-S05 (3 points) remains absent. Merge does not establish acceptance of the recovered Lead stories. On 6 Nov the backlog audit (#442) took them out of Release 1 and replaced them with To Do follow-ups SCRUM-256 to 259. The fifth To Do story is E06-S07 (SCRUM-260), staff-set hold expiry (T-84) [REFRESH: Jira Release 1]
- All 20 Week 4 core features map to stories (`docs/bdr/F-core-feature-coverage.md`), and feature 5 "Coordinator Assignment" now also maps to the Lead queue E03-S08 (Week 7 change 5, #442), whose implementation is now merged in #450, with acceptance reconciliation pending
- Design kept in step with code (Weeks 5 and 11): #371 maps every class-diagram method to the real function and adds a test for the error-class hierarchy the diagram shows
- **Done stays Done:** a missed requirement becomes a new linked story, following the instructors' guidance (`docs/plans/instructor-guidance-2026-10-06.md`) and T-74
- **What we'd do differently:**
  - Merge small slices every day. Lead work merged late through #450; earlier Jira Done did not mean integrated code
  - Never mark a story Done in Jira before its PR merges
  - Fix flaky tests by pattern, early
  - Keep sprints the same length (S1 was one week)
- Dashboard: https://5p9t29p9jotq.postplan.dev [REFRESH: dashboard date]

**SPEAKER NOTES** (Presenter: ________, about 1 minute):
"Last, our numbers and our lessons. Velocity went 66, 66, 34, 53 and 38,
only points Done by each sprint's end date. Sprint 1 was only one week, so
it isn't directly comparable. Sprints 3 and 4 were lower. In Sprint 4 we
finished 53 of 85 points, so we didn't meet its Sprint Goal of finishing
every Release 1 story. The rest moved to Sprint 5, a short close-out. Jira
had marked four stories Done before their code reached main. The backlog
audit added follow-ups. Lead implementation has since merged in PR 450;
reuse is still missing, and acceptance reconciliation remains separate.

What would we do differently? Merge smaller pieces every day. The Coordinator
Lead work sat on branches while Jira said Done; it finally merged on
6 November. We should have caught the mismatch sooner. Never mark Done before the merge. Fix flaky tests
as a pattern, not one by one. And keep sprints the same length so velocity is
comparable. Thanks, we're happy to take questions."

**SUGGESTED VISUAL:** Velocity bar chart, Sprints 1 to 5. Source:
`artifacts/sprint-burndown-velocity.html` or the PostPlan dashboard.

**Evidence:** `docs/plans/sprint-burndown-velocity-analysis.md` (reconciled 3 Nov:
Done at each sprint's end date; Sprint 4 53 Done of 85, 32 carried over);
Jira Sprint 5 report and issue history (closed 6 Nov 15:05 SGT; SCRUM-256 to 260);
`docs/plans/release-1-product-backlog-audit-20261106.md` (#442);
Jira board 1; `CONTRIBUTING.md`.

---

## Slide 17: End of Submission

**Question:** None.

**SLIDE CONTENT:** Keep the template text ("No further slides beyond this point").

**SPEAKER NOTES:** None. The slide 16 presenter closes and opens Q&A
(Presenter: same as slide 16).

**SUGGESTED VISUAL:** None. Keep the template slide as it is.

---

## Checklist before presenting

1. Re-read every `[REFRESH: ...]` number from its source.
2. Resolve or remove every `[CONFIRM]` item (list: `_CONFIRM-slide-deck.md` in the submission folder).
3. Confirm the instructors can open all three recording links after Google sign-in; anonymous access is unavailable under the current sharing settings.
4. Each member reads their row on slide 15.
5. Everyone reads slides 4, 5, 7 and 16 out loud once: any of us can be asked about any answer.


## Evidence audit (not slide content)

Audited against merged main `a8f2d879` after #450/#451 on 6 November.
All 17 original template slides and questions are covered; the timing table
sums to 20 minutes. Existing screenshot/source paths resolve. Fresh landing
and Actions screenshots remain suggestions, not supplied evidence.

- GitHub inventory: 453 PRs total, 401 merged, 48 closed without merging,
  4 open at query time. Closed-unmerged #403/#407 did not remove manual
  acceptance requirements; #438 did not supersede merged design PR #437.
- Main author snapshot: 396 human commits: Bryan 182, Amareet 61, Lexin 44,
  Aaron 42 (29 Bl0oper + 13 aaronkwk), Jining 35, Xiangying 32. Rounded shares
  are 46/15/11/11/9/8 percent; these are not effort measurements.
- Manual-labeled records: 122 sessions; 249 unique IDs have PASS/FAIL rows.
  TC-specific rows: 416 PASS, 9 FAIL, 30 SKIP, 3 N/A. Counts do not validate
  screenshot quality, full-case coverage or independent human review.
- Main holds 967 dated run records; branch-local audit records are excluded.
- #450 implements Lead queue assignment, immediate Lead reassignment and
  oversight. Jira SCRUM-256 to 258 and recovery SCRUM-261 remain To Do.
  `defects.md` still says D-01 to D-03 Open; owners must reconcile acceptance
  and the registry. This audit changes neither tickets nor another owner's docs.
- #451 packages the named Jira CSV and backlog PDF. Its CSV is a dated export,
  not live Jira. Runtime queries still show Release 1: 65 stories, 60 Done,
  227 recorded points, 5 To Do. Product-story totals per member exclude E00
  technical enablers and other non-product Story tickets.
- Code gap still present: reuse (D-04), configurable hold expiry (T-84), and
  first-time automatic safety entry (C-132/T-82). Eligible automatic re-entry
  excludes Safety Officer send-back, which needs Coordinator resubmission.
- #445 uses Vercel Git integration as the automatic deploy path. #448 excludes
  submission assets from two secret scanners. Neither proves production
  correctness or the absence of sensitive content in packaged assets.
- GitHub required approval is an account-level gate. This session submitted
  agent-disclosed approvals on #443/#450 at the user's request; those are not
  independent human review or PO acceptance receipts.
- Earlier human confirmations of roles, tools and contribution areas are
  retained. Sprint 4 recording choice is user-reported; retain the TA receipt.
  The user reports Google sign-in is required and broader sharing unavailable;
  instructor access after sign-in remains unverified.

Assumptions: preserve the confirmed 20-minute slot, original presenter blanks,
team roles and Sprint 4 recording choice pending its receipt. Do not infer
story Done from merge, code coverage from TC-ID inventory, human review from
manual execution, or production acceptance from API-stubbed browser tests.

Canva follow-up: it is a derived copy and is not edited during this file audit.
The current Canva slide 7 includes an extra evidence question absent from the
original PPTX; restore template compliance when next editing the deck. Sync
all changed figures, status lines and speaker notes from this source before
exporting the final presentation.
