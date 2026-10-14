# SCRUM-33 and SCRUM-34 read-only production check

Record the "before the demo" read-only production check promised in the
SCRUM-33 and SCRUM-34 run records (`docs/plans/scrum-33-implementation-status.md`,
`docs/plans/scrum-34-implementation-status.md`). Both stories are Done; this
branch only adds the result to their Run logs.

## Done so far

- Ran on 2026-10-08 02:15 SGT against production, from `main` at `1ad3820`,
  inside `BEGIN READ ONLY` … `ROLLBACK` (`transaction_read_only` reported
  `on`). Aaron approved the four queries before they ran. Only object names,
  migration file names and counts came back.
- Both stories' statuses, thread types and columns are present.
- Production records migrations 0001 to 0008. 0009 is unrecorded (known: its
  table was created by hand). 0010 is unrecorded too.
- 1 of the 5 Under Review requests is missing required information.
- One Run log row added to each run record, plus a pointer under "Before the
  demo".

## Decisions taken without team sign-off

- No T-65 session file: this is a schema and data check, not a test-suite
  run, and no `scope` value in `docs/testing/runs/README.md` fits it. The Run
  log rows are the record.

## Learnings

- Migration 0010 (activity log entries can't be changed, #190) is not recorded
  in production, so production may not have that protection. Applying
  migrations to production needs the team's approval; raise it with the team.
- Enum values were listed twice in `pg_type`, most likely because production
  also holds a separate `test` schema. Filter by schema when checking types.
