# Narrow Booking Decision Recovery Follow-Up

Publish only the reproduced task-12 decision-authority and buffered-window fixes
as a draft follow-up to #298 / SCRUM-48 / E06-S04, without publishing the combined
main+#299+#298 verification tree or clearing story acceptance holds.

## Source And Scope

- Exact owner base: #298 `7d674fe80c219f9ecbde93bb09874ccf91d98d12`, branch
  `feature/SCRUM-48-decide-venue-request`; shared branch remains untouched.
- Extracted only `decisions.ts` and its existing unit/integration test changes
  from the task-12 own-fix patch. Both failing-before unit cases reproduced on
  this exact base: stale staff authority was accepted and buffered window absent.
- Task-12's `bookingRecovery.integration.test.ts` imports #299's withdrawal module,
  absent from #298. Its default/actual-CI script union also names that missing
  cross-owner integration module. Preserve those patches pending owner integration;
  do not publish missing imports, skip them green or copy another owner's modules.
- The narrow portable CI selection adds only #298's existing decision integration
  module to its current two-file booking command. The default DB list already has
  it exactly once. This does not port task-12's blocked five-module union.
- The primary ActivityLog formatter resolution applies only to the combined
  #299/#298 tree; its separate publication requires owner composition/review.
- Source authority: `docs/source-of-truth.md`, `docs/contracts/venue-bookings.md`
  and 6 October instructor guidance. No new product requirement or migration.

## Verification And Gates

Fresh final-base tests, builds, coverage, generators and repository checks are
recorded in the new task-19C session, not relabelled inherited runs. LSP remains
unavailable with installation previously declined. Existing oversized decision
module retained under explicit narrow-publication/no-refactor scope.

Landing: this owned branch -> #298 feature branch -> main after owner conflict
resolution, independent human code/test review and required main checks. A clean
intermediate base isn't main readiness. #298's confirmed-cancellation TC_E06S04_07,
human T-93/PO hold and separate authorized public 0022 verification remain.
Current-main E10-S01=8 is not overwritten by this old owner-base patch. No shared
branch push, remote merge, Jira transition, production/test-schema write, reset,
seed or provider operation is authorized.

## Observed Publication Verification

New immutable session: `docs/testing/runs/20261021-225225-bryanseah234-full-regression.md`.
Red unit run: 28 passed/2 failed; final 30 unit and 22 real-PG decision cases pass.
Actual CI booking command passes 33, zero skips; default selection checked without
running its broad suite. Both typechecks/builds pass; first missing frontend link
failure is disclosed. decisions.ts unit coverage all100%; 158 tooling tests and
explicit hooks pass. Regenerated inventory 195/375, not acceptance. Actual newest
workbook enumerated 161026; full dirty-tree fingerprints are in the session.
No original worker record is reused as a new observation. Only record/handoff
metadata follows tested code. Owned PG stopped/removed; no app/provider stack.
