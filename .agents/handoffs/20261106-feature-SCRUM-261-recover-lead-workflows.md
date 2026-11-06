# Recover Lead workflows absent from main

Recover the missing Release 1 Lead functionality for SCRUM-153, SCRUM-154 and SCRUM-155 into current `main` under technical enabler SCRUM-261, without rewriting the Done history of the original stories.

## Evidence and scope

- The historical commits `0a849522`, `83e1f022`, `c3ba22a9` and `3754a729` are on a pushed branch with no GitHub pull request and are not reachable from `main`.
- Re-integrate only the missing Lead queue, reassignment and oversight behaviour. Do not bring across the historical Safety/role code that current main already supersedes.

## Recovery completed locally

- Recovered explicit queue assignment (E03-S08), Lead reassignment and Coordinator escalation (E03-S09), and assignment oversight (E03-S10).
- Preserved the current Safety queue/review routes and only integrated the missing Lead behaviour, its migration and focused tests.
- Rebased onto `origin/main` at `c54f30ad` before recovery work; the three recovery commits are `b08a439f`, `0d2dd1e2`, `4e3b43ac`, and `a1a6c8c`.
- Focused backend tests, focused frontend tests, typechecks, the backend unit suite and repository check passed locally. Paired current backend-unit and frontend-vitest T-65 records are committed with this task.

## Follow-up before merge

- `0028_lead_reassignment_requests.sql` could not be applied to the shared `test` schema: this worktree has no configured database URL. Apply it only with `search_path = test, extensions, public`; never run the production migration command against Supabase.
- The canonical E03 browser cases remain scaffolded in `docs/testing/tc-coverage.md`; this recovery adds unit/component coverage but not a real-database or browser acceptance run.
