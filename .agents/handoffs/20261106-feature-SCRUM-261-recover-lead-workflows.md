# Recover Lead workflows absent from main

Recover the missing Release 1 Lead functionality for SCRUM-153, SCRUM-154 and SCRUM-155 into current `main` under technical enabler SCRUM-261, without rewriting the Done history of the original stories.

## Evidence and scope

- The historical commits `0a849522`, `83e1f022`, `c3ba22a9` and `3754a729` are on a pushed branch with no GitHub pull request and are not reachable from `main`.
- Re-integrate only the missing Lead queue, reassignment and oversight behaviour. Do not bring across the historical Safety/role code that current main already supersedes.

## Recovery completed locally

- Recovered explicit queue assignment (E03-S08), Lead reassignment (E03-S09), and assignment oversight (E03-S10).
- Preserved the current Safety queue/review routes and only integrated the missing Lead behaviour, its migration and focused tests.
- Rebased onto `origin/main` at `981d5495`.
- Removed the obsolete automatic-assignment implementation in `f1c5c8f5`, including its stale tests and supersession allowlist entries. Submission now remains Submitted/unassigned until a Lead chooses a Coordinator. The merged test catalogue had six now-obsolete `todo` markers for these workflows; they are active real-database checks again.
- C129 and O-36 require direct, Lead-only reassignment. The retired Coordinator-to-Coordinator and Coordinator-to-Lead request paths, UI entry points, tests, and unmerged `0028_lead_reassignment_requests` migration were removed. Old request URLs now explicitly refuse Coordinator attempts through the audited Lead guard.
- Removed non-existent `assigned_by` column from `events` update queries in `coordinatorAssignment.ts` and updated unit test mock assertions. The acting Lead is recorded as `actor_id` in `audit_logs`.
- On `c344848`, backend unit tests passed 723 tests with 1 intentional skip; focused frontend Vitest passed 12 tests; `npm run typecheck` and `python scripts/check.py` passed. New T-65 records accompany the final test runs.

## Follow-up before merge

- Local real-database integration was not run because this worktree has no `TEST_DATABASE_URL`. CI must exercise `activityLog.integration.test.ts` against its disposable PostgreSQL service before merge; never run a general migration against shared Supabase.
- The canonical E03 browser cases remain scaffolded in `docs/testing/tc-coverage.md`; this recovery adds unit/component coverage but not a browser acceptance run.
