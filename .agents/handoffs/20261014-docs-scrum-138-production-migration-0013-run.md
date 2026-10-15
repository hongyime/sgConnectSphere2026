# Production migration 0013 run record

Goal: document the deploy owner's verified production application of migration 0013 and the required pre-run and post-run ledger checks, following the production migration runbook and Amareet's request.

## Completed

- Refreshed from `origin/main` at `8f246ae`; confirmed migration PR #246 is merged and the migration is present on main.
- Read the production ledger in a read-only transaction. Before the write, 0009 and 0010 were applied and `0013_tentative_venue_holds.sql` was the only pending migration.
- Followed the runbook's exactly-one-pending-file path and ran `npx tsx src/database/cli.ts migrate` once from `backend/`. The command exited 0 and reported only 0013 applied.
- Re-read the ledger read-only. It contains 0013 at `2026-10-13T18:53:10.865Z`; all 13 migration files are accounted for, with no pending or unexpected migration.
- Jira SCRUM-138 received a production release update before the write. Its Done status was left unchanged. SCRUM-182 remains the selector implementation task; this run used the existing CLI only because the verified ledger had exactly one pending migration.
- The run record is `docs/ops/production-migration-runs/20261013-1853-0013_tentative_venue_holds.sql.md`.

## Remaining

- #245 and #252 still need their conflicts/reviews resolved and should be rechecked against the now-migrated production schema before merge.
- This migration record must merge through the normal docs PR workflow.

## Verification

- `git fetch --all --prune` and `git pull --ff-only`: up to date; `origin/main` at `8f246ae`.
- Read-only production precheck: 0013 sole pending migration.
- `npx tsx src/database/cli.ts migrate` from `backend/`: exit 0; applied 0013 only.
- Read-only production postcheck: 0013 present; no pending migration.
- `.venv-tools/bin/python scripts/check.py`: PASS; repository hygiene and 87 tooling tests. This does not establish application lint, test, build or deployment status. T-65 record: `docs/testing/runs/20261014-025430-bryanseah234-tooling.md`.
