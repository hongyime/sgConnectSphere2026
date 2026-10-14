---
date: 2026-10-06T01:23:13+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 031026
database: real
commit: 8557f2d
pr: 214
---

This records the review of user-provided local browser screenshots on 6 October
2026. It does not reconstruct a complete manual acceptance run. The exact running
application SHA was not captured; commit above is the documentation review base.
The configured application's database was used, rather than intercepted responses.
Only UI observations are established; no database query or refresh was observed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S01_01 | Save full equipment details and make item available for reservation | SKIP | Full manual case not confirmed. Catalogue screenshot shows Test Microphone, Audio, quantity 0, Main Storage and Working. Details screenshot also shows description Test item. Creation action, original stock and downstream reservability were not independently observed. |
| TC_E07S01_02 | Reduced stock flags reservations and notifies Coordinators | SKIP | User reported reducing stock; item shown at 0 with an empty history. No active reservation was established, so this cannot prove shortage flagging or notification. Working is operational condition, not reservation review state. |
| TC_E07S01_03 | Retirement excludes item and retains history | SKIP | No manual retirement result supplied. Automated real-database/browser evidence is recorded separately. |
| TC_E07S01_04 | Updated attributes are saved | SKIP | Full manual persistence case not confirmed. Quantity 0 is visible in catalogue and details; before-value, save/refresh sequence and updates to other fields were not captured. |

UI clarity observation: before fix, the history area showed only column headers
(Event, Period, Quantity, Status), without a visible heading or empty message.
Commit 8557f2d adds Reservation history and No reservations yet. Agent-verified
mock-backed desktop/mobile screenshots and assertions are recorded separately in
20261006-011302-xiangyingg-frontend-e2e.md; the user has not yet confirmed this
updated view manually. SKIP here means no complete user-performed case is claimed;
it is not a failure or replacement of the passing automated acceptance evidence.
