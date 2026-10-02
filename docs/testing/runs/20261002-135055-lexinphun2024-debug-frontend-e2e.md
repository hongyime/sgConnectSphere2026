---
date: 2026-10-02T13:50:55+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: "011026"
commit: 397e499
pr: 175
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E03S07_01 | Organiser edits any field before approval | PASS | `npx playwright test tests/e2e/e03.spec.ts`: 32 passed, 24 skipped (`test.fixme`), 0 failed, desktop and mobile. Run on 397e499 with the uncommitted review fixes for #175 applied. |
| TC_E03S07_03 | Organiser edits unrestricted fields after approval | PASS | Same run. |
| TC_E03S07_04 | Restricted post-approval edit directs to the change request page | PASS | Same run. The test now follows "Request a change" and checks it lands on the E10-S01 Coming soon page. |
| TC_E03S07_05 | Unassigned Coordinator refused when editing | PASS | Same run. |
| TC_E03S07_06 | Organiser post-approval edit recorded in activity log | PASS | Same run; the activity log comes from the mock harness. |
