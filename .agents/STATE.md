# Agent State

Current state refreshed on **2026-10-14** from `origin/main` at `8f246ae`, live Jira Sprint 3 data, and current open GitHub PRs. Detailed task history is in `.agents/handoffs/`; `python scripts/agent_handoffs.py` lists it. This file and JOURNAL are owner-maintained through the open consolidation PR #259 under decision 0014, not routine PRs.

## Where things stand

**Sprint 3 is active** (Jira sprint 36, 2026-10-04 to 2026-10-17). The latest merged Week 9 decision, backlog/test, and architecture/UI PRs are #253, #254, and #255. Main now records customer answers C-71 to C-136, team decisions T-79 to T-91, the affected backlog and canonical test cases, ADR-018/019, and updated schema/API/architecture/flow/design handoffs. Application implementation and actual Figma frame work remain downstream. The BDR and ADR Word exports now point to CAA 141026.

**Live Sprint 3 parent-story status checked 2026-10-14:**

There are 21 parent-story issues: 11 Done and 10 incomplete. Board search omits subtasks, so the subtask inventory was checked separately against each issue's Sprint field.

- Bryan: SCRUM-44 (E05-S05, In Review; former PR #231 closed, replacement #261 pending) and SCRUM-176 (E03-S11, In Progress; PR #247 has changes requested).
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

SCRUM-142 is linked as blocked by SCRUM-44, whose replacement implementation PR is #261. These subtasks remain active Sprint 3 work, not confirmed carryovers. Reconcile all parent stories and subtasks only after sprint close under T-73.

## Week 9 follow-through and Jira

- Canonical Markdown was merged before downstream Jira reconciliation, following `docs/source-of-truth.md`.
- Jira follow-up PR #257 records the Week 9 reconciliation. SCRUM-180 (E02-S07) and SCRUM-181 (E07-S08) are To Do outside Sprint 3, without points or assignees. Twelve Week 9 descriptions were refreshed, and SCRUM-50/SCRUM-60 were corrected to the already-merged Week 7 Sprint 3 baseline; status, owners, estimates and sprint assignments were preserved.
- SCRUM-176 is now In Progress to match the open, changes-requested PR #247; Jira records the 2026-10-14 status correction. SCRUM-177 (PR #248) is In Review; Jira now limits removable links to `.venv-tools`, root `node_modules`, `backend/node_modules` and `frontend/node_modules`. Arbitrary ignored symlinks remain user data unless `--force` is explicit. SCRUM-178 (PR #217) is In Review; SCRUM-179 (PR #230) remains In Progress while its change request is open.
- SCRUM-182 is a technical enabler for the migration CLI. It is In Review and implemented on PR #258, which adds the one-migration-at-a-time selector. Its no-selector behavior remains all-pending. The Jira description now reflects the verified production ledger: the selector was not needed to apply the sole pending 0013, but remains a future safety improvement.
- SCRUM-141 was reconciled to the accepted existing outbox-relay decision in T-69/ADR-006; T-84 supplies per-hold warning timing. Jira's old GitHub Actions/15-minute wording was removed. The repository currently schedules the existing Vercel relay daily; the product owner has been asked to decide whether to retain that cadence or record a different one. No scheduler or deployment secret was added or changed.

## Production migrations and Amareet's request

- Production ledger was checked read-only before and after the deploy-owner run on 2026-10-14. Before the write, 0009 and 0010 were already applied and `0013_tentative_venue_holds.sql` was the sole pending file among 13 migrations.
- The runbook permits the current CLI when exactly one migration is pending. `npx tsx src/database/cli.ts migrate` ran once from `backend/`, exited 0 and reported only 0013 applied. The post-run read-only ledger includes 0013 at `2026-10-13T18:53:10.865Z`; all 13 migration files are accounted for and none are pending. Run record: `docs/ops/production-migration-runs/20261013-1853-0013_tentative_venue_holds.sql.md`, committed in PR #260.
- Jira SCRUM-138 was updated before the production write and remains Done. SCRUM-182's description was revised to reflect that the selector was not a prerequisite for this one-file catch-up; PR #258 remains a future one-at-a-time CLI improvement and awaits review.
- The production dependency for #245 and #252 is satisfied. #245 is synced to current main at 84ffaa2, conflict-free and mergeable with required checks passing; fresh peer approval is still required. #252 is synced to #245 and current main at c884ccd, conflict-free and mergeable; repository and application checks pass, it remains draft, and no reviewers have been requested.
- GitHub's source-branch rename closed PR #231 instead of retargeting it. Replacement PR #261 uses feature/SCRUM-161-venue-setup-turnaround-pr231; it is mergeable with all required checks passing and peer approval pending. Its backend-only scope does not complete parent SCRUM-44, so SCRUM-142 remains blocked.

**Implementation scaffold sequencing (local audit, 2026-10-14):**

- SCRUM-50 (5 points) and SCRUM-60 (5 points) already had remote task branches. They are now synced to main 8f246ae and carry type-only starter contracts at commits a0140fc and 61d5bbd; neither adds runtime behavior. SCRUM-50 implementation waits on booking foundation #256 and buffer PR #261; SCRUM-60 stays on the T-71 manual readiness submission through sprint close. T-79/T-80/T-82/T-84 changes remain post-sprint follow-up under T-73.
- SCRUM-50 should build on the shared booking contract and buffered occupancy work; replacement PR #261 (migration 0011) and #256 (E06-S03 booking foundation) are still open, so do not fork another implementation path before they land.
- SCRUM-60's remaining implementation spans venue bookings, equipment reservations, support assignments and Safety Review. Its type-only contract marks the readiness/submission seam; the current mock screens remain scaffolds, not delivery evidence.
- SCRUM-180 and SCRUM-181 remain outside Sprint 3 and have no points or assignees; do not create implementation branches until planning assigns them.
- Replacement PR #261 head `d18acba` merges former PR #231 head `532a664` with current `origin/main` `8f246ae`, regenerates `tc-coverage.md`, and carries the tooling run record. The old #231 description links to #261. Parent SCRUM-44 remains open pending the calendar distinction and full acceptance.

## Open PR snapshot (checked 2026-10-14)

All PRs below target main. “Required checks” means `repository-checks`, `pr-conventions`, `lfs-guard`, and `application-checks`.

- #260 production migration 0013 run record: open and mergeable; all six checks pass; teammate approval is required.
- #261 SCRUM-161 venue buffers: replacement for closed #231; open and mergeable at d18acba; required checks pass and peer approval is required.
- #259 owner STATE/JOURNAL consolidation: open and mergeable; all six reported checks pass on head `cc8d69f`. `scripts/check.py` passed 87 tooling tests at base `022ff47`; T-65 record: `docs/testing/runs/20261014-084551-bryanseah234-tooling.md`. Teammate approval remains required.
- #258 SCRUM-182 migration selector: mergeable; review required; required checks pass. Optional Vercel deploy failed.
- #257 Week 9 Jira reconciliation: open at 7609866; all six checks pass; peer approval is required.
- #256 E06-S03 booking foundation: open at 9546159; all required checks pass; review is required.
- #252 hold screens: open draft at c884ccd; conflict-free/mergeable against current main, repository and application checks pass, and no review requests are set. The production 0013 dependency is satisfied.
- #251 Dependabot Actions updates: mergeable; approved; required checks pass. #250 tooling updates: mergeable; approved; required checks pass.
- #249 SCRUM-55 equipment unavailable: conflicting; review required; reported checks pass.
- #248 SCRUM-177 worktree hygiene: mergeable at `7002b6c`; the allowlist follow-up preserves arbitrary ignored symlinks and only unlinks recognized dependency links. The 41-test focused suite has 100% line and branch coverage; `scripts/check.py` passes 128 tooling tests. All reported GitHub checks pass; teammate re-review/approval is required. Auto-merge remains enabled.
- #247 SCRUM-176 registration setup: mergeable; reported checks pass; the coverage inventory requested in Bryan's review was regenerated on the branch. GitHub still records CHANGES_REQUESTED, so owner re-review remains necessary before merge.
- #245 SCRUM-138 tentative holds: open at 84ffaa2; conflict-free/mergeable against current main, all required checks pass, and fresh peer approval is required. The production dependency is satisfied.
- #232 Coordinator Lead/Safety Officer roles: mergeable; changes requested; reported checks pass.
- #231 SCRUM-44 venue buffers: closed after the source branch rename; its description points to replacement #261.
- #230 SCRUM-179 seeded-account cases: mergeable at `9131d0c`; all six checks pass. Xiang Ying's change request is still attached to `cb0406a`; the corrected fixtures, workbook, and handoff are present, but a teammate must re-review the latest head.
- #217 SCRUM-178 Week 7 test scaffolds: mergeable at `a6a8b48`; required checks pass and no formal approval is recorded. Optional Vercel deploy failed.

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
4. Track #261's peer review; keep SCRUM-44 open until its remaining frontend acceptance is complete. #245's checks pass but it needs fresh peer approval; #252 is green but remains draft without reviewer requests. Keep #252 draft until #245 merges.
5. Keep #259 open until teammate approval; recheck the live PR status after each push and before merging.
6. Recheck Sprint 3 at close on 17 October, then confirm carryovers and assign any agreed Bryan follow-up work.
