# Decision 0015: Apply production migrations one at a time

- **Status:** Accepted
- **Date:** 2026-10-14
- **Decision owner:** Product Owner
- **Related work:** SCRUM-182; SCRUM-138; PR #241; PR #246; `docs/ops/production-migrations.md`

## Context

The database CLI's default `migrate` command applies every migration absent from the ledger, in filename order. The production runbook therefore stopped operators whenever more than one migration was pending. Migration 0013 (`SCRUM-138`) is merged, while the hold implementation PRs #245 and #252 wait for its production application. The production ledger has not yet been inspected for this catch-up request.

## Decision

Add an explicit selector that applies at most one exact migration filename per CLI invocation. For production, the deploy owner must inspect the ledger read-only, select one pending and dependency-ready migration, run it with `migrate --only <exact-filename.sql>`, then verify the ledger and commit its run record before selecting another file. The production operator must not use the default all-pending command.

Keep the existing no-selector behavior for local and test workflows. Do not group multiple migrations into an exceptional batch for this catch-up.

## Consequences

- SCRUM-182 adds the selector, its validation and regression tests, and updates the runbook.
- A failed migration can be investigated before another file is attempted; one run record remains tied to each migration attempt.
- This decision does not authorize a production database write. The read-only precheck, per-file postchecks and run records remain required.
- Migration dependencies must be evaluated from the actual ledger and migration contents. Do not assume that every file named in a catch-up request is pending.

## Alternatives considered

- Apply all pending migrations in one one-off run and record an exception. Rejected because an unexpected pending file would be applied in the same command and a failure could leave the operator with a less clear recovery boundary.
- Keep the default all-pending-only workflow and stop until only one file is pending. Rejected because the CLI would not support a safe staged catch-up while multiple files are pending.
