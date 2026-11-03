# Venue Staff Roster Provisioning

This procedure provisions the Product Owner-approved production Venue Staff roster into `venue_staff_assignments`. Per team decisions T-64, T-89, and T-97, venue-to-staff assignments are operational setup data used for routing notifications without a frontend roster management screen in Release 1.

## Scope and Governance

- **Jira Traceability**: Story `E11-S01` (SCRUM-75), Subtask `SCRUM-195` ("Backend: provision the PO-approved production venue-staff roster").
- **PO Accountability**: Bryan as accountable Product Owner approved the roster mapping under T-97.
- **Deploy Owner Execution**: The deploy owner runs the bounded, idempotent provisioning script.
- **Verification**: Delivery behaviour is verified by Ji Ning without claiming UI acceptance.
- **Safety Boundary**: This procedure is a targeted data-setup operation, not a migration, schema reset, or general seed command. It never modifies existing credentials, user passwords, client organisations, or other database tables.

## PO-Approved Canonical Roster Mapping

The canonical mapping assigns the five production venues between the two active Venue Staff accounts:

| Venue Staff Account | Email | Assigned Venues |
| --- | --- | --- |
| **Alex Tan** (Venue Staff A) | `venue_staff@connectsphere.com` | Orchid Hall, Lotus Room, Maple Room |
| **Jordan Lee** (Venue Staff B) | `venue_staff_b@connectsphere.com` | Jasmine Hall, Cedar Auditorium |

## Preconditions

1. **Database & Schema**: Connect to the production database with schema fixed to `public`.
2. **Migration Ledger**: Confirm migration `0018_venue_staff_assignments.sql` is recorded and applied in the migration ledger.
3. **Target Accounts**: Verify both `venue_staff@connectsphere.com` and `venue_staff_b@connectsphere.com` exist, are active (`status = 'active'`), and hold role `'venue_staff'`.
4. **Target Venues**: Verify all five venues (Orchid Hall, Lotus Room, Maple Room, Jasmine Hall, Cedar Auditorium) exist in `venues`.
5. **Conflict Safe**: The insert is idempotent (`ON CONFLICT (venue_id, staff_id, active_from) DO NOTHING`).

## Execution

Run the bounded provisioning tool:

```bash
npx tsx scripts/provision_venue_staff_roster.ts
```

Or execute within a single transaction:

```sql
BEGIN;

-- Insert Alex Tan assignments
INSERT INTO venue_staff_assignments (venue_id, staff_id, active_from)
SELECT v.id, u.id, now()
FROM venues v, users u
WHERE u.email = 'venue_staff@connectsphere.com'
  AND v.name IN ('Orchid Hall', 'Lotus Room', 'Maple Room')
ON CONFLICT (venue_id, staff_id, active_from) DO NOTHING;

-- Insert Jordan Lee assignments
INSERT INTO venue_staff_assignments (venue_id, staff_id, active_from)
SELECT v.id, u.id, now()
FROM venues v, users u
WHERE u.email = 'venue_staff_b@connectsphere.com'
  AND v.name IN ('Jasmine Hall', 'Cedar Auditorium')
ON CONFLICT (venue_id, staff_id, active_from) DO NOTHING;

COMMIT;
```

## Post-Execution Verification

1. Verify that `venue_staff_assignments` contains exactly 5 current active rows (`active_from <= now() AND (active_until IS NULL OR active_until > now())`).
2. Run `resolveAssignedVenueStaff` across all five venues and verify that:
   - Orchid Hall, Lotus Room, and Maple Room resolve to Alex Tan.
   - Jasmine Hall and Cedar Auditorium resolve to Jordan Lee.
3. Record the sanitized outcome in `docs/ops/production-account-runs/`.
