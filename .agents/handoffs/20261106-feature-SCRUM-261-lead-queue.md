# Recover the Lead assignment queue as a focused PR

Deliver E03-S08 under SCRUM-261 as a small first increment: keep new requests unassigned until a Lead assigns them, retire automatic assignment, and make the queue usable. #450 (E03-S09/S10) merged first and brought most of that to `main`; what remains here is recording the assigning Lead in `events.assigned_by`.

## Done so far

- Merged current `origin/main` at `a8f2d879` to clear PR #453's conflict with the newer Lead-only reassignment flow from #450. Kept main's current Lead queue, oversight, and reassignment behavior.
- Updated Lead assignment and reassignment to persist `events.assigned_by`; extended both unit checks. The migration remains in prerequisite PR #454.
- Created from `origin/main` with a first-commit handoff.
- Amareet recommended splitting obsolete assignment behavior from the Lead workflows. This branch delivers E03-S08: new requests stay unassigned until a Lead assigns them, and the Lead queue is restored.
- Retired automatic Coordinator assignment and updated its unit, integration, UI, and E2E coverage. E03-S09/S10 remain known defects for the follow-up in #450.
- Regenerated `docs/testing/tc-coverage.md`.
- Opened [PR #453](https://github.com/hongyime/sgConnectSphere2026/pull/453). Its first application-check run at `d5de3fc` failed; the CI run is recorded at `docs/testing/runs/20261106-213746-bryanseah234-backend-db.md`.
- CI exposed three issues: the `assigned_by` migration was absent, one test expected an Organiser self-notification contrary to E11, and the route-test origin allowlist was not initialized. The notification assertion and allowlist fixture are corrected in this branch.
- Opened migration-only prerequisite [PR #454](https://github.com/hongyime/sgConnectSphere2026/pull/454) for `events.assigned_by`.
- The follow-up application CI run at `932fc54` is recorded in `docs/testing/runs/20261106-220410-bryanseah234-backend-db.md`: 4 passed, 6 failed, and 2 out-of-scope TODO failures. The route-origin fixture now passes; remaining in-scope failures are blocked by the missing `assigned_by` column from #454.
- The same database acceptance checks reran on `729e135` and again failed on the absent `assigned_by` column; this run is recorded in `docs/testing/runs/20261106-221021-bryanseah234-backend-db.md`.
- The current app diff is within the 40-file/1800-addition/1500-deletion PR guardrail.
- #450 merged into `main` (`a8f2d879`) before this PR, carrying the queue, the retirement of automatic assignment and its tests. After the merge of `main` at `b35c890`, this PR only adds the `events.assigned_by` writes (with their unit checks), the `TC_E03S01_01`/`_02` retired stubs and the run records.
- Review fixes (Aaron, at `b35c890`): the retired stubs use `test.skip`, matching `tests/e2e/e14.spec.ts`; `docs/testing/tc-coverage.md` regenerated (the copy regenerated earlier was replaced by `main`'s in the merge, so `repository-checks` failed).

## Next

- Merge #454 and apply migration 0027 to production through the protected Production Migration workflow. Then merge `main` into this branch and rerun CI: `application-checks` fails until `events.assigned_by` exists.
- Amareet's suggested activity-log check passed in #450's CI run 42227594248: `activityLog.integration.test.ts` ran against disposable PostgreSQL.
- No #450 follow-up is left: it merged before this PR.

## Verification

- `python scripts/check.py` — passed; repository hygiene and 207 tooling tests passed. It warns that secondary worktrees are present.
- `python scripts/doc_guard.py` — passed with 0 errors and 188 existing missing-front-matter warnings.
- Application tests/build were not run locally. CI run `42231522648` failed because the schema migration is absent; the migration is isolated in #454 and must be merged before updating #453 and rerunning database acceptance checks.
