# feature/SCRUM-189-venue-staff-assignments

Goal: give Venue Staff notifications real recipients. Add the venue-to-staff
assignment relation (T-64, T-89) so booking and venue-change notices reach the
Venue Staff responsible for each venue, unblocking E11-S01 (SCRUM-75). Jira
subtask SCRUM-189 under SCRUM-75, owner Le Xin; approach confirmed with the PO
at Sprint 4 planning.

## Plan

Two PRs, per `docs/ops/production-migrations.md`:

1. Migration-only PR (branch `feature/SCRUM-189-venue-staff-migration`):
   `0018_venue_staff_assignments.sql` creates `venue_staff_assignments`
   (venue_id, staff_id, active_from, active_until). New table only, so the
   deployed application is unaffected. Apply it in production after merge.
2. Code PR (this branch, stacked on 1): seed assignments, a table-backed
   default resolver in `captureEventAudience`, tests. Merge only after the
   production ledger check for 0018 passes.

## Decisions

- No roster screen (T-89). Rows are setup data.
- Never infer assignment from `decided_by` (T-64); TC_E11S01_13 keeps proving it.
- Resolved IDs are still filtered to active `venue_staff` users, as before.
- Migration number 0018 (renamed from 0016 on 15 Oct): 0016 is #261's write
  guard, 0017 is reserved for SCRUM-184 (Bl0oper), 0019 is the booking
  contract. Agreed in the #271 review comments and `docs/db_schema.md`.

## Open

- Production has no assignment rows after the migration. Who loads the real
  venue-to-staff list, and from where, is for the PO and deploy owner.
