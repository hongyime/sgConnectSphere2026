# Recover Lead workflows absent from main

Recover the missing Release 1 Lead functionality for SCRUM-153, SCRUM-154 and SCRUM-155 into current `main` under technical enabler SCRUM-261, without rewriting the Done history of the original stories.

## Evidence and scope

- The historical commits `0a849522`, `83e1f022`, `c3ba22a9` and `3754a729` are on a pushed branch with no GitHub pull request and are not reachable from `main`.
- Re-integrate only the missing Lead queue, reassignment and oversight behaviour. Do not bring across the historical Safety/role code that current main already supersedes.

## Recovery completed locally

- Recovered explicit queue assignment (E03-S08), Lead reassignment and Coordinator escalation (E03-S09), and assignment oversight (E03-S10).
- Preserved the current Safety queue/review routes and only integrated the missing Lead behaviour, its migration and focused tests.
- Rebased onto `origin/main` at `207b4556`; the recovery commits are `ffe2efcc`, `dae777d7`, `c9ef806d`, and `f6f54bd9`.
- Removed the obsolete automatic-assignment implementation in `ab6f9440`, including its stale tests and supersession allowlist entries. Submission now remains Submitted/unassigned until a Lead chooses a Coordinator.
- On `ab6f944`, the backend unit suite passed 734 tests with 1 intentional skip, and the focused Lead queue/Coordinator frontend suites passed 18 tests. Current T-65 records are added with this task.

## Follow-up before merge

- Local real-database integration was not run because this worktree has no `TEST_DATABASE_URL`. CI must exercise the two updated Lead/coordinator integration tests against its disposable PostgreSQL service before merge; never run a general migration against shared Supabase.
- The canonical E03 browser cases remain scaffolded in `docs/testing/tc-coverage.md`; this recovery adds unit/component coverage but not a browser acceptance run.
