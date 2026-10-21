# Supporting audit: Definition of Done and source-of-truth wording

**Purpose:** Exact current wording and conflict inventory supporting the concise prospective proposal. This audit does not adopt policy or change historical records. Source quotations below are retained from the earlier inventory.

## Current wording inventory

These are the active governing statements and linked records that expose the policy seams. Historical run records and old handoffs are not treated as policy sources.

### Repository policy and testing

[`CONTRIBUTING.md`](../CONTRIBUTING.md#definition-of-done), “Definition of Done,” lines 103–129:

> A product backlog item is considered done only when all of these conditions are met:
>
> - Acceptance criteria stated in the user story are satisfied.
> - Automated tests pass, including unit, integration, or end-to-end coverage where relevant to the change. Acceptance criteria that involve persistence or interactions between features are evidenced by real-database or end-to-end runs, labelled as such in the PR; mocked tests alone do not satisfy them.
> - Unit tests cover the new and changed code at 100%, including boundary and error cases, or the PR states why a gap cannot be covered.
> - Integration and manual end-to-end tests are run before the Sprint Review using the test case template in `docs/testing/cases/`, and each run is logged in `docs/testing/runs/` with the tester, date and outcome (T-65).
> - Code and its test cases have been reviewed by at least one other developer, who checks that the code works and that the tests are correct and valid, not faked. AI-generated code and tests are inspected by a human before review.
> - Peer review was requested only after the PR was review-ready: no merge conflicts, up to date with `main`, and required checks passing or queued for the latest commit.
> - Documentation, architecture views and project logs are updated where the change affects setup, interfaces, decisions, backlog interpretation, or team workflow.
> - The item is merged into `main` through the reviewed pull-request process.
>
> An item that does not meet all Definition of Done conditions is not counted as complete and returns to the Product Backlog.
>
> A story marked Done stays Done. If a Done story later needs a fix or a change, create a new user story for it and record what went wrong and how the team prevents it (instructor guidance of 6 October 2026).

[`AGENTS.md`](../AGENTS.md), lines 35–43:

> Before starting or reviewing any user story, read the Definition of Done in
> `CONTRIBUTING.md` and the grading guidance in
> `docs/plans/instructor-guidance-2026-10-06.md`: human review of code and test
> cases, 100% unit coverage of changed code (or a stated reason), manually
> logged end-to-end runs before the Sprint Review, and Done stories are never
> reopened.
> For product, backlog, design, testing, or Jira work, also read
> `docs/source-of-truth.md` before editing derivative Markdown, Figma notes, Jira
> issues, or scaffold files.

The same file has a conditional bootstrap statement at lines 3–5:

> This repository is a school web application monorepo. The stack is not selected
> yet, so repository tooling and documentation are the source of truth until real
> frontend and backend code exists.

That condition no longer describes the present application repository, but the
wording remains live in the instructions and should be reviewed as part of any
future cleanup. It is not used here to override the more specific authority
rules below.

[`docs/source-of-truth.md`](source-of-truth.md), lines 3–5:

> GitHub Markdown is authoritative for ConnectSphere's backlog, architecture
> decisions, backlog decisions, and acceptance test cases. Jira, spreadsheets,
> Word exports, Figma notes, and PostPlans follow those sources.

Its “Authority order,” lines 39–45:

> 1. Canonical Markdown requirements and accepted decisions above.
> 2. Merged code, tests, PR review records and recorded verification establish
>    delivery against those requirements. A merged PR alone does not satisfy the
>    [Definition of Done](../CONTRIBUTING.md#definition-of-done).
> 3. Jira, generated exports, planning summaries, Figma and PostPlans are views of
>    that evidence. A Jira Done flag does not override missing acceptance criteria.

[`docs/backlog/README.md`](backlog/README.md), lines 3–13, states:

> This directory holds the canonical product backlog for ConnectSphere. It is
> authoritative. The Excel workbook (`docs/CONNECTSPHERE BACKLOGS CAA
> <DDMMYYYY>.xlsx`) is a generated export produced by
> `scripts/export_backlog_xlsx.py` from these Markdown files; when the two
> disagree, Markdown wins.
>
> Architecture and backlog decisions are also authoritative in `docs/adr/` and
> `docs/bdr/`, per repository decision 0005.

The current [`docs/bdr/README.md`](bdr/README.md), line 9, says “The backlogs
themselves are canonical Markdown under `docs/backlog/`; generated workbook
`CONNECTSPHERE BACKLOGS CAA 161026.xlsx` contains story data.” Decisions 0004 and
0005 separately name backlog Markdown and ADR/BDR Markdown as authoritative.
`docs/source-of-truth.md` lines 126–130 further says:

> `design.md` at the repository root is the design-language authority for the
> frontend: tokens, building blocks, states, wording and accessibility rules.
> The shared skeleton in `frontend/src/shared/` implements it; where the two
> disagree, the difference is raised in `design.md` and resolved in review
> (ADR-017). Figma boards are proposals derived from these sources.

[`docs/testing/README.md`](testing/README.md), lines 10–14 and 57–67:

> Do not implement story assertions in the reference copy under
> `frontend-verification-scaffold-v5/`. Update canonical `docs/testing/cases/`
> first, then update/promote the matching runnable tests. Regenerate dated XLSX
> exports with `scripts/export_testcases_xlsx.py`.
>
> `docs/testing/runs/` holds one Markdown file per test run session. Record a run
> when it is used as evidence: cited in a pull request, offered as proof that a
> story meets its Definition of Done, or shown in a demo. Exploratory runs during
> development need no record, and CI runs are already covered by their Actions
> logs unless someone cites one.

[`docs/testing/runs/README.md`](testing/runs/README.md), lines 12–24:

> Record a run when it is **used as evidence**: cited in a pull request, offered
> as proof that a story meets its Definition of Done, or shown in a demo. This
> obligation is team decision **T-65** in `docs/bdr/B-team-decisions.md`; this
> document defines only the format that satisfies it.
>
> You do not need a record for exploratory runs while developing -- the `npm test`
> you run twenty times while writing a function is not evidence of anything.
> Neither is a CI run by default: those already have an immutable Actions log with
> a URL. Record a CI run only when citing it as evidence, with `environment: ci`
> and the run URL in `Remarks`.
>
> The test is whether someone later needs to see that this ran, on this commit,
> with this outcome, and who ran it.

[`docs/bdr/B-team-decisions.md`](bdr/B-team-decisions.md), T-65 at line 71, says a record is required only when a run is used as evidence; exploratory runs need none; CI is covered by Actions unless cited; and records are immutable once merged. T-93 at line 99 requires manual-run screenshots to be hand-taken, named by TC_ID, and kept with the session record; agent or Playwright screenshots do not count as manual evidence.

T-65's exact scope sentence is: “A record is required only when a run is
**used as evidence**: cited in a pull request, offered as proof that a story
meets its Definition of Done, or shown in a demo.” Its exact immutability
sentence is: “Records are immutable once merged, so a later catalogue revision
never rewrites history.”

[`docs/jira-agent-workflow.md`](jira-agent-workflow.md), “Definition of done,” lines 68–81:

> The definition of done should not live only in one agent's prompt. Put it in Jira
> as either a project-level checklist, an issue template, or repeated issue
> checklist fields if the team's Jira plan supports that.
>
> Minimum issue-level done evidence:
>
> - acceptance criteria reviewed against the source documents;
> - linked branch and pull request;
> - repository checks run with the result stated accurately;
> - relevant frontend/backend/test evidence once application checks exist;
> - screenshots or Figma frame links for UI work;
> - reviewer approval and unresolved review comments addressed.

The same file, lines 109–120, maps “PR approved and checks pass” to “Ready to Merge” and “PR merged” to “Done, after definition of done is satisfied,” then says not to transition solely on merge when required evidence or documentation is missing.

The exact final guard in that section is:

> Do not auto-close or auto-transition issues to Done solely because a PR merged if
> the issue still lacks test evidence, design review, migration notes, or source
> document updates required by the definition of done.

[`docs/plans/instructor-guidance-2026-10-06.md`](plans/instructor-guidance-2026-10-06.md), lines 102–118, says the DoD is “Beyond satisfying Acceptance Criteria (AC) and passing tests,” calls for human code and test reviews, and says “Reviews: Product Owner checking the DoD and verifying E2E testing.”

The current DoD in CONTRIBUTING says a Done story stays Done. BDR [`T-74`](bdr/B-team-decisions.md#L80) instead says:

> A Done story stays Done; new behaviour that touches it is a new story; an incomplete story is updated in place; a story is reopened only when one of its original criteria turns out unsatisfied

Instructor guidance, lines 68–72, explicitly identifies this mismatch and says T-74 needs amending or its exception needs a documented justification.

### Handoff and pull-request wording

[`AGENTS.md`](../AGENTS.md), lines 78–84, says to record every test run used as evidence in `docs/testing/runs/`, with a session record before committing. The per-task handoff guide, [`.agents/handoffs/README.md`](../.agents/handoffs/README.md), lines 29–35, says a handoff may record decisions “without team sign-off” for reviewer attention, while test runs used as evidence still go in T-65 records. Neither guide distinguishes a draft PR from a ready PR; T-65 says “a pull request.”

The [PR template](https://github.com/hongyime/sgConnectSphere2026/blob/main/.github/pull_request_template.md), “Verification,” requires:

> For every test run cited as evidence give the command, the commit it ran on,
> the outcome and the environment (`local` or `ci`), and say whether it ran
> against mocked data or a real database. Acceptance criteria that involve
> persistence or interactions between features need real-database or end-to-end
> evidence; mocked tests alone do not satisfy them.

Its checklist includes:

> - [ ] Application tests pass (`npm test` / Playwright) — _command, commit, outcome, environment:_ `____` — _mocked or real database:_ `____` — _execution record in `docs/testing/runs/`:_ `____` or N/A
> - [ ] Manual verification done — _screenshot folder in `docs/testing/runs/evidence/` (T-93) and PostPlan link (recommended to show the screenshots):_ `____`
> - [ ] Branch up to date with `main`, no conflicts, required checks green — _last commit SHA:_ `____`

The template has no explicit “draft is not accepted/Done” item and does not identify a final story sign-off role.

Relevant statements in the linked PR bodies:

- [PR #308](https://github.com/hongyime/sgConnectSphere2026/pull/308), “Verification” and “Checklist”:

  > - Venue Staff T-65 manual acceptance remains open.
  > - [x] One logical change, conventional title — PR title: `feat(venues): prevent overlapping booking approvals (SCRUM-50)`.
  > - [x] `python scripts/check.py` passes — repository hygiene and tooling tests passed.
  > - [x] Application tests pass — SCRUM-50 targeted suites passed; the latest complete full GitHub Actions run on `2871ece` passed. An intervening transient failure on unrelated `TC_E03S12_01` is documented above.
  > - [x] Regression tests added — `backend/tests/venueBookingDecisions.test.ts`, `backend/tests/venueBookingDecisions.integration.test.ts`, `frontend/src/features/venue/BookingRequests.test.tsx`.
  > - [ ] Manual verification done — T-65/T-93 browser run and hand-taken screenshots are pending; postplan: https://z9wjs849lf87.postplan.dev.
  > - [ ] Branch up to date with main, no conflicts, required checks green — this is intentionally stacked on the #298 branch; current-head application checks are green.
  > - [x] Documentation/architecture updated if affected — migration comment, regenerated `docs/testing/tc-coverage.md`, T-65 records and handoff updated; ADR-003 reused.
  > - [x] TC_IDs traced from story to test title — TC_E06S06_01–07.
  > - [x] Copy-forward rules followed — no CAA-dated file changed.
  > - [x] Backlog derivatives checked — no backlog source changed.
  > - [x] Diff reviewed — no secrets, credentials, or generated build output included.

  “Follow-ups” says “Keep SCRUM-50 open until human review and this manual acceptance are recorded.”

- [PR #298](https://github.com/hongyime/sgConnectSphere2026/pull/298), “Checklist”:

  > - [x] One logical change, conventional title — _PR title:_ `feat(venue): decide on venue booking requests (SCRUM-48, E06-S04)`
  > - [x] `python scripts/check.py` passes — _CI run:_ `repository-checks passed for 5fea91a: https://github.com/hongyime/sgConnectSphere2026/actions/runs/38894770700/job/116952499221`
  > - [x] Application tests pass (`npm test` / Playwright) — _command, commit, outcome, environment:_ `npm test 431/431, vitest 436/436, test:db 138/140 (2 pre-existing on main), playwright 12/12, all at f097571, local` — _mocked or real database:_ `real for test:db and the manual run; mocked for unit, Vitest and Playwright` — _execution record in `docs/testing/runs/`:_ `20261017-002350/002555/002434/002458 and 20261016-185304 (manual)`
  > - [x] Regression tests added where needed — _test file(s):_ `backend/tests/venueBookingDecisions.test.ts, backend/tests/venueBookingDecisions.integration.test.ts, frontend/src/features/venue/BookingRequests.test.tsx, frontend/src/features/events/ActivityLog.test.tsx, tests/e2e/venueBookingDecisions.spec.ts`
  > - [x] Manual verification done — _screenshot folder in `docs/testing/runs/evidence/` (T-93) and PostPlan link (recommended to show the screenshots):_ `docs/testing/runs/evidence/20261016-185304-lexinphun2024-debug-frontend-e2e/; PostPlan https://27gi9ze3wxl6.postplan.dev`
  > - [x] Branch up to date with `main`, no conflicts, required checks green — _last commit SHA:_ `7d674fe` (merged latest main 17 Oct, conflicts resolved; all 14 checks passed)
  > - [x] Documentation/architecture updated if affected — _file:_ `docs/testing/manual/E06-S04-click-through.md, docs/plans/screen-inventory.md, .agents/handoffs/20261005-feature-SCRUM-48-decide-venue-request.md`
  > - [x] TC_IDs traced from story → test title — _TC_IDs:_ `TC_E06S04_01 to TC_E06S04_06 (TC_07 pending the PO); TC_E06S02_04 (staff side)`
  > - [x] Copy-forward rules followed if CAA-dated file touched — _new filename:_ `N/A`
  > - [x] Backlog derivatives updated if backlog changed — _derivatives checked:_ `N/A, backlog unchanged`
  > - [x] Diff reviewed for secrets and generated files — no credentials, `.env` values, or personal paths

  The PR's “What and why” says “Please do not merge until the Product Owner decides TC_E06S04_07.” It also says “Not tested: TC_E06S04_07 (release logging), pending E10-S04.” “Follow-ups” says “Product Owner: where TC_E06S04_07 belongs (T-76 proposes E10-S04). Blocks merge.”

- [PR #299](https://github.com/hongyime/sgConnectSphere2026/pull/299), “Checklist”:

  > - [x] Scope traced to E06-S03 / SCRUM-47, follow-up to #274/#280.
  > - [x] Regression tests and real-database evidence recorded; dependency skips disclosed.
  > - [x] Manual evidence retained with limits and initial failure recorded.
  > - [x] Contract, schema notes, manual guide and generated coverage inventory updated.
  > - [ ] Required CI checks and current-head review on `929f49f` (prior checks cited below remain historical).
  > - [ ] Human review of code and test cases, especially Le Xin's integration review.
  > - [x] Hosted PostPlan: https://yn2ouq6ojr23.postplan.dev

  “Follow-ups” says “This PR is ready for human re-review, not held by the obsolete ‘Keep draft’ instruction.” It also says “Manual staff approval/race/API security checks were not exercised in this PR's human runs” and “This PR alone does not declare E06-S03 Done.”

### Jira wording

The read-only issue descriptions are [SCRUM-50](https://theprawnworkspace.atlassian.net/browse/SCRUM-50), [SCRUM-47](https://theprawnworkspace.atlassian.net/browse/SCRUM-47), and [SCRUM-48](https://theprawnworkspace.atlassian.net/browse/SCRUM-48).

SCRUM-50 labels its source:

> Canonical GitHub source: https://github.com/hongyime/sgConnectSphere2026/blob/1956509/docs/backlog/release-1/E06-venue-search-booking.md
> Current source: https://github.com/hongyime/sgConnectSphere2026/blob/main/docs/backlog/release-1/E06-venue-search-booking.md

SCRUM-47's source lines are:

> Canonical merged source (reconciled 10 October 2026): https://github.com/hongyime/sgConnectSphere2026/blob/f4d5308f0255420e0123ca516c18c6d50affdca8/docs/backlog/release-1/E06-venue-search-booking.md
> Current source: https://github.com/hongyime/sgConnectSphere2026/blob/main/docs/backlog/release-1/E06-venue-search-booking.md

SCRUM-48's source lines are:

> Canonical GitHub source: https://github.com/hongyime/sgConnectSphere2026/blob/c35b527892c8c4ed40c472dbc6d54568d5daf66e/docs/backlog/release-1/E06-venue-search-booking.md
> Current source: https://github.com/hongyime/sgConnectSphere2026/blob/main/docs/backlog/release-1/E06-venue-search-booking.md

Each Jira description ends with this exact rule:

> GitHub Markdown and accepted decisions govern scope. Jira assignee is the accountable owner; contributors above retain their implementation/review credit. Estimates and original sprint assignments are retained.

SCRUM-50 describes five acceptance scenarios, including buffered-window conflicts and per-venue scope. SCRUM-47 describes E06-S03 acceptance scenarios. SCRUM-48 currently describes three scenarios, while PR #298 describes five, including overlap blocking and audit logging. Jira has no issue-level DoD field in these descriptions, and they name an accountable assignee without stating who gives final Product Owner acceptance.

At inspection, SCRUM-50 was To Do / Sprint 3 / 5 points; SCRUM-47 and SCRUM-48 were In Progress / Sprint 3 / 3 points each. These are read-only status snapshots, not policy text.

## Ambiguities and conflicts

1. **What “Done” requires and when.** CONTRIBUTING makes acceptance criteria, automated checks, real-database evidence where relevant, manual end-to-end runs before Sprint Review, peer review, coverage, documentation, and merge to `main` cumulative gates. Green CI or a merged PR alone is insufficient. The Jira workflow says the same, but the PR template permits a reviewable PR with its manual box unchecked without saying whether it may merge before manual acceptance. The DoD sets manual timing relative to Sprint Review, not explicitly relative to merge.
2. **Which artifact controls.** `docs/source-of-truth.md` makes Markdown requirements and accepted decisions authoritative and Jira a view. `docs/jira-agent-workflow.md` also says the DoD should be put in Jira if supported, without stating whether that is a copied checklist or a competing policy source. Jira cites both a commit-pinned “canonical” source and `main` as “Current source,” without explaining which wins if they differ or how an unmerged PR proposal is treated. PR bodies summarize scope/evidence but are absent from the authority order.
3. **Who signs off.** CONTRIBUTING requires another developer to review code and tests. Instructor guidance says the Product Owner checks the DoD and E2E testing at review. Jira says the assignee is accountable. No single statement says whether reviewer approval and PO acceptance are both required, who records acceptance, or how Venue Staff's manual result becomes PO acceptance. #298 explicitly waits on a PO decision; #308 asks for human review and manual acceptance without naming the final approver.
4. **Draft PRs and evidence.** T-65 requires a record when a run is cited in “a pull request,” without distinguishing draft from ready. Draft PRs can therefore cite available T-65 evidence, but the text does not explicitly say whether a draft can carry preliminary records or that its status can never count as final acceptance. #308 shows a draft with automated records linked and manual acceptance pending.
5. **Stacked PR checklist.** The template asks for a branch up to date with `main`; #308 targets a dependency branch and leaves the checkbox open while reporting green checks. There is no rule distinguishing readiness of an intermediate stacked PR from story completion after the full chain reaches `main`.
6. **Done-story correction.** CONTRIBUTING / AGENTS say Done stories are never reopened; T-74 allows reopening when an original criterion was unsatisfied. Instructor guidance expressly leaves open whether T-74 should be amended or justified. This is unresolved policy, not permission to alter historical Jira records.
7. **Jira checklist drift.** SCRUM-48's Jira description has three scenarios while PR #298 describes five and marks a PO-dependent TC_E06S04_07 as blocking. The repository authority rule points scope to canonical Markdown, but does not say who reconciles Jira's checklist or when a stale Jira description blocks approval.
