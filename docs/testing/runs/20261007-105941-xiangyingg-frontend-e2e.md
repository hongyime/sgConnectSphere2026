---
date: 2026-10-07T10:59:41+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: regression
test_case_version: '031026'
database: real
commit: 83754ab
pr: 216
---

Command: `npx playwright test --config playwright.auth.config.ts equipmentRequests.spec.ts`. Timestamp captured at command completion.
Executed on the uncommitted coverage-review working tree merging latest main
into branch HEAD 83754ab; the commit field identifies HEAD, not the unstaged changes.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | SCRUM-52 coverage review regression | PASS | Observed exit code 0; command and coverage scope above. |

Final output:

```text
[WebServer] (node:36899) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 2 tests using 1 worker

(node:36900) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 [desktop] › tests/auth-e2e/equipmentRequests.spec.ts:16:1 › TC_E07S02_01 TC_E07S02_02 TC_E07S02_03 TC_E07S02_04 real login request, warning, independent events, amend/remove and staff notification (3.6s)
(node:36922) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  2 [mobile] › tests/auth-e2e/equipmentRequests.spec.ts:16:1 › TC_E07S02_01 TC_E07S02_02 TC_E07S02_03 TC_E07S02_04 real login request, warning, independent events, amend/remove and staff notification (3.4s)

  2 passed (9.0s)
```
