# Recover the Lead assignment queue as a focused PR

Deliver E03-S08 under SCRUM-261 as a small first increment: keep new requests unassigned until a Lead assigns them, retire automatic assignment, and make the queue usable. The existing SCRUM-261 PR will carry E03-S09/S10 after this increment lands.

## Done so far

- Created from `origin/main` with a first-commit handoff.
- Amareet recommended splitting obsolete assignment behavior from the Lead workflows. This branch delivers E03-S08: new requests stay unassigned until a Lead assigns them, and the Lead queue is restored.
- Retired automatic Coordinator assignment and updated its unit, integration, UI, and E2E coverage. E03-S09/S10 remain known defects for the follow-up in #450.
- Regenerated `docs/testing/tc-coverage.md`.
- The branch is 18 files, 378 additions, and 367 deletions against `main`, within the PR guardrail.

## Next

- Push this branch and open the focused PR linked to SCRUM-261 and #450.
- After this PR merges, update #450 against the new `main` and confirm its deletion count is within the guardrail.

## Verification

- `python scripts/check.py` — passed; repository hygiene passed and 207 tooling tests passed. The check warns that secondary worktrees are present.
- `python scripts/doc_guard.py` — passed with 0 errors and 188 existing missing-front-matter warnings.
- Application tests/build were not run locally; CI will report those checks.
