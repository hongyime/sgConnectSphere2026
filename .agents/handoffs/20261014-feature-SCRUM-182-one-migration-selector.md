# SCRUM-182 one-migration selector

Add an explicit one-file-at-a-time mode to the database migration CLI and update the production runbook so a deploy owner can safely catch up multiple pending migrations one at a time after verifying the production ledger.

## Current state

- Jira technical enabler SCRUM-182 was created under E00 (SCRUM-127) before code changes. The Product Owner selected the one-at-a-time route for Amareet's migration catch-up request.
- Production ledger read/run is still blocked on access to the designated 3410/T14 environment; no production database was queried or changed.
- Migrations currently present on `main` include `0009_keepalive_logs.sql`, `0010_audit_logs_immutable.sql`, and `0013_tentative_venue_holds.sql`.
- Started from freshly fetched `origin/main` at `8f246ae` on `feature/SCRUM-182-one-migration-selector`.
- The CLI now accepts `migrate --only <exact-filename.sql>`, validates the filename before connecting, and preserves all-pending behavior when the selector is omitted. The runbook and accepted decision 0015 document the one-at-a-time production procedure.
- Generated `docs/testing/tc-coverage.md` after adding the selector tests.
- T-65 evidence is recorded in `docs/testing/runs/20261014-011243-bryanseah234-backend-unit.md`.
- CLI preflight smoke evidence is recorded in `docs/testing/runs/20261014-012212-bryanseah234-backend-unit.md`.
- The repository check passed with a temporary `python` shim targeting the installed `python3`; T-65 evidence is recorded in `docs/testing/runs/20261014-011444-bryanseah234-tooling.md`.
- PostPlan is uploaded and visually reviewed at desktop and mobile widths: https://axyjpgs4rblh.postplan.dev/v/2.

## Remaining work

- Fetch `origin` again before pushing; open a reviewed PR with the required four sections and PostPlan.
- Set SCRUM-182 to In Review and add the PR/evidence link after the PR opens.
- After merge, the deploy owner must use the T14/3410 environment for a read-only ledger precheck and apply each still-pending migration separately, with its own postcheck and run record. Do not run the production migrate command from this environment.

## Verification

- Read the current production runbook and the existing SCRUM-138/0013 migration handoff before implementation.
- `npm test --workspace backend` — passed, 344/344 tests.
- `npx c8 --include=src/database/migrationSelection.ts --reporter=text tsx --test tests/migrationSelection.test.ts` — passed, 11/11; statements, branches, functions and lines all 100% for the new selector module.
- `npm run build --workspace backend` — passed (`tsc -p tsconfig.json --noEmit`).
- `env -u DATABASE_URL npx tsx src/database/cli.ts migrate --only missing.sql` — rejected the unknown migration before database URL lookup.
- Final `python3 scripts/check.py` with a temporary `python` shim targeting installed `python3` — passed repository hygiene, all 87 tooling tests, and validation of 196 test-run records.
- No production ledger query, migration command, or production write has been performed. This runtime is Linux and exposes neither the T14/3410 mount nor a `DATABASE_URL` or `psql` client.

## Learnings

- The existing migration CLI intentionally applies every pending file, so a multi-file production catch-up must use a supported single-file path rather than a batch exception.
- The one-at-a-time option limits each invocation to one file, while the deploy owner still must check dependencies and the live ledger before selecting a migration.
