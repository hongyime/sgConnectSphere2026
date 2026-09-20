# Sprint 1 delivery and contribution ledger

Audited 20 September 2026 against GitHub `main` at `c35b527` and live Jira.
This is the progress/evidence companion to the canonical requirements in
`release-1/`, not a change to their scope, estimates or original sprint allocation.

## Window and counting rules

- Jira sprint 34: **14 September 2026 10:00:06 to 20 September 00:00 Singapore
  time** (`2026-09-14T02:00:06.711Z` to `2026-09-19T16:00:00Z`).
- The sprint end date has passed; Jira still reported the sprint **active**.
  The team should complete it after review and agree how to move open work.
- **47 Release 1 stories / 155 points**. The full product view has 71 distinct
  story IDs, including these 47; do not add the two directory totals.
- **12 planned Sprint 1 stories / 36 points** have merged implementation work.
  **8 stories / 24 points** have sufficient evidence for Done at this audit;
  **4 stories / 12 points** retain scope, review or integration-verification gaps.
- Release 1 therefore has **39 stories / 131 points remaining**: those four
  Sprint 1 items plus 35 later-sprint stories / 119 points.
- **71 merged PR records** fall inside the sprint timestamps: **66 into main**
  and **5 into stacked feature branches**, subsequently integrated. These are
  activity records, not 71 independent features. There were 13 earlier merged
  PRs; cumulative merged PRs through the cutoff total 84.
- Jira corrections were applied on 20 September. They were not backdated.
  Historical burndown and current evidence-based completion can differ.
- Existing extension-ticket estimates total 44 points but were changed during
  the sprint. They are not added to the 36-point baseline as comparable velocity.
  Duplicate and superseded closures do not count as delivered scope.

## Planned Sprint 1 stories

PR links below use `https://github.com/hongyime/sgConnectSphere2026/pull/<number>`.
Every Jira story description now links its exact GitHub source, BDR/ADR catalogue
and acceptance-case file, with the contribution and limitation notes below.

| Story / Jira | Pts | Audited state | Implementation and collaboration | Evidence / outstanding work |
| --- | ---: | --- | --- | --- |
| E01-S01 / SCRUM-16 | 3 | Done | Xiang Ying: final login/recovery and ADR-016. Bryan: earlier session, lockout and routing foundation; integration of #95. | #91, #95; seven TC_IDs in real PostgreSQL/API/browser tests. Real deployed inbox and worker cadence remain rollout checks. |
| E01-S02 / SCRUM-17 | 5 | Done | Xiang Ying: organisation-scoped visibility. Bryan: API/auth integration. | #41, #78, #82; client isolation and direct-access rejection. |
| E01-S03 / SCRUM-18 | 3 | Done | Xiang Ying: attendee projection and internal-planning refusal. Le Xin: additional denial logging. Bryan: route repair. | #42, #78, #88; published fields only and access-denial coverage. |
| E01-S04 / SCRUM-19 | 1 | In Progress | Ji Ning: profile update API/UI, validation, persistence and email routing. Amareet: explanation, feedback and layout polish. | #47, #87, #90, #98. Organisation updates remain required by the backlog and TC_E01S04_01, but `profile.ts` rejects them. Resolve permission rules or approve an explicit scope amendment. |
| E01-S08 / SCRUM-23 | 3 | Done | Ji Ning: public attendee registration, password hashing, uniqueness and role control. Bryan: separate verification/outbox extension. | #43; extension work in #64/#68 is additional engineering work, not another E01-S08 completion. |
| E01-S11 / SCRUM-25 | 3 | Done | Ji Ning: deactivation, session revocation, coordinator checks, registration withdrawals and audit transaction. Bryan: T-52–T-55 clarification. Amareet: earlier UX groundwork. | #93, reviewed by Xiang Ying; `docs/testing/account-deactivation.md`. E09 must later prove another attendee can book a released place. |
| E02-S01 / SCRUM-26 | 5 | In Review | Aaron: ten-field submit flow. Xiang Ying: parser/date/attendance/retry regressions. Bryan: initial form/persistence foundation and integration. | #29, #36, #56, #73, #78, #82. Real database create/read roundtrip for migration 0005 remains explicitly open in SCRUM-110; mocked browser tests do not prove it. |
| E02-S02 / SCRUM-27 | 3 | In Review | Aaron: save/reopen/edit/delete/submit drafts and owner privacy; subsequent accessibility-reopen fix. | #79, #94. T-57 allows seven incomplete fields. #79 has zero submitted reviews; reviewed #99 explicitly records this DoD gap. Obtain a teammate review of the complete merged slice. |
| E02-S03 / SCRUM-28 | 1 | Done | Aaron: controlled vocabulary, persistence, matching and reopen fix. Amareet: initial checklist UX. | #87, #94. T-60 accepts backend-only matching and structural Coordinator visibility; AC3 browser case intentionally remains fixme. |
| E05-S01 / SCRUM-40 | 3 | Done | Le Xin: catalogue backend, capacity/retirement and duplicate rules. Amareet: live CRUD UI and fixes. Bryan: earlier mock-screen foundation. | #48, #86, #89, #92, #98; frontend and backend jointly deliver the story. |
| E05-S02 / SCRUM-41 | 3 | Done | Le Xin: layout/capacity operations and SQL filtering. Ji Ning: identified filter-before-limit bug in review. Amareet: layout UI. | #71, #72, #89, #92. Future E06 owns the event-context Coordinator search UI. |
| E14-S02 / SCRUM-86 | 3 | In Progress | Le Xin: atomic status-change logging and denial coverage. Ji Ning: deactivation logging. Bryan: original audit/lockout foundation. | #31, #58, #88, #93. #88 explicitly shipped partial scope; booking approval/rejection/release logging and relevant DB verification remain. |

**Done counts are accepted-scope implementation evidence, not a claim that the
whole release or every deployed external service has been verified.** Human
deployment checks, notification cadence and E09/E06 integration remain explicit
release work. Existing BDR T-60's scoped backend acceptance is respected; no new
scope reduction was invented by this audit.

## Remaining Release 1 roadmap

All rows below remain To Do. Fixture-backed screens or reusable foundations
are recognised as contributions, but do not complete these business stories.
Original dates, points and sprint allocation are preserved in Jira.

| Sprint | Story / Jira | Points | Scope |
| --- | --- | ---: | --- |
| 2 | E03-S01 / SCRUM-32 | 3 | Assign a Coordinator |
| 2 | E03-S02 / SCRUM-33 | 3 | Request clarification |
| 2 | E03-S03 / SCRUM-34 | 3 | Decide on a request |
| 2 | E03-S05 / SCRUM-35 | 1 | Track event status |
| 2 | E03-S06 / SCRUM-36 | 3 | Event comments |
| 2 | E03-S07 / SCRUM-37 | 5 | View/update event information |
| 2 | E05-S03 / SCRUM-42 | 5 | Venue calendar; incorrect automation closure reversed |
| 2 | E05-S04 / SCRUM-43 | 3 | Maintenance blocks |
| 2 | E06-S01 / SCRUM-45 | 5 | Suitable venue search |
| 2 | E11-S01 / SCRUM-75 | 5 | In-app and email event notifications |
| 3 | E06-S02 / SCRUM-46 | 3 | Venue suitability |
| 3 | E06-S03 / SCRUM-47 | 3 | Booking requests |
| 3 | E06-S04 / SCRUM-48 | 3 | Booking decisions |
| 3 | E06-S05 / SCRUM-49 | 3 | Tentative holds |
| 3 | E06-S06 / SCRUM-50 | 5 | Prevent double-booking |
| 3 | E07-S01 / SCRUM-51 | 3 | Equipment catalogue |
| 3 | E07-S02 / SCRUM-52 | 3 | Equipment requests |
| 3 | E07-S03 / SCRUM-53 | 5 | Equipment availability |
| 3 | E07-S04 / SCRUM-54 | 5 | Equipment reservations |
| 3 | E07-S05 / SCRUM-55 | 1 | Unavailable equipment |
| 3 | E07-S06 / SCRUM-56 | 1 | Technical support requests |
| 3 | E07-S07 / SCRUM-57 | 3 | Technical staff assignments |
| 3 | E08-S03 / SCRUM-60 | 5 | Confirm an event |
| 4 | E08-S04 / SCRUM-61 | 1 | Revert confirmation |
| 4 | E08-S05 / SCRUM-62 | 3 | Complete an event |
| 4 | E09-S01 / SCRUM-63 | 5 | Attendee registration |
| 4 | E09-S02 / SCRUM-64 | 3 | Capacity enforcement |
| 4 | E09-S03 / SCRUM-65 | 3 | Registration period |
| 4 | E09-S04 / SCRUM-66 | 5 | Waiting list |
| 4 | E09-S05 / SCRUM-67 | 3 | Withdrawal |
| 4 | E09-S06 / SCRUM-68 | 3 | Attendance |
| 4 | E09-S07 / SCRUM-69 | 1 | Registration list |
| 4 | E10-S01 / SCRUM-70 | 3 | Change requests |
| 4 | E10-S02 / SCRUM-71 | 5 | Arrangement-impact assessment |
| 4 | E10-S04 / SCRUM-73 | 5 | Cancellation |

Sprint 2 baseline: 10 stories / 36 points. Sprint 3: 13 / 43.
Sprint 4: 12 / 40. The four open Sprint 1 stories add 12 points of remaining
scope; assignment to a future sprint is a team planning decision.

## Team contribution attribution

Counts below are PR **opener** activity in the exact sprint window. They do not
allocate story points or measure individual productivity.

| Contributor | PR records opened and merged | Evidence-based contribution |
| --- | ---: | --- |
| Bryan (`bryanseah234`) | 51 | Shared app/database/auth/outbox foundations, initial organiser form, role-screen prototypes, source migrations/exports, testing/tooling, CI/CD and integration. #73 and #95 were opened/integrated on Xiang Ying's behalf. |
| Xiang Ying (`xiangyingg`) | 3 | #41 client isolation, #42 attendee visibility, #91 lockout ADR. Also authored #73's regression fix (`51f7b4d`) and #95's login/recovery implementation (`b94d425`), even though Bryan opened those PRs. |
| Ji Ning (`jininggg`) | 3 | #43 registration, #47 profile, #93 deactivation. Reviewed and identified the venue-limit issue on #71. Database-schema work in #7 predates the sprint window. |
| Aaron (`Bl0oper`) | 4 | #56 submission, #79 drafts, #94 accessibility matching, #99 review-gap correction. C4 work in #24 predates the sprint window. |
| Le Xin (`lexinphun2024-debug`) | 5 | #48 catalogue, #71 layout matching, #72 SQL-limit fix, #86 duplicate labels, #88 audit logging. Earlier ADR/test-case contributions are pre-sprint. |
| Amareet (`amareetkm2024-del`) | 5 | #87 checklist/profile UX, #89 live venue CRUD/layouts, #90 token/button consistency, #92 Enter-key/search fix, #98 final form/layout polish; also substantive review participation. The older zero-activity claim is incorrect. |

### Bryan's engineering work registry

These existing Jira items now have GitHub evidence and limitations recorded in
their descriptions. Scope is the engineering deliverable named here, not the
completion of every product story a prototype depicts. Missing human review
keeps implemented work visible in In Review.

| Jira | Existing pts | State | Merged contribution / evidence |
| --- | ---: | --- | --- |
| SCRUM-87 | — | Done | Playwright/workbook reconciliation, reviewed #32. Corrects stale #31 link. |
| SCRUM-88 | — | In Review | Release branding/source-data cleanup, #33; only dismissed reviews remain. |
| SCRUM-89 | — | Closed duplicate | Original shell #35; duplicate scope of SCRUM-95. No extra delivery credit. |
| SCRUM-90 | — | Closed superseded | Supabase Auth abandoned under ADR-015/T-58. Done is the terminal workflow representation, not delivered Supabase scope. |
| SCRUM-91 | — | In Review | Cookie consolidation #82, earlier persistence #36/#34. Review and real E02 create/read E2E acceptance remain. |
| SCRUM-92 | — | Done | Initial login traceability #38, completed by Xiang Ying's reviewed real login suite #95. Bryan retains foundation/integration credit. |
| SCRUM-93 | 5 | In Review | Hashed single-use verification token flow, #64; no human review recorded. |
| SCRUM-94 | 3 | Done | Initial lockout #58, hardened and verified in reviewed #95 by Xiang Ying. |
| SCRUM-95 | 5 | In Review | Landing/login/router/whoami shell, #50; no human review recorded. |
| SCRUM-96 | 2 | In Review | Coordinator mock screens, #53; E03 classification corrected; no human review. |
| SCRUM-97 | 2 | In Review | Venue Staff mock screens, #53; live inventory later delivered by Amareet; no complete-slice review. |
| SCRUM-98 | 2 | In Review | Technical Support mock screens, #53; E07 classification corrected; no human review. |
| SCRUM-99 | 2 | In Review | Admin/audit mock screens, #53; no human review or implemented admin role claimed. |
| SCRUM-100 | 5 | In Review | Backlog/test Markdown and XLSX export/roundtrip tooling, #54/#67; no human reviews. |
| SCRUM-101 | 2 | In Review | Vitest/Testing Library/jsdom, #59; no human review recorded. |
| SCRUM-102 | 2 | Done | TC_ID mapping #61 and reviewed drift/determinism enforcement #96. Inventory is not semantic acceptance coverage. |
| SCRUM-103 | 3 | In Review | ADR/BDR Markdown migration, #62; correct ADR directory is `docs/adr/`; no human review. |
| SCRUM-104 | 2 | In Review | Contribution guides, #63; no human review recorded. |
| SCRUM-105 | 0 | Closed duplicate | Duplicate verification ticket of SCRUM-93. #65's branch used this key for SCRUM-106 work. |
| SCRUM-106 | 5 | Done | Full role-route coverage, reviewed #65; some routes use fixtures. |
| SCRUM-107 | 3 | In Review | Verification email/outbox wiring, #68/#82; no human review of the extension recorded. |
| SCRUM-108 | 1 | In Review | ADR/BDR Word export helper, #62; no human review recorded. |
| SCRUM-109 | — | To Do | Shared test-schema provisioning is not proven. Reconcile T-59 with the newer disposable loopback CI harness. |
| SCRUM-110 | — | To Do | Real event-request migration/create/read roundtrip remains open. |
| SCRUM-111 | — | To Do | Git integration decommission is distinct from the delivered Actions mirror. |
| SCRUM-112 | — | To Do | Preview-cleanup workflow not found in merged evidence. |

SCRUM-93–108 retain their existing 44-point total: 10 points in three
non-duplicate Done engineering items, 34 points in 12 implemented items awaiting
review, and one zero-point duplicate. Historical mid-sprint re-scoring means these
are a current estimate inventory, not comparable velocity. No estimates were
changed by this audit. SCRUM-87–92 were assigned to Bryan using existing authorship
evidence; original product-story owners were preserved.

Other Bryan work is recorded through PR evidence rather than invented retroactive
story points: #25/#27 scaffold and prototype, #26 branch naming, #28 handoff,
#29 organiser form, #30 icons, #31 database/seed/status/module foundation,
#34 durable outbox/runtime repair, #44 browser CI installation, #45/#46 DoD and
review readiness, #49 source/Jira audit, #51 decision/session plans, #52 pinned
document tooling, #55 QA audit, #60/#77 deactivation decisions, #69 coverage
refresh, #70 PostPlan practice, #74/#85 earlier retrospective, #75 path cleanup,
#76 deployment-log visibility, #78 route-collision guard, #80/#81 planning and
misattribution cleanup, #83 runtime denial regression, #84 test-schema decision,
#96 metadata/coverage CI, and #97 advisory Jira sync. #37 also supplied initial
submit traceability. #73/#95 are integration support for Xiang Ying's code.

Bryan's pre-sprint preparation is retained as context, not Sprint 1 velocity:
#2 repository baseline, #10 imported backlog, #11 testing reference organisation,
#12/#13 Figma planning, #14 PR-update automation, #20 source/Jira workflow,
and #22 hosting plan. PR #100 was opened after the Sprint 1 cutoff and is excluded.

## Testing: what the evidence establishes

- `docs/testing/tc-coverage.md`: **55 / 230 (23.9%)** IDs referenced by active
  test titles; **172** scaffold-only; **3** without references. Regeneration
  confirms the inventory, not execution or semantic completeness.
- E01-S01: #95 records **113 backend tests**, **12 database scenarios (13
  reported tests)**, **8 desktop/mobile browser runs**, **26 notification
  regressions**, and **15 runtime checks**, plus types/build. These are recorded
  implementation-run results, not a claim that this documentation audit reran them.
- #94 records **134 backend tests**, **17 frontend component tests** and
  **126 browser executions / 430 skipped** for that revision, plus real
  accessibility database matching. Counts from different commits overlap and
  must not be summed.
- Deactivation has unit, rollback-only database and mocked browser tests
  (`docs/testing/account-deactivation.md`), even though its original five TC_ID
  scaffold titles remain. Untagged coverage is not absent implementation.
- Conversely, E03/E09 fixture-backed browser tests can carry active TC_IDs while
  real clarification/registration/capacity workflows remain unimplemented.
- The audit does not establish real Brevo inbox delivery, timely worker cadence,
  full live E02 submit/read persistence, E09 seat reuse, every venue/audit database
  regression, or measured T-51 performance. These remain specific verification
  work, not a generic "all tests green" assertion.

## Jira reconciliation performed

The API update read each status again before mutation and read each updated
record back afterwards: **101 records verified**, no exceptions.

- **71** product-story descriptions refreshed from canonical Markdown, with
  direct source, decision and applicable acceptance-case links.
- **26** existing engineering/follow-up descriptions reconciled; six previously
  unassigned foundation tasks attributed to Bryan, five summaries corrected,
  and duplicate/superseded/review-needed labels made explicit.
- **4** epic states moved to In Progress (E01, E02, E05, E14).
- **26 status changes total**: 3 to Done, 16 to In Review, 6 to In Progress,
  and 1 to To Do. This includes the four epic changes.

| Correction | Reason |
| --- | --- |
| SCRUM-25: In Review → Done | Reviewed deactivation #93 and recorded evidence satisfy its accepted implementation scope. |
| SCRUM-87: In Progress → Done | Reviewed scaffold reconciliation #32 had not reached Jira. |
| SCRUM-92: In Review → Done | Reviewed real login/traceability #95 supersedes early routing stubs. |
| SCRUM-19: Done → In Progress | Organisation-editing requirement is unresolved. |
| SCRUM-26: Done → In Review | Real event-request persistence acceptance evidence still outstanding. |
| SCRUM-27: Done → In Review | Explicit missing peer review of #79. |
| SCRUM-86: Done → In Progress | Booking-decision logging remains outside the partial #88 delivery. |
| SCRUM-42: Done → To Do | Jira's history names #97's automated transition; its example closing clauses are not venue-calendar implementation. |
| SCRUM-88, 91, 93, 95–101, 103, 104, 107, 108: Done → In Review | Missing current human review and, for SCRUM-91, real E02 integration evidence. |

The calendar false positive was produced by #97 itself, not inferred solely
from #78's mislabelled branch. Both are examples of why issue-key matching cannot
establish completion. The current sync script still needs a separate fix to
ignore quoted/example closing clauses and incomplete scope, and to require
actual completion evidence. No protection settings were bypassed in this audit.

## Sprint review decisions to make

1. **Team / reviewer:** accept or schedule the four product closure gaps. Review
   merged engineering slices before changing their audit status back to Done.
2. **Ji Ning + team:** resolve organisation editing against the canonical story;
   a UI hint about admin approval does not establish a supported admin workflow.
3. **Bryan + Aaron:** complete SCRUM-110 using a disposable database and a real
   authenticated submit/reload. Align SCRUM-109's older instructions with current
   test isolation before provisioning anything.
4. **Le Xin + future booking owner:** finish audit writes with E06 and verify
   transaction/immutability behaviour against the database.
5. **Team:** assign Sprint 2 owners, record a sprint goal and close Sprint 1 in
   Jira after deciding carry-over. Keep historical estimates intact.
6. **Bryan / CI maintainer:** fix the sync false-positive path and verify branch
   protection requires a valid approval and meaningful application checks.
7. **Feature owners:** demonstrate critical journeys with real backend state;
   finish deployed recovery-mail cadence/inbox checks and later E09 seat reuse.

## Source links

- [Canonical Release 1 backlog](release-1/)
- [BDR decisions](../bdr/B-team-decisions.md), [ADR index](../adr/README.md)
- [Definition of Done](../../CONTRIBUTING.md#definition-of-done)
- [Acceptance catalogue](../testing/cases/), [automation inventory](../testing/tc-coverage.md)
- [PR #73 attribution](https://github.com/hongyime/sgConnectSphere2026/pull/73)
- [PR #95 attribution and live-auth evidence](https://github.com/hongyime/sgConnectSphere2026/pull/95)
- [PR #99 review-gap evidence](https://github.com/hongyime/sgConnectSphere2026/pull/99)
- [Jira SCRUM project](https://theprawnworkspace.atlassian.net/jira/software/projects/SCRUM/boards/1)
