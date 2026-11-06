# Recover the Lead assignment queue as a focused PR

Deliver E03-S08 under SCRUM-261 as a small first increment: keep new requests unassigned until a Lead assigns them, retire automatic assignment, and make the queue usable. The existing SCRUM-261 PR will carry E03-S09/S10 after this increment lands.

## Done so far

- Created from `origin/main` with a first-commit handoff.
- Amareet recommended splitting obsolete assignment behavior from the Lead workflows. This branch delivers E03-S08: new requests stay unassigned until a Lead assigns them, and the Lead queue is restored.
- Retired automatic Coordinator assignment and updated its unit, integration, UI, and E2E coverage. E03-S09/S10 remain known defects for the follow-up in #450.
- Regenerated `docs/testing/tc-coverage.md`.
- Opened [PR #453](https://github.com/hongyime/sgConnectSphere2026/pull/453). Its first application-check run at `d5de3fc` failed; the CI run is recorded at `docs/testing/runs/20261106-213746-bryanseah234-backend-db.md`.
- CI exposed three issues: the `assigned_by` migration was absent, one test expected an Organiser self-notification contrary to E11, and the route-test origin allowlist was not initialized. The notification assertion and allowlist fixture are corrected in this branch.
- Opened migration-only prerequisite [PR #454](https://github.com/hongyime/sgConnectSphere2026/pull/454) for `events.assigned_by`.
- The current app diff is within the 40-file/1800-addition/1500-deletion PR guardrail.

## Next

- Merge migration-only PR #454 and apply/verify its migration through the protected production workflow before releasing dependent code. Then update #453 against `main` and rerun CI.
- After #453 merges, update #450 against the new `main` and confirm its deletion count is within the guardrail. At its current head `e404119`, #450 still fails the deletion guardrail at 1,723 deletions.

## Verification

- `python scripts/check.py` — passed; repository hygiene passed and 207 tooling tests passed. The check warns that secondary worktrees are present.
- `python scripts/doc_guard.py` — passed with 0 errors and 188 existing missing-front-matter warnings.
- Application tests/build were not run locally. The failed CI run on `d5de3fc` is recorded; a fresh CI run after the test fixes is pending, and the schema fix is waiting on PR #454.
