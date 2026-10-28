Integrate E10-S05 / SCRUM-74 recovery from merged #355 with E05-S06 #348/#349, following Ji Ning's authorization. Keep the parent open; human manual acceptance and independent review remain required.

## Implementation

Branch starts from main f3df479b. Real block creation, rejected replacement, retry approval and block lift/edit reproduced restoration of the original to Confirmed. Restore detection now recursively follows same-event non-Released replacement descendants, with UNION to terminate cycles. No migration or direct state fixture substitutes for detection in the two new integration cases. Existing fixture-based tests remain for other regressions.

## Verification

Combined booking/unavailability database suite: 91 passed, zero failed/skipped on disposable native loopback PostgreSQL. Initial exploratory targeted regression before the fix: six passed, two failed on Confirmed versus Conflicting. Backend typecheck passed. Backend units: 545 passed, zero failed. python scripts/check.py passed, including repository hygiene and tooling tests. Coverage inventory regenerated without drift; record validation and staged whitespace passed. Immutable T-65 records dated 28 October capture these results. SQL orchestration uses real PostgreSQL tests rather than claiming 100% mocked unit coverage. Ji Ning subsequently performed the guided manual flow; see the 28 October manual record and 20 hand-taken screenshots. PASS applies only to the described observations.

## Next

Finish repository checks and record observed runs. Human TC_E10S05_01-04 with hand-taken screenshots remains pending. Review must include tests and SQL coverage exception. Obtain PO/delegate acceptance only after merged combined evidence; never auto-close SCRUM-74 or its unfinished subtasks.

## Human evidence collected

Manual record: docs/testing/runs/20261028-133021-jininggg-frontend-e2e.md. Twenty screenshots. Combined change about 29 files, under PR limits. Remaining canonical gaps: equipment/staff preservation, non-default layout/accessibility, second Attendee, intercepted emails, and venue-change inbox content naming the actual new venue (current screenshot is generic). Do not claim TC_04 fully accepted or story Done. No screenshots substituted by agent. Local database directories and runtime env file are untracked and must never be staged.
