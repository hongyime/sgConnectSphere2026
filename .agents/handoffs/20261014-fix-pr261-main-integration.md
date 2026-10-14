# PR #261 buffer and hold integration

Resolve PR #261 conflicts against current main, preserving SCRUM-161 venue buffer backend behavior and merged E06-S05 tentative hold rules. This is the replacement for closed PR #231, not the booking-approval implementation itself. User requested a fix; comments only for review feedback.

## Resolution

- Starting PR head d18acba; merged main 367b279.
- Preserved both unit/database test lists in backend/package.json.
- Search/calendar combine occupied_window() with main's expiry-aware holdsVenue() predicate. Conflicting/released/expired bookings do not occupy a venue under the shared main contract; live tentative holds do.
- Maintenance notifications retain raw advertised ranges and include live tentative holds.
- Three isolated PostgreSQL fixtures apply both migrations 0011 and 0013.
- Regenerated tc-coverage.md; no manual generated-row resolution.
- Typecheck PASS; backend unit tests 363/363 PASS.
- First database run FAIL: Docker was stopped, all 13 tests refused the local connection. Immutable failure record retained. After starting disposable local PostgreSQL, all 13 tests PASS across buffer conflict, search, calendar, catalogue, accessibility and holds suites.
- This does not claim full story acceptance, manual browser validation, full coverage certification or booking approval Scenario 4 completion. The approval-flow owner still needs to verify the consumer against buffered conflicts once this dependency merges.

## Next

Repository check, commit and normal push to feature/SCRUM-161-venue-setup-turnaround-pr231. No approval, Request changes review or merge into main. Teammate review and new-head CI remain required.

## Latest main follow-up

Main advanced to 03e7644 during verification, adding shared migration selection and worktree hygiene. Merged again, retained migrationSelection unit test and buffer integration test, regenerated coverage and reran verification before final push.

Latest resolved tree with main 03e7644: backend unit 374/374 PASS; focused PostgreSQL 13/13 PASS; repository hygiene and 128 tooling tests PASS. Latest run records derive application HEAD fbf7bd5 before final merge commit; their boilerplate main reference 367b279 describes the earlier integration, while this final rerun includes 03e7644. Existing immutable records remain unedited.
