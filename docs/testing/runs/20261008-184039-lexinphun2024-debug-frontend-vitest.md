---
date: 2026-10-08T18:40:39+08:00
runner: lexinphun2024-debug
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: "081026"
database: mocked
commit: b6e6a24
---

`npx vitest run` in `frontend/` (fetch stubbed, no database), after the
Activity log moved to StatusPill badges and plain action wording.
A separate 393px and 320px check in Chromium against the local stack found
no horizontal overflow (page width equal to the viewport at both).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E14S02_01 | the assigned Coordinator reads who changed the event, what changed and when | PASS | |
| TC_E14S02_05 | the Activity log offers no edit or delete controls | PASS | |
| TC_E14S02_08 | the Activity log shows only the entries the API returns, with no access denials | PASS | |
| MULTIPLE | Frontend Vitest suite | PASS | 333/333 passed across 37 files |
