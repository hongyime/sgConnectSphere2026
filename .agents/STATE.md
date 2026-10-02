# Agent State

- 2026-10-03: Week 7 Change 2 backlog + cases on
  `docs/week7-change-2-venue-unavailable` (stacked on change 1): new E05-S06
  mark venue unavailable over bookings, E10-S05 back in Release 1, ten new
  TC_IDs, exports regenerated. Depends on #194 and #197. Details in
  .agents/handoffs/20261003-docs-week7-change-2-venue-unavailable.md.
- 2026-10-03: Week 7 Change 1 backlog + cases on
  `docs/week7-change-1-setup-turnaround`: E05-S05 back in Release 1 (Sprint 3)
  with six scenarios, buffer scenarios added in place to E06-S01/S03/S04/S05/
  S06, eleven new TC_IDs, exports CAA 031026 regenerated (48 R1 stories, 264
  cases), legacy workbook + tc-coverage refreshed. Depends on #194. Details in
  .agents/handoffs/20261003-docs-week7-change-1-setup-turnaround.md.
- 2026-10-02: PR #183 review follow-up: refreshed from main 139217e; corrected live deactivation, accessibility selection, comments and clarification routes. Recounted 47 stories and 75 routes, with 11 stories having no current route. E14 viewer remains a prototype; PR #192 reader/sprint decisions are explicitly pending merge. Pending peer re-review; no story completion asserted.

- 2026-10-02: Merged origin/main (f0c4264, #182) into the screen inventory branch. Kept both notes.

  - 2026-10-02: Review on #183. Refreshed docs/plans/screen-inventory.md
  after #175 (1780b3c): E10-S01 now includes /change-requests/new
  (coming-soon) and E03-S07 includes the Organiser edit on /events/*.
  Coming-soon route count is 3. SCRUM-118.

  - 2026-10-02 (PR A, SCRUM-118): screen inventory added at docs/plans/screen-inventory.md,
  generated from frontend/src/app/routes.tsx at f39e81e plus docs/backlog/release-1/.
  Covers all 47 Release 1 stories (role, sprint, routes, status, page pattern per
  design.md section 4) plus a second table for routes with no Release 1 story. Framed
  as a draft for Amareet's SCRUM-118 review; Amareet's own draft is not in the repo
  so the two must be reconciled. Verification: python scripts/check.py (PASS, 76
  tests). Open items: reconcile against Amareet's draft; add rows if new routes land.

  - 2026-10-02: Review on #182. Merged main (1780b3c) into
- 2026-10-02: Addressed Amareet's PR #184 review locally: venue suitability is
  a shared StatusPill in Card actions; the single no-full-matches Alert remains.
  Added browser assertions against per-result alerts. Focused browser 8,
  navigation component 4, build/typecheck and hygiene/tooling 76 passed.
  Evidence: docs/testing/runs/20261002-214056-jininggg-full-regression.md.
  Desktop/mobile screenshots visually checked. Timezone behaviour unchanged;
  non-blocking scope advice applies to future PRs. User authorized committing and
  pushing this follow-up for re-review; final CI and human approval remain required.

- 2026-10-02: The upload rejection was an accidental click; user reauthorized
  publication. Postplan uploaded after screenshot compression, retaining both
  views: https://gnoj0c9eujtz.postplan.dev. Commit/push and draft PR preparation
  follow on the verified branch. Keep E11 open and wait for remote CI/review.

- 2026-10-02: Publication preparation: build, 8 venue browser checks and
  repository checks passed on main f0c4264 plus the working changes; evidence
  docs/testing/runs/20261002-162701-jininggg-full-regression.md. Postplan HTML validated locally,
  but upload was declined. Open a draft; do not claim a hosted review artifact
  or remote CI success. Commit/push/PR creation are authorized, not merge.

- 2026-10-02: User authorized committing and opening the E06-S01 design PR.
  Refreshed onto main f0c4264, preserving #182 font loading and both handoff
  entries. E11 scope is documentation/regression evidence only; no Jira status
  changes or merge authorized. Fresh publication checks follow in runs/.

- 2026-10-02: PR #191 review refresh: integrated main 139217e and retained all three original calendar execution records unchanged. Their backend/browser scope remains unit or mocked API, with PostgreSQL validation explicitly outstanding. New verification covers repository tooling only. Awaiting peer review; no business story completion asserted.

- 2026-10-02: Sprint 2 T-65 records for E05-S03 / SCRUM-42 on
  `test/sprint2-execution-records` (off main db8360d): whole backend unit
  (259/259), frontend Vitest (229/229) and Playwright (206 passed, 368 fixme
  skips) suites; all five TC_E05S03 cases pass. Database suite not run (no
  TEST_DATABASE_URL locally). E05-S04 records were drafted separately but left
  uncommitted on purpose: its four cases are still unproven (Playwright specs
  are `test.fixme` until #185 merges; DB suite not run).

- 2026-10-02: Review on #182. Merged main (1780b3c) into
  feature/SCRUM-117-load-inter. Kept #180's section 11 and removed the
  Typeface row, per design.md section 14. Google Fonts stays; the choice
  and the IP trade-off are in docs/decisions/0011. SCRUM-117.

- 2026-10-02: Current-state review and E06-S01 presentation refresh on
  fix/SCRUM-45-venue-search-design, based on main 1780b3c. Shared skeleton
  #173/#180 and organiser edit #175 are now merged (older open notes below
  are historical). VenueSearch uses shared page/form/card/feedback blocks,
  preserves all query parameters and backend matching, and passes desktop/mobile
  plus 320px overflow checks. Existing E06/E11 implementation records refreshed.
  Clarification #163, decisions #174 and maintenance blocks #151 already call
  the E11 writer; no duplicate notification runtime integration was added.
  E03-S02/S03 remain In Progress for frontend; E05-S04 Done has a To Do
  frontend pilot SCRUM-120. Venue/staff assignments and future workflow callers
  remain missing. Live migration ledger stops at 0008; repository 0009 is not
  recorded (read-only inspection, no migration applied). Tests and limitations
  are in docs/testing/runs/20261002-161552-jininggg-full-regression.md.
  No commit, push, Jira transition, live data write or real email send.

- 2026-10-02: Frontend skeleton (SCRUM-116) and SCRUM-119 status. Merged:
  #171 route table and shell, #172 shared blocks, #176 and #177 (Amareet's
  Coordinator, venue and Organiser pages moved onto the shared blocks), #179
  (those pages aligned with design.md: shared status labels, Singapore-time
  formatDate/formatDateRange, inline ConfirmPanel for venue retire). SCRUM-119
  is Done. Open: #173 templates and docs/frontend-guide.md (approved, CI green,
  awaiting merge; merge it before #180, whose branch carries SCRUM-116 so
  jira-sync marks SCRUM-116 Done when #180 merges);
  #178 design.md (Bryan, SCRUM-117) merged 2026-10-02; #180 closes the
  design.md section 11 gaps and removes the resolved rows (button hover, --green-ink/--amber-ink, eyebrow
  tracking, one disabled style, skip link, radius tokens). Still open: loading
  Inter needs a team dependency decision. Every PR citing test runs carries
  T-65 records in docs/testing/runs/. Local Vitest must run with
  --no-file-parallelism on Windows; CI is authoritative.

- 2026-10-01: SCRUM-117 design.md written on `docs/SCRUM-117-design-language`
  (off main 71e6567) and registered in docs/source-of-truth.md. It documents
  the current look (teal pen, paper on a 32px planning grid, soft-tint status
  pills, uppercase eyebrow), pins the styles.css tokens with measured contrast,
  names all 16 skeleton blocks and the four templates exactly, and sets state,
  status, writing, accessibility and responsive rules. Section 11 raises the
  skeleton gaps per ADR-017 (Inter not loaded, button hover and green pill
  contrast, eyebrow tracking, disabled pattern, skip link, token additions);
  section 12 lists the drift in older feature stylesheets to clear when
  touched. Verified against the running /ui-kit by computed styles; corrected
  the card description to flat (the skeleton's Card has no shadow). check.py
  passed. No frontend code touched; docs/frontend-guide.md (PR #173) and the
  shared blocks (PR #172) are cited, not edited. Postplan
  https://sdn67cwcq7y7.postplan.dev. PR opened for Amareet's review; reconcile
  SCRUM-117 in Jira only after merge.

- 2026-09-27: PR #134 main refresh after #143 merged as af97522. Retained
  calendar, coordinator and notification test commands and both CI database
  steps; regenerated the combined test inventory. Existing inbox/security and
  coordinator changes are preserved. Prior local-only #143 notes are historical;
  that PR is now merged. Validation is recorded in the PR follow-up. SCRUM-42.

- 2026-09-26: PR #134 refreshed after #138 merged. Calendar API implementation and prior review fixes retained; SCRUM-42 / E05-S03. Required review and CI are checked on the refreshed head before merge.

- 2026-09-26: Resolved main conflicts for PR #134 while retaining calendar, venue search and email test commands; regenerated coverage. SCRUM-42 / E05-S03. Validation evidence is recorded in the PR review follow-up.
- 2026-09-27: PR #143 review revision is LOCAL, uncommitted and unpushed by user
  instruction. Main 84e8180 is merged with --no-commit; conflict entries resolved,
  but MERGE_HEAD intentionally remains until authorized completion. Preserve both
  main's PR #141 integration and the inbox work. Eventless notices are excluded
  from GET and POST RETURNING; inbox capped at 100. Verification email delivery
  stays intact; regression tests cover hidden capabilities, normal event/read
  behavior and auth/reset. Database security 12, auth DB 13, provider 26, Redis 2,
  backend units 208, frontend 48, runtime 15 and browser 10 passed; build/typecheck
  passed. Broad backend DB has 9 pass / 1 unchanged registration concurrency failure
  (users_email_key) after disposable schema setup. Do not tick final CI or mark PR
  approved/merged; no push authorized. Postplan follows the established public HTML
  convention: https://0lympnguubta.postplan.dev. Linked in a top-level PR comment and
  updated PR evidence/checklist without pushing code. Hygiene passed (45 tooling
  tests). See docs/testing/event-notifications.md for evidence and follow-ups.

- 2026-09-27: E11-S01 / SCRUM-75 inbox follow-up on
  `feature/SCRUM-75-notification-inbox`: replaced frontend fixtures with the
  authenticated all-role list/read API, using the existing notification function
  rewrite and cookie sessions. Opening marks read, other-recipient writes fail,
  and read timestamps remain stable. Shared event hooks/outbox already present
  are reused. Backend unit suite, 7 inbox component tests, 10 notification DB
  tests, 26 dispatcher/provider tests, 2 Redis tests, 2 real desktop/mobile inbox
  browser tests, typecheck/build, 15 runtime tests and repository checks passed.
  Initial DB/Redis attempts lacked test URLs; isolated local containers resolved
  that setup issue. No live data changes or real emails. Full-story gaps and
  owning Jira references are in docs/testing/event-notifications.md. Venue
  assignment, future workflow integrations and deployed mailbox verification
  remain incomplete; do not mark SCRUM-75 Done. The user subsequently authorized
  committing and opening a PR; prepare a draft with remaining dependencies and
  leave Jira open. No Jira transition was made.

- 2026-09-27: PR #141 integrated with approved notification foundation #142.
  Preserved submission auditing plus automatic assignment, combined backend test
  commands and full migration-chain fixtures, and removed a duplicate API pool
  import from the textual auto-merge. Assignment and generic status notices share
  a change ID: one Coordinator message/email job plus the Organiser status notice.
  Reassignment notifications now prepare transactional email deliveries too.
  23 focused unit tests and 13 PostgreSQL integration tests passed, including
  rollback of creation, draft submission, requests and accept/decline responses.
  The cross-PR impact and merge order are in docs/plans/e11-notification-hooks.md.
  Merge #142 first; hold #141 auto-merge until main contains that foundation and
  refresh/recheck before requesting final approval. No new/live migration needed.

- 2026-09-26: SCRUM-32 (E03-S01) backend by Aaron: submissions auto-assign the eligible Coordinator with the fewest active events (T-14/T-52; tie-break least recently assigned; advisory lock), and the assigned Coordinator can request reassignment that moves only when the named colleague accepts (C-56). Migration 0008, Coordinator endpoints in `api/events.ts`, in-app notifications via `notifyUser()`. Frontend and e2e are Amareet's, built against the API contract in the PR. TC_E03S01_03 retired; TC_E03S01_05 added.
- 2026-09-27: Approved E11-S01 recipient matrix recorded in both backlog views,
  BDR T-64 and the existing ADR-006. The event-notification hook now captures
  active linked recipients, suppresses the actor, deduplicates by business change,
  uses public attendee content and writes notifications/outbox rows atomically
  with existing status/submission/date-edit transactions. Real PostgreSQL tests
  cover rollback, concurrent retries and pre-release cancellation membership.
  Full build, backend unit suite, 37 database checks and 15 compiled runtime
  checks passed; the final notification database rerun passed 8/8 after the
  same-status reason-preservation fix. Runtime cleanup initially rejected a
  temporary dependency junction; rerunning with a real local cache passed.
  Dated backlog, test, BDR and ADR exports regenerated for 270926, including
  the test compatibility workbook and coverage inventory. This is partial
  E11-S01 work: venue assignment, downstream workflow callers, all-role inbox
  and deployed email verification remain in docs/plans/e11-notification-hooks.md.
  Do not mark SCRUM-75 Done or reconcile Jira until reviewed canonical changes
  merge. No live migration or provider call was made for this implementation.

- 2026-09-26: PR #124 review: verify replacement ruleset parameters before deleting classic protection; only explicit absent-protection responses are idempotent. Added mocked migration regressions. ADR 0008 distinguishes merged tooling from an administrator applying live settings. No live migration performed.

Current task: Sprint 2 CI/test-infrastructure hardening for ConnectSphere is
now mostly landed. Remaining: Aaron's review on #120/#115, Bryan's own
review of SCRUM-107/108 (held out from the Jira cleanup), and PR #121's
review by Jining. No implementation-mode carryover to other Sprint 2
stories unless Bryan asks directly.

## Frontend / Scrum Master track (Amareet) -- Sprint 2

Updated 2026-09-30.

**Role split (whole project) -- changed 2026-09-30, see ADR-017:** each
story's owner (its Jira assignee) builds that story's **frontend as well as
its backend**, on a shared frontend skeleton. This replaces the 2026-09-26
split, in which Amareet was frontend-only and the other five did backend.
It follows instructor feedback that the team needed a common design language
and that one frontend developer was a bottleneck.

- **Amareet** -- Scrum Master; owns the frontend skeleton (SCRUM-116): app
  shell and single route list, design tokens, shared building blocks, four
  page templates (List, Detail, Form, Decision), data-loading pattern, test
  helpers and guide. Also moves their own Sprint 2 pages onto it (SCRUM-119),
  and reviews and pairs on other owners' frontend work.
- **Bryan** -- owns `design.md`, the design-language rules the skeleton
  implements (SCRUM-117).
- **Le Xin** -- E05-S04 maintenance-blocks screen is the skeleton pilot
  (SCRUM-120, Sprint 3; the backend merged in #151).
- **Everyone** -- build new story screens on the skeleton once it lands;
  move an existing page onto it when you next change that page. No big-bang
  restyle.
- **Inputs:** a screen inventory of all 47 Release 1 stories (SCRUM-118, under
  team review), a building-block and template list, and a summary of the
  current tokens and inconsistencies for `design.md`.

Sprint 2 frontend status at 2026-09-30:

- **Merged:** E03-S01 Coordinator screens (#147), E05-S03 venue calendar
  (#136), live Organiser request list and detail (#137), landing and login
  copy (#149, #150).
- **Open:** E03-S07 Coordinator editing (#148), awaiting approval. The
  Organiser side of E03-S07 waits on the Organiser read and an activity-log
  read (asked on #148).
- **Not started, still in Sprint 2:** E03-S02 (SCRUM-33) and E03-S03
  (SCRUM-34). Aaron plans to finish both this sprint, building both sides.
- **Known frontend follow-ups:**
  - sign-in still sends Venue Staff, Technical Support and Admins to
    `/events` (#158 fixed Coordinators; the skeleton's route list fixes the
    rest);
  - no success message after submitting a request;
  - submitted requests have no event code;
  - venue search is unstyled;
  - forms hide the server's error reason.

Progress (most recent first):

- **SCRUM-43 / E05-S04 backend in progress** on
  `feature/SCRUM-43-block-venue-maintenance` (updated to main `388c639`,
  which includes merged #134; uncommitted at time of writing). New `venueBooking/blocks.ts` plus
  `block` / `shorten_block` / `remove_block` POST actions and
  `GET /api/venues?id=...&blocks=1` in the existing `api/venues/index.ts`
  (still 11 api files, ADR-014). Decisions made without team sign-off yet:
  Scenario 3's "affected Coordinators" = coordinators of upcoming events with
  a **pending** booking overlapping the block (confirmed ones are refused by
  Scenario 2); overlapping blocks are refused; blocks can only be shortened,
  not lengthened. Unit tests pass locally; `venueBlocks.integration.test.ts`
  (TC_E05S04_01..04) was NOT run locally (no disposable Postgres
  credentials on this machine) -- it runs in the new CI step. Frontend is a
  separate later PR. The #134 overlap (calendar + blocks in
  `api/venues/index.ts`, both test lists, both CI steps) is already resolved
  and `tc-coverage.md` regenerated.

- **Standardized 24 Jira ticket titles** that used `[E01-S05] Title`
  (brackets) to match the 47 that already used `E01-S05 Title` (no
  brackets, matching the canonical backlog Markdown heading format) --
  applied via direct API calls, verified 0 bracketed-story titles remain.
  Left the 3 other bracket variants alone (`[E01-EXT]`, `[E01]` plain,
  `[Docs]`/`[DUPLICATE...]`) since those tag genuinely different,
  non-story technical work, not a story-ID reference. Confirmed branch
  names reference ticket keys, not title text, so no branches needed
  renaming.

- **Closed PR #114** without merging -- superseded by **PR #117** (Ji
  Ning's, merged), which independently fixed the same T-61 scope gap more
  comprehensively (also touched docs/decisions/0003-profile-editing.md,
  the product backlog, test cases, source-of-truth, and the actual
  tests/e2e/profile.spec.ts). Compared both diffs line-by-line before
  deciding -- same substance, #117 just more thorough and already merged.

- **Opened PR #121** (`docs/e01-s04-checklist-bullet-readonly-org`):
  carries over the one thing #114 had that #117 didn't -- a checklist
  bullet phrasing the read-only-org guidance as a testable acceptance
  item, added alongside (not replacing) #117's explanatory paragraph.
  Applied to both the release-1 and product backlog views per the
  reconciliation rule; xlsx export regenerated (CAA 230926, old 220926
  retained). CI green (application-checks 2s, confirming #118's
  skip-workflow fix still works). jininggg requested as reviewer, tagged
  in the PR body -- nothing for her to action, just a heads-up.

- **Merged PR #118 and #119** (Aaron approved both ~17:04-17:10 on 22
  Sep). #118's fix is proven working repeatedly since (every docs-only
  PR's `application-checks` now resolves via the skip-workflow in ~2-3s
  instead of showing no status at all).

- **Closed 13 Jira tickets as Done** (SCRUM-26, 27, 91, 93, 95, 96, 97,
  98, 99, 100, 101, 103, 104) via `scripts/reconcile_jira.py --pr <N>
  --yes` for the 10 that map to one PR each, plus a small companion
  script (reusing that script's own `find_done_transition`/
  `transition_to_done` functions) for SCRUM-97/98/99, which PR #53's
  branch name doesn't reference explicitly even though its body covers
  all four Sprint-2 stories in one commit-per-story PR. Verified via a
  live Jira status re-query after transitioning -- all 13 confirmed Done.
  **Held out SCRUM-107 and SCRUM-108 at Bryan's explicit instruction** --
  investigation found their described work likely shipped under
  *different* tickets' branches (PR #68 is tagged
  `feature/SCRUM-93-...` even though its title matches SCRUM-107's
  description; the actual ADR/BDR docx export script SCRUM-108 describes
  was added by PR #62, which already ships SCRUM-103) -- probably
  duplicate/overlapping tickets, not confidently 1:1 mappable, so left
  for Bryan to eyeball himself. Still "In Review" in Jira as of this
  writing.

- Built and uploaded a PostPlan HTML review-queue report
  (https://nibmdmkybkwz.postplan.dev) distinguishing the Jira-ticket-
  status cleanup (housekeeping, Bryan's call) from the GitHub-PR queue
  (blocked on Aaron's review, not Bryan's). Caught and fixed two real
  responsive-layout bugs before shipping it (tables and the SVG diagram
  both overflowed illegibly on a 390px viewport) -- verified via exact
  DOM measurement (`scrollWidth`/`clientWidth`), not just an AI vision
  screenshot read, after that read gave an unreliable answer on the
  fix's first pass.

- Made `AGENTS.md`'s `.agents/STATE.md` reference firm (was "if a future
  file exists," written before the file existed) and named Claude Code,
  Codex, Cursor, and OpenCode explicitly, per Bryan's ask to make sure
  the team's agents actually pick this up regardless of harness. **Found
  while doing this: a live Claude Code session on machine PRAWN-T14 is
  already auto-appending timestamped "Auto State" blocks to this exact
  file on its own Stop hook** (see the `<!-- MOLT_AUTO_START -->` block
  below) -- some MOLT automation already exists on at least Bryan's own
  machine. Left its uncommitted edits alone throughout all of the above
  by stashing/restoring around branch switches rather than touching or
  discarding them.

- Merged **PR #116**: fixed two real, root-caused pre-existing bugs --
  `EVT-A02` defaulted to `status='draft'` in
  `eventVisibility.integration.test.ts`'s fixture, tripping the (correct)
  draft-privacy filter and hiding a colleague's event it shouldn't have;
  and `attendeeVisibility.integration.test.ts`'s audit lookup had no
  `entity_type` filter so it could grab a stale row from an earlier,
  unrelated denial in the same test. Both were test-fixture/query bugs,
  not application bugs. Aaron independently re-verified both root causes
  before approving.

Open and waiting (nothing more to do until one of these moves):

1. **PR #120** (`.agents/STATE.md` + `JOURNAL.md`, this file) -- awaiting
   Aaron's first review.
2. **PR #115** (SCRUM-110 + the 6th `CREATE EXTENSION` race-fix site) --
   awaiting Aaron's re-review after two rounds of fixes.
3. **PR #121** (the checklist-bullet carry-over) -- awaiting Jining's
   review.
4. **SCRUM-107 / SCRUM-108** -- re-examined the tickets' own descriptions
   (not just branch names) and found an earlier Sep-20 reconciliation pass
   already documented PR #68/#62 shipping their work, with the same
   "no human review" caveat that SCRUM-93/103 had when Bryan approved
   closing those. Built an evidence postplan
   (https://3wupccg0rklj.postplan.dev) with direct quotes side-by-side;
   final call is still Bryan's, do not close until he says so.
5. Once #115 merges, a small DRY follow-up remains open: swap
   `eventLifecycle.integration.test.ts`'s local
   `createExtensionIfNotExists` copy for an import from
   `backend/tests/helpers/ensureTestExtensions.ts` (already on `main` via
   #119) -- cosmetic only, not a correctness fix, low priority.

Known env facts:

- Local integration tests need a disposable Docker `postgres:17` container
  (`POSTGRES_PASSWORD=synthetic-local-password`, db
  `connectsphere_notification_test`, port 5432) -- never the live Supabase
  project. CI spins up an equivalent fresh service container per run.
- `registration.db.test.ts` needs `public` schema pre-migrated via
  `npx tsx src/database/cli.ts migrate` (with `DATABASE_URL` set to the local
  container) before it passes -- pre-existing, unrelated to any fix above.
- Branch protection requires `repository-checks`, `pr-conventions`,
  `lfs-guard`, `application-checks` + a review approval on the latest commit
  (`require_last_push_approval: true`, `enforce_admins: true`) -- no bypass.

<!-- MOLT_AUTO_START -->
## Auto State

- Updated: 2026-09-23 07:16:29 +08:00
- Machine: PRAWN-T14
- Harness: claude
- Event: stop
- Branch: docs/agents-state-journal
- HEAD: f5e174b
- Dirty files: 1
- Resume hint: Read .agents/STATE.md, then the latest file in .agents/handoffs/ if present.
<!-- MOLT_AUTO_END -->

- 2026-09-27: PR #134 refreshed after #124/#140; continuity conflicts resolved by retaining both histories; generated test inventory refreshed. SCRUM-42 / E05-S03.
- 2026-09-27: PR #141 / SCRUM-32 review: migration 0008 applied with explicit operator approval and verified against the live ledger/schema, assignment backfill, indexes, RLS and browser-role grants. Only 0008 applied. Fixed the reproduced empty status-history query using event/status audit fields; real PostgreSQL regression excludes other events and field changes. Assignment/visibility units and both PostgreSQL integration tests pass (36 total), and backend typecheck passes. Updated against merged #140; current CI and peer approval remain required.
- 2026-09-27: PR #139 reviewed and refreshed after #140; retain all five navigation guards plus the merged draft-error handling, and regenerate the combined test inventory. Follow-up to #136/#137.

- 2026-09-28: PR #145 review narrowed imported workflows to repository policy, proposed ADR 0009, disabled public Scorecard publishing and credential verification, restored honest scanner failures, and removed unsupported fleet-sync claims. Team acceptance and final-head scan evidence remain required.

- 2026-09-29: PR #126 refreshed against main 9630c2a. Restored the complete main continuity files before adding this entry, addressing the review finding about truncated history. No application change in this refresh; renewed final-head peer approval is required.
- 2026-09-29: PR #127 refreshed against main 9630c2a. Restored the complete main continuity files before adding this entry, addressing the review finding about truncated history. No application change in this refresh; renewed final-head peer approval is required.
- 2026-09-29: PR #136 refreshed against main 9630c2a. Restored the complete main continuity files before adding this entry, addressing the review finding about truncated history. No application change in this refresh; renewed final-head peer approval is required.
- 2026-09-30: PR #137 refreshed against current main after #136 merged; main continuity files copied byte-for-byte before appending this entry and tc-coverage.md regenerated. No application change in this refresh; renewed final-head peer approval is required.
- 2026-09-30: PR #146 refreshed against current main; main continuity files copied byte-for-byte before appending this entry. Addressed review: separate backend/frontend PRs with their own Jira tickets count as independently reviewable increments; branch-age wording aligned; stale #145 note updated. Instructor announcement quoted verbatim in docs/plans/instructor-guidance-2026-09-28.md.

- 2026-10-02: PR #175 / SCRUM-37 stale coverage CI failure reproduced exactly: four E03-S07 cases changed from scaffold to active and a date-field component test was omitted. Regenerated tc-coverage.md; no application code changes. Local repository verification and immutable tooling evidence are being prepared before pushing the fix.

- 2026-10-02: PR #175 / SCRUM-37 follow-up: #181 was already merged; pulled it and normally merged main. Added registration date hint/error ARIA regression and activity-log actor assertion. Root typecheck, 188 Vitest tests, 32 desktop/mobile E03 tests (24 scaffold skips), and 76 tooling tests passed without hook skips. T-65 records added; coverage regeneration and push follow. #175 remains for peer approval, not merged by this session. Prior verification-preparation note is completed.

- 2026-10-02: PR #175 CI found CodeQL incomplete-sanitization in #181 date-presence replace call. Replaced it with a direct Boolean check of the two source date values; focused 16 form tests, root typecheck and 76 tooling tests pass. Coverage regenerated unchanged. Final CI and peer approval remain required.
