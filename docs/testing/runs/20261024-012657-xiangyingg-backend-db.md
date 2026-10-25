---
date: 2026-10-24T01:26:57+08:00
runner: xiangyingg
scope: backend/db
environment: local
run_type: manual
test_case_version: 211026
database: real
commit: 6be208a
pr: 325
---

Human-taken screenshots supplied by Xiang Ying after running the documented interactive `scripts/manual_completion_boundary.ts` procedure from #324. This session covers the system completion evaluator and real isolated PostgreSQL schema, not a browser flow; backend/db identifies the exercised scope. Source application commit 6be208a is printed in both captures. Observation timestamps span 2026-10-24 01:26:32.379–01:26:57.804 Asia/Singapore (2026-10-23T17:26:32.379Z–17:26:57.804Z); session date uses the final visible observation to seconds precision.

The controlled application evaluation clock is 2 November 2026, first 16:59:59 and then exactly 17:00:00 +08:00, matching canonical TC_E08S05_06. It is distinct from actual observation/database audit time. The helper uses the existing injected application clock; the computer clock is unchanged. This is a human-driven controlled evaluator observation, not automated test evidence or an ordinary browser screenshot. Cleanup is not visible in the supplied captures. Earlier manual SKIP sessions remain immutable; this new execution supplies the boundary observations for independent review.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E08S05_06 | Verify that an event auto-completes at the exact end time and not before | PASS | EVT-2002 ends at 2026-11-02T09:00:00.000Z (17:00 +08:00). At controlled 16:59:59 it remains confirmed, completedThisEvaluation is 0 and actual activity is empty. At exactly 17:00:00 it becomes completed, completedThisEvaluation is 1, and one actual activity row records Automatically completed event, confirmed to completed, actor System. Its audit timestamp is actual 2026-10-23T17:26:57.774Z, not the injected clock. The first capture crops the heading and wraps the completed-count property; identity, commit, clock and observed values remain visible. |

## Screenshots

- [TC_E08S05_06-1](evidence/20261024-012657-xiangyingg-backend-db/TC_E08S05_06-1.png): before-end controlled evaluation; Confirmed, zero completions, empty activity.
- [TC_E08S05_06-2](evidence/20261024-012657-xiangyingg-backend-db/TC_E08S05_06-2.png): exact-end controlled evaluation; Completed, one completion and System activity.
