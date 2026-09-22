# Agent State

Current task: Sprint 2 CI/test-infrastructure hardening for ConnectSphere is
now mostly landed. Remaining: Aaron's review on #120/#115, Bryan's own
review of SCRUM-107/108 (held out from the Jira cleanup), and PR #121's
review by Jining. No implementation-mode carryover to other Sprint 2
stories unless Bryan asks directly.

Progress (most recent first):

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
4. **SCRUM-107 / SCRUM-108** -- Bryan wants to eyeball these himself
   before any decision; do not touch until he says so.
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
