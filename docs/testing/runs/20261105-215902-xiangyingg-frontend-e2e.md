---
date: 2026-11-05T21:59:02+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "051126"
database: real
commit: 62e8208
---

# E02-S07 / SCRUM-180 supplemental TC05 human evidence

Follow-up to PR #420 and Amareet's request for the past-Session refusal and
human browser correction. Xiang Ying performed the browser actions and supplied
the original screenshots in this session on 5 November 2026. The timestamp above
is evidence intake after the observations, not an invented execution start time.
The application ran the unchanged source exported from main commit `62e8208`;
`git rev-parse --short=7 HEAD` on the matching evidence checkout returned
`62e8208`. Native loopback PostgreSQL was disposable and separate from shared
Supabase. No computer-clock change or production operation was used.

## Execution and attribution

- First Event: `TC05 Retake Xiang Ying 5 Nov`, ID
  `a5ab86c2-c340-4996-89c6-5163ec276431`. Event dates: 10 November 2026,
  09:00–17:00 Singapore time. The agent prepared the Draft and two Sessions;
  Opening initially used 4 November 09:00–10:00, Afternoon used 10 November
  13:00–14:00. Xiang Ying saved Opening's corrected 10 November 09:00–10:00
  dates through the browser and supplied the Session-saved capture and the
  named Event's persisted Under review result. The agent did not correct or
  submit this fixture. A subsequent generic submission-error capture is not
  treated as success; read-only database inspection confirmed Under review
  with both future Session ranges retained.
- Second Event: `TC05 Refusal Capture – Xiang Ying`, ID
  `8fbe2264-cb31-42b4-b228-f88141a36e17`. Xiang Ying created this additional
  Draft, saved Opening on 4 November 09:00–10:00 and Afternoon on 10 November
  13:00–14:00, and attempted submission. Its Event dates remained 10 November
  09:00–17:00. The original refusal screenshot shows Opening's past dates
  alongside the named Session error. Read-only database inspection confirmed
  Draft status and both saved Session ranges. Two earlier accidentally submitted
  setup Events are not used as TC05 evidence.
- The refusal image was captured after the first Event's correction/submission.
  These are two separate fixtures in one human session, not a claimed continuous
  screenshot sequence on one Event. Cropped correction/refusal images omit the
  Event identity; attribution comes from this session and supplemental read-only
  inspection. The correction image retains the earlier refusal text, so it proves
  the Session save, not a fresh refusal of the corrected date.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E02S07_05 | Supplemental past-Session refusal and human correction evidence | PASS | Across the two explicitly identified Events: image 1 shows Opening on 4 November 09:00–10:00 refused with “Session 1 (Opening): start date and time must be in the future. Edit this Session before submitting again.” Image 2 shows human browser correction saved to 10 November 09:00–10:00. Image 3 shows the first named Event Under review, dated 10 November 09:00–17:00. PASS is scoped to these observed supplemental results; no single-Event continuous screenshot chain or separate reload screenshot is claimed. |

## Screenshots

- [TC_E02S07_05-1](evidence/20261105-215902-xiangyingg-frontend-e2e/TC_E02S07_05-1.png): Past Opening dates and submission refusal, second Event.
- [TC_E02S07_05-2](evidence/20261105-215902-xiangyingg-frontend-e2e/TC_E02S07_05-2.png): Session saved with corrected future dates, first Event; previous refusal text remains visible.
- [TC_E02S07_05-3](evidence/20261105-215902-xiangyingg-frontend-e2e/TC_E02S07_05-3.png): First Event's name, future dates and Under review status.
- [TC_E02S07_05-4-context](evidence/20261105-215902-xiangyingg-frontend-e2e/TC_E02S07_05-4-context.png): Additional user-supplied organisation Events screen; context only, no TC05 assertion.

## Review boundary

Original image bytes are preserved. Earlier merged run records and SCRUM-180's
Done state are unchanged. This supplements the earlier TC05 evidence; independent
human review and PO judgement of the two-fixture evidence remain separate. It
does not establish TC02 reload evidence or claim an application regression suite.
