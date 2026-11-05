---
date: 2026-11-04T02:33:14+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "021126"
database: real
commit: 9315178
pr: 420
---

Human-supplied screenshots from the local manual run against 9315178. This new
record preserves the earlier immutable TC01 record unchanged. The recording
time is after the observations; screenshots were supplied during the same chat.

Fixture preparation and correction were performed by the agent through the
local API. The human opened the browser, observed the refusal, and subsequently
submitted the corrected Draft and supplied the captures. This does not claim a
human performed the Session correction through the editor. Event identity:
E02 Horizon TC05 Prepared, id b06d895d-b2cb-4e28-bd8a-f96ad3e551aa.
Future Event date was 2026-11-05; Opening was initially 2026-11-03 09:00–10:00
Singapore time, then corrected by the agent to 2026-11-05 09:00–10:00.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E02S07_05 | Past Session refusal followed by corrected draft resubmission | PASS | Scoped to the observed post-correction submission: 05-3 shows API persistence/submission and 05-4 shows the named Event Under review on 5 Nov 2026, 09:00–17:00. Earlier chat showed Opening's past-date refusal, but that earlier file is no longer available locally and is not archived in this record. 05-2 shows cropped Event inputs, not corrected Session dates. Human editor correction, saved Session date capture and complete negative-to-positive screenshot chain remain evidence gaps; this row does not claim full story acceptance. |

## Screenshots

- [TC_E02S07_05-2](evidence/20261104-023314-xiangyingg-frontend-e2e/TC_E02S07_05-2.png): Cropped Event date inputs only; not proof of saved Opening Session correction.
- [TC_E02S07_05-3](evidence/20261104-023314-xiangyingg-frontend-e2e/TC_E02S07_05-3.png): Successful API submission timeline after agent-assisted fixture correction.
- [TC_E02S07_05-4](evidence/20261104-023314-xiangyingg-frontend-e2e/TC_E02S07_05-4.png): Named TC05 Event persisted Under review with future Event dates.

## Evidence audit and remaining work

TC01 start refusal is already archived in 20261104-012731-xiangyingg-frontend-e2e.
Later TC01 end refusal/Session inputs, TC02 boundary acceptance, TC03 next-day
acceptance and TC04 past-date warning/disabled Submit were supplied in chat,
but those image files are no longer available in the supplied local locations.
Restore or reattach the original human captures before claiming they are pushed.
The latest available TC05 files are archived unchanged here. Do not substitute
agent-taken screenshots, invent missing files or edit earlier run records.
SCRUM-180 remains awaiting complete evidence and independent acceptance.
