---
date: 2026-11-05T14:26:33+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: "051126"
database: real
commit: 3efa11f
pr: 430
---

Review correction on 3efa11fe plus the working HTTP-boundary tests and readiness
map. No production implementation changed; no live provider request occurred.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E11S01_08 | Real booking approval through Brevo HTTP classification and durable PostgreSQL | PASS | Five cases: 400/401 rejection, 503 and thrown/lost response uncertainty, 429 delayed retry exhausted after five attempts. Repeated dispatch never resends terminal/uncertain outcomes. Confirmed booking, inbox and prepared content persist. Fetch intercepted; synthetic config restored in finally. |
| MULTIPLE | Focused notification regression | PASS | 53 passed, zero failures/skips. Real disposable native loopback PostgreSQL; controlled provider/queue. Final rerun includes payload assertions outside the adapter catch boundary. |
| MULTIPLE | Backend typecheck | PASS | npm.cmd run typecheck --workspace backend. Test-only change; production-code coverage unchanged. |

Commands:

```text
node --import tsx --test --test-concurrency=1 tests/notifications/providers.test.ts tests/notifications/postgres.test.ts backend/tests/notificationInbox.integration.test.ts backend/tests/e11CurrentFlows.integration.test.ts backend/tests/eventNotifications.integration.test.ts
npm.cmd run typecheck --workspace backend
.venv-tools/Scripts/python.exe scripts/tc_coverage_audit.py
```

The generated inventory was refreshed after changing static test declarations.
No mailbox receipt, production roster load, full application build or human
manual acceptance is claimed. Earlier records remain immutable.
