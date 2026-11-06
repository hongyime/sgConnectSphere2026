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

Numbers were collected on 6 November 2026 from: Jira board 1 (read-only REST),
`git` on `origin/main` at `0773a721`, GitHub pull requests and Actions runs, and
`docs/testing/`. Sprint 4 is treated as the final sprint for the ceremony
recordings, as the teaching assistant told us; Sprint 5 (1 to 5 November) was a
short close-out sprint.

How this file was made (task steps 1 to 3):

- Questions were extracted with python-pptx from `Week 11 Presentation.pptx`
  and checked against the untouched instructor template (commit `56672fa3`,
  `Week 11 Slide Template.pptx`). The template has no speaker notes, so all
  speaker notes here are new. The pptx itself is not edited.
- The only earlier answers were typed into the pptx on 29 to 30 October. They
  were the starting point and are corrected here. No other copy of the answers
  exists in the repo, so nothing was deleted.
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

The speaker notes total about 2,050 words, roughly 15 minutes at a normal
speaking pace. That leaves about 5 minutes for switching speakers, pointing at
visuals and slowing down on the tables.

---

## Slide 1: ConnectSphere IS212 Project Presentation

**Question:** None (title slide).

**SLIDE CONTENT:**

- ConnectSphere: Event Planning and Venue Booking System
- IS212 Software Project Management, AY2026/27, Team 8
- Bryan (Product Owner), Amareet (Scrum Master), Aaron, Xiang Ying, Lexin, Jining (Developers)

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
| Product backlog | Zip: `1. PRODUCT BACKLOG/` [CONFIRM: exact file names from the backlog owner]. Repo: `docs/backlog/release-1/` (one file per epic) |
| Git URL (e.g. GitHub)(remember to add your two instructors to the repository; see instructions) | https://github.com/hongyime/sgConnectSphere2026 (branch `main`). Zip: `6. CODE REPOSITORY/`. Both instructors added (confirmed 6 Nov). |
| Exports of project management tools (e.g. Google Sheets, Jira, Notion docs, …) | Jira export in `1. PRODUCT BACKLOG/` [CONFIRM: export file name]. Board: https://theprawnworkspace.atlassian.net/jira/software/projects/SCRUM/boards/1 |
| Video recording URLs of sprint 4 scrum ceremonies | Sprint Planning: https://drive.google.com/file/d/1KpmvbnEnyXBcUu3NpOHAAw-THKKRz66F/view?usp=sharing. Daily stand-up: https://drive.google.com/file/d/16CDoyd2Ix-ALtighIaiXpY3E7zcN6zZw/view?usp=sharing. Sprint Review and Retrospective (one recording): https://drive.google.com/file/d/1HkO0yxH7kBRUQqzXZkco-GNWNgbsbIwo/view?usp=sharing |
| Sprint meeting records (all sprints) | Zip: `2. SPRINT MEETINGS/`: 12 Word files, planning, stand-ups and review + retrospective for Sprints 1 to 4. Repo: the same records as Markdown in `docs/sprints/` (PR #440) |
| System designs (C4, class, sequence, database) | Zip: `3. SYSTEM DESIGNS/`. Repo: `docs/c4-diagrams.md`, `docs/class-diagram.md`, `docs/dynamic-user-flows.md` (sequence diagrams), `docs/db_schema.md`, `docs/architecture.md`, `docs/modular-monolith-architecture.md` [REFRESH: design pack in PR #437, not merged yet] |
| Test cases and test run records | Zip: `4. TEST CASES/`. Repo: `docs/testing/cases/` (383 test case IDs), `docs/testing/runs/` (945 run records) [REFRESH: docs/testing] |
| Slide deck, README, decisions | Zip: `5. SLIDE DECK/`, `7. README/`. Repo: `docs/bdr/` (customer clarifications and team decisions) |

**SPEAKER NOTES** (Presenter: ________, about 25 seconds):
"This is our index. Every row points to a folder in the zip and, where it
helps, to the same thing in the repo. The three ceremony videos are Sprint 4,
our last full sprint: planning, one daily stand-up, and the review and
retrospective, which we recorded back to back in one video. Jira is linked too,
but in case you can't log in, the export is in folder 1."

**SUGGESTED VISUAL:** None. The table fills the slide.

**Evidence:** Week 4 Project Instructions (`docs/bdr/customer-sources/Week 4 Project Instructions.docx`,
Documents and Videos table) asks for final-sprint recordings of planning,
review, retro and one daily stand-up, as unlisted links.

**Before presenting:** Check that all three Drive links open in a private
browser window ("Anyone with the link can view"). Amareet will do this check
in an incognito window and report back; it can't be checked from the repo.

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

- **Change 6, Operational Safety Check (Safety Officer)**
- New role (7 roles now, T-72) and a new event status, Safety Review, between Planning and Confirmed (T-71, migration `0017`)
- Changed the Confirm step we had already built (E08-S03), added the Safety Officer review (E08-S06, 8 points) and a "send back to planning" path (E08-S04)
- The only change that added a status to the event lifecycle, so every status rule, screen and notification around Confirm had to be rechecked
- Week 9 answers changed it again: rejection returns the event to planning (C-132 onwards), and the review should start automatically (T-82)
- Revert to planning (E08-S04) Done on 6 Nov in Sprint 5 [REFRESH: Jira SCRUM-61]. Not finished: a first-time event is still submitted by the Coordinator rather than entering review on its own (known gap: T-82 on 13 Oct says the Coordinator does not submit, but E08-S03 was built on 17 Oct, #283, to its written criteria, which still say "When I submit"; only re-entry is automatic, #392, #395)

**Question 2:** Describe how you handled these changes, and which components of your project were affected and how.

**SLIDE CONTENT:**

- Process (Week 7 "Managing Changes" guide): each change got a customer clarification row (C-65 to C-70) and a team decision (T-66 to T-74)
- Done stories stayed Done; new behaviour became new stories with their own points (T-74, guide Scenario 2)
- Backlog, acceptance criteria, test cases and C4 diagrams were all updated in one PR (#205)
- Backend: `backend/src/modules/eventReadiness/` (`safetyCheck.ts`, `submission.ts`, `autoSafetyReview.ts`), role list in `backend/src/modules/shared/roles.ts`, migration `0017` adds the status
- Frontend: Safety Officer queue `frontend/src/features/roleQueues/SafetyReview.tsx`
- Tests: `safetyReview.integration.test.ts` on real PostgreSQL in CI

**SPEAKER NOTES** (Presenter: ________, about 1.5 minutes):
"Week 7 gave us six changes, and the Safety Officer check hit us hardest. It
wasn't only a new screen. It added a seventh role and a new status in the
middle of our event lifecycle, between Planning and Confirmed. We had already
built the Confirm step, so we had to change what Confirm means: an event now
goes through a safety check before it can be confirmed. And the Safety Officer
can send an event back to planning, which means venue and equipment
arrangements may need another look. Then the Week 9 answers moved it again,
for example the review should start automatically. We haven't finished all of
it: the 'revert to planning' story only closed in Sprint 5, and a first-time
event still needs the Coordinator to submit it.

For all six changes we followed the Week 7 guide. Each change became a
customer clarification row and a team decision. A Done story stayed Done, and
the new behaviour went into a new story with its own estimate, so our velocity
history stayed honest. We updated the backlog, the test cases and the C4
diagrams together in one PR, number 205."

**SUGGESTED VISUAL:** The "automatic Safety Review" sequence diagram, section 14
of `docs/dynamic-user-flows.md` (render the Mermaid block to an image). Or a
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

- **Change 3, Multiple Venues for One Event**
- Each booking row already belonged to one event, and conflicts were already checked per venue
- So the change mostly removed a rule: "one pending venue request per event" (T-20 retired, T-68)
- Migration `0019` only added columns (purpose, headcount, primary venue); old bookings stayed valid
- No new story and no new points: E06-S03 wasn't Done yet, so it was updated in place (T-74). Every other change needed at least one new story

**Question 2:** Describe how you handled these changes, and which components of your project were affected and how.

**SLIDE CONTENT:**

- Backlog: E06-S03 amended (it was not Done yet), rule B for two claims on one slot (T-100, E06-S06)
- Backend: `backend/src/modules/venueBooking/bookingSubmission.ts` creates a second booking as Pending next to the first; row locks (`FOR UPDATE`) stop two claims on the same slot both winning
- Frontend: `frontend/src/features/venue/VenueBookingForm.tsx` takes a purpose and headcount for each venue request on the same event
- Tests: `TC_E06S03_*` cases on real PostgreSQL (`test:venue-booking-requests:db`, 103 tests in CI) [REFRESH: CI]

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
| 5 Event Coordinator Lead | E01-S13 roles and sign-in, Lead queue (read only) | Gap: new requests are still auto-assigned to a Coordinator, and the Lead's assign, reassign and oversight work is on unmerged branches (`feature/SCRUM-153`, `-154`, `-155`), although Jira shows these stories Done. Follow-up stories SCRUM-256 to 258 added to Release 1 on 6 Nov (To Do) |
| 6 Safety Officer | E08-S03, E08-S06, E08-S04 | Review, decisions and revert to planning Done; first entry into review not yet automatic (C-132, T-82) |

Note for the team (not on the slide): keep change 5 as a gap. On 6 Nov the
Lead commits were only on remote feature branches and there was no open Lead
PR. Bryan will tell the team only if the work is merged into `main`. If that
happens, change the change 5 row to Done and update slides 9 (long branches),
15 (Bryan's row) and 16 (Release 1 line and lessons).

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
| 2. Manual test evidence | Agent browser runs produced screenshots that were first offered as manual evidence | Decision T-93: a manual run counts only with screenshots a person took by hand, logged in a run record | Hand-run sessions found real bugs that the automated runs missed, e.g. header clipping and the unread count (#309) | 121 manual run records, 249 test cases run by hand at least once [REFRESH: docs/testing/runs] |
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

Third, concurrency. A generated booking endpoint will happily accept two
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

- Yes, three cases we recorded:
- Agent screenshots offered as manual evidence; redone by hand after T-93 (15 Oct)
- Agent test setup in SCRUM-51's manual run inserted an extra Session, so the first request failed; removed and rerun (`docs/plans/scrum-51-equipment-catalogue.md`)
- Agent-written focus assertions were flaky; fixed in #373, and the same kind of failure turned `main` red again on 5 Nov (`SessionEditor.test.tsx`) [CONFIRM: that these tests were agent-written]

**Question 2:** Which part of the final system contains the clearest evidence that your team contributed more than simply prompting an AI tool? Why?

**SLIDE CONTENT:**

- Venue booking: the booking states and rule B (T-100)
- Our call on what the customer meant, enforced with row locks so two claims on one slot can't both win
- Covered by 103 real-PostgreSQL booking tests in CI [REFRESH: CI]

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
Bryan, Jining and Xiang Ying used OpenAI Codex; Lexin, Amareet and Aaron used
Claude Code. We also used GitHub's
Copilot pull request reviewer, which left automatic review comments on 201 of
our 435 PRs [REFRESH: GitHub PR reviews]. Copilot comments were a second
opinion only and Copilot was never an approving reviewer. Every merge into
`main` still needed an approving review from a teammate on the latest push.

**SPEAKER NOTES** (Presenter: ________, about 1.5 minutes):
"Yes, AI caused rework, and we logged it. Agent screenshots had to be redone by
hand. An agent's test setup broke one of our manual runs by adding data we
didn't ask for. And some flaky focus checks in our frontend tests kept failing
in CI, including on main as recently as 5 November.

The clearest human part of the system is venue booking. The rule for two
claims on the same slot came from us reading the customer's answers, and we
enforced it in the database, not just in the screen.

The decision that most needed judgement was near-match search. The customer
never said how close is close enough. Instead of making up thresholds, we show
every venue and flag what doesn't match, so the Coordinator decides.

One more thing to be upfront about. GitHub's Copilot reviewer commented on
about 200 of our PRs. We treated it as a spell-checker for code. It never
counted as a review, because the ruleset needs a teammate's approval."

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
- **Constrain:** `AGENTS.md` instructions every agent reads first; pre-commit and CI checks (`scripts/check.py`, secret scanning); at most 40 files and 2 open PRs per author (`scripts/check_pr_guardrails.py`); hard rules such as never resetting the shared Supabase database (T-59)
- **Verify:** Four required checks on every PR (repository-checks, pr-conventions, lfs-guard, application-checks with real PostgreSQL and Playwright); a teammate's approval on the latest push; hand-taken manual runs (T-65, T-93)
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

- **Trunk-based with short-lived branches** (Week 5): one branch per story, named `feature/SCRUM-xx-...`, merged into `main` by PR. 385 PRs merged [REFRESH: GitHub]
- **How it evolved:**
  - Sprint 1: rules were advice only; 36 PRs merged without an approval (14 Sep to 1 Oct)
  - 3 Oct (after the Sprint 2 retro): ruleset on `main` with required checks, approval of the latest push, squash merges through a merge queue (#195, decision 0012). No bypass actors
  - Same day: shared `STATE.md`/`JOURNAL.md` edits banned in PRs, per-task handoff files instead, because they caused conflicts on every merge (decisions 0013, 0014)
  - 27 Oct: PR guardrails, max 40 files and 2 open PRs per author, 10 team-wide
- **How consistently:** no PR has reached `main` without approval since 3 Oct
- **Where we slipped:** some branches lived too long. The Lead stories' branches (`feature/SCRUM-153` to `155`) have been unmerged since 1 Nov

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

Where we fell short: a few branches lived for days. The Lead stories have sat
on branches since 1 November, which is exactly the delayed integration Week 5
warns about."

**SUGGESTED VISUAL:** Timeline graphic: Sprint 1 to 5 with the 3 Oct ruleset
and 27 Oct guardrails marked. Data: `docs/decisions/0012-merge-queue.md`,
`docs/decisions/0013-*`, `docs/decisions/0014-*`.

**Evidence:** GitHub ruleset `main-protection` (created 3 Oct 2026);
PRs #148, #165, #166, #167 (merged 1 Oct without approval); `scripts/check_metadata.py`;
`scripts/check_pr_guardrails.py` (added 27 Oct). PR #334 (24 Oct) had no
approval but merged into a feature branch, not `main`, so it is not a bypass.

---

## Slide 10: Testing Strategy (i)

**Question 1:** Complete the following table on tests (at the time of your project submission):

**SLIDE CONTENT:**

| Metric | Result |
| --- | --- |
| Number of manual e2e test cases using Wk4 template | 383 test case IDs in `docs/testing/cases/` (13 epic files); 249 of them run by hand at least once [REFRESH: tc-coverage, docs/testing/runs] |
| Number of unit tests | 1,586: 735 backend + 851 frontend (Vitest). CI run 42032706992, 5 Nov 2026 [REFRESH: latest green main run] |
| Number of integration tests (if any) | 408 backend tests on real PostgreSQL, in 30 CI steps (same run) |
| Number of automated e2e tests (if any) | 524 Playwright tests passing (58 auth + 466 scaffold), 218 still `test.fixme` (same run) |
| Coverage (explain why if not 100%) | Definition of Done: 100% of changed code, checked per PR in review. Whole frontend: 84.13% statements on 5 Nov [REFRESH: PR #436]. CI does not enforce a threshold, so older code has gaps |
| Current passing tests | All of the above on `main` `62e82081` (5 Nov); all checks green on `main` head `0773a721` [REFRESH: CI] |
| Current failing tests | 0 on `main` head. But one flaky frontend test failed on `main` on 5 Nov (`SessionEditor.test.tsx`, TC_E10S02_14) |
| CI status | Pass: all checks green on `main` `0773a721` (6 Nov) [REFRESH: CI] |
| Number of known unresolved defects | 0 open GitHub issues. Known gaps, each with a To Do story in Jira: Lead assign, reassign and oversight not on `main` (SCRUM-256 to 258), reuse a previous event not on `main` (SCRUM-259), configurable hold expiry (SCRUM-260, T-84). Also flaky focus tests [REFRESH: Jira, PR #436] |

**Question 2:** Which type of testing provided the least value to your team, and why?

**SLIDE CONTENT:**

- Unit tests that mocked the database
- A mock can't notice when the real schema has moved on
- In #355 the mocked tests passed; only the real-PostgreSQL suite caught a missing column
- So we added rollback-based database tests and Playwright runs for anything touching persistence (Definition of Done)

**SPEAKER NOTES** (Presenter: ________, about 1.5 minutes):
"Here are our numbers as of 5 and 6 November. We have 383 test cases written
in the Week 4 template, and we've run 249 of them by hand at least once. The
automated side has about 1,600 unit tests, around 400 tests against a real
PostgreSQL database, and just over 500 Playwright browser tests passing. Over
200 Playwright tests are still placeholders, and we're not counting those.

On coverage, our Definition of Done asks for 100% of changed code in each PR,
and reviewers check it. CI doesn't enforce it, and the whole frontend is at 84%.

Main is green today, but we had a flaky focus test fail on main on 5 November,
so we're not going to claim zero failures.

The least useful tests were unit tests that mocked the database. In PR 355
they all passed, and the real-database suite caught a missing column. That's
why our Definition of Done now says persistence needs real-database or
end-to-end evidence."

**SUGGESTED VISUAL:** Bar chart of the test counts by type (unit, real-DB,
Playwright, manual). Data source: this table.

**Evidence:** GitHub Actions run 42032706992 (log: backend `# tests 735`,
frontend `Tests 851 passed`, Playwright `58 passed`, `466 passed`, `218 skipped`);
`docs/testing/tc-coverage.md`; `CONTRIBUTING.md` Definition of Done.

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

- **No.** 249 of 383 test cases have a recorded hand-run; the rest are covered only by automation or not yet [REFRESH: docs/testing/runs]
- Process: tester sets up data with the SQL preconditions, follows the steps, takes their own screenshots, logs a run record (T-65, T-93)
- 121 manual sessions: 407 PASS, 9 FAIL, 30 SKIP rows [REFRESH: docs/testing/runs]
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
exists, so tests can't quietly drift from the backlog.

Has every case been checked by a person? No. 249 of 383 have a hand-run on
record. Those runs logged nine failures, and each one stays in the record as a
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
| How many CI failures (CI going red) did your team encounter during the project? | 339 failed runs of the required workflows (CI 175, Application Checks 107, LFS Guard 38, PR guardrails 19). 325 were on PR branches, 10 in the merge queue, 4 on `main` [REFRESH: GitHub Actions] |
| What was the most meaningful CI failure you encountered? | A flaky focus check in our frontend tests (issue #372, `RefusedEdit.navigation.test.tsx`, TC_E10S01_03) |
| What caused it, and how was it resolved? | The test checked focus right away, before React had moved focus. PR #373 waits for it instead (`waitFor`). The same pattern failed again on `main` on 5 Nov in another file, so we're now fixing it for all tests, not one file at a time [REFRESH: PR #436] |
| Did CI ever prevent faulty code from being merged? Give one example. | Yes. PR #320 (event cancellation): Typecheck failed on commit `cc7322f` (run 39831097976) because a test used an option `ByRoleOptions` doesn't have. A cached local check had missed it. Fixed before merge |
| Did you ever need to bypass CI (e.g. git force push / move code from local main to local branch)? Why? What did you do? | No. The ruleset blocks force pushes and has no bypass actors. Before it existed, four PRs (#148, #165, #166, #167) merged on 1 Oct without approval |

**SPEAKER NOTES** (Presenter: ________, about 1.5 minutes):
"CI runs on every PR, in the merge queue and on main. Four checks are required.
The biggest is application-checks, which runs typecheck, all the unit tests,
the real-database suites and Playwright.

We went red a lot: 339 failed runs. Almost all were on PR branches, which is
where you want them. Ten were caught in the merge queue, after approval but
before main. Four slipped onto main, mostly flaky frontend tests.

The most useful failure was one of those flaky tests. It checked focus before
React had moved it, so it passed on our laptops and failed in CI under load. We
fixed it with a wait, but the same pattern came back in another file on
5 November. Lesson: fix the pattern, not the file.

And CI did stop real bugs. PR 320 failed typecheck because a test used an
option that doesn't exist. Someone's cached local check had missed it."

**SUGGESTED VISUAL:** Screenshot of GitHub Actions run 39831097976 showing the
failed Typecheck step.

**Evidence:** `.github/workflows/ci.yml` (`on:` block); ruleset
`main-protection` required checks; issue #372; PR #373; PR #320; Actions
runs 39831097976 and 42039785462.

---

## Slide 13: CI Pipeline (ii)

**Question:** What are the most interesting things in your CI Pipeline that you wish to highlight? Why? Where did you get the idea from, and what benefits do you get from this?

**SLIDE CONTENT:**

1. **Backlog to test drift check:** `scripts/tc_coverage_audit.py` and `scripts/check_test_case_references.py` fail the build if a test case cites a scenario that no longer exists or was superseded
2. **Merge queue:** checks re-run on top of the latest `main` plus every PR ahead in the queue, so you don't need to "update branch" and get re-approved
3. **Diagrams render in CI:** the C4 Mermaid file must render (`mmdc`), so a broken architecture diagram fails the build (it caught one on `main` on 30 Oct)
4. **Evidence hygiene:** a run record and its screenshots must land in the same commit; secrets are scanned (detect-secrets, TruffleHog)

- Where the ideas came from: our own Sprint 2 retro (merge conflicts, stale approvals), Week 6 and 9 lectures (CI, regression), and GitHub's merge queue docs
- Benefit: docs and tests can't silently drift from the backlog, and reviewers stopped re-approving the same PR

**SPEAKER NOTES** (Presenter: ________, about 1 minute):
"Four things we're proud of. First, a drift check: if someone changes a story
and forgets the test cases, CI fails. Second, the merge queue. Before it, every
time main moved you had to update your branch, and that wiped your approval. The
queue tests your PR on top of the latest main for you. Third, our C4 diagrams
are code, and CI renders them, so a broken diagram is a broken build. That
happened once on main. Fourth, evidence: a run record and its
screenshots go in together, and secrets are scanned on every push. Most of
these came from our Sprint 2 retrospective, where merge conflicts and repeat
approvals were the top complaints."

**SUGGESTED VISUAL:** Simple pipeline diagram: PR, then four required checks,
then review, then merge queue, then `main`. Source: `.github/workflows/`
[CONFIRM: draw in Canva or reuse from `3. SYSTEM DESIGNS/` if one exists].

**Evidence:** `scripts/tc_coverage_audit.py`; `scripts/check_test_case_references.py`;
`docs/decisions/0012-merge-queue.md`; Actions run 41078692527 (30 Oct, C4
render gate); `docs/sprints/sprint-2-review-retrospective.md` (PR #440), Part B
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
Without that step, the bug would only have shown up for real users."

**SUGGESTED VISUAL:** Screenshot of Actions run 40331728045 with the red step
and the error line.

**Evidence:** PR #355; Actions run 40331728045; commit `2e7b580`;
`docs/testing/runs/20261026-215233-jininggg-backend-api.md`.

---

## Slide 15: Team Contribution and Ownership

**Question:** Complete: (add/delete rows based on no. of team members)

**SLIDE CONTENT (table: Team Member | Main Areas Worked On | Approx. Contribution | Code/PR Examples | Other Contributions).**
Keep the template's column header "Approx. Contribution" (the current deck
renamed it). Put the "share of commits" explanation in the cell text.

Approx. Contribution = share of commits on `main` per mapped Git author, out of
380 human commits (Dependabot excluded). Squash merges make this close to a
count of merged PRs. It is not a measure of effort, so the last column adds
Jira points and reviews. [REFRESH: `git shortlog -sne origin/main`]

| Team Member | Main Areas Worked On | Approx. Contribution | Code/PR Examples | Other Contributions |
| --- | --- | --- | --- | --- |
| Bryan (Product Owner) | CI/CD, repository tooling, Git rules and merge queue, architecture docs; Jira stories: Coordinator scope (E01-S12), Lead and Safety Officer sign-in (E01-S13), reuse a previous event (E02-S05), Lead queue, assign, reassign, oversight (E03-S08 to S10) | 46% (175 commits) | #96, #108, #195, #205, #232, #339, #378, #379 | Product Owner: backlog order, decisions (T-xx), acceptance; Week 7 change analysis (#205); PostPlan dashboards. 6 stories Done in Jira (27 pts), of which E02-S05 and E03-S08 to S10 (17 pts) are not on `main` yet; follow-ups SCRUM-256 to 259 (slide 5) |
| Amareet (Scrum Master) | Frontend skeleton and shared shell; tentative holds (E06-S05); technical support requests and staffing (E07-S06, E07-S07); attendee registration, capacity, period and list (E09-S01, S02, S03, S07); multi-session events (E04-S02) | 15% (58 commits) | #171, #172, #173, #245, #252, #326, #327, #353, #366, #368 | Scrum Master: Scrum events and Jira board; most reviews in the team (109 approvals); Definition of Done update for Week 7 guidance (#215); re-estimation (#213, #323); 14 manual run sessions. 8 stories Done (26 pts) |
| Lexin | Venue catalogue and layouts (E05-S01, S02), availability calendar and blocks (E05-S03, S04), venue unavailable over bookings (E05-S06), booking decisions (E06-S04), double-booking prevention (E06-S06), activity log (E14-S02, S03), Organiser registration fixes (E03-S11, S12); revert to planning (E08-S04), including automatic re-entry into Safety Review (#392); minor vs major edits (E10-S02); Venue Staff notification routing for E11-S01 (#271, #272) | 11% (43 commits) | #88, #134, #151, #190, #272, #298, #348, #349, #385, #392 | Migration 0025; 22 manual run sessions; 51 approvals. 13 stories Done (42 pts) |
| Aaron | Event request submit, draft and accessibility (E02-S01 to S03); auto-assignment, clarification and decision (E03-S01 to S03); setup and turnaround buffers (E05-S05); equipment reservation, unavailability, Sessions and warnings (E07-S04, S05, S08, S09); safety submission and Safety Officer check (E08-S03, E08-S06); waiting list and withdrawal (E09-S04, S05) | 10% (39 commits) | #174, #236, #283, #328, #361 | 24 manual run sessions; 75 approvals. 15 stories Done (60 pts), the most in the team |
| Jining | Account create, update and deactivate (E01-S04, S08, S11); venue search, near-match results and suitability (E06-S01, S02, T-63); booking requests and multiple venues (E06-S03); lost-venue recovery (E10-S05); change requests (E10-S01); notifications (E11-S01) | 9% (35 commits) | #143, #242, #299, #300, #355, #367 | 18 manual run sessions; 50 approvals. 9 stories Done (44 pts) |
| Xiang Ying | Early user flows and architecture (#9); log in and access control (E01-S01 to S03); Organiser event editing (#175); event and Session date validation (E02-S07); status tracking, comments and event details (E03-S05 to S07); equipment catalogue, requests and availability (E07-S01 to S03), including the stock and withdrawal fix (#265); automatic completion (E08-S05); attendance (E09-S06); event cancellation (E10-S04), which makes open change requests Obsolete and prefills a change request after a refused edit (#319, #363, #365) | 8% (30 commits) | #9, #175, #214, #216, #229, #265, #319, #320, #324, #343, #363, #365, #389, #420 | 25 manual run sessions, the most in the team; 31 approvals. 13 stories Done (45 pts) |

Areas come from the Jira stories each person owns (assignee) plus their own
PRs. A story owner is not always the only author: for example the waiting list
(E09-S04, Aaron's story) was built in Bryan's #379. All counts
[REFRESH: Jira assignees, GitHub PR reviews, docs/testing/runs].

[CONFIRM: Aaron and Jining check their own rows. Bryan, Amareet, Xiang Ying
and Lexin confirmed theirs on 6 Nov. Areas and PR numbers come from git and
Jira, not from self-reports.]

**SPEAKER NOTES** (Presenter: ________, about 1.5 minutes):
"This is who did what, from git and Jira. The commit share is lopsided. Bryan
has 46%, partly because he owned the tooling, CI and docs, which come as lots of
small PRs. That's why we also show story points Done and reviews: Aaron
finished the most product points, Xiang Ying ran the most manual test sessions,
and Amareet did the most reviews, over a hundred approvals. All six of us
shipped features and all six of us reviewed others' code. Every row was
checked by its owner."

**SUGGESTED VISUAL:** Small stacked bar per person: commits, approvals given,
story points Done. Data: this table.

**Evidence:** `git shortlog -sne origin/main`; GitHub PR list (authors and
approvals); Jira board 1 (assignee and points of Done product stories).

---

## Slide 16: Anything Else?

**Question:** Anything else you would like us to know about your project, process, or otherwise? (It's OK to put "N/A" here.)

**SLIDE CONTENT:**

- **Velocity (Jira, product story points Done at each sprint's end date):** S1 66 (one-week sprint), S2 66, S3 34, S4 53, S5 38 (1 to 5 Nov, short close-out; points Done by 5 Nov 23:59 SGT). Jira closed Sprint 5 on 6 Nov with all 14 stories Done; its 78-point close-date total includes 40 points moved to Done on 6 Nov, so 78 is not velocity (Product Owner confirmed 6 Nov)
- **Sprint Goal check:** Sprint 4's goal was to complete all remaining Release 1 stories. We didn't meet it: 53 of 85 points Done at the sprint end (62%), 32 points carried over to Sprint 5. Sprint 5's goal (finish E08-S04, E10-S01, E10-S02, E11-S01 and unblock E08-S06) was met when Jira closed it on 6 Nov, one day after its end date. E11-S01 had been carried since Sprint 2
- Release 1: all 64 original stories Done in Jira (244 points). 4 of them (E02-S05, E03-S08 to S10) are not on `main`, so on 6 Nov we added 5 follow-up stories to Release 1, all To Do: SCRUM-256 to 259 for those 4, and E06-S07 (SCRUM-260) for staff-set hold expiry (T-84) [REFRESH: final refresh item after PRs #442, #443 and #444 merge; the backlog review found the 64-story baseline out of date]
- All 20 Week 4 core features map to stories (`docs/bdr/F-core-feature-coverage.md`), but feature 5 "Coordinator Assignment" now means Lead assignment (Week 7 change 5), which is the gap above
- Design kept in step with code (Weeks 5 and 11): #371 maps every class-diagram method to the real function and adds a test for the error-class hierarchy the diagram shows
- **Done stays Done:** a missed requirement becomes a new linked story, following the instructors' guidance (`docs/plans/instructor-guidance-2026-10-06.md`) and T-74
- **What we'd do differently:**
  - Merge small slices every day. Long branches (the Lead work) are why change 5 isn't on `main`
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
shows every story Done, but four of them aren't on main, so they now have
follow-up stories.

What would we do differently? Merge smaller pieces every day. The Coordinator
Lead work sat on branches and isn't on main, even though Jira says Done, and
we should have caught that. Never mark Done before the merge. Fix flaky tests
as a pattern, not one by one. And keep sprints the same length so velocity is
comparable. Thanks, we're happy to take questions."

**SUGGESTED VISUAL:** Velocity bar chart, Sprints 1 to 5. Source:
`artifacts/sprint-burndown-velocity.html` or the PostPlan dashboard.

**Evidence:** `docs/plans/sprint-burndown-velocity-analysis.md` (reconciled 3 Nov:
Done at each sprint's end date; Sprint 4 53 Done of 85, 32 carried over);
Jira Sprint 5 report and issue history (closed 6 Nov 15:05 SGT; SCRUM-256 to 260);
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
3. Open all three Drive links in a private window.
4. Each member reads their row on slide 15.
5. Everyone reads slides 4, 5, 7 and 16 out loud once: any of us can be asked about any answer.
