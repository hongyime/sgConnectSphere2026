# chore/SCRUM-195-provision-venue-staff-roster

Provision the PO-approved production Venue Staff roster for SCRUM-195 (E11-S01), verify resolution of the Safety Officer UI blocker from PR #418, and clean up secondary worktrees in `C:\Users\bryan\Projects`.

## Done so far

- **Worktree Cleanup**:
  - Ran `git worktree prune` to clear dead temporary worktree references from git metadata.
  - Safely unlinked dependencies and removed all 8 secondary worktrees in `C:\Users\bryan\Projects`:
    - `sgConnectSphere2026-dashboard-audit`
    - `sgConnectSphere2026-SCRUM-153`
    - `sgConnectSphere2026-SCRUM-154`
    - `sgConnectSphere2026-SCRUM-155`
    - `sgConnectSphere2026-SCRUM-156`
    - `sgConnectSphere2026-SCRUM-157`
    - `sgConnectSphere2026-SCRUM-158`
    - `sgConnectSphere2026-SCRUM-30`
  - Verified each was clean with 0 unpushed commits prior to removal. `git worktree list` now reports only the primary repository.
- **Safety Officer UI Blocker Reconciliation (SCRUM-157 / PR #418)**:
  - Investigated Ji Ning's report in PR #418 regarding the Safety Officer UI check redirecting to `/` due to missing role metadata.
  - Confirmed the blocker occurred on PR #418's tested commit `a954231b` prior to the merge of Aaron's PR #412 (`267348f3`) and PR #413 (`607536e3`) on 3 November.
  - PR #412 and #413 integrated `safety_officer` into `frontend/src/app/roles.ts` (`ROLES`, `roleLabel`, `roleHome`, `roleNavigation`), added the `/safety/queue` and `/safety/review/:eventId` routes, and implemented the Safety Review screen and automated tests.
  - Verified on current `origin/main`:
    - `npm test --workspace frontend -- src/features/accessControl/LoginPage.test.tsx src/app/routes.test.tsx src/features/roleQueues/RoleQueues.test.tsx` (34 passed).
    - `npm test --workspace backend` (all backend units passed).
    - Both frontend and backend typechecks passed with 0 errors.
  - Confirmed that logging in as `safety_officer@connectsphere.com` lands on `/safety/queue` and unblocks Ji Ning's manual UI check.
- **Production Venue-Staff Roster Provisioning (SCRUM-195 / E11-S01)**:
  - Product Owner Bryan approved the canonical roster mapping under T-64, T-89, and T-97:
    - Alex Tan (`venue_staff@connectsphere.com`): Orchid Hall, Lotus Room, Maple Room.
    - Jordan Lee (`venue_staff_b@connectsphere.com`): Jasmine Hall, Cedar Auditorium.
  - Authored operational procedure in `docs/ops/venue-staff-roster-provisioning.md`.
  - Implemented bounded, idempotent provisioning script `backend/src/database/provisionVenueStaffRoster.ts` with schema, venue, and staff prechecks, single-transaction insert, and post-execution resolution check.
  - Authored operational run record in `docs/ops/production-account-runs/20261104-1700-venue-staff-roster.md`.

## Verification

- Worktree check: `python scripts/check_worktrees.py` reports only the primary worktree.
- Frontend role tests: 34 tests passed.
- Backend tests: full suite passed.
- Frontend & backend typechecks: passed.

## Next steps

- Run `python scripts/check.py` and `python scripts/doc_guard.py` before committing.
- Commit and open pull request for `chore/SCRUM-195-provision-venue-staff-roster`.
- Notify Ji Ning that pulling `origin/main` unblocks the Safety Officer UI manual acceptance testing for E10-S01.
- Transition SCRUM-195 to In Review / Done in Jira upon PR review and merge.
