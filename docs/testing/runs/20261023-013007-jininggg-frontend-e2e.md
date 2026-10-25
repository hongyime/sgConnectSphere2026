---
date: 2026-10-23T01:30:07+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: regression
test_case_version: 171026
database: mocked
commit: 195375f
pr: 341
---

At 195375f plus uncommitted TC_E03S07_04 fixture/assertion fix.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E03S07_04 | Restricted edit links to the real form | PASS | npx.cmd playwright test tests/e2e/e03.spec.ts --grep TC_E03S07_04:2/2 desktop/mobile. Preserves readonly/link/URL checks; asserts real page heading, editable description and send button. GET fixture validates method/Event id and supplies current API contract instead of detail-only payload. |
| TC_E03S07_01 | Preapproval edit regression | PASS | Broader npx.cmd playwright test tests/e2e/e03.spec.ts --grep E03-S07:12 passed,2 existing skipped, desktop/mobile. |
| TC_E03S07_03 | Unrestricted postapproval edit | PASS | Same broader group. |
| TC_E03S07_05 | Unassigned Coordinator refused | PASS | Same broader group. |
| TC_E03S07_06 | Edit recorded in history | PASS | Same broader group, intercepted API not real persistence. |
| TC_E03S07_02 | Complete Coordinator edit/activity read case | SKIP | Existing fixme retained on both viewports; partial Scenario2 steps1-4 passed separately. No skip removed or introduced. |
| N/A | Types and inventory | PASS | npm.cmd run typecheck:both workspaces. python scripts/tc_coverage_audit.py:206/376 unchanged. No product source/workflow timeout changes. |

Real browser against intercepted synthetic API. Not human/manual acceptance,
real database, automatic refused-field prefilling (SCRUM-205) or email receipt.
The original failing CI run is not relabelled as passing; this local regression
fixes its two obsolete Coming-soon expectations on the real form route.
