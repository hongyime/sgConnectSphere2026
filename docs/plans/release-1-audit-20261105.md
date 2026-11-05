# Release 1 audit 5 November 2026

## Purpose and method

This is an evidence audit and submission manifest for ConnectSphere Release 1.
It separates current requirements, verified repository evidence, live Jira
state, and unresolved work. It does not treat a merged pull request, a Jira
status, a generated coverage inventory, or an agent result as Product Owner
acceptance.

The audit read the original customer archive in date order, the course lecture
slides, canonical Markdown, the current `main` tree at `1e286f75`, live Jira in
read-only mode, and the current tracked presentation deck. Client changes in a
later source take precedence over earlier wording. BDR decisions are labelled
as team choices rather than customer requirements.

### Assumptions

- The external staging directory is `C:\Users\bryan\IS212-submission`; the
  repository remains the source for committed Markdown, scripts, code and tests.
- The staged package contains only copies or generated exports of evidence that
  exists at packaging time. It does not reconstruct meetings, manual runs,
  approvals, or deployment facts.
- Jira was queried only for the current snapshot. No issue status, estimate,
  sprint or assignee was changed by this audit.
- The fixed `tc-coverage.md` measures literal TC_ID references, not behavioural
  completeness, code coverage or acceptance.

### Team identity mapping

The user confirmed the team-role mapping after a private reconciliation of Git
history and a read-only Jira lookup: Bryan — Product Owner (also codes);
Amareet — Scrum Master (also codes); Aaron, Xiangying, Lexin and Jining —
Developers. Git aliases and Jira account identifiers are deliberately not
reproduced here. Commit counts are not a measure of contribution and must not
replace the role-specific PR, review and ceremony evidence.

## Customer requirement provenance

| Source | Requirement coverage and locator |
| --- | --- |
| `Week 1 Customer Briefing.docx` | pp. 3–7: baseline organiser-to-coordinator-to-arrangements-to-confirmation-to-registration workflow, role/relationship access, change impact, notifications and auditability. |
| `Week 2 User Story Assignment.pdf` | pp. 1–3: user-story card fields, acceptance criteria and INVEST. |
| `G1G2 Week2 Clarification.xlsx` | `Sheet1` nonblank-question rows 2–59 map in order to BDR C-01–C-54 (row 4 continues C-01's answer). Later customer answers supersede conflicting rows. |
| `Week 4 Project Instructions.docx` | p. 3: the 20 core features and coherent end-to-end scope; pp. 3–5: the required seven-folder submission and rubric emphasis on traceability, testing, CI, process and explainability. |
| `G1G2 Week4 Clarification.xlsx` | `Sheet1` rows 2–11 map in order to BDR C-55–C-64. |
| `Week 7 Customer Changes.pdf` | pp. 1–2: the six mandatory Release 1 changes, recorded in document order as BDR C-65–C-70. |
| `Week 7 Guide to Managing Changes.pdf` | pp. 1–3: change-impact analysis, downstream backlog/design/test updates and preservation of completed-story history. |
| `G1G2 Week9 Clarification.xlsx` | `G1G2` rows 2–67 map in order to BDR C-71–C-136. These are the latest customer clarifications. |

`docs/bdr/A-customer-clarifications.md` preserves the customer answer and
current interpretation for every C-ID. `docs/bdr/F-core-feature-coverage.md`
maps the 20 Week 4 features to Release 1 stories; it is a scope map, not proof
of delivery.

## Course-method audit

The submission package should show the following course practices, not merely
name them:

- Product Backlog: Product Goal, prioritised and estimated INVEST-ready stories,
  measurable acceptance criteria, Jira linkage, and AC-to-test-to-evidence
  traceability (Weeks 1b and 2).
- Scrum events: Planning goal/capacity/dependencies; Daily Scrum adaptation and
  blockers; Review inspection and stakeholder feedback; Retrospective actions
  with follow-through. Refinement is ongoing work, not a Scrum event (Week 3).
- Design: C1/C2, selected C3/C4 views where useful, concise ADRs and diffable
  diagrams (Weeks 4 and 5).
- Testing: test specifications have ID, scenario, preconditions, steps, data and
  expected result; executions separately record actual result, tester, date,
  status and evidence (Week 4). Coverage is diagnostic, not a correctness or
  acceptance claim (Week 6).
- Repository and AI accountability: coherent short-lived PRs, human review,
  protected main, CI, named ownership and an evidence trail (Weeks 5, 6 and 10).

## Current evidence snapshot

- Requirements and cases: Release 1 has canonical epic files in
  `docs/backlog/release-1/` and acceptance-case files in `docs/testing/cases/`.
- Architecture: the current package includes architecture, C4, modular-monolith,
  schema, user-flow, class-diagram, API-contract and ADR sources.
- Automated-test inventory: regenerating `docs/testing/tc-coverage.md` at this
  snapshot reports 386 catalogue cases: 326 explicit active TC_ID tests, 47
  scaffold-only IDs and 13 IDs with no matching test title. The former conclusion
  that every ID was scaffolded and only three were absent was corrected in this
  audit.
- Test records: at the audit snapshot, `docs/testing/runs/` contains 944
  immutable run records (excluding its README and template) and 76
  evidence directories. These prove only the runs and observations each record
  describes; they are not a blanket Release 1 acceptance receipt.
- Live Jira snapshot: of 47 historically mapped Release 1 keys, 43 are currently
  `Done`; `SCRUM-61`, `SCRUM-70`, `SCRUM-71`, and `SCRUM-75` are `In Progress`.
  This is a current read-only observation, not a delivery count or an acceptance
  decision. The mapping does not replace review of newer or un-mapped backlog
  follow-ups.
- CI configuration runs application checks, but it does not enforce a coverage
  threshold. The backend aggregate coverage command excludes several suites and
  all `api/` handlers, as documented in `docs/testing/coverage-audit.md`.
- The latest `main` application-checks run at this snapshot failed one frontend
  test: `SessionEditor.test.tsx` expected focus on the review panel but observed
  focus on `body` (850 of 851 tests passed). This is a failing CI signal, not a
  Release 1 acceptance result; it needs a scoped code/test diagnosis before
  submission.
- Branch verification recorded on 5 November: frontend coverage passed 851/851
  tests across 76 files (84.13% statements); the backend unit coverage suite
  and `scripts/check.py` also passed. The branch makes asynchronous component
  test execution reliable under coverage with the isolated `vmThreads` pool,
  a 10-second test budget and a three-second DOM-query budget. Database and
  browser end-to-end suites were deliberately not rerun locally.

## Material gaps and required follow-up

### E03 Lead assignment and reassignment

Week 9 C-100/C-127 require multiple Leads with system-wide visibility;
C-104/C-128 require immediate Lead reassignment; C-129/C-130 and T-83 make
assignment and reassignment Lead-only. The canonical E03-S08/S09/S10 backlog
and cases are corrected in this audit to reflect those rules.

The implementation is not aligned: submission still auto-assigns the
least-busy Coordinator, the Lead UI has no assignment/reassignment/oversight
controls, and the superseded Coordinator request/accept/decline workflow is
still exposed. This is a product implementation gap, not a documentation-only
finding. A follow-up must update the lifecycle service, assignment API, Lead
screens, notifications, access-denial/audit behavior and real-PostgreSQL and
browser tests. It must not rewrite historic E03-S01 evidence.

### E06 configurable tentative holds

T-84 supersedes the Sprint 3 T-92 defaults for future work: no default expiry,
Venue Staff-configured expiry, Coordinator-configured warning at or before
expiry, and no more than two reasoned extensions. The existing code still
defaults to 48 hours, has no warning state and permits unlimited reasonless
extensions. E06-S05 is historical Done evidence, so this is a new follow-up
story rather than a silent rewrite of the original acceptance evidence.

The customer/BDR sources do not settle whether an unconfigured requested hold
reserves a venue. Current `holdsVenue()` treats a null expiry as non-reserving.
Resolve that lifecycle before a migration or UI change; otherwise an attempted
fix can create a double-booking or indefinite-hold defect.

### E11 notification evidence

E11-S01 remains `In Progress` in the live Jira snapshot. The latest manual
records establish scoped quarantine-email receipt and selected venue-staff/actor
observations, not general normal-Inbox delivery or timeliness. They retain
deployment-SHA, independent-review and Product Owner/delegate-acceptance
limitations. The notification matrix now names T-84 warnings and removes the
retired Coordinator-to-Lead reassignment request.

### Process and package evidence

- The tracked material has a Sprint 1 retrospective, Sprint 2 sequencing note,
  delivery ledger and burndown analysis, but no local Sprint 2–4 Planning,
  Review, Retrospective or stand-up minutes with dates, attendees, venues and
  actions. Do not manufacture them.
- The tracked Week 11 deck still has obsolete workbook paths, counts, a
  placeholder ceremony link and point-in-time claims. It must be refreshed from
  the staged manifest and this audit before submission.
- The lecture archive does not include the official final-deck template said to
  be on eLearn. Do not claim that the local deck is the latest official template
  without confirmation.

## Submission staging rules

Stage the external package in the seven folder names required by Week 4. Copy
the current Markdown authorities and regenerated exports together, preserve the
whole test-record/evidence tree, and put every unsupported claim in the external
`_CONFIRM-release-1-audit.md` checklist. Do not add binaries to this pull
request.

The exact staged-file list and hashes are generated at packaging time, so it
describes the actual package rather than a projected one.

## Sources used

- Original client archive: `docs/bdr/customer-sources/`.
- Course slides: `docs/slides/lecture/`.
- Current source hierarchy: `docs/source-of-truth.md`.
- Instructor guidance: `docs/plans/instructor-guidance-2026-10-06.md`.
- Live Jira snapshot: queried read-only on 2026-11-05 using local credential
  variables; no credentials or account identifiers are recorded here.
