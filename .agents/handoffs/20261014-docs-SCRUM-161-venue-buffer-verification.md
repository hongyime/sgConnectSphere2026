# SCRUM-161 / E05-S05 venue setup and turnaround verification and handoff

Provide the manual click-through script for SCRUM-161 / E05-S05 (venue setup and turnaround buffers), review the migration application runbook for migrations 0011 and 0016, and prepare the acceptance testing handoff for Xiang Ying.

## Done so far

- PR #261 (`feat(e05): venue setup and turnaround buffers (SCRUM-161)`) was approved by Lexin Phun and merged to `main` at commit `5c22e26`.
- Additive migrations included in the merge:
  - `backend/database/migrations/0011_venue_setup_turnaround_buffers.sql` (adds `setup_time_minutes`, `turnaround_time_minutes`, and `occupied_window()`).
  - `backend/database/migrations/0016_venue_buffer_write_guard.sql` (adds `buffer_conflict` column and `guard_venue_buffer_overlap()` trigger on `venue_bookings`).
- Created manual click-through test script in `docs/testing/manual/E05-S05-click-through.md` covering all 7 canonical test cases (`TC_E05S05_01` to `TC_E05S05_07`).
- Identified that production Vercel deployment hit daily free rate limit (`api-deployments-free-per-day`), while PR #261 Vercel preview remains active at `https://sgconnectsphere-jpggnmxnm-theprawnvercel.vercel.app`.

## Production Migration Application Steps (for Deploy Owner)

Per `docs/ops/production-migrations.md`:
1. Use a shell where `DATABASE_URL` is securely set to the production Supabase database.
2. Check current ledger:
   ```sql
   SELECT name, applied_at FROM public._connectsphere_migrations ORDER BY name;
   ```
3. Apply migration 0011:
   ```bash
   npx tsx src/database/cli.ts migrate --only 0011_venue_setup_turnaround_buffers.sql
   ```
4. Apply migration 0016:
   ```bash
   npx tsx src/database/cli.ts migrate --only 0016_venue_buffer_write_guard.sql
   ```
5. Confirm post-run ledger check passes and log migration run record in `docs/ops/production-migration-runs/`.

## Next steps for Xiang Ying (Manual Click-Through)

1. Follow `docs/testing/manual/E05-S05-click-through.md` using either:
   - Local dev stack: `npx tsx backend/src/database/cli.ts reset` then `npm run dev`.
   - Or deployed environment once migrations 0011 and 0016 are applied.
2. Execute Scenarios 1–7 (buffer editing, calendar display, buffer conflict preservation, boundary testing, maintenance blocks, search exclusion).
3. Record the manual test run evidence in `docs/testing/runs/` following T-65.
