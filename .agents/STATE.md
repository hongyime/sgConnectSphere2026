# Agent State

Current state refreshed on **2026-10-06**, following Sprint 2 close
(2026-10-03) / Sprint 3 open (2026-10-04). Detailed history lives in
`.agents/handoffs/` (`python scripts/agent_handoffs.py` lists it).
`JOURNAL.md` is the per-task Learnings archive. This file is the owner’s
curated summary and is only edited through a `chore(agents): consolidate ...`
PR (decision 0014).

## Where things stand

**Sprint 2 is closed.** Eight PRs merged on 3 October (#194, #195, #196,
#204, #205, #206, #207 and #208), landing the Week 7 Customer Changes
(C-65 to C-70), the merge queue, per-task handoff files, the STATE/JOURNAL PR
exclusion, Sprint 2 retro CI changes and Sprint 2 execution-record evidence.
The #182–#192 review tranche is now closed. #185 and #187 merged after #208
on 3 October; #185 shipped the frontend skeleton pilot and #187 backfilled
Sprint 1 execution records. #190 shipped the E14-S02 immutability migration,
and #192 recorded the remaining E14-S02 scope. The latest `main` at this
refresh is `1c1be82` (2026-10-06).

**Sprint 3 is active** (Jira sprint 36, 2026-10-04 to 2026-10-17). Goal set
2026-10-05: deliver end-to-end event execution -- venue booking (E06),
equipment and technical support (E07), and event confirmation (E08) -- while
completing the carried-over notifications (E11) and activity log (E14)
foundations from Sprint 2.

**Sprint 3 Jira assignment and status (checked 2026-10-06):**

- In Progress: SCRUM-75 (E11-S01, Ji Ning) and SCRUM-86 (E14-S02, Le Xin),
  both carried over from Sprint 2 (T-67, T-76).
- In Review: SCRUM-51 and SCRUM-52 (E07-S01/S02, Xiang Ying).
- To Do: Ji Ning owns SCRUM-46/47 (E06-S02/S03); Le Xin owns SCRUM-48/50
  (E06-S04/S06); Amareet owns SCRUM-49/56/57 (E06-S05, E07-S06/S07);
  Xiang Ying owns SCRUM-53 (E07-S03); Aaron owns SCRUM-54/55/60
  (E07-S04/S05, E08-S03); Bryan owns SCRUM-112 (preview-deploy cleanup).
- Done: SCRUM-116/117/119 (frontend skeleton, design.md, Amareet’s pages onto
  it), carried in from Sprint 2.

Week 7 story tracking (checked 2026-10-06): E05-S05 (SCRUM-44) and E10-S05
(SCRUM-74) are To Do and outside Sprint 36. The seven new Jira Stories are
SCRUM-152 (E05-S06), SCRUM-153/154/155 (E03-S08/S09/S10), SCRUM-156/157
(E01-S12/S13) and SCRUM-158 (E08-S06); all are To Do under their matching
Epics and outside Sprint 36. Jira defaulted their priority to Medium; team
triage remains open. The release backlog marks them Sprint 3, but sprint
placement remains pending T-73 planning; points and assignees are unset.

## Live infrastructure

- **Merge queue** live on `main` since 3 October (decision 0012, ruleset
  `main-protection` id 24377800). SQUASH, ALLGREEN, 30 minute timeout,
  `strict_required_status_checks_policy` off. Required checks:
  `repository-checks`, `pr-conventions`, `lfs-guard`, `application-checks`,
  plus one approval and an approval after the latest push
  (`require_last_push_approval: true`). `merge_group` triggers are wired on
  the four required workflows; `update-pr-branches` is `workflow_dispatch` only.
- **Per-task handoff files** are the detailed working record (decision 0013).
  PRs may not edit `.agents/STATE.md` or `.agents/JOURNAL.md` (decision 0014,
  enforced by `pr-conventions` via `check_changed_files` in
  `scripts/check_metadata.py`). The owner opens one `chore(agents):
  consolidate ...` PR to rewrite this file. The nine Sprint 2 handoff files
  already on `main` do not carry a `Learnings` heading; the first
  consolidation reads them whole.
- **Vercel preview deploys** come from `vercel-deploy.yml` only
  (SCRUM-111, #164); drafts are skipped and `ready_for_review` triggers a
  deploy (decision 0010 amended, #204).
- **Jira nightly sweep** (#170) covers missing Team/assignee fills.
- **Jira sync** on PR merge works but may transition a parent story Done when
  only one scenario shipped: in #190 it moved SCRUM-86 to Done after only
  Scenario 5 landed; the PR #192 session restored In Progress and documents
  the pattern. Prefer scope PRs that keep the story key out of the branch,
  title and closing clauses.

## Role split (Week 6 onward, ADR-017)

Each story’s Jira owner builds that story’s frontend as well as its backend,
on the shared frontend skeleton. Amareet builds her Sprint 3 stories
(SCRUM-49, SCRUM-56 and SCRUM-57) full-stack while serving as Scrum Master
and owning the skeleton (SCRUM-116, Done) and frontend guide. Bryan owns
`design.md` (SCRUM-117, Done); story owners build on the skeleton going
forward.

## Known env facts

- Local integration tests use a disposable Docker `postgres:17` container
  (`POSTGRES_PASSWORD`, db
  `connectsphere_notification_test`, port 5432) -- never the live Supabase
  project. CI spins up an equivalent service container per run. Tests that
  need `TEST_DATABASE_URL` are skipped locally when it is unset; CI runs them.
- `registration.db.test.ts` needs the `public` schema pre-migrated via
  `npx tsx src/database/cli.ts migrate` before it passes.
- Local Vitest must run with `--no-file-parallelism` on Windows; CI is
  authoritative.
- Local API needs `ADDITIONAL_ALLOWED_ORIGINS` set to the frontend origin for
  E05-S03 end-to-end against a seeded database (see the 20261003 E05-S03/S04
  seeded-execution handoff and run).
- `scripts/reconcile_jira.py` requires `JIRA_SITE_URL`, `JIRA_EMAIL`,
  `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`. GitHub Actions variant is advisory and
  never blocks a merge.

## Carried-over Sprint 2 work (now in Sprint 3)

- **SCRUM-75 / E11-S01** (Ji Ning, In Progress): notification foundation
  shipped in Sprint 2 (#141/#142/#163) and inbox follow-up on
  `feature/SCRUM-75-notification-inbox`; still open: venue assignment,
  downstream workflow callers (every write path that needs a notification),
  all-role inbox verification, deployed email verification. See the Sprint 2
  Learnings for the test-DB and provider test setup.
- **SCRUM-86 / E14-S02** (Le Xin, In Progress): immutability migration shipped
  in #190; the remaining acceptance criteria (1/2/4/5) are the Sprint 3
  carryover, with booking approval/rejection/release logging moved into
  E06-S04 Scenario 5 by #192 (T-76). Jira sync marked SCRUM-86 Done on #190
  merge; status restored to In Progress on 2026-10-02.

## Open follow-ups and small debts

- **Backlog -> Jira:** Week 7 stories now have Jira issues, including
  SCRUM-152 through SCRUM-158. Resolve Sprint 3 placement under T-73, estimate
  the new stories at planning, and triage the Jira default Medium priorities.
- **Playwright scaffolds:** the 50+ new TC_IDs from the Week 7 backlog PRs
  still need `test.fixme` scaffolds; owners add these alongside the story
  implementation. `tc-coverage.md` is current as of 2026-10-03.
- **Pending migration 0011:** documented in `docs/db_schema.md` under
  "Pending migration" and in ADR-003/006/007/009/012 amendments; not yet
  written or applied. Needed before the Week 7 Change 1 setup/turnaround and
  Change 4 hold-expiry implementation.
- **Pre-commit mirror** of `check_changed_files` (decision 0014 Not done).
- **Deploy-and-debugging doc** still describes the retired Vercel git-
  integration `Vercel` status check beyond the two bullets changed in #204.
- **DRY follow-up on #115:** `eventLifecycle.integration.test.ts`'s local
  `createExtensionIfNotExists` can be swapped for the
  `backend/tests/helpers/ensureTestExtensions.ts` import; cosmetic only.

## Pointers

- Detailed per-task notes: `.agents/handoffs/` (newest first via
  `python scripts/agent_handoffs.py`).
- Learnings archive: `.agents/JOURNAL.md` (untrimmed, append-only).
- Live decisions index: `docs/decisions/`.
- Source-of-truth map: `docs/source-of-truth.md`.
- Backlog views: `docs/backlog/` (Markdown) + `docs/CONNECTSPHERE BACKLOGS CAA
  <DDMMYYYY>.xlsx` (regenerated via `scripts/export_backlog_xlsx.py`).
- Test case views: `docs/testing/cases/` (Markdown) + `docs/testing/PROJECT
  TEST CASES CAA <DDMMYYYY>.xlsx` + `docs/testing/tc-coverage.md`
  (regenerated via `scripts/export_testcases_xlsx.py` and
  `scripts/tc_coverage_audit.py`).
- Branch protection: ruleset `main-protection` (id 24377800); see
  `docs/decisions/0012-merge-queue.md` for the "Merge when ready" flow.
