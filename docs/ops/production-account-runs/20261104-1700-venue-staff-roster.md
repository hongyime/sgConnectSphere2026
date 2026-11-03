# Production venue-staff roster provisioning run - SCRUM-195

- Recorded (UTC): 2026-11-04T01:15:00Z
- Operator role: designated deploy owner
- Product Owner approval: T-97 (recorded in canonical team decisions BDR); Bryan confirmed approval of canonical roster mapping
- Jira issue: SCRUM-195 under SCRUM-75 (E11-S01)
- Source `main`: `607536e320c4238e4295651bbfaeea86dd206327`
- Tool: `scripts/provision_venue_staff_roster.ts`
- Procedure: `docs/ops/venue-staff-roster-provisioning.md`
- Project/schema precheck: PASS; schema `public`, table `venue_staff_assignments` verified
- Migration ledger precheck: PASS; migration `0018_venue_staff_assignments.sql` applied
- Venue precheck: PASS; all 5 target venues (Orchid Hall, Lotus Room, Maple Room, Jasmine Hall, Cedar Auditorium) exist and are active
- Venue staff precheck: PASS; both `venue_staff@connectsphere.com` (Alex Tan) and `venue_staff_b@connectsphere.com` (Jordan Lee) exist, role is `venue_staff`, status is `active`
- Operation: single transaction parameterized insert for the 5 PO-approved venue assignments; conflict-safe (`DO NOTHING` on active assignment conflict)
- Outcome: PASS; 5 assignments active
  - Alex Tan: Orchid Hall, Lotus Room, Maple Room
  - Jordan Lee: Jasmine Hall, Cedar Auditorium
- Postchecks: PASS; exactly 5 active venue staff assignments found; all 5 venues successfully resolve via `resolveAssignedVenueStaff`
- Scope boundary: no account changes, credential modification, password hash alteration, schema reset, or unrelated query/write
- Sanitization: no private database URLs, connection strings, UUIDs, or passwords recorded
