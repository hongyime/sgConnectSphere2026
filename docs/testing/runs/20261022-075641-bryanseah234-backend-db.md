---
date: 2026-10-22T07:56:41+08:00
runner: bryanseah234
scope: backend/db
environment: local
run_type: automated
test_case_version: 171026
database: real
commit: 0806898
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Exact standalone cancellation CI selector | PASS | From backend: `npx tsx --test tests/eventCancellation.integration.test.ts tests/cancellationRecovery.integration.test.ts`; 8/8 passed, zero failed/cancelled/skipped/todo. Four existing cases and four new rollback/retry/replay cases executed on owned native loopback PostgreSQL 17. |
| MULTIPLE | Injected failure atomicity and replay | PASS | Booking Released audit INSERT, Obsolete audit INSERT, notification delivery INSERT and equipment UPDATE each failed deliberately; full business/history/notice snapshots matched their starting state. Removing the fault permitted one committed cancellation; replay preserved that state. |

Base HEAD was `0806898` plus the scoped working diff. Test SHA-256:
`82aff400ac206297c2ff9b4279823a4d6537386dd9efdb5bf4fa6dd0cc63fb90`;
fixture SHA-256 `e37dc3303dc6a2191951b48d559734c78edcd428c2fedbae61bccb594ee22138`.
The target database, loopback address and owned port were positively verified.
Only allowlisted variables and the pinned local network guard reached tests.
The owned cluster stopped, private directory was removed and dependency link
unlinked. No shared database or provider operation occurred.

The first run's eight cases also passed, but its receipt parser rejected Node's
spec-summary prefix. That failed receipt is retained; this new run passed after
the helper-only parser correction. SQL establishes Confirmed fixture state; it
does not prove approval/Safety UI or real approval/cancellation races. This does
not supply human T-93 evidence, whole-story acceptance or production permission.
