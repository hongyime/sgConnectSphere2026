---
date: 2026-10-07T13:38:11+08:00
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
| MULTIPLE | SCRUM-53 equipment availability regression | FAIL | Observed exit code 1; scope and command above. |

Final output:

```text
        at createExtensionIfNotExists (<repository>/backend/tests/helpers/ensureTestExtensions.ts:18:5)
        at ensureTestExtensions (<repository>/backend/tests/helpers/ensureTestExtensions.ts:35:3)
        at loginDatabase (<repository>/backend/tests/helpers/loginDatabase.ts:16:3)
        at <repository>/tests/auth-e2e/equipmentAvailability.spec.ts:12:14

    Error Context: test-results/equipmentAvailability-TC-E-0f5d3-ability-and-role-protection-mobile/error-context.md

    Error Context: test-results/equipmentAvailability-TC-E-0f5d3-ability-and-role-protection-mobile/error-context.md

  2 failed
    [desktop] › tests/auth-e2e/equipmentAvailability.spec.ts:46:1 › TC_E07S03_01 TC_E07S03_02 TC_E07S03_03 real login/API/PostgreSQL availability and role protection
    [mobile] › tests/auth-e2e/equipmentAvailability.spec.ts:46:1 › TC_E07S03_01 TC_E07S03_02 TC_E07S03_03 real login/API/PostgreSQL availability and role protection
```
