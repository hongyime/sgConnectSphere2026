---
date: 2026-11-05T01:31:50+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: automated
test_case_version: "051126"
database: real
commit: 0d1609d
---

Focused E11-S01 / SCRUM-227 verification on main 0d1609d plus this task's
uncommitted test/documentation diff, not a clean final publication commit.
Persistence tests use fresh disposable native loopback PostgreSQL and random
schemas; provider/queue outcomes are intercepted or controlled. No production
writes, live email sends or human mailbox observations.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E11S01_02 / TC_E11S01_03 / TC_E11S01_06 / TC_E11S01_07 / TC_E11S01_08 / TC_E11S01_09 / TC_E11S01_10 / TC_E11S01_11 / TC_E11S01_14 | Existing routing, real flows, inbox and controlled provider baseline | PASS | Initial unchanged focused selection: 48 tests, zero failures/skips. Actual PostgreSQL persistence for recipient/current E09-E10 flows/inbox/outbox; controlled provider transport. Not full application regression or human acceptance. |
| TC_E11S01_08 | Actual booking approval survives explicit or uncertain email failure | PASS | Selection after adding two real-booking cases: 50 tests, zero failures/skips. Actual decideBooking confirms a Pending booking and creates the Coordinator inbox/delivery. Controlled provider_rejected records failed/failed; provider_outcome_unknown records failed/uncertain. Both preserve Confirmed booking, inbox notice, HTML and sanitized reason; repeated dispatch invokes sender once. Existing HTTP-adapter tests separately validate 400/401 rejection, 503/network ambiguity and 429 retry classification. |
| TC_E11S01_08 | Final static TC_ID title verification | PASS | After making both test titles explicit/discoverable, targeted file run selected both new cases: two passed, zero failures/skips. No production implementation changed. |
| MULTIPLE | Backend types and generated derivatives | PASS | npm.cmd run typecheck --workspace backend passed. Repository exporter generated CAA 051126 from Markdown; alias is byte-identical. Read-only openpyxl verified revised TC_08 appears once, refers to Scenario 4, includes uncertain dispatch state and omits unreachable-SMTP instructions. Inventory regenerated: 326/386 automated including the real-database TC_08 link. git diff --check passed. |

Commands:

```text
node --import tsx --test --test-concurrency=1 tests/notifications/providers.test.ts tests/notifications/postgres.test.ts backend/tests/notificationInbox.integration.test.ts backend/tests/e11CurrentFlows.integration.test.ts backend/tests/eventNotifications.integration.test.ts
node --import tsx --test --test-name-pattern=TC_E11S01_08 backend/tests/notificationInbox.integration.test.ts
npm.cmd run typecheck --workspace backend
.venv-tools/Scripts/python.exe scripts/export_testcases_xlsx.py --date 051126
.venv-tools/Scripts/python.exe scripts/tc_coverage_audit.py
```

TEST_DATABASE_URL was supplied only to the explicitly guarded loopback runtime;
no application .env or production connection was loaded. Existing helpers own
schema cleanup. No coverage claim for every owning workflow or real registered
email delivery. TC_05, production roster verification and PO acceptance remain.
