# feature/SCRUM-39-multi-session-events

Goal: complete E04-S02 / SCRUM-39 by letting Organisers create one or more child Sessions with their own time ranges, attendance, venue and equipment requirements, and by supporting the story's per-Session venue suitability/booking and safe deletion behavior. Do not perform manual tester steps or create manual run records/screenshots.

## Scope and current state

- Canonical story: `docs/backlog/release-1/E04-programme-sessions.md`; acceptance cases: `docs/testing/cases/E04.md`; decisions and contract: ADR-018, C-107, T-79, T-85, T-99 and `docs/contracts/venue-bookings.md`.
- Jira SCRUM-39 is To Do, 5 points, assigned to Amareet Kaur Madas, the eligible teammate with the lowest open story-point load (0 points and no other open assigned items at selection time). No sprint or estimate changes were made.
- Prior SCRUM-183 implementation added the Session table, a one-Session-per-Event backfill, and the default-session trigger. Its handoff explicitly says the parent remains open for Session UI/workflows and scenarios 3–5.
- The latest main at branch creation is `eab9f89` (PR #376). SCRUM-180's date-horizon branch is separate; its Event-range validation does not ship with this branch. After Sessions are writable, SCRUM-180 must validate each Session range too before its Session-specific acceptance is complete.
- Keep Event status/lifecycle, registration windows, and technical-support requests Event-level. Preserve existing Events, registrations, audit history, and dependent arrangements. Do not edit `.agents/STATE.md` or `.agents/JOURNAL.md`.
- No manual tester steps or screenshots are performed by the agent. SCRUM-39 stays open pending all acceptance evidence, human code/test review, and PO/delegate acceptance.

## Next steps

1. Trace current Event/Sessions APIs, client forms, venue suitability, booking and deletion paths before implementing any missing story behavior.
2. Implement only the remaining E04-S02 acceptance criteria, including date/attendance/requirement validation and safe transactional persistence; add automated unit/integration/component coverage for changed code and regenerate `docs/testing/tc-coverage.md` if test inventories change.
3. Read `docs/testing/supabase-test-schema.md` before any database test. Use only an approved disposable database path; do not start Docker Desktop or write general suites to Supabase.
4. Record only automated evidence runs actually used, run `python scripts/check.py` before commits, and commit regularly.
5. Do not open another PR while the authenticated author already has three open PRs. Do not close unrelated PRs to free a slot; preserve SCRUM-66's closed PR state.
