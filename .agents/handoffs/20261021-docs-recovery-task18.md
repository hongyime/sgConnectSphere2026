# Task 18 Derivative Packaging

Prepare narrowly scoped recovery derivatives and actual tooling-run records for
task 19 under `docs/source-of-truth.md`, without publishing or claiming story
acceptance. The report, policy and testcase lanes remain separate proposals.

## Completed

- Regenerated the 21 October testcase workbook from task-8 Markdown. Reconciled
  the legacy input byte-for-byte. Semantic comparison found only three changed
  precondition cells; every ID and expected result is preserved. Altering one
  disposable expected-result cell was rejected by the same parity comparator.
- Regenerated the buffer lane coverage classification from its actual tests.
  Booking, cancellation and double-booking inventories already match their own
  proposed declarations. None is represented as current-main execution evidence.
- Regenerated the cancellation lane's dated backlog from its actual changed
  source views, preserving older exports and current E10-S01=8 versus baseline=3.
- Regenerated only the policy BDR export through the existing exporter. Repeated
  document XML agrees; unchanged ADR sources/export were not regenerated.
- Initial cancellation env check failed. The new scanned auth test reads HOME
  and PATH; canonical regeneration documents them. PLAYWRIGHT_BASE_URL occurs
  only outside scanned roots and does not enter the generated template. No
  generator allowlist, product behavior, guard or configuration read changed.
- Nine actual repository checks passed: 163 tooling tests in the reconciliation
  lane, 158 in each other lane. Used existing tooling via in-memory
  `check.python_path` binding. New immutable automated T-65 records carry actual
  HEAD/runner/time and explicitly exclude prior workers' runs as new evidence.

## Publication Boundary

Task-18 local packaging manifests pin each lane's base and complete proposed
tree, changes, generator applicability, hooks, preservation and cleanup. Task 19
must review focused deltas, reconcile overlapping source-of-truth lines against
fresh main, regenerate on the resulting proposed tree, and supply full PR
traceability without staging dependency links or copying broad integration trees.

No application/DB/browser stack or new dependency was needed. LSP remains
unavailable with installation previously declined; real interpreter syntax and
repository checks were used instead. No human/manual T-93 or PO acceptance,
#298 hold clearance, production authorization or whole-story Done claim.
No stage, commit, push, branch rewrite, PR/Jira mutation, migration or provider
operation. Existing run records/images and STATE/JOURNAL are preserved.
