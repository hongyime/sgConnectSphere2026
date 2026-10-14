# Agent State

Current state refreshed on **2026-10-14** from origin/main 979cc08, live GitHub pull requests, and the Sprint 3 Jira snapshot. Task history and machine-to-machine handoffs live in .agents/handoffs/; run python scripts/agent_handoffs.py to list them. This file and JOURNAL.md are owner-maintained through PR #259 under decision 0014. Routine pull requests must not edit either file.

## Where things stand

**Sprint 3 is active** (Jira sprint 36, 2026-10-04 to 2026-10-17). There are 10 incomplete parent stories and 19 incomplete subtasks; all are assigned. Bryan owns SCRUM-44 and SCRUM-176. SCRUM-75 is at risk. Do not reassign or declare carryovers before the sprint closes; apply T-73 after checking actual Jira state.

Week 9 customer decisions and derivative updates are merged on main (#253, #254, #255). The canonical BDR, backlog and test-case Markdown is authoritative. BDR/ADR exports and backlog/test workbooks are CAA 131026.

The production migration record for 0013 is merged (#260). The production ledger showed 0009 and 0010 already applied and 0013 as the sole pending migration; post-run verification found all 13 migration files applied. Do not infer new production state without a fresh read-only check.

## Current work and review gates

GitHub status was refreshed on 2026-10-14. Check the live pull request before acting because head hashes, checks and review requirements can change.

- **#259** is this owner-only STATE/JOURNAL refresh. Its remote head is 8029820; this branch is synced with main and the owner snapshot is refreshed. On Windows, python scripts/check.py at c2e80cc ran 128 tooling tests: 124 passed and 4 worktree-hygiene path tests failed. A T-65 tooling record is included in this PR. Linux CI must confirm the new head. Teammate approval is required; do not self-approve or merge around protection.
- **#232** adds Coordinator Lead and Safety Officer roles. Xiang’s changes-requested review remains. The requested real PostgreSQL evidence is not complete. Do not create a T-65 record from the rejected Docker Desktop run or from an unsupported Supabase run.
- **#217** needs peer review; required checks were passing at the last check. Its optional Vercel check failed.
- **#230** has Xiang’s changes-requested review on an older head and is now marked conflicting with main; Xiang must review the current head after it is synced.
- **#247** still has a changes-requested review; a human owner re-review is required.
- **#249** needs teammate approval; check current-head checks and review state before merge.
- **#252** has approval but is conflicting with main; refresh and rerun checks before review or merge.
- **#261** is conflicting with main and needs Bryan’s product decision on venue occupancy semantics before implementation is approved. Do not invent that decision or duplicate holdsVenue().
- **#263** needs teammate review.
- SCRUM-141 still needs the Product Owner’s cadence choice before any scheduler or deployment-secret change.

PR #245, #248, #256, #258, #260 and #262 are merged. This list is a snapshot, not a substitute for checking current GitHub state.

## Database test safety

T-59 chose a test schema inside the existing Supabase database instead of provisioning a second Supabase project. The Supabase test schema shares the same database as public; it is not a disposable PostgreSQL server.

The supported Supabase test is deactivation.integration.test.ts, which wraps its writes in a transaction and rolls back. Do not run db:reset, the general seed command, or any committing database suite against Supabase. In particular, do not bypass the reset guard. Other database suites require an isolated disposable loopback PostgreSQL database.

For this task Bryan directed agents not to use Docker Desktop. GitHub Actions’ managed Postgres service container is CI infrastructure and does not imply that a teammate or agent should launch Docker Desktop locally. The current machine has no native psql command or PostgreSQL service. The requested #232 reset, migration, seed and sign-in evidence remains pending until an approved non-Docker isolated database path or a supported schema-scoped harness is available. Do not write to Supabase or claim T-65 evidence without that.

T-65 records are required only for runs cited as evidence in a pull request, story completion, or demo. Each record is a new immutable file under docs/testing/runs/; follow its README and template.

## Cross-machine agent workflow

Before work, read README.md, CONTRIBUTING.md, docs/repository-setup.md, .agents/STATE.md, the Definition of Done, and the instructor grading guidance. For product/backlog/design/testing/Jira changes, also read docs/source-of-truth.md. Run python scripts/agent_handoffs.py and read the handoff for the active branch. Keep task notes in that branch’s handoff so another machine can resume without chat history. Do not commit secrets, personal data, or machine-specific paths.

Use short-lived branches, conventional commits and reviewed pull requests into main. Run python scripts/check.py before committing. State and journal changes belong only in the owner consolidation PR. Repository checks cover repository tooling; they do not establish application tests, build or deployment.

## Next actions

1. Finish the refreshed owner snapshot and durable journal learnings on #259; run checks, push, then wait for teammate approval.
2. For #232, first establish a supported non-Docker isolated PostgreSQL path or implement an explicitly approved schema-scoped harness. Then run the requested migrations, seed and sign-in checks, and create a T-65 record only from observed results. Request Xiang’s re-review after the evidence is on the current PR head.
3. Resolve current-main conflicts and obtain required human reviews on #217, #230, #247, #249, #252, #261 and #263. Keep product decisions with Bryan and the Product Owner where noted above.
4. Confirm SCRUM-141 cadence with the Product Owner before changing configuration.
5. Reconcile Sprint 3 commitments and carryovers after 2026-10-17 under T-73.
