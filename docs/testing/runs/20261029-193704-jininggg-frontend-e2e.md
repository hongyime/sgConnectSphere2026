---
date: 2026-10-29T19:37:04+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: regression
test_case_version: 281026
database: real
commit: 901d69b
---

Real browser sessions, local API and disposable native loopback PostgreSQL, on the recorded main base plus this integration-test working diff. No browser API routes are intercepted. The code is in tests/auth-e2e/changeRequests.spec.ts; it is automatically selected by the existing authenticated browser suite in CI. These are automated outcomes, not human T-93 acceptance.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S01_03 | Initial environment attempt | FAIL | Previous disposable database was stopped: ECONNREFUSED during beforeAll; one setup failure, three tests did not run. No application assertions executed. Started a fresh disposable native instance; no reset or Supabase writes. |
| MULTIPLE | First fresh desktop attempt | FAIL | Two passed and two failed: repeated fixture organisation name violated client_organisations_name_key before those tests could exercise application behavior. Fixed synthetic fixture names to be unique; no product behavior changed. |
| TC_E10S01_03 | Readonly field/current value and concurrent approval refusal | PASS | Final desktop/mobile run: each viewport followed the real readonly link, then separately received real PATCH 409 after fixture concurrent approval. Proposed attendance 75 and current attendance 40 were retained; no request was inserted by opening the form. |
| TC_E10S01_01 TC_E10S01_02 | Explicit submission and persisted comparison | PASS | Real submitted request stores Pending fields/before snapshots, reload shows requested value, Event attendance stays 40 and Coordinator notice is persisted. |
| TC_E10S01_04 TC_E10S01_05 | Safe apply, decline and dependency guard | PASS | Real UI name approval updates publication and records Applied; purpose decline preserves original purpose and produces distinct notices. Separate arrangement approval stays Approved/unapplied; explicit API apply returns 409. Guard-only result is not a full arrangement-apply TC_04 PASS. |
| TC_E10S01_06 TC_E10S01_07 | Terminal workflows and Obsolete UI | PASS | Real authenticated completion/cancellation API transitions produce Obsolete requests and one Pending-to-Obsolete history entry with actor; both browser roles lose decision/submission controls and attempted approval returns 409. Terminal actions use real API calls, not human button clicks. |

Command: node --env-file=<temporary test env> node_modules/@playwright/test/cli.js test --config=playwright.auth.config.ts tests/auth-e2e/changeRequests.spec.ts. Final result: **12 passed**, zero failures/skips, desktop and mobile. Provider delivery/mailbox receipt not tested. No formal human screenshots created or substituted.
