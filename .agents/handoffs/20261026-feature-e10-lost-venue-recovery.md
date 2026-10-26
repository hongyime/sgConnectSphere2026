Implement E10-S05 / SCRUM-74 lost-venue recovery in implementation-only PR #355, covering SCRUM-228 backend, SCRUM-229 frontend and automated tests in SCRUM-230. Dependency integration and human manual acceptance belong in a later PR, as Ji Ning requested. The parent story and acceptance work remain open.

## Current review fixes

Le Xin requested changes at review 5653949411 on head 23794b8b. Addressed:

1. Recovery creates its own Lost Venue Replaced audit and uses that ID for arrangement notices. The separate Booking Approved audit still delivers the Coordinator decision notice; coordinatorNotified is true. Primary transfer/publication refresh are auditable and transactional.
2. Rejected attempts keep their status and T-96 predecessor slot. Retrying a lost original extends its terminal Rejected attempt; staff suggestions continue that chain. Approval and original cancellation trace the same-Event chain. No index change or migration. UI follows descendants and restores search after rejection.
3. Replacement status uses an ASCII dash instead of a literal question mark.
4. Secondary-room recovery does not notify Attendees when publication is unchanged; internal notices still go out.
5. Imports grouped with external imports first; lostVenueRecovery.ts expanded into readable blocks.
6. Added early 401/403/400 unit guard tests. SQL orchestration coverage still uses real PostgreSQL; no 100% unit-coverage claim. Le Xin reviewed the stated exception.

## Verification in progress

Both typechecks passed. Backend unit suite: 500 passed. Exact eight-file CI booking acceptance suite: 74 passed, zero failures/skips. Includes direct Coordinator notice assertions, distinct audit IDs, rejected retry followed by suggested approval, retained history, secondary-room publication suppression, and rollback when the later approval-notice outbox insert fails. Final focused frontend regression: 42 tests passed in six files. Inventory regenerated. Fresh T-65 records:
- docs/testing/runs/20261026-231507-jininggg-backend-db.md
- docs/testing/runs/20261026-231507-jininggg-backend-unit.md
- docs/testing/runs/20261026-231507-jininggg-frontend-vitest.md
Repository hygiene and record checks passed; 163 tooling tests retain the known 3 failures and 11 errors in Windows worktree fixtures. Tooling record: docs/testing/runs/20261026-231625-jininggg-tooling.md. New-head CI remains pending.

The original CI fixture repair (2e7b5803) preserves pre-migration rows and the 0019 backfill assertion while applying all current migrations. Root staged review notes remain untouched.

## Still pending

E05-S06 application PRs #348/#349 own detection and Confirmed-to-Planning. Recovery tests start with a Conflicting fixture; they do not prove that trigger or the combined lift interaction. Ji Ning will integrate dependencies, fix any findings and run human TC_E10S05_01-04 with hand-taken screenshots in a separate follow-up PR. Product Owner or documented delegate acceptance is needed before story Done. Do not auto-close parent/subtasks from this implementation PR.

Jira estimate is restored to 3. Separate PR #356 proposes 5 with team/PO basis confirmation pending. Only reconcile Jira to 5 after that backlog PR merges. Earlier implementation records describe historical estimates and must not be rewritten.
