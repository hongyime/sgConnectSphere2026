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

Finish repository checks, commit, push and open a reviewable PR with a postplan.
Manual human checklist, final-head CI, skeleton review and reviewed merge remain
required before Jira Done. E07-S04/E07-S05 own writers and are not closed by this reader.

## Learnings

Deduct peak simultaneous reservations plus dated withdrawals, not every row
intersecting a long period. Location and venue buffers never affect equipment.
Mobile shared table includes column labels in cell names: use column positions
for numeric browser assertions. A dedicated disposable PostgreSQL container
supports actual full-stack validation without resetting the application database.
