---
date: 2026-10-28T13:09:08+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: 281026
database: mocked
commit: f3df479
---

SCRUM-205 / E10-S01 Scenario 3. HEAD above plus the implementation/test working
diff committed with this record; this is explicitly not a clean-HEAD execution.
The backend/database was not under test. Human TC_E10S01_03 is still pending.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S01_03 | Restricted attendance refusal, draft handoff and explicit send | PASS | Desktop/mobile; stale approval and Confirmed-readonly entry; no automatic POST. |
| TC_E03S07_04 | Restricted date link still reaches the real form | PASS | Desktop/mobile. Total 6/6 browser checks passed. |

`playwright test tests/e2e/e10.spec.ts tests/e2e/e03.spec.ts
--grep 'TC_E10S01_03|TC_E03S07_04' --workers 1`.

Initial browser run: 2 PASS / 2 FAIL because the test selector matched both the
recovery link and locked-field links. Scoped the selector to the refusal panel;
subsequent and final six-test runs passed. Browser API interception supplies
synthetic reads/refusals; no real backend/database or human acceptance is claimed.
The older E03 fixture emitted unmatched session proxy warnings but assertions
passed. These do not establish a connected application backend.

## Screenshots

Automated intercepted-API captures, not manual test evidence:

- `TC_E10S01_03-1.png`: desktop refused edit; attempted attendance 75.
- `TC_E10S01_03-2.png`: desktop preselected request; proposed 75/current 40.
- `TC_E10S01_03-3.png`: mobile refused edit.
- `TC_E10S01_03-4.png`: mobile preselected request.

Evidence folder: `docs/testing/runs/evidence/scrum-205-automated-20261028/`.
Desktop prefill and mobile refusal originals were visually inspected.
