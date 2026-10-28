Integrate E10-S05 / SCRUM-74 recovery from merged #355 with E05-S06 #348/#349, following Ji Ning's authorization. Keep the parent open; human manual acceptance and independent review remain required.

## Implementation

Branch starts from main f3df479b. Real block creation, rejected replacement, retry approval and block lift/edit reproduced restoration of the original to Confirmed. Restore detection now recursively follows same-event non-Released replacement descendants, with UNION to terminate cycles. No migration or direct state fixture substitutes for detection in the two new integration cases. Existing fixture-based tests remain for other regressions.

## Verification

Combined booking/unavailability database suite: 91 passed, zero failed/skipped on disposable native loopback PostgreSQL. Initial exploratory targeted regression before the fix: six passed, two failed on Confirmed versus Conflicting. Backend typecheck passed. Backend units: 545 passed, zero failed. python scripts/check.py passed, including repository hygiene and tooling tests. Coverage inventory regenerated without drift; record validation and staged whitespace passed. Immutable T-65 records dated 28 October capture these results. SQL orchestration uses real PostgreSQL tests rather than claiming 100% mocked unit coverage. Ji Ning subsequently performed the guided manual flow; see the 28 October manual record and 20 hand-taken screenshots. PASS applies only to the described observations.

## Next

Automated checks and the guided human recovery flow are recorded below. Review the evidence against canonical acceptance; do not describe omitted canonical manual preconditions as manually passed. Review must include tests and SQL coverage exception. Obtain PO/delegate acceptance only after merged combined evidence; never auto-close SCRUM-74 or its unfinished subtasks.

## Human evidence collected

Manual record: docs/testing/runs/20261028-133021-jininggg-frontend-e2e.md. Twenty screenshots. Combined change about 29 files, under PR limits. Remaining canonical gaps: equipment/staff preservation, non-default layout/accessibility, second Attendee, intercepted emails, and venue-change inbox content naming the actual new venue (current screenshot is generic). Do not claim TC_04 fully accepted or story Done. No screenshots substituted by agent. Local database directories and runtime env file are untracked and must never be staged.

## Acceptance-gap follow-up

Fixed recovery messages to include the confirmed venue name, sourced from the booking venue row. Shared arrangement messages retain their prior fallback when no name is supplied. Added formatting unit tests and a combined real-database test with projector reservation, assigned technical staff, Theatre layout, wheelchair requirement, two Attendees and intercepted durable email dispatch. These remain unchanged after loss/replacement; inbox and prepared email each name Replacement Hall exactly once after approval and not before. Full DB 92/92, final targeted DB 9/9, units 546/546 and backend typecheck passed; new full-regression record documents the scope. Original manual record remains immutable.

Separate synthetic EVT-E10-MESSAGE is ready in the local manual stack: Pending Manual Hall 3 replacing conflicting Hall 1 on 2 March 2027, with two Attendees and missing preconditions populated. API restarted with current source. Human message-content follow-up passed on d3790e5: docs/testing/runs/20261028-141409-jininggg-frontend-e2e.md and two hand-taken screenshots show the new venue name for Attendee and Organiser. No real provider delivery is claimed; intercepted provider boundary is tested automatically.

## Current delivery state

All 22 supplied screenshots are collected across the two immutable manual records. Final branch is expected to contain 38 changed files (including two follow-up images and record), below the 40-file cap. Human code/test review, CI and PO/delegate acceptance remain outstanding. Canonical equipment/staff, non-default requirements, second Attendee and intercepted email coverage is automated; do not claim those were all manually exercised. No PR has been opened by this branch yet.
