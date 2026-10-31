---
date: 2026-10-30T01:37:15+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 281026
database: real
commit: eab9f89
---

E10-S01 / SCRUM-70, SCRUM-202/203/204; shared E10-S02 integration after #376.
Source was base `eab9f89` plus the implementation/test working diff on
`feature/e10-change-request-apply`, not clean base execution. The runner identity
was read from GitHub's authenticated user endpoint. Database tests used a fresh
native loopback PostgreSQL instance and a separate migrated schema per test;
no Supabase, production data, live email provider or human manual run.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S01_04 | Supported arrangement requests preview and apply through the shared transaction | PASS | New real-PostgreSQL tests verify rolled-back preview, explicit token, changed-capacity refusal and fresh preview, flags, atomic outbox rollback, publication dates, one venue-staff notice and one Organiser decision, older Approved requests, late-close confirmation, and Safety Review request context without widening ordinary direct edits. |
| MULTIPLE | Combined backend unit/database slice with coverage | PASS | 53 passed, zero failed/skipped: changeRequests.test.ts, changeRequests.integration.test.ts, arrangementImpact.integration.test.ts, eventNotifications.integration.test.ts and registrationPeriod.integration.test.ts. SQL Session/layout preconditions in the pre-existing E10-S02 suite remain SQL-based, not proof of a Session-edit app route. |
| MULTIPLE | Backend unit regression | PASS | `npm.cmd test --workspace backend`: 611 passed, zero failed; one existing repositoryContract database-only test skipped without its database flag. Mocked unit evidence, separate from the real-database slice above. |
| MULTIPLE | Frontend unit/component regression | PASS | `npm.cmd test --workspace frontend -- --maxWorkers=2`: 680 passed across 65 files. Stubbed API data. Focused ChangeRequests.test.tsx run: 24 passed, including impact/warning display, Cancel without a decision, older Approved apply/token/consent, preview refusal and unsupported mixed requests. |
| MULTIPLE | Types and build | PASS | `npm.cmd run typecheck` and `npm.cmd run build` passed for frontend/backend. Existing Vite chunk advisories were emitted; no build failure. |
| MULTIPLE | Repository and generated inventory | PASS | `python scripts/check.py` passed repository hygiene/tooling. `.venv-tools/Scripts/python.exe scripts/tc_coverage_audit.py` regenerated the inventory (281 active/379). `git diff --check` passed. Tooling-test output includes synthetic Jira fixtures; no real Jira mutation occurred. |

## Commands and coverage

Database command: `node --env-file=<temporary local test env> node_modules/c8/bin/c8.js --include=backend/src/modules/changeManagement/requests.ts --include=backend/src/modules/eventNotifications/informationChange.ts --reporter=text node --import tsx --test backend/tests/changeRequests.test.ts backend/tests/changeRequests.integration.test.ts backend/tests/arrangementImpact.integration.test.ts backend/tests/eventNotifications.integration.test.ts backend/tests/registrationPeriod.integration.test.ts`.

Combined scoped backend coverage: 99.74% statements/lines, 98.4% branches,
100% functions. requests.ts: 99.69% lines, 98.71% branches; informationChange.ts:
100% lines, 94.44% branches. SQL orchestration is covered using real PostgreSQL,
not claimed as 100% mocked unit coverage. The existing unexpected account-lock
error rethrow and defensive/default branches remain gaps for human review.

UI coverage command: `npm.cmd test --workspace frontend -- --run src/features/events/ChangeRequests.test.tsx --maxWorkers=2 --coverage --coverage.include=src/features/events/ChangeRequests.tsx --coverage.include=src/features/events/changeRequestsApi.ts`.
24 passed; combined 98.7% lines, 96.82% statements, 92.17% branches,
98.59% functions. Not 100% changed-file coverage: native-input/disabled-control,
unmount timing and defensive branches require reviewer consideration. No DoD
coverage exception is self-approved by this record.

Earlier development attempts: sandbox worker spawning failed with EPERM before
assertions and was retried outside the sandbox. Two old UI arrangement-waiting
wording assertions failed after the new preview behavior; tests were updated
to verify the actual preview. Initial expanded UI test-double argument handling
was corrected before its passing run. The initial database slice passed 36;
the expanded slice passed 48 before the final 53-test combined coverage run.

## Limits

No browser/API/PostgreSQL end-to-end run or hand-taken screenshot is claimed for
this new implementation. Open #375 remains independent evidence/review work;
its old supported-arrangement waiting guard needs updating when combined.
Layout/accessibility IDs, registration enablement and null registration-window
boundaries remain Approved/unapplied until the shared path supports them.
Session editing, independent review, human acceptance and PO/delegate receipt
remain outstanding. No whole-story Done or external mailbox receipt claimed.
