---
date: 2026-10-31T17:46:00+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 301026
database: real
commit: 4da52a4
---

E11-S01 / SCRUM-75 / SCRUM-227 current E09/E10 notification audit and public-name
fix. Source is 4da52a4 plus this working diff, not a clean-base run. No production
roster access, shared Supabase writes, live provider send or human manual PASS.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E11S01_02 TC_E11S01_03 TC_E11S01_09 TC_E11S01_10 TC_E11S01_11 TC_E11S01_14 | Current E09/E10 flow and existing integration regression | PASS | 111 passed in combined backend unit/real-database slice. New nine real-service tests cover organiser approve/reject/manual add using public names, suppression without publication, real registered/waitlisted membership receiving applied E10 dates, withdrawn/unrelated/actor exclusion, single staff notice, eligible waiting-list release on withdrawal and outbox-failure rollback. Other named suites retain their stated scope, not all-case human acceptance. |
| TC_E11S01_14 | Backend units and changed-module coverage | PASS | `npm.cmd test --workspace backend`: 646 passed, one existing database-only skip, zero failed. c8 reports attendeeRegistration/organiser.ts 100% statements/branches/functions/lines. Includes all three public-name/missing-publication unit paths. This is changed-module coverage, not a whole-repo 100% claim. |
| TC_E11S01_08 TC_E11S01_09 | Controlled dispatcher/provider tests | PASS | 25 passed: actual local PostgreSQL outbox/leases plus intercepted or simulated provider/transport responses. Retry/uncertain/failure behaviours are controlled automated observations, not actual mailbox receipt or the exact human unreachable-provider booking sequence. |
| TC_E11S01_06 TC_E11S01_07 TC_E11S01_08 | Inbox and simulated provider rejection | PASS | 16 unit/real-PostgreSQL tests passed. Recipient ownership, ordering, persistent idempotent read state and provider rejection preserving the inbox. No new UI screenshots claimed. |
| MULTIPLE | Types/build/repository | PASS | Both workspace typechecks/builds completed; existing Vite import warnings remain. check.py hygiene/186 tooling tests passed. doc_guard.py zero errors/156 existing front-matter warnings; inventory regenerated; staged whitespace passed. |

Combined backend command: Node with disposable loopback test environment,
`--import tsx --test`, naming `backend/tests/e11CurrentFlows.integration.test.ts`,
`attendeeCapacity.test.ts`, `attendeeCapacity.integration.test.ts`,
`attendeeRegistration.integration.test.ts`, `eventNotifications.test.ts`,
`eventNotifications.integration.test.ts`, `changeRequests.integration.test.ts`,
`eventCancellation.integration.test.ts`, `lostVenueRecovery.integration.test.ts`,
`bookingPrimary.integration.test.ts`, `eventCompletion.integration.test.ts`,
`eventReadiness.integration.test.ts`, `eventReversion.test.ts` (all under backend/tests).
Dispatcher: Node with the same local test environment, `--import tsx --test
"tests/notifications/*.test.ts"`. Inbox: same Node invocation naming
`backend/tests/notificationInbox.test.ts` and `notificationInbox.integration.test.ts`.
Other commands: `npm.cmd test --workspace backend`, `npm.cmd run typecheck`,
`npm.cmd run build`, `python scripts/check.py`, `python scripts/doc_guard.py`,
virtual-environment Python `scripts/tc_coverage_audit.py`, `git diff --cached --check`.

Development reproduction: the first five-test audit had four failures and one
pass. Three exposed private planning titles in the actual organiser notification
writes; the fourth was a test expectation missing the comma separator's space.
The privacy fix and corrected assertion precede the final 111-pass run. These
failures were observed on the pre-fix working diff and are not hidden as passes.

The acceptance/evidence matrix is `docs/testing/e11-s01-evidence-audit-20261031.md`.
TC_E11S01_05 actual-mailbox delivery, SCRUM-195 production roster provisioning/
verification, outstanding genuine human observations and explicit PO/delegate
acceptance remain separate. No historical human session was edited or rerun only
to replace its provenance. Existing pg concurrent-query deprecation warnings are
not represented as failed assertions or silently fixed by this audit.
