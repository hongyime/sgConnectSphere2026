# Fail the build when a test-case citation drifts from the backlog

Make the backlog-to-test-case link mechanical, so a deleted, renumbered or
superseded scenario fails the repository check instead of orphaning a case
silently.

## Why

`docs/testing/tc-drift-audit-20261101.md` found 383 cases and no drift, but only
because someone read them by hand. Nothing in the pipeline reads the
`AC reference` line. The near-miss that triggered the audit — retiring
`TC_E03S01_01`/`_02` because their backlog scenarios say `[Superseded]`, when the
replacing story is unbuilt and the code still does what the cases describe — is
exactly the mistake a table-driven check would make.

## What changed

- `scripts/check_test_case_references.py` — parses every `### TC_...` block, reads
  its `AC reference`, and resolves it against `docs/backlog/release-1/` and
  `docs/backlog/product/`. Fails when the story is gone, the scenario number is
  gone, or the scenario is superseded while the case is neither retired nor
  allowlisted.
- `docs/testing/tc-drift-allowlist.json` — the two E03-S01 cases, each naming
  `E03-S08` as the replacement. The check fails on a stale entry, so the file
  cleans itself up: the day E03-S08 ships the entry must be deleted and the case
  retired, in that PR.
- `tooling/tests/test_check_test_case_references.py` — 11 tests, including the
  parser cases that matter (`Scenario 3e, 3f; T-95, T-96` must not read 95 and 96
  as scenario numbers) and each failure mode.
- `scripts/check.py` — runs the new check.
- `CONTRIBUTING.md` — the rule itself: retire and create in the same PR as the
  backlog change.

## Deliberately not included

The other two prevention ideas from the audit: per-story coverage reporting, and
one TC_ID per test title. Both change numbers people quote and deserve their own
change.

## Learnings

The AC reference is prose, so the first version of the parser read `; T-95` as
scenario 95 and `by T-76` as scenario 76, producing eleven false failures on a
clean tree. Numbers in a prose citation are only scenario numbers when they follow
the word Scenario; anything capturing a wider span will pick up BDR identifiers.

## Commands and outcomes

- `python scripts/check_test_case_references.py` — PASS, 383 cases, 2 allowlisted.
- `python tooling/tests/test_check_test_case_references.py` — 11/11 pass.
- `python scripts/check.py` — PASS.
