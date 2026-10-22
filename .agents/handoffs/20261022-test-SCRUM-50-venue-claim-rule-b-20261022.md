# E06-S06 first accepted claim proof

Verify E06-S06 / SCRUM-50 against the Product Owner's 22 October rule-B choice with real booking services and unchanged database guards. This test-only leaf is based on #334 `938322ff26ff1f1674050ae2ab53db41676eca9c`, targeting `fix/SCRUM-48-recovery-decision-20261021`, not main directly.

## Done so far

- Added seven real-PostgreSQL tests for Pending exclusivity, hold/request order, concurrent claims, buffered adjacency/one-minute overlap, later buffer growth plus explicit rejection, different venues for one event and hold conversion.
- The concurrency case uses two distinct assigned Coordinators. Exactly one request returns 201 and one refuses with 409; only one Pending claim and one Planning event remain. The losing Approved event has no booking, audit, notification or notification-delivery effects.
- The fixture applies real existing migrations in isolated schemas and calls real submission/hold/conversion/decision services. No dropped constraints, disabled triggers, runtime/API/frontend change, migration edit or 0021 adoption.
- Added the new test once to existing default and focused booking selectors. The existing application workflow already invokes the focused script; no workflow change is needed. Regenerated `docs/testing/tc-coverage.md`.
- Initial technical gate rejected the weaker concurrency assertions. The correction is preserved separately from that rejection, not substituted into the old report.
- Fresh owned native PostgreSQL verification finished at 2026-10-22T17:35:38+08:00: rule B 7/7, actual CI booking selector 40/40, holds 6/6, buffers/search 11/11 and decision units 30/30, all with zero failed/cancelled/skipped/todo. Counts overlap and are not a unique-test total. Backend typecheck, explicit strict test compilation and backend build passed. Owned PostgreSQL, temporary data and owned dependency links were removed.
- T-65 evidence: `docs/testing/runs/20261022-173538-bryanseah234-full-regression.md`. Tests ran on base `938322f` plus the disclosed working diff; source hashes identify the tested additions.
- Full original repository checks at 17:42 Singapore time passed all 158 tooling tests and validated 395 run records, including the new real-service record. See `docs/testing/runs/20261022-174227-bryanseah234-tooling.md`. Only the installed tooling-interpreter locator was bound in memory; no check was skipped or suppressed.
- Independent technical delta rereview returned APPROVE with high confidence and no blockers after checking the two assigned actors, loser-specific effects, fresh run and matching source hashes. A broader review attempt timed out without a verdict and was not counted as approval. Final repository validation passed with 396 records and 158 tooling tests.

## Provenance and limits

The runtime branch contains CAA 161026 / 375 catalogue cases. New test titles are deliberately untagged and use prospective T-100 traceability comments, not passing revised CAA 221026 case claims. Canonical requirements are proposed separately on `docs/venue-claim-rule-b-20261022`; reconcile title mapping/inventory after adoption.

Only test/helper/selector/inventory changes are introduced here. No new or changed production code therefore requires a new unit-coverage percentage; the adjacent decision unit suite is regression evidence, not a claim of full application coverage. LSP was unavailable and installation previously declined; actual TypeScript compiler commands passed instead.

## Next and remaining gates

Publish a focused draft PR on #334; publication and hosted checks are not yet claimed here. Keep human code and test validity review, genuine T-93 manual runs, PO acceptance, parent integration/main conflicts and production migration authorization separate. Do not merge #308's first-approval proposal or reopen the completed recovery audit.

## Learnings

Aggregate effects cannot prove a concurrent loser is side-effect free when the winner legitimately emits effects. Assert the losing event's persisted effects directly and use the distinct assigned actors specified by the case.
