---
date: 2026-10-07T00:34:26+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: regression
test_case_version: '031026'
database: real
commit: ccb32b6
---

Command: `npx playwright test --config playwright.auth.config.ts equipmentAvailability.spec.ts`. Timestamp captured immediately after command
completion. Run on the uncommitted reviewer follow-up working tree based on HEAD
ccb32b6; the commit field is not a claim the working tree was already committed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | SCRUM-53 equipment availability regression | PASS | Observed exit code 0; scope and command above. |

Final output:

```text
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 2 tests using 1 worker

(node:15556) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 [desktop] › tests/auth-e2e/equipmentAvailability.spec.ts:46:1 › TC_E07S03_01 TC_E07S03_02 TC_E07S03_03 real login/API/PostgreSQL availability and role protection (1.7s)
(node:15612) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  2 [mobile] › tests/auth-e2e/equipmentAvailability.spec.ts:46:1 › TC_E07S03_01 TC_E07S03_02 TC_E07S03_03 real login/API/PostgreSQL availability and role protection (1.9s)

  2 passed (5.8s)
```
