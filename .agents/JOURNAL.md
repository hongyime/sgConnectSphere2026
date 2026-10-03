# Agent Journal

- 2026-10-02: PR #187 review refresh: integrated main 139217e without altering the ten historical execution records or their original source attribution. New verification covers repository tooling only; historical application suites are not rerun. Awaiting renewed peer review after the push.
- 2026-10-03: Review and merge of PR #193 (SCRUM-34 decide screens) on
  Bryan's behalf from an isolated detached checkout: head 3dc0107 checked
  against E03-S03 and its backend contract, no blocking findings; focused
  component run 52/52 after restoring the worktree's frontend dependency
  link; approval pullrequestreview-5394108313 cites the run; squash-merged as
  c6c9aab at 00:16 +08:00. The execution record
  (the 00:14:04 frontend-vitest file under docs/testing/runs/) was left
  uncommitted in that checkout and is salvaged in #204; the checkout was then
  removed during the 3 October worktree clean-up along with the merged
  #182/#183/#191 checkouts and the clean, pushed #185/#187/#192/#194/#195/#196
  ones.

- 2026-10-03: Collapsed the Week 7 stack (#197-#203) into one PR after
  working out that `dismiss_stale_reviews_on_push` plus squash merges plus the
  shared `.agents/STATE.md` prepend meant every merge invalidated the next
  approval. Kept the per-change postplans as the review aids. Set the live
  ruleset's strict up-to-date policy to false (the team had already decided it
  in #195) because it was the other half of the re-approval loop. Verification:
  python scripts/check.py; exports and tc-coverage regenerated; pairwise
  merge-tree checks between the five open PRs.

- 2026-10-02: Week 7 Customer Changes PDF (six mandatory Release 1 changes:
  venue setup/turnaround buffers, venue unavailable after booking, several
  venues per event, expiring tentative holds, Event Coordinator Lead role with
  unassigned queue, Safety Officer gate). Checked each against the lecture
  process (Wk2 user stories/AC/INVEST, Wk3 refinement any time but sprint scope
  fixed, review returns not-Done to backlog) and the repo's downstream-flow
  rule (source-of-truth: BDR and backlog Markdown first, Jira last). Four
  changes reverse earlier customer answers (C-01/C-16/C-60 no hold expiry,
  C-18/C-38 no turnaround, C-41/C-55 auto-assign, C-56 reassignment actor);
  earlier rows annotated rather than edited. Change 6's "preparation" has no
  status today; team placed a Safety Review status before Confirmed and made
  that the first Q&A question. Change 2 conflicts with E05-S04 Scenario 2
  (refuses blocks over confirmed bookings), which is mid-sprint, so the delta
  becomes a new E05 story. Change 3 retires T-20. Fixed five pre-existing
  blank lines splitting the section B table. Verification:
  python scripts/check.py in the worktree; docx regenerated with
  .venv-tools\Scripts\python.exe scripts/export_adr_bdr_docx.py (ADR copy
  discarded as unchanged).

- 2026-10-02: Sprint 2 retro feedback asked for a merge queue. Checked: repo is
  public (queue available on free plan), Bryan has admin, no ruleset existed,
  classic protection had strict up-to-date on. Applied the ADR 0008 ruleset
  migration first because merge_queue is ruleset-only. Read GitHub docs:
  required-check workflows MUST trigger on merge_group or the queue times out;
  the queue replaces the up-to-date rule; paths filters are ignored on
  merge_group, so application-checks runs its full suite on every queued PR and
  the companion skip workflow must not also run there (two same-named checks on
  one commit). Chose ALLGREEN over HEADGREEN (no flaky required check exists),
  30-minute timeout against an 8-12 minute suite, groups of five. Demoted the
  hourly branch updater because each auto-update dismissed approvals, re-ran CI
  and consumed a Vercel Hobby deployment (decision 0010). Verification in the
  worktree: python scripts/check.py; JSON and YAML parsed with the tooling
  venv; on: keys confirmed per workflow.

- 2026-10-02: PR #183 review follow-up: refreshed from main 139217e; corrected live deactivation, accessibility selection, comments and clarification routes. Recounted 47 stories and 75 routes, with 11 stories having no current route. E14 viewer remains a prototype; PR #192 reader/sprint decisions are explicitly pending merge. Pending peer re-review; no story completion asserted.

- 2026-10-02: Merged origin/main (f0c4264, #182) into the screen inventory branch so #183 can merge. Conflict was only the agent notes; kept both. Verification: python scripts/check.py. SCRUM-118.

  - 2026-10-02: Review on #183. Updated the screen inventory for the two
  routes #175 added after f39e81e. Header now cites 1780b3c. Verification:
  python scripts/check.py. SCRUM-118.

  - 2026-10-02 (PR A, SCRUM-118): wrote docs/plans/screen-inventory.md mapping all 47
  Release 1 stories to role, sprint, route(s), status and page pattern. Generated from
  routes.tsx at f39e81e and docs/backlog/release-1/. Noted stories whose route is a
  mock, which stories live on inline surfaces (comments, change classification) and
  which have no route yet. Verification: python scripts/check.py (PASS). Framed as a
  draft for Amareet's SCRUM-118 review and must be reconciled against her own draft.

  - 2026-10-02: Review on #182. Merged main and removed the design.md
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

- 2026-10-02: Review on #182. Merged main and removed the design.md
  section 11 Typeface row instead of leaving it marked resolved. Added
  docs/decisions/0011-load-inter-from-google-fonts.md and pointed section
  3.2 at it. Google Fonts kept, per the recorded choice. Verification:
  python scripts/check.py.

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
- 2026-09-29: PR #127 refreshed against main 9630c2a. Restored the complete main continuity files before adding this entry, addressing the review finding about truncated history. No application change in this refresh; renewed final-head peer approval is required.
- 2026-09-29: PR #136 refreshed against main 9630c2a. Restored the complete main continuity files before adding this entry, addressing the review finding about truncated history. No application change in this refresh; renewed final-head peer approval is required.
- 2026-09-30: PR #137 refreshed against current main after #136 merged; main continuity files copied byte-for-byte before appending this entry and tc-coverage.md regenerated. No application change in this refresh; renewed final-head peer approval is required.
- 2026-09-30: PR #146 refreshed against current main; main continuity files copied byte-for-byte before appending this entry. Addressed review: separate backend/frontend PRs with their own Jira tickets count as independently reviewable increments; branch-age wording aligned; stale #145 note updated. Instructor announcement quoted verbatim in docs/plans/instructor-guidance-2026-09-28.md.

- 2026-10-02: PR #175 / SCRUM-37 stale coverage CI failure reproduced exactly: four E03-S07 cases changed from scaffold to active and a date-field component test was omitted. Regenerated tc-coverage.md; no application code changes. Local repository verification and immutable tooling evidence are being prepared before pushing the fix.

- 2026-10-02: PR #175 / SCRUM-37 follow-up: #181 was already merged; pulled it and normally merged main. Added registration date hint/error ARIA regression and activity-log actor assertion. Root typecheck, 188 Vitest tests, 32 desktop/mobile E03 tests (24 scaffold skips), and 76 tooling tests passed without hook skips. T-65 records added; coverage regeneration and push follow. #175 remains for peer approval, not merged by this session. Prior verification-preparation note is completed.

- 2026-10-02: PR #175 CI found CodeQL incomplete-sanitization in #181 date-presence replace call. Replaced it with a direct Boolean check of the two source date values; focused 16 form tests, root typecheck and 76 tooling tests pass. Coverage regenerated unchanged. Final CI and peer approval remain required.

- 2026-10-02: Addressed Amareet's PR #184 review locally: venue suitability is
  a shared StatusPill in Card actions; the single no-full-matches Alert remains.
  Added browser assertions against per-result alerts. Focused browser 8,
  navigation component 4, build/typecheck and hygiene/tooling 76 passed.
  Evidence: docs/testing/runs/20261002-214056-jininggg-full-regression.md.
  Desktop/mobile screenshots visually checked. Timezone behaviour unchanged;
  non-blocking scope advice applies to future PRs. User authorized committing and
  pushing this follow-up for re-review; final CI and human approval remain required.
