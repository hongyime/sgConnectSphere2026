# Narrow Booking Activity Reference Follow-Up

Publish the portable task-14 booking-only Activity-log reference fix on #298 /
SCRUM-48 / E06-S04. This isn't cancellation implementation or TC07 acceptance.
Preserve #320's source/authorship and the full combined verification tree locally.

## Source And Scope

- Exact owner base: #298 `7d674fe80c219f9ecbde93bb09874ccf91d98d12`, branch
  `feature/SCRUM-48-decide-venue-request`; no shared branch update.
- Portable task-14 own-fix hunks only: booking-only SQL `booking_id`, event-only
  NULL expectation, renderer reference and two component regressions. Added one
  positive booking-ID assertion to the existing real-PG approval/audit case to
  verify the portable SQL projection on this exact owner base.
- Failing-before component case reproduced: same-venue releases with identical
  actor/time lacked their booking references. Event/hold reference refusal passed.
- #320 `0806898e41525bc1b54d6390ad0b9eb8d45e3637` lacks #298's booking-activity
  projection/renderer and decision module. Its task-14 recovery/race/auth harness
  imports that module and requires #299/#298 composition. Preserve exact patches
  pending owner coordination; don't transplant #298 implementation into #320.
- Guarded auth config, cancellation fixture/recovery/races and real-auth TC07
  harness remain preserved but unpublished, not skipped tests counted as green.
- Source authority: `docs/source-of-truth.md`, shared venue contract and instructor
  guidance. No canonical case/result, booking guard, cancellation rule or schema
  changed. Existing #298 event/actor privacy and role boundaries stay intact.

## Verification And Gates

Fresh final-base component/real-PG tests, typechecks/builds, generator and repository
results belong to a new immutable task-19C session. Historical combined task-14
proof remains dated automated evidence only. LSP unavailable; no installation.

Landing: this branch -> #298 feature branch -> main after independent owner review,
conflict resolution and required main checks. Separately #320 -> main requires
authorized/verified public 0022 before dependent release. TC_E06S04_07 stays E06-S04:
confirmed E10-S04 cancellation must yield Booking Released with booking/event/actor/
time and valid human T-93/PO acceptance. Synthetic component release rows aren't
that cancellation run. No hold waived, shared branch pushed, remote merge, Jira
mutation, shared DB write, reset/seed/provider operation or manual screenshot claim.

## Observed Publication Verification

New immutable session: `docs/testing/runs/20261021-224524-bryanseah234-full-regression.md`.
Red reference case reproduced; final 27 real-PG and13 component tests pass with
zero skips. ActivityLog coverage all100%; both workspace typechecks/builds and158
tooling tests pass. Existing generator gives196/375 title-linked inventory only.
Actual newest workbook enumerated161026; full dirty-tree fingerprints are recorded.
Real Chrome module QA passed four viewport/media combinations with distinct
references, venue/actor/time and legacy-ID refusal; zero page errors. Launcher
path/interop failures are disclosed, not product edits. No actual cancellation,
authenticated workflow or human evidence claimed. Owned PG, Chrome and Vite stopped.
