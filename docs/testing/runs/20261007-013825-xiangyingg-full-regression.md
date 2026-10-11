---
date: 2026-10-07T01:38:25+08:00
runner: xiangyingg
scope: full-regression
environment: local
run_type: regression
test_case_version: '031026'
database: mocked
commit: 884dc52
---

Command: `npm run test:e2e:scaffold`. Timestamp captured immediately after command
completion. Run on the uncommitted reviewer follow-up working tree based on HEAD
884dc52; the commit field is not a claim the working tree was already committed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | SCRUM-53 equipment availability regression | PASS | Observed exit code 0; scope and command above. |

Final output:

```text
  ✓  578 [mobile] › tests/e2e/e03.spec.ts:868:3 › E03-S07 › TC_E03S07_04 - Verify that an Organiser attempting to directly edit a restricted field after approval should be refused and directed to the change request form (655ms)
  ✓  579 [mobile] › tests/e2e/e03.spec.ts:896:3 › E03-S07 › TC_E03S07_05 - Verify that a Coordinator who is not assigned to an approved event should be refused when attempting to edit it (270ms)
[WebServer] 1:38:24 AM [vite] http proxy error: /api/auth/session
[WebServer] Error: connect ECONNREFUSED 127.0.0.1:3001
[WebServer]     at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1637:16)
[WebServer] 1:38:24 AM [vite] http proxy error: /api/auth/session
[WebServer] Error: connect ECONNREFUSED 127.0.0.1:3001
[WebServer]     at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1637:16)
  ✓  580 [mobile] › tests/e2e/e03.spec.ts:924:3 › E03-S07 › TC_E03S07_06 - Verify that an Organiser's unrestricted post-approval edit should also be recorded in the activity log (913ms)

  342 skipped
  238 passed (44.1s)
```
