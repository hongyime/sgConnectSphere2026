---
date: 2026-10-07T00:34:25+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: regression
test_case_version: '031026'
database: mocked
commit: ccb32b6
---

Command: `npx playwright test tests/e2e/equipmentAvailability.spec.ts --reporter=list`. Timestamp captured immediately after command
completion. Run on the uncommitted reviewer follow-up working tree based on HEAD
ccb32b6; the commit field is not a claim the working tree was already committed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | SCRUM-53 equipment availability regression | PASS | Observed exit code 0; scope and command above. |

Final output:

```text
(node:15609) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:15608) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  2 [desktop] › tests/e2e/equipmentAvailability.spec.ts:38:1 › TC_E07S03_01 reserved and damaged quantities show five free units with responsive shared layout (540ms)
  ✓  1 [mobile] › tests/e2e/equipmentAvailability.spec.ts:38:1 › TC_E07S03_01 reserved and damaged quantities show five free units with responsive shared layout (560ms)
  ✓  3 [desktop] › tests/e2e/equipmentAvailability.spec.ts:50:1 › TC_E07S03_02 equipment at another venue remains available without transit allowance (481ms)
  ✓  4 [mobile] › tests/e2e/equipmentAvailability.spec.ts:50:1 › TC_E07S03_02 equipment at another venue remains available without transit allowance (512ms)
  ✓  5 [desktop] › tests/e2e/equipmentAvailability.spec.ts:57:1 › TC_E07S03_03 adjacent time windows can each show the full free quantity (509ms)
  ✓  6 [mobile] › tests/e2e/equipmentAvailability.spec.ts:57:1 › TC_E07S03_03 adjacent time windows can each show the full free quantity (630ms)

  6 passed (2.6s)
```
