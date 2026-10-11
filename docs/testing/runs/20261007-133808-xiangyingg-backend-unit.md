---
date: 2026-10-07T13:38:08+08:00
runner: xiangyingg
scope: backend/unit
environment: local
run_type: regression
test_case_version: '031026'
database: mocked
commit: 0691e79
---

Command: `node_modules/.bin/c8 --reports-dir artifacts/scrum53-review-backend --include backend/src/modules/equipmentSupport/availability.ts --reporter=text --reporter=json node --import tsx --test backend/tests/equipmentAvailability.test.ts`. Timestamp captured immediately after command
completion. Run on the uncommitted reviewer follow-up working tree based on HEAD
0691e79; the commit field is not a claim the working tree was already committed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | SCRUM-53 equipment availability regression | PASS | Observed exit code 0; scope and command above. |

Final output:

```text
# tests 7
# pass 7
# fail 0
# skipped 0
```
