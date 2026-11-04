---
date: 2026-11-04T00:44:26+08:00
runner: xiangyingg
scope: frontend/vitest
environment: local
run_type: regression
test_case_version: "021126"
database: mocked
commit: 64fd870
pr: 420
---

Tested 64fd870 plus the pending main 607536e3 merge (#413). Both appended
frontend-guide sections are retained; the generated coverage inventory was rerun.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E02S07_01 / TC_E02S07_02 / TC_E02S07_05 | Submission form regression after main sync | PASS | npm test --workspace frontend -- OrganiserRequestFlow.test.tsx: 21 passed. npm run typecheck passed for both workspaces. Repository check and doc guard also passed before the merge commit. Full application results remain recorded against their original tested working tree, not attributed to this later merge. |
