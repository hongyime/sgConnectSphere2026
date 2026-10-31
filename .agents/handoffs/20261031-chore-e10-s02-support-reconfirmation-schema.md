# SCRUM-244 migration 0026 — reconfirmation flag on Technical Support requests

Migration-only branch for the E10-S02 follow-up (T-103, story SCRUM-71,
subtask SCRUM-244, owner Le Xin). Under `docs/ops/production-migrations.md`
("Release sequence") the schema change ships in its own PR, is merged and
applied by the deploy owner, and only then may the code PR that uses it
(`feature/SCRUM-71-e10s02-support-reconfirm`) merge.

## Done

- `backend/database/migrations/0026_support_reconfirmation.sql`: adds
  `requires_reconfirmation boolean NOT NULL DEFAULT false` to
  `tech_support_requests` (`ADD COLUMN IF NOT EXISTS`). The reason stays in the
  audit log, as for venue bookings and equipment reservations, which carry the
  same flag since 0001.
- Also adds `reconfirm_range tstzrange` (nullable, never empty): the time a
  flagged request moves to, worked out when the date changes, since a request
  keeps its own window (T-79) and the old Session time is gone by the time
  Technical Support Staff reconfirm. Le Xin chose a column over keeping it in
  the audit log (31 October). Added before the PR opened, so still one
  migration.
- Backward compatible: existing rows read false; the deployed code never names
  the column, and its insert still works (proved in the schema test).
- `backend/tests/supportReconfirmationSchema.integration.test.ts` (listed in
  `test:db`): column shape and default, a deployed-style insert unflagged, set
  and clear, NULL refused. Without the migration both tests fail.
- `docs/db_schema.md`: column in the diagram and a 0026 note.
- Applied to the local `connectsphere_dev_stack` twice: applied, then "already
  applied". Not applied to production; that is the deploy owner's step after
  merge.

## Next step

`main` (with #392 and #393) merged in; `backend/package.json` conflict
resolved by keeping main's `test:db` list and adding the schema test. New run
record `20261031-210950` covers `reconfirm_range`: 312/313, the one failure
the local-only `registration.db.test.ts`. PR opened.

After merge, the deploy owner applies 0026 and records the run under
`docs/ops/production-migration-runs/`; then the code PR
(`feature/SCRUM-71-e10s02-support-reconfirm`) may merge.
