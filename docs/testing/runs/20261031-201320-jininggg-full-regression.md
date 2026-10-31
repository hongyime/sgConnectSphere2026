---
date: 2026-10-31T20:13:20+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 311026
database: real
commit: 44d0826
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S01_04 | Applied changes interrupt Safety Review only for affected arrangements | PASS | Real PostgreSQL request suite covers affected apply, safe-only and structured no-impact retention, preview with no status effects and final outbox failure rolling back the transition together with request values, flags and audits. |
| TC_E10S01_04 / TC_E08S04_05 | Reconfirmation of an interrupted first Safety Review requests a fresh SO check | PASS | Two flagged Confirmed bookings are retained. First reconfirmation leaves Planning and zero fresh SO review notices; last reconfirmation enters Safety Review and writes exactly one fresh SO review notice. Event status audit is Safety Review -> Planning -> Safety Review without fabricated Confirmed history. |
| TC_E08S04_05 | Shared automatic Safety Review regression | PASS | Existing real-database suite retains prior approval history, requires a new Safety Officer approval, waits for required arrangements and verifies notification rollback. Three-suite focused run: 39 passed, zero failures. |
| TC_E10S01_01 / TC_E10S01_04 | Backend unit regression | PASS | `npm.cmd test --workspace backend`: 656 passed, one existing skip, zero failures. These are unit tests; the lifecycle persistence evidence is the real-database suite above. |

Tested tree is main HEAD `44d0826` plus this branch's working diff; this is not a clean final-commit run. Disposable native loopback PostgreSQL only, with random per-test schemas; no shared Supabase or production writes. Automated execution, not a human manual run or provider delivery proof.

Commands: `node --import tsx --test backend/tests/changeRequests.integration.test.ts backend/tests/autoSafetyReview.integration.test.ts backend/tests/autoSafetyReview.test.ts`; `npm.cmd test --workspace backend`; `npm.cmd run typecheck --workspace backend` (PASS); `python scripts/doc_guard.py` (zero errors, 155 existing warnings); `python scripts/tc_coverage_audit.py`; repository generator `scripts/export_testcases_xlsx.py --date 311026` and alias synchronized. Whitespace check passed.

Coverage from the three focused suites: autoSafetyReview.ts 100% statements/branches/functions/lines. requests.ts 97.23% statements/lines, 90.59% branches and 100% functions; uncovered lines are existing parser/validation branches outside this change. New lifecycle condition is exercised for affected, no-impact and non-Safety Review applies, and its rollback uses a deliberately failed final application notice. This combines unit and real-database coverage; it is not a claim of unit-only 100% coverage for the service.
