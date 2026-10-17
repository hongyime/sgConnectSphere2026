# E05-S05 VenueForm buffer controls

Implement SCRUM-44 / E05-S05 Venue Staff setup and turnaround minute controls in
the supported venue create/edit form, persist them through the existing venue
API, show them on venue inventory details, and cover form validation and the
save/display flow without changing backend persistence or scope history.

## Starting point and scope

- Started from current branch `docs/po-review-corrections-20261016` at
  `d80e164`; task branch is `feature/SCRUM-44-venueform-buffer-controls`.
- Read the E05-S05 recovery brief (READY), Sprint 3 closure classification
  (SCRUM-44 INCOMPLETE), canonical cases, repository workflow and current branch
  handoff before editing.
- Backend already returns and persists `setup_time_minutes` and
  `turnaround_time_minutes`; SQL buffer behavior is unchanged. No backend or
  migration files are in scope. PR #231's branch is untouched.
- Existing untracked review/planning artifacts and local tool directories were
  present at start and are preserved.

## Implementation

- Add typed buffer fields to the venue API model and venue form state, default
  new venues to zero, and populate edits from the existing API response.
- Validate nonnegative whole minutes up to PostgreSQL's integer maximum before
  submit; send both values as numbers on create and update.
- Display both values on the Venue Staff inventory detail card, including
  zero-valued venues.
- Add frontend tests for default and boundary values, create/edit payloads,
  rejection of invalid input, and saved detail display.

## Verification and delivery

- Focused frontend tests/typecheck and loopback PostgreSQL integration results
  will be recorded after final code is committed.
- Do not use the `.env` `DATABASE_URL`: it points at shared Supabase. At task
  start `TEST_DATABASE_URL` was unset and `127.0.0.1:5432` refused connections;
  run no database suite unless a loopback disposable target is configured.
- Manual T-65 acceptance for TC_E05S05_01–07 remains separate and requires the
  human Venue Staff/Coordinator flows and hand-taken T-93 screenshots.
- After implementation and tests pass, push/open a review PR and link it from
  SCRUM-44 as authorized by Bryan's update. Do not merge the PR. Leave Sprint
  assignment, estimates, dates and acceptance criteria unchanged; do not merge
  #298 or modify Jira beyond linking this PR.
