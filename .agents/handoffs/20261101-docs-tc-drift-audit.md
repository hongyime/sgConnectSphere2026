# Test-case drift audit plus the first missing test

Audit all 383 test cases for drift between the canonical backlog, the shipped
code and the automation inventory, publish the findings as a standing document,
and close the one real coverage hole the audit could close on the spot.

## Why

A case appeared stale (`TC_E03S01_01`, `_02`, citing scenarios the backlog marks
`[Superseded by E03-S08]`). Before retiring anything I checked the code: E03-S08
is `To Do` and `coordinatorAssignment.ts` still auto-assigns on submission, so
those cases describe what ships and must stay. That near-miss is the reason the
audit exists — the same mistake, made from a table, would have deleted real
coverage.

## What this change contains

- `docs/testing/tc-drift-audit-20261101.md` — method, findings, root cause and six
  prevention steps. Re-runnable; it does not ask anyone to trust the numbers.
- `backend/tests/attendeeRegistration.test.ts` — one new test for
  `TC_E09S05_02`, the only no-test case on a Done story that was testable today.
  It asserts a withdrawal writes exactly one row addressed by that registration's
  own id, never by `event_id`, which is what "leaving other events unaffected"
  means in the statement.
- `docs/testing/tc-coverage.md` and the CAA 011126 workbook — regenerated:
  308/383 automated, 54 scaffold, 21 no test.

## Deliberately not done

- **No retirements.** The only supersede candidates are `TC_E03S01_01`/`_02`, and
  they must wait for E03-S08. The audit records the trigger.
- **The 21 remaining no-test cases** are unbuilt stories, retired cases or the three
  performance targets outside the DoD. `SCRUM-246` tracks the 25 scaffold-only
  cases on Done stories.
- **Not fixed:** 87 test titles carry more than one TC_ID; the worst claims 15
  cases. Recorded, not touched, because rewriting titles would move the coverage
  numbers in the same PR that documents them.

## Learnings

A superseded scenario in the backlog is not evidence that the code changed. Check
the replacement story's status and the module before retiring a case; the backlog
records intent, the code records fact, and they diverge exactly as long as the
replacement is unbuilt.

## Commands and outcomes

- `npx tsx --test tests/attendeeRegistration.test.ts` - 30/30 pass.
- `python scripts/tc_coverage_audit.py` - regenerated; 308 automated.
- `python scripts/export_testcases_xlsx.py` - regenerated CAA 011126.
- `python scripts/check.py`, `python scripts/doc_guard.py` - see the PR.
