---
date: 2026-10-07T00:08:45+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: regression
test_case_version: '031026'
database: mocked
commit: ac1e2ec
pr: 216
---

Command: `npx playwright test tests/e2e/equipmentCatalogue.spec.ts tests/e2e/equipmentRequests.spec.ts --reporter=list`. Timestamp captured immediately after command
completion. Run on the uncommitted reviewer follow-up working tree based on HEAD
ac1e2ec; the commit field is not a claim the working tree was already committed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | SCRUM-52 reviewer follow-up regression | PASS | Observed exit code 0; scope and command above. |

Final output:

```text
  ✓   8 [mobile] › tests/e2e/equipmentCatalogue.spec.ts:17:1 › TC_E07S01_02 stock reduction displays flagged reservation and notification outcome (703ms)
  ✓   7 [mobile] › tests/e2e/equipmentRequests.spec.ts:23:1 › TC_E07S02_02 over-stock request saves with explicit requested-versus-owned warning (852ms)
  ✓   9 [desktop] › tests/e2e/equipmentRequests.spec.ts:26:1 › TC_E07S02_03 requests remain independent across separate events (785ms)
  ✓  10 [desktop] › tests/e2e/equipmentCatalogue.spec.ts:26:1 › TC_E07S01_03 retirement removes item and detail retains historical reservations (741ms)
  ✓  11 [mobile] › tests/e2e/equipmentCatalogue.spec.ts:26:1 › TC_E07S01_03 retirement removes item and detail retains historical reservations (748ms)
  ✓  12 [mobile] › tests/e2e/equipmentRequests.spec.ts:26:1 › TC_E07S02_03 requests remain independent across separate events (894ms)
  ✓  13 [desktop] › tests/e2e/equipmentRequests.spec.ts:29:1 › TC_E07S02_04 amend and remove an unreserved equipment line (894ms)
  ✓  14 [desktop] › tests/e2e/equipmentCatalogue.spec.ts:35:1 › TC_E07S01_04 update equipment location persists after reopening, with responsive shared layout (1.1s)
  ✓  16 [mobile] › tests/e2e/equipmentRequests.spec.ts:29:1 › TC_E07S02_04 amend and remove an unreserved equipment line (799ms)
  ✓  15 [mobile] › tests/e2e/equipmentCatalogue.spec.ts:35:1 › TC_E07S01_04 update equipment location persists after reopening, with responsive shared layout (1.0s)

  16 passed (7.2s)
```
