# Agent Journal

- 2026-09-27: PR #134 main refresh after #143 merged as af97522. Retained
  calendar, coordinator and notification test commands and both CI database
  steps; regenerated the combined test inventory. Existing inbox/security and
  coordinator changes are preserved. Prior local-only #143 notes are historical;
  that PR is now merged. Validation is recorded in the PR follow-up. SCRUM-42.

- 2026-09-26: PR #134 refreshed after #138 merged. Calendar API implementation and prior review fixes retained; SCRUM-42 / E05-S03. Required review and CI are checked on the refreshed head before merge.

- 2026-09-26: Resolved main conflicts for PR #134 while retaining calendar, venue search and email test commands; regenerated coverage. SCRUM-42 / E05-S03. Validation evidence is recorded in the PR review follow-up.
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

- 2026-09-22: Opened PR #119 (`test/fix-create-extension-race-condition`) fixing a `CREATE EXTENSION IF NOT EXISTS` TOCTOU race across 6 integration-test files via a shared helper; CI green (application-checks 3m6s against a genuinely fresh Postgres container). eventLifecycle.integration.test.ts (on #115, unmerged) deliberately left out -- will fast-follow once #115 picks up main.
- 2026-09-22: Created `.agents/STATE.md` and `.agents/JOURNAL.md` (this file) per Bryan's request to track progress across sessions, using the cross-harness-state skill's convention.
- 2026-09-22: Spun up a 2-member team (`bdr-adr-reviewer`, `jira-ticket-updater`) to parallel-check whether tonight's 3 fixes warranted a decision record and whether Jira needed updates, while continuing the critical path solo. bdr-adr-reviewer found a *second*, separate `docs/adr/` numbering scheme (ADR-001..016) distinct from `docs/decisions/` (0001..0006) -- confirmed `docs/decisions/` was the right home for the CI-workflow-gap decision by precedent (0006 Jira-sync workflow). jira-ticket-updater confirmed SCRUM-109's existing comment wasn't the superseded recommendation and posted a correct new one; worked around a deprecated Jira Cloud JQL search endpoint (410 Gone) by switching to `POST /rest/api/3/search/jql`.
- 2026-09-22: Opened PR #118 fixing a real bug Aaron found on #114: `application-checks.yml`'s path filter meant docs-only PRs never got a status for that required check, permanently blocking merge. Added a companion `paths-ignore`-mirrored workflow reporting the same check name (GitHub's documented pattern). Live-proved on the PR's own run (3s pass vs the usual ~3min). Added `docs/decisions/0007` for this after the bdr-adr-reviewer subagent's review overturned my own initial "not architecturally significant" call -- accepted the correction; its reasoning (changes the required-check contract for every future PR) was right and mine was too quick.
- 2026-09-22: Merged PR #116 (Bryan's explicit ask) after confirming Aaron's approval + CI green. Fixed two real, root-caused pre-existing bugs in E01-S02/E01-S03 integration tests (EVT-A02 wrongly defaulting to draft status; a stale audit-row match with no entity_type filter). Both were test-fixture bugs, not application bugs -- traced via the actual query/service code, not guessed.
- 2026-09-22: Fixed PR #115's `CHANGES_REQUESTED` blocker (stale `docs/testing/tc-coverage.md`) per Aaron's exact instructions; re-requested review.
- 2026-09-22: Discovered (during PR #116's stress-testing) a non-deterministic `CREATE EXTENSION IF NOT EXISTS` race affecting 6 integration-test files on a fresh database -- flagged as a follow-up rather than silently expanding scope, since Bryan hadn't asked for it yet. He asked for it explicitly in the next message ("yes i want the 6 file fix now").
- 2026-09-22 23:30:08 +08:00 [PRAWN-T14/claude/stop] branch=docs/agents-state-journal head=b7e7dee dirty=1
- 2026-09-22 23:40:37 +08:00 [PRAWN-T14/claude/stop] branch=docs/agents-state-journal head=b7e7dee dirty=1
- 2026-09-23 00:22:25 +08:00 [PRAWN-T14/claude/stop] branch=docs/agents-state-journal head=f5e174b dirty=1
- 2026-09-23 07:16:29 +08:00 [PRAWN-T14/claude/stop] branch=docs/agents-state-journal head=f5e174b dirty=1
- 2026-09-23: Aaron approved and merged #118 and #119 (~17:04-17:10). #118's skip-workflow fix confirmed working repeatedly on subsequent docs-only PRs.
- 2026-09-23: Batch-closed 13 Jira tickets as Done (SCRUM-26/27/91/93/95/96/97/98/99/100/101/103/104) via scripts/reconcile_jira.py plus a small companion script for 97/98/99 (PR #53's branch name only references SCRUM-96; its body covers all four). Verified all 13 via live re-query. Held out SCRUM-107/108 at Bryan's explicit instruction -- their described work appears to have shipped under sibling tickets' PRs (#68 tagged SCRUM-93, #62 tagged SCRUM-103), not confidently 1:1 mappable.
- 2026-09-23: Built and uploaded a PostPlan HTML review-queue report (https://nibmdmkybkwz.postplan.dev). Caught two real narrow-viewport layout bugs (tables and SVG diagram both overflowed illegibly at 390px) via exact DOM measurement after an AI-vision screenshot read gave an unreliable answer -- learned not to trust look_at for pixel-precision questions with a definite technical answer.
- 2026-09-23: Made AGENTS.md's .agents/STATE.md reference firm and named all four harnesses explicitly, per Bryan's ask that his team's agents actually use MOLT. Discovered a live Claude Code session on PRAWN-T14 already auto-appends Auto State blocks to this file on its own Stop hook (see below) -- MOLT partly exists already on at least one machine. Stashed/restored around this file's uncommitted concurrent edits rather than touching them, across several branch switches.
- 2026-09-23: Bryan flagged a live merge conflict on #114 (created by #117 merging first, same file). Compared both diffs directly rather than guessing a side: same substance, #117 more comprehensive and already merged. Closed #114 without merging; opened #121 to carry over #114's one unique piece (a checklist bullet) on top of #117's already-shipped work; tagged Jining since it's her story's file.
- 2026-09-23 07:42:42 +08:00 [PRAWN-T14/claude/stop] branch=docs/agents-state-journal head=546453a dirty=1
- 2026-09-23 08:08:58 +08:00 [PRAWN-T14/claude/stop] branch=docs/agents-state-journal head=546453a dirty=1
- 2026-09-23 08:19:57 +08:00 [PRAWN-T14/claude/stop] branch=docs/agents-state-journal head=546453a dirty=1
- 2026-09-23: Re-examined SCRUM-107/108 by reading the tickets' own descriptions (not just branch names this time) -- found an earlier, independent Sep-20 reconciliation pass had already documented PR #68 and #62 as shipping their work, with a "no human review yet" caveat identical in wording to SCRUM-93/103, which were already closed with Bryan's approval. Found SCRUM-105 (`[DUPLICATE of SCRUM-93]`) as the team's real precedent for how true duplicates get labeled -- 107/108 never got that label, which argues against them being duplicates in that sense. Built and uploaded an evidence postplan (https://3wupccg0rklj.postplan.dev) with direct quotes side-by-side rather than asserting a conclusion; final call left to Bryan.
- 2026-09-23: Audited all 111 Jira tickets' title conventions at Bryan's request. Found 4 genuinely different, historically-mixed patterns: 47 tickets `E01-S01 Title` (no brackets), 24 tickets `[E01-S05] Title` (brackets, interleaved chronologically with the no-bracket ones, not a clean early/late split), plus `[E01-EXT]`/`[E01]`/`[Docs]`/`[DUPLICATE...]` variants for non-story technical work. Standardized the 24 bracketed story tickets to match the no-bracket majority (which also matches the canonical backlog Markdown format's own documented heading convention) via direct Jira API calls; verified 0 remain bracketed. Confirmed branch names reference ticket keys, not title text, so no branch renames were needed.

- 2026-09-27: PR #134 refreshed after #124/#140; continuity conflicts resolved by retaining both histories; generated test inventory refreshed. SCRUM-42 / E05-S03.
- 2026-09-27: PR #141 / SCRUM-32 review: migration 0008 applied with explicit operator approval and verified against the live ledger/schema, assignment backfill, indexes, RLS and browser-role grants. Only 0008 applied. Fixed the reproduced empty status-history query using event/status audit fields; real PostgreSQL regression excludes other events and field changes. Assignment/visibility units and both PostgreSQL integration tests pass (36 total), and backend typecheck passes. Updated against merged #140; current CI and peer approval remain required.
- 2026-09-27: PR #139 reviewed and refreshed after #140; retain all five navigation guards plus the merged draft-error handling, and regenerate the combined test inventory. Follow-up to #136/#137.
- 2026-09-27: Implemented SCRUM-75 all-role authenticated notification inbox on
  feature/SCRUM-75-notification-inbox, reusing T-64 event hooks and email outbox.
  Added database ownership/current-email/provider-failure regressions and real
  desktop/mobile login-to-inbox tests. Unit/component, notification database,
  dispatcher/provider, Redis, browser, build/typecheck, runtime and hygiene checks
  passed. Coverage inventory regenerated. See docs/testing/event-notifications.md
  for exact commands and unfinished owning-story dependencies. No production
  schema/data/email changes, commits, pushes or Jira status changes.

- 2026-09-27: User authorized commit and PR for SCRUM-75 inbox follow-up.
  Preparing a conventional draft PR with the required four sections, actual test
  evidence and explicit outstanding dependencies; do not close the full story.

- 2026-09-27: PR #143 security review: prepared local merge of main 84e8180,
  preserving coordinator assignment/audit/outbox fixes and migration 0008. Resolved
  STATE, package scripts, hook plan and generated coverage conflicts by combining
  current intent. Filter eventless notices in list and mark-read responses, cap
  inbox at 100, and add real verification-capability/database/browser regressions.
  Relevant suites pass; broad DB registration concurrency test still fails in
  unchanged code. Legacy organisation-filtered read-path consolidation remains a
  follow-up. No commit, push, live migration, approval or PR merge authorized.

- PR #143 postplan uploaded and linked: https://0lympnguubta.postplan.dev.
  Updated PR description/checklist with local evidence and remaining DB failure;
  final-head CI remains unchecked. No commits or code push.

- 2026-09-28: PR #145 review narrowed imported workflows to repository policy, proposed ADR 0009, disabled public Scorecard publishing and credential verification, restored honest scanner failures, and removed unsupported fleet-sync claims. Team acceptance and final-head scan evidence remain required.

- 2026-09-29: PR #126 refreshed against main 9630c2a. Restored the complete main continuity files before adding this entry, addressing the review finding about truncated history. No application change in this refresh; renewed final-head peer approval is required.
- 2026-09-29: PR #137 refreshed against main 9630c2a. Restored the complete main continuity files before adding this entry, addressing the review finding about truncated history. No application change in this refresh; renewed final-head peer approval is required.
