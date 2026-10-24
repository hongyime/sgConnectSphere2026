---
date: 2026-10-23T00:50:47+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 211026
database: real
commit: 553962f
pr: 325
---

Human-taken screenshots supplied by Xiang Ying. Run end reconstructed from the final supplied screenshot modification time (seconds precision); captures span 00:45:12–00:50:47 Asia/Singapore. Application checkout was 553962f when servers and fresh fixtures were prepared, separate from this evidence branch. Local frontend and backend used isolated PostgreSQL with migration 0022; this is not production migration verification. No computer-clock changes or test-clock HTTP override used. AUTO before/after plus System activity support evaluation; terminal invocation/output itself is not captured. Cropped activity images are attributed by the matching complete event captures and supplied sequence. Prior session and images remain unchanged.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E08S05_01 | Verify that a Confirmed event should automatically become Completed once its last event's end time has passed | PASS | AUTO B16F5D70 changes Confirmed to Completed after passed end; System entry at 00:48. Human-supplied sequence; evaluator HTTP output was not supplied. |
| TC_E08S05_02 | Verify that an Event Coordinator should be able to manually mark a Confirmed event complete once its last event has started | PASS | MANUAL E4860EEB Completed at 00:45 after start and before end; success banner and reload persistence. Go-back confirmation branch is not evidenced by these images. |
| TC_E08S05_03 | Verify that attempting to mark an event complete before its first event has started should be blocked | PASS | PREMATURE F2D64B23 remains Confirmed with 30 October start, disabled control and explicit before-start explanation. |
| TC_E08S05_04 | Verify that a Cancelled event should never auto-complete, even after its original end time passes | PASS | CANCELLED 8DDE3EB7 remains Cancelled in supplied before/after sequence surrounding the AUTO evaluation; original end passed; no completion activity. |
| TC_E08S05_05 | Verify that an event's transition to Completed should be recorded in the activity log | PASS | Assigned Coordinator reads manual Confirmed to Completed entry by Coordinator A at 00:45. PO 21 October reader decision in 94ccd2f applies; no administrator screen claimed. System entry at 00:48 is supplemental TC01 evidence. |
| TC_E08S05_06 | Verify that an event auto-completes at the exact end time and not before | SKIP | No controlled exact-end human execution supplied; automated boundary evidence remains separate. Await controlled run or explicit PO acceptance. |

## Screenshots

- [TC_E08S05_01-1](evidence/20261023-005047-xiangyingg-frontend-e2e/TC_E08S05_01-1.png): AUTO Confirmed with passed end before evaluation.
- [TC_E08S05_01-2](evidence/20261023-005047-xiangyingg-frontend-e2e/TC_E08S05_01-2.png): Same AUTO Completed with System activity after evaluation.
- [TC_E08S05_02-1](evidence/20261023-005047-xiangyingg-frontend-e2e/TC_E08S05_02-1.png): Correct MANUAL event Completed with success banner.
- [TC_E08S05_02-2](evidence/20261023-005047-xiangyingg-frontend-e2e/TC_E08S05_02-2.png): Same MANUAL event remains Completed after reload.
- [TC_E08S05_03-1](evidence/20261023-005047-xiangyingg-frontend-e2e/TC_E08S05_03-1.png): PREMATURE Confirmed, future start, explanation and disabled completion control.
- [TC_E08S05_04-1](evidence/20261023-005047-xiangyingg-frontend-e2e/TC_E08S05_04-1.png): CANCELLED with passed original end before evaluation.
- [TC_E08S05_04-2](evidence/20261023-005047-xiangyingg-frontend-e2e/TC_E08S05_04-2.png): Same CANCELLED remains Cancelled after evaluation; no completion activity.
- [TC_E08S05_05-1](evidence/20261023-005047-xiangyingg-frontend-e2e/TC_E08S05_05-1.png): Manual transition by Coordinator A at 00:45.
- [TC_E08S05_05-2](evidence/20261023-005047-xiangyingg-frontend-e2e/TC_E08S05_05-2.png): Automatic transition by System at 00:48.
