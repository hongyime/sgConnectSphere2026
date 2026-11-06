# Recover the Lead assignment queue as a focused PR

Deliver E03-S08 under SCRUM-261 as a small first increment: keep new requests unassigned until a Lead assigns them, retire automatic assignment, and make the queue usable. The existing SCRUM-261 PR will carry E03-S09/S10 after this increment lands.

## Done so far

- Created from current `origin/main`.
- Amareet's review recommends separating obsolete assignment behavior from the Lead workflows. This branch uses the E03-S08 story boundary so the first increment replaces automatic assignment with the Lead queue.

## Next

- Apply the E03-S08 queue and automatic-assignment retirement changes.
- Regenerate `docs/testing/tc-coverage.md`, run repository-required checks, push, and open a PR linked to #450.
- After this PR merges, update #450 against the new `main` and confirm its deletion count is within the guardrail.

## Verification

- Not run yet.
