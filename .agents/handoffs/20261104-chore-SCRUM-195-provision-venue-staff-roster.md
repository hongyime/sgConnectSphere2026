# chore/SCRUM-195-provision-venue-staff-roster

Provision the PO-approved production Venue Staff roster for SCRUM-195 (E11-S01), verify resolution of the Safety Officer UI blocker from PR #418, and address review feedback from Xiang Ying and Le Xin on PR #425.

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
  - Implemented bounded, idempotent provisioning script `scripts/provision_venue_staff_roster.ts` with schema, venue, and staff prechecks, single-transaction insert, post-execution resolution check, and `--verify-only` mode.
  - Authored operational run record in `docs/ops/production-account-runs/20261104-1700-venue-staff-roster.md`.
  - Authored T-65 test execution record in `docs/testing/runs/` proving verification of the 5 canonical assignments and confirming `TC_E11S01_13` (unassigned venues have zero broad fallback).
  - Authored `docs/testing/e11-s01-roster-verification-20261104.md` reconciling E11-S01 evidence audit requirements against the provisioned and verified roster.

- **Reconcile Xiang Ying's Review Comments on PR #425**:
  - Point 1: Fixed `users` schema precheck in `scripts/provision_venue_staff_roster.ts` and `docs/ops/venue-staff-roster-provisioning.md` to read boolean `is_active` instead of non-existent column `status`.
  - Point 2: Fixed ON CONFLICT target in `scripts/provision_venue_staff_roster.ts` and runbook SQL to match migration 0018's real primary key `PRIMARY KEY (venue_id, staff_id)` instead of `(venue_id, staff_id, active_from)`, and implemented clean reactivation logic for expired pairs. Added comprehensive unit tests in `backend/tests/venueStaffRosterProvisioning.test.ts`.
  - Point 3: Fixed verification logic in `scripts/provision_venue_staff_roster.ts` so multiple active assignees on a single venue cannot be hidden by a `Map<string, string>`. Validates all active pairs and rejects extra unexpected assignees.
  - Point 4: Added explicit resolver check for assigned and unassigned venues. Clarified delivery verification distinction per T-97 in `docs/testing/e11-s01-roster-verification-20261104.md` and added follow-up T-65 record in `docs/testing/runs/`.

- **Reconcile Le Xin's Review Comments on PR #425**:
  - Point 1: Added `is_active = true` precheck validation for venues in `scripts/provision_venue_staff_roster.ts` and updated unit test suite.
  - Point 2: Added case-insensitive email lookup (`lower(email) = ANY(...)`) for target venue staff users.
  - Point 3: Enclosed entire provisioning operation, postcheck verification, and resolver assertion within a single transaction `BEGIN ... COMMIT` with automatic `ROLLBACK` on any failure.
  - Point 4: Imported and directly invoked canonical resolver `resolveAssignedVenueStaff` from `backend/src/modules/eventNotifications/service.ts`.
  - Point 5: Verified fallback boundary check `TC_E11S01_13` via `resolveAssignedVenueStaff` verifying that unassigned venues return `[]` with zero broad fallback staff.
  - Point 6: Targeted upsert uses `ON CONFLICT (venue_id, staff_id) DO UPDATE SET active_from = now(), active_until = NULL WHERE venue_staff_assignments.active_until IS NOT NULL OR venue_staff_assignments.active_from > now()`.
  - Point 7: Added target safety guard: CLI runner defaults to read-only `--verify-only` mode unless `--execute` is passed; requires `--confirm-production` when connecting to Supabase database. Parsed database URL safely with `new URL()` and inspected `urlObj.hostname` directly to resolve CodeQL CWE-20 incomplete URL substring sanitization alert.
  - Point 8: Refactored `docs/ops/production-account-runs/20261104-1700-venue-staff-roster.md` as an operational specification / runbook awaiting release deployment execution, avoiding claiming premature production execution.
  - Point 9: Expanded `backend/tests/venueStaffRosterProvisioning.test.ts` to 7 unit tests covering venue `is_active`, user `is_active`, case-insensitivity, conflict handling, transaction rollback, rogue assignees, and resolver fallback prevention.

## Verification

- Worktree check: `python scripts/check_worktrees.py` reports only the primary worktree.
- Frontend role tests: 34 tests passed.
- Backend tests: `npx tsx --test backend/tests/venueStaffRosterProvisioning.test.ts` passed 7/7 tests.
- Repository hygiene: `python scripts/check.py` and `python scripts/doc_guard.py` passed.

## Next steps

- Run pre-commit checks and commit updates.
- Push to `origin chore/SCRUM-195-provision-venue-staff-roster`.
- Post response comment to Le Xin on PR #425.
- Await approval and merge of PR #425.
