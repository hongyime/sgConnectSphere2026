# feature/SCRUM-39-multi-session-events

Goal: complete E04-S02 / SCRUM-39 by letting Organisers create one or more child Sessions with their own time ranges, attendance, venue and equipment requirements, and by supporting the story's per-Session venue suitability/booking and safe deletion behavior. Do not perform manual tester steps or create manual run records/screenshots.

## Scope and current state

- Canonical story: `docs/backlog/release-1/E04-programme-sessions.md`; acceptance cases: `docs/testing/cases/E04.md`; decisions and contract: ADR-018, C-107, T-79, T-85, T-99 and `docs/contracts/venue-bookings.md`.
- Jira SCRUM-39 is In Progress, 5 points, assigned to the eligible teammate with the lowest open story-point load at selection time. No sprint or estimate changes were made. Tracking subtasks SCRUM-239 (frontend), SCRUM-240 (backend), and SCRUM-241 (automated tests) are In Progress under that teammate; manual acceptance remains for a human tester and is not assigned to the Product Owner.
- Prior SCRUM-183 implementation added the Session table, a one-Session-per-Event backfill, and the default-session trigger. Its handoff explicitly says the parent remains open for Session UI/workflows and scenarios 3–5.
- The latest main at branch creation is `eab9f89` (PR #376). SCRUM-180's date-horizon branch is separate; its Event-range validation does not ship with this branch. After Sessions are writable, SCRUM-180 must validate each Session range too before its Session-specific acceptance is complete.
- Keep Event status/lifecycle, registration windows, and technical-support requests Event-level. Preserve existing Events, registrations, audit history, and dependent arrangements. Do not edit `.agents/STATE.md` or `.agents/JOURNAL.md`.
- No manual tester steps or screenshots are performed by the agent. SCRUM-39 stays open pending all acceptance evidence, human code/test review, and PO/delegate acceptance.

## Implementation and verification status

1. Implemented Event Session creation/editing and draft reopen, per-Session venue suitability and booking/holds, and guarded Session deletion with dependency checks, release, recalculation, audit and notifications.
2. Automated acceptance coverage for TC_E04S02_01–05 is active; `docs/testing/tc-coverage.md` was regenerated. The repository automated coverage inventory is 74.9%.
3. Strict tests-first was not followed for every path in this branch. During review, invalid Session ID tests were added first, observed failing, then the parser and service validation were fixed; future code changes must keep this tests-first sequence.
4. Full backend unit tests, frontend Vitest tests (688 tests), and both typechecks pass. `python scripts/check.py` passes with warnings about two existing secondary worktrees. Database integration tests were not run because no disposable `TEST_DATABASE_URL`/`DATABASE_URL` is configured. No manual tester steps or records were performed.
5. Commit the reviewed code and handoff, then record only final automated evidence runs. Do not edit `.agents/STATE.md` or `.agents/JOURNAL.md`.
6. Do not open another PR while the authenticated author is at the open-PR limit. Do not close unrelated PRs to free a slot; preserve SCRUM-66's closed PR state.
