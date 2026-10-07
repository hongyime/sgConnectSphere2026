# E07-S03 equipment availability

Implement SCRUM-53 / E07-S03 frontend, backend and acceptance evidence against
canonical requirements, design.md and the shared skeleton, independently of
unmerged PR #216.

## Delivered

Read-only availability mode on existing equipment API; active/unlocked Technical
Support authorization; single-statement snapshot; concurrent quantity sweep;
released reservations excluded; dated withdrawals deducted; standing maintenance
free zero; location ignored; non-overlapping half-open periods independent.
Live support/availability and legacy support/conflicts use shared form/table and
loading/error/empty states. No new schema, dependency or environment variables.

270 backend unit tests, 277 frontend tests, real PostgreSQL acceptance, six mocked
browser tests and two real authenticated desktop/mobile tests pass. Typecheck and
build pass. Coverage regenerated. Actual completion-time records and traceability
are in docs/plans/scrum-53-equipment-availability.md. Screenshots visually checked.

## Next step

Implementation commit fec891b is locally verified. The Product Owner pre-created
remote branch at b57537f has been merged without conflict; only its setup handoff
was added. This original handoff is now the canonical per-branch record.
Draft PR #229 is open: https://github.com/hongyime/sgConnectSphere2026/pull/229.
Implementation fec891b and integration 884dc52 are pushed. Review page with
synthetic screenshots: https://gnxd10tqiilh.postplan.dev/v/1.
Next: run the documented human checklist, check final-head CI and obtain review.
Manual human checklist, final-head CI, skeleton review and reviewed merge remain
required before Jira Done. E07-S04/E07-S05 own writers and are not closed by this reader.

## Learnings

Deduct peak simultaneous reservations plus dated withdrawals, not every row
intersecting a long period. Location and venue buffers never affect equipment.
Mobile shared table includes column labels in cell names: use column positions
for numeric browser assertions. A dedicated disposable PostgreSQL container
supports actual full-stack validation without resetting the application database.

## Branch origin

Product Owner @bryanseah234 pre-created this branch on 5 October at b57537f.
The implementation began from current main ccb32b6; both histories are preserved.
The pre-creation record described To Do status; manual acceptance, final-head
checks and reviewed merge still govern completion.

## CI follow-up

PR #229 initial application CI failed only because tests/e2e/support.spec.ts
still expected mock Conflict state at the route now serving live availability.
Updated that compatibility regression and regenerated inventory. Full local
scaffold passes: 238 passed, 342 deliberate skips. New final-head CI must pass;
manual results are still pending. No E07-S02 code was imported.

## Latest main integration

Main 3f8de45 / #222 landed during implementation. Merged normally, resolved the
sole package.json conflict retaining both test sets, regenerated coverage.
289 combined backend tests and post-merge real authenticated desktop/mobile
availability acceptance pass; typecheck passes. Finish final merge push and CI.

## Review follow-up — 7 October

Merged main b41938d including #216, resolved all six conflicts preserving both
request and availability workflows, regenerated coverage. Added missing-item
API 404 test and frontend standing-maintenance/missing-location test. Focused
availability backend and frontend statement/branch coverage measures 100%.
Manual checklist remains pending; automated tests are not manual PASS records.
The first real-browser rerun failed in setup because the disposable database
was stopped; preserve its failed execution record and rerun after restarting it.
Next: final repository checks, commit/push, final-head CI and human manual review.
