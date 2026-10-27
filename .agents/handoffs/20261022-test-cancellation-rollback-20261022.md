# Standalone Cancellation Rollback Verification

Publish four real-database cancellation rollback/retry/replay regressions and
their existing default/CI selectors on #320 without transplanting booking owners.

## Scope And Evidence

- Exact base #320: `0806898`; target `feature/SCRUM-73-event-cancellation`.
- New fixture seeds a Confirmed event with valid nonoverlapping Session bookings,
  equipment, support, registrations and Pending change requests directly in the
  disposable database. It does not import the absent decision service, bypass
  guards, or claim to exercise approval or Safety confirmation UI.
- Four injected failure points cover Booking Released audit, Obsolete audit,
  notification delivery INSERT and equipment UPDATE. Full row snapshots prove
  rollback; retry and replay assertions check committed effects and uniqueness.
- Existing cancellation CI command now selects `eventCancellation.integration.test.ts`
  and `cancellationRecovery.integration.test.ts`; the default DB list also includes
  the recovery file. Actual approval/cancellation race tests are NOT selected:
  they still need the unmerged #298 decision module.
- Parent exact-command run passed 8/8, zero failed/cancelled/skipped/todo, on an
  owned native PostgreSQL 17 cluster with a positively verified loopback target.
  The cluster stopped, private directory was removed, and only its owned
  dependency link was unlinked. No shared environment or provider was used.
- The first host run also executed all eight tests successfully, but its summary
  parser expected TAP while Node emitted the spec summary. Its failed receipt
  remains; a new run passed after correcting only that parser. No test was weakened.
- Backend build and explicit strict test/fixture compilation passed in the
  authoring context. Coverage inventory regenerated without a diff; no new
  runtime code means changed-runtime unit coverage is not applicable.
- New record: `docs/testing/runs/20261022-075641-bryanseah234-backend-db.md`.
  Full repository/publication checks receive a separate tooling record.

## Remaining Gates

This is a scoped test/CI enabler, not a reopening or acceptance of SCRUM-73.
Independent source/QA review approved it; independent human review is still
required. Booking recovery, real decision races and authenticated TC_07 remain
on their separate owner-integration paths. No full synthetic composition is
published, no #298 hold is waived, and no production migration is authorized.
LSP unavailable with prior installation declined. Preserve all old records.

Full original repository checks passed with 158 tooling tests and 448 records
validated at 08:13:57 SGT; new session `20261022-081357-bryanseah234-tooling.md`.
Final staged-file hooks and publication readback remain separate prerequisites.
