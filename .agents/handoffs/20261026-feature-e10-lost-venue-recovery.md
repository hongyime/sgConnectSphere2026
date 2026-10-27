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

E05-S06 backend PR #348 is now merged in main fe9c5484 and included by the 27 October conflict resolution; #349 frontend integration and the combined recovery/lift checks remain follow-up work. E05-S06 owns detection and Confirmed-to-Planning. Recovery tests start with a Conflicting fixture; they do not prove that trigger or the combined lift interaction. Ji Ning will integrate dependencies, fix any findings and run human TC_E10S05_01-04 with hand-taken screenshots in a separate follow-up PR. Product Owner or documented delegate acceptance is needed before story Done. Do not auto-close parent/subtasks from this implementation PR.

Estimate PR #356 merged as 9ff84453. Jira was subsequently reconciled from 3 to 5, recorded in PR #358. Earlier implementation records describe historical estimates and must not be rewritten.


## 27 October merge conflict resolution

Merged main fe9c5484 (E05-S06 backend #348) into recovery head 51224aed. Resolved backend/package.json by retaining both recovery and unavailability selectors; retained both formatSgt and confirmLostVenueReplacement imports; reader emits both conflict-detail alias conventions without duplicating timestamps; legacy fixture retains all ordered migrations and backfill assertions; regenerated the coverage inventory (246 automated / 378 cases).

Initial combined DB run exposed the legacy reader's concurrent extension-creation race. Reused ensureTestExtensions before BEGIN and reran on a fresh disposable database: 89 passed, zero failures/skips. Backend units 520 passed, venue UI 121 passed across 15 files, both typechecks passed. New immutable records:
- docs/testing/runs/20261027-001457-jininggg-backend-db.md
- docs/testing/runs/20261027-001457-jininggg-backend-unit.md
- docs/testing/runs/20261027-001457-jininggg-frontend-vitest.md

Repository hygiene/record checks passed; the same 3 failures and 11 errors remain in 163 Windows tooling tests. Record: docs/testing/runs/20261027-001555-jininggg-tooling.md. New-head CI pending. No full E05-S06-to-recovery or lift integration acceptance is claimed. Main's restoreFlagged checks direct active replacements; the rejected retry-chain/lift interaction specifically remains to verify in the planned integration follow-up. Preserve implementation-only scope and all earlier immutable evidence. Root staged notes untouched.
