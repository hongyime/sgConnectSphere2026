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
3. **Target Accounts**: Verify both `venue_staff@connectsphere.com` and `venue_staff_b@connectsphere.com` exist, are active (`is_active = true`), and hold role `'venue_staff'`. The runner uses case-insensitive matching (`lower(email)`).
4. **Target Venues**: Verify all five venues (Orchid Hall, Lotus Room, Maple Room, Jasmine Hall, Cedar Auditorium) exist in `venues` and are active (`is_active = true`).
5. **Conflict Safe**: The insert is idempotent and targets the primary key `PRIMARY KEY (venue_id, staff_id)` declared in migration 0018:
   ```sql
   ON CONFLICT (venue_id, staff_id)
   DO UPDATE SET active_from = now(), active_until = NULL
   WHERE venue_staff_assignments.active_until IS NOT NULL
      OR venue_staff_assignments.active_from > now()
   ```

## Execution

### CLI Runner

The script defaults to read-only `--verify-only` mode for safety.
To execute writes against a target database:

```bash
# Dry-run / verification only:
npx tsx scripts/provision_venue_staff_roster.ts --verify-only

# Local / development execution:
npx tsx scripts/provision_venue_staff_roster.ts --execute

# Production (Supabase) execution:
npx tsx scripts/provision_venue_staff_roster.ts --execute --confirm-production
```

When `DATABASE_URL` targets Supabase, `--confirm-production` is mandatory to avoid accidental writes.

### Direct Transactional SQL

If executed manually via `psql` by the designated deploy owner, run inside a single transaction:

```sql
BEGIN;

-- Insert Alex Tan assignments
INSERT INTO venue_staff_assignments (venue_id, staff_id, active_from, active_until)
SELECT v.id, u.id, now(), NULL
FROM venues v
CROSS JOIN users u
WHERE lower(u.email) = 'venue_staff@connectsphere.com'
  AND u.is_active = true
  AND v.is_active = true
  AND v.name IN ('Orchid Hall', 'Lotus Room', 'Maple Room')
ON CONFLICT (venue_id, staff_id)
DO UPDATE SET active_from = now(), active_until = NULL
WHERE venue_staff_assignments.active_until IS NOT NULL
   OR venue_staff_assignments.active_from > now();

-- Insert Jordan Lee assignments
INSERT INTO venue_staff_assignments (venue_id, staff_id, active_from, active_until)
SELECT v.id, u.id, now(), NULL
FROM venues v
CROSS JOIN users u
WHERE lower(u.email) = 'venue_staff_b@connectsphere.com'
  AND u.is_active = true
  AND v.is_active = true
  AND v.name IN ('Jasmine Hall', 'Cedar Auditorium')
ON CONFLICT (venue_id, staff_id)
DO UPDATE SET active_from = now(), active_until = NULL
WHERE venue_staff_assignments.active_until IS NOT NULL
   OR venue_staff_assignments.active_from > now();

COMMIT;
```

## Post-Execution Verification

1. Run the read-only verification mode:
   ```bash
   npx tsx scripts/provision_venue_staff_roster.ts --verify-only
   ```
2. Verify that `venue_staff_assignments` contains exactly 5 current active rows using explicit `JOIN`s:
   ```sql
   SELECT
     v.name AS venue_name,
     v.id AS venue_id,
     u.email AS staff_email,
     u.id AS staff_id
   FROM venue_staff_assignments a
   JOIN venues v ON v.id = a.venue_id
   JOIN users u ON u.id = a.staff_id
   WHERE a.active_from <= now()
     AND (a.active_until IS NULL OR a.active_until > now());
   ```
3. Verify `resolveAssignedVenueStaff` query logic across all five venues:
   - Orchid Hall, Lotus Room, and Maple Room resolve strictly to Alex Tan.
   - Jasmine Hall and Cedar Auditorium resolve strictly to Jordan Lee.
4. Confirm `TC_E11S01_13`: Any unassigned venues return unresolved (`[]`) with zero fallback staff.
5. Record the sanitized outcome in `docs/ops/production-account-runs/` and cite in T-65 test run records under `docs/testing/runs/`.
