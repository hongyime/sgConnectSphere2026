# E06-S03 #299 stale DB assertions and acceptance

Correct PR #299's real-decision PostgreSQL race assertions against its current withdrawal response, then run the E06-S03 database acceptance cases on loopback PostgreSQL using the current real decision service from PR #298 in an isolated verification checkout; keep the follow-up stacked on #299 and leave Jira status, sprint, estimate, and story completion unchanged.

## Done so far

- Created `feature/SCRUM-47-e06s03-fix-from-299` from PR #299's live head `15d5d4051573e1edc0e96c9170cbef8a37ff1592`.
- Read the E06-S03 recovery brief and SCRUM-47 classification, PR #299, and Step 3.6 commit `902ac79`.
- Reproduced four failing approve/reject race assertions on real loopback PostgreSQL with PR #298's current `decisions.ts` overlaid in a disposable checkout: 23 passed, 4 failed, 0 skipped. All four failures were the stale busy-response wording; the E06-S03_09, _11, _12, and _13 database cases passed.
- Updated the two stale assertion expectations to match `bookingWithdrawal.ts` on #299.
- Commit `fc443e8` contains the assertion fix and this handoff.
- T-65 record `docs/testing/runs/20261017-220616-bryanseah234-backend-db.md`: corrected combined database suite passed 27/27 with zero skips using the current actual PR #298 decision module from an isolated overlay checkout; loopback only.
- `python scripts/check.py` passed with repository hygiene/tooling tests; it warned that other pre-existing secondary worktrees are present.

## Next

1. Review the final diff and T-65 record, then commit the record.
2. Open a draft PR with base `feature/e06-s03-pending-withdrawal`, then link that PR to SCRUM-47 without editing issue fields.
3. Keep the PR and SCRUM-47 open; do not merge #299 or claim the story Done.

## Acceptance limits

Automated PostgreSQL tests do not replace the remaining human T-65 observations for authenticated API refusal/privacy, both human race orders, exact recipient/rollback behavior, idempotent replay, concurrent replacement attempts, long replacement chains, blocked suggestions, and termination when no suggestion is available. PR #298 remains unmerged, and the eight real-decision integration tests still skip on a checkout that lacks its `decisions.ts`; this branch's local combined run must use the documented isolated overlay and report that dependency precisely.
