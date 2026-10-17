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

## Draft PR and Jira link

- Draft PR #307: https://github.com/hongyime/sgConnectSphere2026/pull/307, base `feature/e06-s03-pending-withdrawal`; no merge.
- Postplan: https://7ztwhjac1qmk.postplan.dev. Structural check passed; the computer-use environment had no browser available for visual inspection.
- Added a Jira remote link from SCRUM-47 to draft PR #307. Readback still showed In Progress, Sprint 3, 3 points; no Jira fields were edited.
- PR #307 checks were still running after creation; review the current check status before any further action.

## Next

1. Review the draft fix and current PR checks.
2. Keep PR #307 and SCRUM-47 open; do not merge #299 or claim the story Done.

## Acceptance limits

Automated PostgreSQL tests do not replace the remaining human T-65 observations for authenticated API refusal/privacy, both human race orders, exact recipient/rollback behavior, idempotent replay, concurrent replacement attempts, long replacement chains, blocked suggestions, and termination when no suggestion is available. PR #298 remains unmerged, and the eight real-decision integration tests still skip on a checkout that lacks its `decisions.ts`; this branch's local combined run must use the documented isolated overlay and report that dependency precisely.
