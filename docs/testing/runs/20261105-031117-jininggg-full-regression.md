---
date: 2026-11-05T03:11:17+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: "051126"
database: real
commit: f1fa2ba
---

Publication verification of f1fa2ba plus the in-progress merge from main
04b5b60c (#429), resolved generated catalogue files and this task's working
notes. This is the observed combined tree before the merge commit, not a
claim that these commands ran on a clean later publication hash.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E11S01_02 / TC_E11S01_03 / TC_E11S01_06 / TC_E11S01_07 / TC_E11S01_08 / TC_E11S01_09 / TC_E11S01_10 / TC_E11S01_11 / TC_E11S01_14 | Combined-main notification regression slice | PASS | 50 tests passed, zero failures/skips. Providers, durable dispatcher/PostgreSQL, inbox, actual booking failure cases, E09/E10 current flows and recipient integration. Real disposable loopback PostgreSQL with controlled/intercepted external provider/transport. No live email or production writes. |
| MULTIPLE | Backend typecheck | PASS | npm.cmd run typecheck --workspace backend passed on the combined tree. No full application suite/build claimed. |
| MULTIPLE | Repository, documentation and generated catalogue | PASS | python scripts/check.py passed after conflict resolutions; python scripts/doc_guard.py reported zero errors/157 front-matter warnings; whitespace passed. Repository exporter rebuilt CAA 051126 and canonical alias from combined E08 and E11 Markdown; coverage inventory regenerated. CAA 041126 from main retained unchanged. |

Commands:

```text
node --import tsx --test --test-concurrency=1 tests/notifications/providers.test.ts tests/notifications/postgres.test.ts backend/tests/notificationInbox.integration.test.ts backend/tests/e11CurrentFlows.integration.test.ts backend/tests/eventNotifications.integration.test.ts
npm.cmd run typecheck --workspace backend
.venv-tools/Scripts/python.exe scripts/export_testcases_xlsx.py --date 051126
.venv-tools/Scripts/python.exe scripts/tc_coverage_audit.py
python scripts/check.py
python scripts/doc_guard.py
git diff --check
```

TEST_DATABASE_URL selected only the fresh loopback synthetic database guarded
by the existing test harnesses. No application .env, shared database, real
provider credentials or mailbox was used. Production roster load, actual
mailbox receipt and final acceptance remain outside this run.
