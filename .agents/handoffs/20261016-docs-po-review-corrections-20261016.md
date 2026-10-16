# Product Owner review corrections

Record the explicitly authorized PO acceptance of PR #292's five scenarios,
verify E03-S11's historical estimate, integrate S11 before S12, correct the
approved #230 fixture and earlier E06-S06 scenarios, and commit the local
corrections without pushing, merging remote PRs or inventing test evidence.

## Starting point and scope

- Branch `docs/po-review-corrections-20261016` started at PR #296 head
  `4fd67f0`, then fast-forwarded to refreshed head `d893bd5` before integration.
  Local text corrections were saved and reapplied, and generated workbooks
  were rebuilt from the combined sources. The previous checkout was
  `docs/SCRUM-161-migration-run-records`; its tracked files were clean.
  Existing untracked `.omo/` and `.playwright-mcp/` folders were preserved.
  No new worktree was created.
- The user explicitly authorized the PO decisions, insertion and commits in
  the follow-up. No push, remote PR merge, Jira write, upload or database
  operation was authorized or performed. The local fast-forward is not a
  merge of either pending PR into main.
- Read the repository onboarding, Definition of Done, instructor guidance,
  source-of-truth rules, active-branch handoff and live PR evidence first.

## Corrections

- Both backlog views of E03-S12 and E14-S03 now cite T-97 as their approval
  authority and identify pending PR #293 as its source. Legitimate T-65/T-93
  manual-evidence references remain; T-93 is the screenshot rule, not this
  approval. Blank estimates, Sprint 3 and ownership are unchanged.
- Both E03 views and the canonical E03 cases now contain S10, S11, S12 in
  numeric order. S11's original five criteria and case definitions were
  imported unchanged from PR #292 head `2abaf3e`; provenance records the new
  PO approval and verified historical estimation gap. Original manual runs,
  screenshots and #292's newer automated-test changes were not copied.
- E06-S06 Scenario 2 now starts with nonoverlapping bookings created under
  zero buffers: A Confirmed at 10:00-12:00, B Pending at 12:30-14:00. A later
  setup/turnaround increase to 30/45 minutes causes a retained conflict; B is
  flagged `buffer_conflict`, its approval is blocked, and neither row releases
  occupancy or changes lifecycle status.
- Scenario 4 now races two valid submissions into a free buffered venue.
  Overlapping buffered windows permit at most one Pending row, with a safe
  conflict for the loser. It does not require two overlapping Pending rows to
  exist first or claim a successful approval.
- Updated only the directly matching canonical cases TC_E06S06_02 and _06,
  their existing scaffold descriptions, and dependent checklist text. Both
  declarations remain `test.fixme`; backend behavior and guards are unchanged.
- Regenerated the CAA 161026 backlog/testcase workbooks, legacy testcase input
  and coverage inventory. The existing source-of-truth table already names
  these dated exports. No BDR policy change is needed: the scenarios now follow
  the existing occupancy policy rather than introducing a new one.
- TC_E11S01_02 and its active fixme scaffold now use the EVT-3001/Jasmine Hall
  mapping to `venue_b` and a permitted end-time edit, not a venue move. A narrow
  seed-fixture note documents the mapping. The case explicitly requires valid
  execution-relative fixture dates, technical-staff and attendee links, and a
  published attendee-visible snapshot; choosing the seed event alone is not
  proof of these prerequisites. The full recipient matrix and future venue-move
  obligation remain, without claiming either was executed.

## Authorized PO actions

- Submitted a bounded PO acceptance review on PR #292 at exact head
  `2abaf3e03e48610283d29bd45d55dd0748ab54dd`, after checking the five criteria
  and green current-head checks. The review explicitly does not claim a fresh
  manual run or independent human code/test sign-off:
  https://github.com/hongyime/sgConnectSphere2026/pull/292#pullrequestreview-5547995001
- Posted the approved fixture/date-time clarification on self-authored PR #230;
  it is not a self-approving review and does not clear the outstanding
  independent changes-requested review:
  https://github.com/hongyime/sgConnectSphere2026/pull/230#issuecomment-6215879956

## Earlier-phase verification

- `python scripts/check.py`: repository hygiene and 149 tooling tests passed;
  existing secondary-worktree warnings only. No worktree was removed.
- Workbook assertion driver: all nine fields for 63 release and 83 product
  rows and all ten fields for 370 unique testcase rows matched canonical
  parsers; metadata/fixture assertions passed. Legacy and dated testcase
  workbooks were byte-identical.
- E06 Playwright `--list --reporter=list`: 48 desktop/mobile entries collected,
  with both changed titles present. This did not execute acceptance cases.
- `git diff --check` passed. Markdown/workbook LSP is not configured;
  TypeScript LSP remains unavailable after a previous installation decline.
- Session record: `docs/testing/runs/20261016-173315-bryanseah234-tooling.md`.
  No application build, database integration suite or manual run was performed.

## Combined-source verification

- `python scripts/check.py`: hygiene, environment-template drift check and
  all 158 tooling tests passed; 376 existing records validated. Existing
  secondary-worktree warnings only, with no cleanup performed.
- Regenerated 64 release stories, 84 product stories and 375 unique testcase
  rows. All nine backlog and ten testcase fields matched their canonical
  parsers; the legacy and dated testcase workbooks were byte-identical.
- A separate assertion driver confirmed S11 criteria and all five case blocks
  match the pinned PR, S10/S11/S12 ordering in all three sources, unchanged S12
  criteria, preserved estimates, and unchanged scaffold skip states.
- E06/E11 Playwright collection found 64 desktop/mobile entries in two files;
  no acceptance case executed. `git diff --check` passed. Markdown LSP is not
  configured; TypeScript LSP remains unavailable after an earlier decline.
- New session record: `docs/testing/runs/20261016-205813-bryanseah234-tooling.md`.
  The earlier 17:33 record remains immutable. No application build, database
  integration suite or manual run was performed.
- One read-only internal gate review found no actionable defects and independently
  confirmed source/workbook parity, preservation of prior case IDs and exactly
  five added S11 IDs. It did not run acceptance tests or replace the required
  independent human code/test review.

## Answers and remaining work

- A read-only live Jira audit confirmed SCRUM-176 is Done, Story point estimate
  and original time estimate are null, and all five available changelog entries
  contain no estimate changes. #247's description, comments and reviews also
  provided no numeric estimate. Points stay blank, not zero; no retrospective
  estimate or Jira write was made. The five scenarios now have explicit PO
  acceptance through the linked review.
- In seeded data, EVT-3001 is an event booked at Jasmine Hall. `venue_b` is the
  staff account assigned to Jasmine Hall; `venue_a` is assigned other venues.
  #230's corrected test recipient matches that fixture, not a new venue assignment.
  The assignment/routing work in #271/#272 is separate from E10-S05's lost-venue
  replacement workflow. A date/time edit exercises current notification routing;
  notification infrastructure alone does not deliver a venue-move workflow.
- Combined ordering is implemented locally, not blocked on inserting S11.
  "Pending" describes remote PRs that remain open/unmerged. This branch does
  not replace #292's original evidence or its newer automated-test changes;
  integrate the original PR through the reviewed process as well. #293's
  T-97 decision also remains pending merge. Regenerate derivatives from the
  final combined sources rather than selecting one side of a binary conflict.
- No Jira requirement changes were made. Reconcile descriptions only after
  canonical changes merge. Push, PR publication and remote merge require
  explicit authorization; only the linked PO actions were performed remotely.
- Adjacent pre-existing E06-S06 case fixtures _01, _03 and _05 also assume
  overlapping active rows can be created directly; _04 needs explicit zero
  buffers or true buffered-boundary adjacency. They were left unchanged because
  the request specifically identifies scenarios 2 and 4. Do not weaken guards
  to construct those fixtures or describe the acceptance suite as executed.

## Learnings

Separate approval provenance from evidence policy. Booking conflicts apply when
Pending occupancy is first created, not only when staff approve it. A later
buffer edit can retain and flag a formerly valid conflict without releasing it;
the flag is not the distinct `Conflicting` lifecycle status.
