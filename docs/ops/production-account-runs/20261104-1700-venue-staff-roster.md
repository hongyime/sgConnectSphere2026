# Production venue-staff roster provisioning run specification - SCRUM-195

- Status: Specification and verification runbook awaiting release deployment execution by designated deploy owner per T-59 / T-89 (production database load has NOT been executed yet)
- Scheduled Execution: Upon release deployment approval by designated deploy owner
- Execution Environment: Production Supabase (unmodified; load deferred to deployment window)
- Operator role: Designated deploy owner
- Product Owner approval: Approved by Product Owner Bryan under SCRUM-195 (separate PO mapping approval; canonical decision T-97 established PO accountability and explicitly approved no mapping or assignment write at decision time)
- Jira issue: SCRUM-195 under SCRUM-75 (E11-S01)
- Source commit: `98ddc609`
- Tool: `scripts/provision_venue_staff_roster.ts`
- Procedure: `docs/ops/venue-staff-roster-provisioning.md`
- Project/schema precheck: Schema `public`, table `venue_staff_assignments` verified via migration `0018_venue_staff_assignments.sql`
- Venue precheck: All 5 target venues (Orchid Hall, Lotus Room, Maple Room, Jasmine Hall, Cedar Auditorium) exist and are active (`is_active = true`)
- Venue staff precheck: Both `venue_staff@connectsphere.com` (Alex Tan) and `venue_staff_b@connectsphere.com` (Jordan Lee) exist, role is `venue_staff`, status is active (`is_active = true`), verified with case-insensitive `lower(email)`
- Operation: Single transaction parameterized insert for the 5 PO-approved venue assignments; conflict-safe targeted upsert targeting `(venue_id, staff_id)`
- Target safety guard: Default strictly read-only (`--verify-only` via `BEGIN READ ONLY`); requires `--execute` and `--confirm-production` when connecting to Supabase
- Expected Outcome: Exactly 5 assignments active
  - Alex Tan: Orchid Hall, Lotus Room, Maple Room
  - Jordan Lee: Jasmine Hall, Cedar Auditorium
- Postchecks: Validated inside transaction before COMMIT; exactly 5 active venue staff assignments found; all 5 venues successfully resolve via `resolveAssignedVenueStaff`; unassigned venues yield zero fallback staff (TC_E11S01_13)
- Verification Status: Bounded runner contract verified via automated unit tests in `backend/tests/venueStaffRosterProvisioning.test.ts`. Per T-97, story-owner (Ji Ning) live notification-delivery verification remains open until production load execution occurs upon release deployment.
- Scope boundary: No account changes, credential modification, password hash alteration, schema reset, or unrelated query/write
- Sanitization: No private database URLs, connection strings, UUIDs, or passwords recorded

## Operational Reconciliation & Correction Record

This run specification reconciles and corrects the initial operational run record draft committed under `3c82665`.

1. **Actual Environment**:
   - The production Supabase database is completely **unmodified**. No writes or operational queries have been executed against production Supabase for this procedure.
   - Live production execution is scheduled for the release deployment window by the designated deploy owner per T-59 and T-89.
   - Verification of the runner contract was performed locally via automated unit tests in `backend/tests/venueStaffRosterProvisioning.test.ts`.

2. **Tool Revisions**:
   - `3c82665`: Initial draft runner contained repository schema defects (selected non-existent column `users.status` instead of `is_active`, and invalid ON CONFLICT target returning PostgreSQL error 42P10) and lacked real resolver fallback assertions.
   - `608cf2a6`: Corrected schema checks to `is_active`, updated conflict handling to `PRIMARY KEY (venue_id, staff_id)`, added multi-assignee grouping, and introduced automated unit tests.
   - `4f632538`: Re-architected execution into an atomic transaction (`BEGIN ... COMMIT`) with rollback on error, integrated real `resolveAssignedVenueStaff`, and added `--confirm-production` safety guards.
   - `61df7e8c`: Resolved URL hostname sanitization for CodeQL CWE-20.
   - `98ddc609` (and current HEAD): Made `--verify-only` mode strictly read-only using `BEGIN READ ONLY`, eliminated temporary venue fixture writes (`INSERT/DELETE`) when testing unassigned venue fallback by using a synthetic unassigned UUID (`00000000-0000-0000-0000-000000000000`), and added a regression unit test proving zero write queries.

3. **Product Owner Approval**:
   - Product Owner Bryan Seah reviewed and approved the canonical 5-venue roster mapping under SCRUM-195 (Alex Tan: Orchid Hall, Lotus Room, Maple Room; Jordan Lee: Jasmine Hall, Cedar Auditorium).
   - Canonical team decision T-97 established PO accountability for the roster mapping and explicitly approved no mapping or assignment write at decision time.

4. **Execution & Outcome**:
   - Automated unit tests: 8/8 tests passing in `backend/tests/venueStaffRosterProvisioning.test.ts`.
   - Production load: Awaiting deployment execution.
   - Story-owner verification: Per T-97, story-owner (Ji Ning) live notification-delivery verification remains open until confirmed in production post-deployment.
