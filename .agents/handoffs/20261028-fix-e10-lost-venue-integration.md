Integrate E10-S05 / SCRUM-74 recovery from merged #355 with E05-S06 #348/#349, following Ji Ning's authorization. Keep the parent open; human manual acceptance and independent review remain required.

## Implementation

Branch starts from main f3df479b. Real block creation, rejected replacement, retry approval and block lift/edit reproduced restoration of the original to Confirmed. Restore detection now recursively follows same-event non-Released replacement descendants, with UNION to terminate cycles. No migration or direct state fixture substitutes for detection in the two new integration cases. Existing fixture-based tests remain for other regressions.

## Verification

Combined booking/unavailability database suite: 91 passed, zero failed/skipped on disposable native loopback PostgreSQL. Initial exploratory targeted regression before the fix: six passed, two failed on Confirmed versus Conflicting. Backend typecheck passed. Backend units: 545 passed, zero failed. python scripts/check.py passed, including repository hygiene and tooling tests. Coverage inventory regenerated without drift; record validation and staged whitespace passed. Immutable T-65 records dated 28 October capture these results. SQL orchestration uses real PostgreSQL tests rather than claiming 100% mocked unit coverage. No manual PASS is claimed.

## Next

Finish repository checks and record observed runs. Human TC_E10S05_01-04 with hand-taken screenshots remains pending. Review must include tests and SQL coverage exception. Obtain PO/delegate acceptance only after merged combined evidence; never auto-close SCRUM-74 or its unfinished subtasks.
