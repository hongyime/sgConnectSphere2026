# SCRUM-189 — production migration 0018 run record

Apply merged migration 0018 from PR #271 once, verify its ledger/schema and public health response, then open a focused reviewed docs PR with the run record and required T-65 evidence.

## Done so far

- Confirmed PR #271 is merged and that its exact `0018_venue_staff_assignments.sql` is present on current `main` (`7cd49c2`, source merge `7bfec65`). It is additive and adds only `venue_staff_assignments`.
- Fresh safe precheck: production project URL matched; public ledger existed with 18 entries; `0012_user_role_enum_additions.sql` appeared exactly once; 0018 was absent and the only pending migration. The 0016/0019 prerequisites, public `users`/`venues` UUID metadata, `venue_staff` enum value, public search path, and required schema/foreign-key/ledger privileges were verified without reading application rows.
- Ran exactly once from `backend/`: `npx tsx src/database/cli.ts migrate --only 0018_venue_staff_assignments.sql`. CLI reported the migration applied.
- Read-only postcheck: ledger increased 18 to 19, 0018 appears once, no other migration was applied and no files remain pending. All four expected columns, two FKs, primary key, active-period check, staff index, and comments exist. No assignment or other application rows were queried or written.
- Public unauthenticated `GET /api/health` returned HTTP 200 with `ok: true` and all readiness flags true.
- The production run record is in `docs/ops/production-migration-runs/20261016-0203-0018_venue_staff_assignments.sql.md`.

## Limits and next steps

- No 0012 rerun, 0017/0019/other DDL, reset, seed, app deployment/configuration, or assignment data operation was performed. Creating the relation does not establish an approved production Venue Staff roster; obtain the owner's approved roster source before any assignment writes.
- Add the T-65 local tooling execution record for `python scripts/check.py` and runtime record for the cited health GET. Do not represent either as a manual human E2E or application test.
- Run the repository check, commit the records promptly, push normally, and open a non-draft docs PR with the four required template headers and explicit SCRUM-189 / SCRUM-75 traceability. Report required-check status honestly; stop if checks are pending. Do not churn commits or PR body for unrelated main advances.
- Do not edit `.agents/STATE.md` or `.agents/JOURNAL.md`. The primary worktree's unrelated changes are untouched. The main task owner will provide any PostPlan; do not generate an HTML PostPlan here.
