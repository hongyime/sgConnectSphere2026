# Agent State

Current state refreshed on **2026-10-14** from `origin/main` at `8f246ae`, live Jira Sprint 3 data, and open GitHub PRs. Detailed task history is in `.agents/handoffs/`; `python scripts/agent_handoffs.py` lists it. This file and JOURNAL are owner-maintained through one `chore(agents): consolidate ...` PR (decision 0014), not routine PRs.

## Where things stand

**Sprint 3 is active** (Jira sprint 36, 2026-10-04 to 2026-10-17). The latest merged Week 9 decision, backlog/test, and architecture/UI PRs are #253, #254, and #255. Main now records customer answers C-71 to C-136, team decisions T-79 to T-91, the affected backlog and canonical test cases, ADR-018/019, and updated schema/API/architecture/flow/design handoffs. Application implementation and actual Figma frame work remain downstream. The BDR and ADR Word exports are dated 13 October.

**Live Sprint 3 incomplete issues checked 2026-10-14:**

- Bryan: SCRUM-44 (E05-S05, In Review; PR #231) and SCRUM-176 (E03-S11, To Do; PR #247 has changes requested).
- Ji Ning: SCRUM-46 (In Review), SCRUM-47 (In Progress), and SCRUM-75 (In Progress; carried from Sprint 2).
- Le Xin: SCRUM-48 (In Progress) and SCRUM-50 (To Do).
- Amareet: SCRUM-49 (In Progress).
- Aaron: SCRUM-55 (In Review) and SCRUM-60 (To Do).

These are live sprint items, not yet confirmed Sprint 3 carryovers. Reconcile any incomplete work after the sprint closes on 17 October under T-73; preserve current owners and commitments until then. Bryan already owns SCRUM-44 and SCRUM-176.

## Week 9 follow-through and Jira

- Canonical Markdown was merged before downstream Jira reconciliation, following `docs/source-of-truth.md`.
- Jira follow-up PR #257 records the Week 9 reconciliation. SCRUM-180 (E02-S07) and SCRUM-181 (E07-S08) are To Do outside Sprint 3, without points or assignees. Twelve eligible existing Jira descriptions were refreshed; Sprint 3 commitments and Done stories were protected.
- SCRUM-182 is a technical enabler for the production migration CLI. It is In Review and implemented on PR #258, which adds the one-migration-at-a-time selector. Its no-selector local/test behavior remains all-pending.

## Production migrations and Amareet's request

- Production migration ledger status is **unverified**: this checkout has no access to the T14/3410 environment, production database URL, or `psql`. No production ledger query or migration was run.
- Migration 0013 is merged in #246, but merge does not prove it is on production. The runbook requires a read-only precheck and postcheck and a committed run record for each attempt. SCRUM-182/#258 implements the selected one-at-a-time CLI path but is still awaiting review and merge.
- PR #231 proposes migration 0011 and has changes requested plus a merge conflict; PR #232 proposes migration 0012 and has changes requested. Check dependencies and the real ledger before choosing the next file. Do not assume 0009, 0010, or 0013 are still pending.
- PRs #245 and #252 depend on production verification of 0013 and renewed review. Both currently have merge conflicts; #245 also awaits review, and #252 has no current checks reported.

## Open PR snapshot (checked 2026-10-14)

All PRs below target main. “Required checks pass” means repository-checks, pr-conventions, lfs-guard, and application-checks.

- #258, SCRUM-182 migration selector: mergeable; review required; repository-checks, pr-conventions, and lfs-guard pass; one application-checks run passed and a duplicate required application-checks run remains pending. Optional Vercel deploy failed on the account's daily quota.
- #257 Week 9 Jira reconciliation: mergeable; review required; required checks pass.
- #256 E06-S03 booking foundation: mergeable; review required; reported checks pass.
- #252 hold screens: conflicting; review required; no current checks reported; production 0013 verification is also required.
- #251 Dependabot Actions updates: mergeable; approved; required checks pass; optional Vercel deploy failed.
- #250 Dependabot tooling updates: mergeable; approved; required checks pass.
- #249 SCRUM-55 equipment unavailable: conflicting; review required; reported checks pass.
- #248 worktree hygiene gate: mergeable; review required; required checks pass.
- #247 SCRUM-176 registration setup: mergeable; changes requested; reported checks pass.
- #245 SCRUM-138 tentative holds: conflicting; review required; reported checks pass; production 0013 verification is also required.
- #232 Coordinator Lead/Safety Officer roles: mergeable; changes requested; reported checks pass.
- #231 SCRUM-161 venue buffers: conflicting; changes requested; reported checks pass. Bryan's review response and branch-name correction remain necessary before extending work on it.
- #230 SCRUM-179 seeded-account test cases: mergeable; changes requested; required checks pass.
- #217 SCRUM-178 Week 7 test scaffolds: mergeable; review required; required checks pass.

## Live infrastructure and team workflow

- Main protection uses the merge queue, SQUASH and ALLGREEN, with required checks `repository-checks`, `pr-conventions`, `lfs-guard`, and `application-checks`; one teammate approval and approval after the latest push are required. Do not merge without review.
- Per-task handoffs are the detailed working record (decision 0013). Pull requests must not edit `.agents/STATE.md` or `.agents/JOURNAL.md`; the owner consolidates merged handoffs in this PR.
- The product/architecture source of truth is GitHub Markdown. Jira, workbooks, Word exports, Figma notes, and PostPlans are derivative views.
- Jira PR-close sync is advisory and can incorrectly mark a parent story Done for a partial implementation. Reconcile actual scope against the Definition of Done before accepting a status.
- Each Jira story owner builds that story's frontend and backend on the shared frontend skeleton (ADR-017). Amareet owns her Sprint 3 stories while serving as Scrum Master; Bryan owns SCRUM-117 design language (Done).

## Known environment facts

- Local integration tests use a disposable Docker `postgres:17` database, never production. CI uses a service container. Tests requiring `TEST_DATABASE_URL` are skipped locally when it is unset.
- `registration.db.test.ts` needs the `public` schema pre-migrated via `npx tsx src/database/cli.ts migrate`.
- Local Vitest must run with `--no-file-parallelism` on Windows; CI is authoritative.
- Local API seeded end-to-end tests need `ADDITIONAL_ALLOWED_ORIGINS` set to the frontend origin.
- `scripts/reconcile_jira.py` needs `JIRA_SITE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, and `JIRA_PROJECT_KEY`; GitHub Actions Jira sync never blocks a merge.
- T-65 requires a new immutable run record for each test session used as PR/story/demo evidence. Exploratory runs and uncited CI runs do not need records.

## Next actions

1. Obtain teammate review/approval where required; answer changes requested and clear conflicts on #230, #231, #232, #245, #247, and #249. Do not self-approve.
2. On T14/3410, perform the read-only production ledger precheck, select one dependency-ready migration at a time, then use the runbook's pre/post checks and a separate run record for each application. No production action is recorded as complete here.
3. Recheck Sprint 3 at close on 17 October, then confirm carryovers and assign any agreed Bryan follow-up work.
4. After #258 merges, verify its final-head review/check status and update the Jira reconciliation only against the merged evidence.
