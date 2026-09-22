# Agent State

Current task: Sprint 2 CI/test-infrastructure hardening for ConnectSphere.
Fixing pre-existing integration-test bugs and CI gaps discovered while
verifying SCRUM-110 (PR #115), per Bryan's explicit "fix it properly, don't
ask me" mandate. No implementation-mode carryover to other Sprint 2 stories
unless Bryan asks directly.

Progress:

- Merged **PR #116** (`fix/event-attendee-visibility-integration-bugs`):
  fixed two real, root-caused pre-existing bugs -- `EVT-A02` defaulted to
  `status='draft'` in `eventVisibility.integration.test.ts`'s fixture,
  tripping the (correct) draft-privacy filter and hiding a colleague's event
  it shouldn't have; and `attendeeVisibility.integration.test.ts`'s audit
  lookup had no `entity_type` filter so it could grab a stale row from an
  earlier, unrelated denial in the same test. Both were test-fixture/query
  bugs, not application bugs. Verified: full `test:db` suite 6/6, backend
  unit suite 144/144, `application-checks` CI green (2m53s + 3m3s on
  re-run). Aaron (Bl0oper) independently re-verified both root causes
  against the actual code before approving.

- **PR #118** (`ci/application-checks-required-check-path-gap`), open, CI
  green, awaiting Aaron's review: `application-checks.yml`'s `paths:`
  filter meant docs-only PRs (like #114) never got a status for that
  required check -- permanently `BLOCKED`, not failing, just stuck. Added
  `.github/workflows/application-checks-skip.yml` (GitHub's documented
  mirrored-`paths-ignore` workaround) reporting the same check name as a
  no-op success. Live-proven on this PR's own run (`application-checks`
  passed in 3s, not the usual ~3min, confirming the skip workflow -- not the
  real one -- satisfied the check). A team-mode subagent (`bdr-adr-reviewer`)
  independently determined this clears the bar for a decision record (it
  changes the required-status-check contract for every future PR) and drafted
  `docs/decisions/0007-application-checks-skip-workflow.md`, following the
  0001-0006 format exactly; reviewed and accepted, added to this PR.

- **PR #119** (`test/fix-create-extension-race-condition`), open, CI green
  (`application-checks` 3m6s against CI's own fresh Postgres container),
  awaiting Aaron's review: fixed a `CREATE EXTENSION IF NOT EXISTS` TOCTOU
  race (flagged as a finding in #116) present identically across 6
  integration-test call sites. Added `backend/tests/helpers/ensureTestExtensions.ts`
  (swallows only `23505`/`pg_extension_name_index`, since that means a
  concurrent session won the race, which is the outcome every caller wanted).
  Wired into `eventVisibility`, `attendeeVisibility`, `profile`,
  `venueAccessibility`, `venueCatalogue` integration tests, and
  `loginDatabase.ts` (used by `loginRecovery.integration.test.ts`). Verified:
  typecheck clean, 6x repeated runs against a freshly-recreated Docker
  Postgres container with all 6 files racing concurrently -- 0/6 occurrences
  of the target race. One run had 2 unrelated `loginRecovery` timing-test
  failures that never reproduced again and coincided with unrelated heavy
  concurrent host load; noted transparently in the PR, not hidden.

- **PR #115** (`fix/scrum-110-eventlifecycle-migration-roundtrip`), open,
  CI green: fixed per Aaron's `CHANGES_REQUESTED` (stale
  `docs/testing/tc-coverage.md` regenerated via `scripts/tc_coverage_audit.py`).
  Also applied the same `CREATE EXTENSION` race fix (see PR #119 below) to
  `eventLifecycle.integration.test.ts` directly on this branch as a local
  copy (with a TODO to consolidate on the shared helper once #119 merges),
  rather than waiting on PR ordering. Re-requested Aaron's review after both
  changes; verified locally against disposable PostgreSQL.

- **PR #114** (`docs/e01-s04-amend-ac-per-t61`), open, Aaron-approved twice,
  but `mergeStateStatus: BLOCKED` because it's docs-only and hits the exact
  gap #118 fixes. Should unblock once #118 merges -- **verify and merge #114
  once #118 lands.**

- Jira: `bdr-adr-reviewer` and `jira-ticket-updater` team-mode subagents
  confirmed SCRUM-109's existing comment was an unrelated Sprint 1
  reconciliation note (not the close-as-superseded recommendation) and
  posted a new comment recommending closure as superseded by the existing
  per-run-random-schema harness. Not closed -- PO (Bryan) decision pending.
  SCRUM-17/SCRUM-18 (E01-S02/E01-S03) already Done; no comment needed since
  #116's fixes were implementation corrections, not scope changes.

- **PR #120** (`docs/agents-state-journal`, this file's own PR): adds
  `.agents/STATE.md` + `.agents/JOURNAL.md`. Touches only `.agents/**`, which
  is outside `application-checks.yml`'s paths AND outside #118's
  not-yet-merged skip-workflow's coverage (since `main` doesn't have #118
  yet) -- so this PR currently shows NO `application-checks` status at all,
  live-demonstrating the exact bug #118 fixes. Expected; documented in the
  PR body. Will resolve once #118 merges and this branch picks it up.

Next (in order):

1. **Everything below is now blocked purely on Aaron's review bandwidth** --
   #118, #119, #120 await a first review; #115 awaits re-review after two
   rounds of fixes; #114 is already approved but blocked on #118 merging.
   Nothing else to do here except merge the instant each is approved+green.
2. Merge #118 first (unblocks #114 and #120's missing-status problem).
3. Merge #114 once #118 lands (verify it actually unblocks -- may need a
   push/rebase on #114's branch to force GitHub to re-evaluate the check).
4. Merge #119, then #115, then #120 as each gets approved.
5. Once #119 merges, do the small follow-up on #115's branch (or after #115
   merges, on `main`): replace the local `createExtensionIfNotExists` copy
   in `eventLifecycle.integration.test.ts` with an import from the now-`main`
   `backend/tests/helpers/ensureTestExtensions.ts` -- purely a DRY cleanup,
   not a correctness fix (both copies are already correct).
6. Re-confirm Jira's "In Review" ticket count -- Bryan said a batch review
   "already all good" earlier tonight but the live snapshot still showed 15
   tickets In Review (Aaron's SCRUM-26/27 + 13 legacy Bryan-authored
   engineering tickets); never re-verified whether statuses need manual
   transition.

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
