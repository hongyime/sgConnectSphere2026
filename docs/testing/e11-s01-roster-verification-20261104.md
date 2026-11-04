# E11-S01 Venue Staff Roster Verification Reconciliation - 4 November 2026

Traceability: E11-S01 (SCRUM-75), Subtask SCRUM-195. Follow-up to `docs/testing/e11-s01-evidence-audit-20261031.md`.

## Context

In `docs/testing/e11-s01-evidence-audit-20261031.md`, the acceptance-to-evidence matrix noted for `TC_E11S01_13`:
> *"Missing assignments remain explicit with no staff-wide fallback. **Production roster verification waits on SCRUM-195.***"

And under *Still required before whole-story Done*, requirement 2 recorded:
> *"Bryan approves the actual production venue/staff pairs under SCRUM-195; the designated deploy owner provisions them, then the story owner verifies behaviour. This audit performs no production reads/writes and does not claim the load happened."*

## Reconciliation

1. **Separate PO Mapping Approval (SCRUM-195, T-97)**:
   Canonical team decision T-97 established Product Owner accountability for SCRUM-195 and explicitly recorded that T-97 itself approved no mapping or assignment write. Under SCRUM-195, Product Owner Bryan Seah subsequently reviewed and granted the separate PO approval for the canonical 5-venue roster mapping:
   - **Alex Tan** (`venue_staff@connectsphere.com`): Orchid Hall, Lotus Room, Maple Room
   - **Jordan Lee** (`venue_staff_b@connectsphere.com`): Jasmine Hall, Cedar Auditorium

2. **Provisioning Tool & Unit Verification (SCRUM-195)**:
   - Tool: `scripts/provision_venue_staff_roster.ts`
   - Runbook: `docs/ops/venue-staff-roster-provisioning.md`
   - Unit & Idempotency Tests: `backend/tests/venueStaffRosterProvisioning.test.ts` (8 passing automated unit tests covering `is_active` prechecks on venues and users, case-insensitive email matching, targeted `ON CONFLICT (venue_id, staff_id)` idempotency and reactivation, transactional rollback on error, rejection of rogue multiple assignees, real `resolveAssignedVenueStaff` boundary verification with zero broad fallback, and strict read-only execution in `--verify-only` mode with zero write queries even when all venues are assigned).
   - Integration & Resolver Tests: `backend/tests/eventNotifications.integration.test.ts` exercises `resolveAssignedVenueStaff` and verifies `TC_E11S01_10` / `TC_E11S01_13` (missing/ended assignments remain unresolved with zero broad fallback).

3. **Verification Evidence & Next Steps (T-65, T-97)**:
   - Automated test execution records: T-65 session records in `docs/testing/runs/`.
   - Tool execution: Bounded provisioning runner is verified against canonical schema and contracts via automated tests against mocked client and disposable fixtures (`backend/tests/venueStaffRosterProvisioning.test.ts`, 8/8 passing).
   - Evidence Reconciliation: The initial PR #425 comment and commit `3c82665` draft prematurely described the operational run as having loaded production. This has been reconciled across operational records and test session logs: the production environment is completely unmodified, and execution is an operational specification scheduled for deployment execution by the designated deploy owner per T-59 and T-89.
   - Production Environment Status: The production environment has NOT been modified; roster provisioning into `venue_staff_assignments` is scheduled for release deployment execution by the designated deploy owner per T-59 and T-89.
   - Story-Owner Verification: Per T-97 and PR #425 follow-ups, story-owner delivery verification of E11-S01 live notification delivery remains open for story owner (Ji Ning) observation once the roster is loaded into production upon release deployment.

With this tool, test suite, and operational runbook committed in PR #425, the SCRUM-195 subtask implementation prerequisites are complete and ready for deployment execution.
