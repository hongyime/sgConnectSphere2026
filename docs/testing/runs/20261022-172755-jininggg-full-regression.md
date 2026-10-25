---
date: 2026-10-22T17:27:55+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 161026
database: real
commit: 56d7117
---

SCRUM-202 / E10-S01 backend increment. Runtime was origin/main `56d7117` plus
the uncommitted implementation on `feature/SCRUM-202-change-requests`; that SHA
alone does not contain the feature. GitHub login was confirmed as jininggg in
this session. No human browser run, email receipt, production write or story
completion is claimed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S01_01 | Submit and authenticated dispatch | PASS | Final focused run: 3 unit/unauthenticated-handler tests and 11 real PostgreSQL service tests, 14 passed, zero skips. Rejects malformed/unknown fields, empty/no-op changes, dates without timezone, reversed period, missing Coordinator, foreign owner and inactive actor. Pending request and targeted notice/outbox commit atomically; injected submit-outbox failure leaves neither request nor audit. |
| TC_E10S01_02 | Current details alongside request | PASS | Private service read returns current Event values and pending requested/before fields. Pending request leaves Event/publication unchanged. This is API/service evidence, not the unbuilt SCRUM-203 UI. |
| TC_E10S01_04 | Safe apply, stale/terminal guard, locking and rollback | PASS | Safe title/purpose application and field history, existing publication-name update, changed-field stale rejection, unrelated-field tolerance, one winner under competing decisions, prompt account-lock conflict, and rollback of Event/request/audits on outbox failure. Arrangement request stays Approved, explicit apply refuses, and original Event values remain. Full arrangement-affecting Scenario 4 is not complete without E10-S02. |
| TC_E10S01_05 | Decline without Event mutation | PASS | Request becomes Declined with reason, requester notice/outbox; Event details remain unchanged. Cancellation action discriminator is excluded from reads/decisions. |
| N/A | Typechecks | PASS | Final `npm.cmd run typecheck`: frontend and backend passed. |
| N/A | Backend regression | PASS | `npm.cmd run test --workspace backend`: 420 tests passed before the final unauthenticated-dispatch test and denial-audit addition. The final 14-test focused run covers those additions; 420 is not relabelled as a final full-suite run. |

Final focused command (temporary environment file path omitted):

```text
node --env-file=<temporary-loopback-test-env> node_modules/c8/bin/c8.js --include=backend/src/modules/changeManagement/requests.ts --reporter=text node --import tsx --test backend/tests/changeRequests.test.ts backend/tests/changeRequests.integration.test.ts
```

Uses the existing native loopback PostgreSQL server on port 55422, disposable
test database, fresh random schema per case and all current migrations through
the guarded loginDatabase helper. Initial database attempt failed before
assertions with ECONNREFUSED because the previous local process was stopped;
restarting that server succeeded. Initial sandbox test-process creation also
failed with spawn EPERM; permission was obtained to run outside the sandbox.
No reset/general seed/shared Supabase operation was performed.

## Coverage and limits

Combined unit plus real-database coverage of requests.ts: 99.56% statements /
lines, 100% functions, 99.29% branches. The uncovered defensive branch rethrows
an unexpected database error while acquiring the account lock (line 98).
This is explicitly not 100% unit-only service coverage: real transactions,
locks, SQL constraints, outbox atomicity and concurrency need actual PostgreSQL;
stubbed successful SQL calls would not prove those properties. Unit tests cover
input validation and unauthenticated HTTP dispatch. Authenticated HTTP/browser
acceptance, existing terminal workflow integration, structured Session/layout/
registration fields and E10-S02 preview/apply remain outside this increment.

No current execution of TC_E10S01_03/_06/_07 is claimed here. SCRUM-204 manual
evidence and peer review remain required. No prior immutable record was edited.
