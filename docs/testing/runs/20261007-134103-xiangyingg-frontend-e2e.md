---
date: 2026-10-07T13:41:03+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: regression
test_case_version: '031026'
database: real
commit: 0691e79
---

Command: `npx playwright test --config playwright.auth.config.ts equipmentAvailability.spec.ts`. Timestamp captured immediately after command
completion. Run on the uncommitted reviewer follow-up working tree based on HEAD
0691e79; the commit field is not a claim the working tree was already committed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | SCRUM-53 equipment availability regression | PASS | Observed exit code 0; scope and command above. |

Final output:

```text
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 2 tests using 1 worker

(node:46695) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 [desktop] › tests/auth-e2e/equipmentAvailability.spec.ts:46:1 › TC_E07S03_01 TC_E07S03_02 TC_E07S03_03 real login/API/PostgreSQL availability and role protection (1.8s)
(node:46720) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  2 [mobile] › tests/auth-e2e/equipmentAvailability.spec.ts:46:1 › TC_E07S03_01 TC_E07S03_02 TC_E07S03_03 real login/API/PostgreSQL availability and role protection (1.8s)

  2 passed (5.9s)
```
