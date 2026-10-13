# Agent State

Current state refreshed on **2026-10-14** from `origin/main` at `8f246ae`, live Jira Sprint 3 data, and current open GitHub PRs. Detailed task history is in `.agents/handoffs/`; `python scripts/agent_handoffs.py` lists it. This file and JOURNAL are owner-maintained through the open consolidation PR #259 under decision 0014, not routine PRs.

## Where things stand

**Sprint 3 is active** (Jira sprint 36, 2026-10-04 to 2026-10-17). The latest merged Week 9 decision, backlog/test, and architecture/UI PRs are #253, #254, and #255. Main now records customer answers C-71 to C-136, team decisions T-79 to T-91, the affected backlog and canonical test cases, ADR-018/019, and updated schema/API/architecture/flow/design handoffs. Application implementation and actual Figma frame work remain downstream. The BDR and ADR Word exports are dated 13 October.

**Live Sprint 3 parent-story status checked 2026-10-14:**

There are 21 parent-story issues: 11 Done and 10 incomplete. Board search omits subtasks, so the subtask inventory was checked separately against each issue's Sprint field.

- Bryan: SCRUM-44 (E05-S05, In Review; PR #231) and SCRUM-176 (E03-S11, To Do; PR #247 has changes requested).
- Ji Ning: SCRUM-46 (In Review), SCRUM-47 (In Progress), and SCRUM-75 (In Progress; carried from Sprint 2).
- Le Xin: SCRUM-48 (In Progress) and SCRUM-50 (To Do).
- Amareet: SCRUM-49 (In Progress).
- Aaron: SCRUM-55 (In Review) and SCRUM-60 (To Do).

These are live sprint items, not confirmed Sprint 3 carryovers. Reconcile incomplete work after the sprint closes on 17 October under T-73; preserve current owners and commitments until then. Bryan already owns SCRUM-44 and SCRUM-176.

**Live Sprint 3 incomplete subtasks (checked 2026-10-14):**

There are 19 incomplete subtasks:

- Amareet: SCRUM-139/140/141 In Review, SCRUM-142 To Do, SCRUM-143/144 In Progress.
- Aaron: SCRUM-163/164/165/166/167/168/169, all In Review.
- Ji Ning: SCRUM-170/171/172 In Review and SCRUM-173/174/175 To Do.

SCRUM-142 is linked as blocked by SCRUM-44, whose current implementation PR is #231. These subtasks remain active Sprint 3 work, not confirmed carryovers. Reconcile all parent stories and subtasks only after sprint close under T-73.

## Week 9 follow-through and Jira

- Canonical Markdown was merged before downstream Jira reconciliation, following `docs/source-of-truth.md`.
- Jira follow-up PR #257 records the Week 9 reconciliation. SCRUM-180 (E02-S07) and SCRUM-181 (E07-S08) are To Do outside Sprint 3, without points or assignees. Twelve eligible existing Jira descriptions were refreshed; Sprint 3 commitments and Done stories were protected.
- SCRUM-177 (PR #248) is In Review; SCRUM-178 (PR #217) is In Review; SCRUM-179 (PR #230) remains In Progress while its change request is open.
- SCRUM-182 is a technical enabler for the migration CLI. It is In Review and implemented on PR #258, which adds the one-migration-at-a-time selector. Its no-selector behavior remains all-pending. The Jira description now reflects the verified production ledger: the selector was not needed to apply the sole pending 0013, but remains a future safety improvement.
- SCRUM-141 was reconciled to the accepted existing outbox-relay decision in T-69/ADR-006; T-84 supplies per-hold warning timing. Jira's old GitHub Actions/15-minute wording was removed. The repository currently schedules the existing Vercel relay daily; the product owner has been asked to decide whether to retain that cadence or record a different one. No scheduler or deployment secret was added or changed.

## Production migrations and Amareet's request

- Production ledger was checked read-only before and after the deploy-owner run on 2026-10-14. Before the write, 0009 and 0010 were already applied and `0013_tentative_venue_holds.sql` was the sole pending file among 13 migrations.
- The runbook permits the current CLI when exactly one migration is pending. `npx tsx src/database/cli.ts migrate` ran once from `backend/`, exited 0 and reported only 0013 applied. The post-run read-only ledger includes 0013 at `2026-10-13T18:53:10.865Z`; all 13 migration files are accounted for and none are pending. Run record: `docs/ops/production-migration-runs/20261013-1853-0013_tentative_venue_holds.sql.md`, committed in PR #260.
- Jira SCRUM-138 was updated before the production write and remains Done. SCRUM-182's description was revised to reflect that the selector was not a prerequisite for this one-file catch-up; PR #258 remains a future one-at-a-time CLI improvement and awaits review.
- The production dependency for #245 and #252 is now satisfied. Both remain conflicting; #245 needs renewed review and #252 remains a draft with no current checks. Do not merge until conflicts, review and required checks are resolved.
- PR #231 is conflicting and has changes requested; it blocks SCRUM-142. PR #231's title references SCRUM-161 while its branch references SCRUM-44; SCRUM-161 is already Done in Jira, so do not infer full story completion from that subtask flag.

## Open PR snapshot (checked 2026-10-14)

All PRs below target main. “Required checks” means `repository-checks`, `pr-conventions`, `lfs-guard`, and `application-checks`.

- #260 production migration 0013 run record: open and mergeable; all six checks pass; teammate approval is required.
- #259 owner STATE/JOURNAL consolidation: open and mergeable on prior head `77f10f6`; required checks passed and teammate approval is still required. This update will rerun checks.
- #258 SCRUM-182 migration selector: mergeable; review required; required checks pass. Optional Vercel deploy failed.
- #257 Week 9 Jira reconciliation: mergeable and ready for review; all required checks pass; peer approval is required.
- #256 E06-S03 booking foundation: mergeable; review required; reported checks pass.
- #252 hold screens: conflicting draft; review required; no current checks reported. The production 0013 dependency is satisfied.
- #251 Dependabot Actions updates: mergeable; approved; required checks pass. #250 tooling updates: mergeable; approved; required checks pass.
- #249 SCRUM-55 equipment unavailable: conflicting; review required; reported checks pass.
- #248 SCRUM-177 worktree hygiene: mergeable; review required; required checks pass.
- #247 SCRUM-176 registration setup: mergeable; changes requested; reported checks pass.
- #245 SCRUM-138 tentative holds: conflicting; review required; reported checks pass. The production 0013 dependency is satisfied.
- #232 Coordinator Lead/Safety Officer roles: mergeable; changes requested; reported checks pass.
- #231 SCRUM-44 venue buffers: conflicting; changes requested; reported checks pass.
- #230 SCRUM-179 seeded-account cases: mergeable; changes requested by Xiang Ying remain uncleared on the latest head; the reported case-data/workbook fixes are present and required checks pass.
- #217 SCRUM-178 Week 7 test scaffolds: mergeable; review required; all required checks pass on head `a6a8b48`. Optional Vercel deploy failed.

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

1. Re-review requests are active for #217 (Xiang Ying and Amareet), #230 (Xiang Ying), and #248 (Amareet). #217 and #248 need peer approval; #230 still has Xiang Ying's change request until she reviews the latest head. Required checks pass; #217's optional Vercel deploy failed. Do not self-approve.
2. Record the product owner's exact SCRUM-141 cadence choice before changing schedule configuration or any deployment secret.
3. Merge the run-record PR #260 and owner state/journal PR #259 after teammate review. Do not self-approve.
4. Resolve the conflicts and requested review changes on #231/#245/#252 before extending dependent work; #245/#252 no longer wait on production 0013, and SCRUM-142 remains blocked by SCRUM-44.
5. Recheck Sprint 3 at close on 17 October, then confirm carryovers and assign any agreed Bryan follow-up work.
