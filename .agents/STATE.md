# Agent State

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

Updated 2026-09-26.

**Role split (whole project, not just Sprint 2):** Amareet is frontend-only
(plus Scrum Master). Aaron, Jining, Le Xin, Bryan and Xiang Ying do backend.
Before Amareet starts a story's frontend, the backend owner is confirmed
(their PR, Jira assignee, or an explicit statement); the frontend is then
built against that API, or against mocks of its contract if not yet live.

- **E11-S01** -- PR #123 merged 2026-09-25 (notification inbox, mocked,
  pending the backend API).
- **PR #127** (Bryan's scaffold) dropped its `/notifications` route, so the
  merge-order clash with #123 is resolved. It still adds a `/venue/blockout`
  placeholder for E05-S04.
- **E05-S03** -- frontend calendar screen in progress, built against Le Xin's
  calendar API in PR #134 (`GET /api/venues?id=&calendar=1&from=&to=`). The
  frontend PR will be marked "merge after #134".
- **E05-S04** -- frontend waits until a backend owner is confirmed (a #127
  review comment says SCRUM-43 is assigned to Le Xin).
- **Agreed Sprint 2 frontend build order:** E11-S01 (done, #123) ->
  E05-S04 -> E05-S03 -> E06-S01 -> E03-S02 + E03-S03 (paired) -> E03-S01 ->
  E03-S06 -> E03-S07 (Scenario 4 deferred, blocked on E10-S01). E03-S05 is
  already satisfied by #112 on `main`. E05-S03 was pulled ahead of E05-S04
  because its backend PR landed first.

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
- 2026-09-29: PR #144 refreshed against main 9630c2a. Restored the complete main continuity files before adding this entry, addressing the review finding about truncated history. No application change in this refresh; renewed final-head peer approval is required.
