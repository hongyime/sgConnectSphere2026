---
date: 2026-11-02T01:00:00+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 311026
database: real
commit: 1f2f149
pr: 408
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E04S02_01 | Creating one Session should support a single-session Event without extra lifecycle setup | PASS | As organiser_a, created and saved the draft "E04 Opening Event" (12 Mar 2027 09:00-10:00, 40 attendees), opened it from Drafts: Event Sessions showed one Session with "It uses the event's own requirements", Remove greyed out. Titled it "Opening" and saved: "Session saved." The database held one draft Event with one Session; no other Event was created. |
| TC_E04S02_02 | Multiple Sessions should retain their own dates, times, attendance, and requirements | PASS | Added a second Session on the same draft. First Session (kept the title "Opening"): 12 Mar 09:00-11:00, 40, venue "Hall A", equipment "Projector", facility Projector. Second "Session B": 13 Mar 13:00-16:00, 120, venue "Hall B", equipment "Microphones", layout Theatre, facility PA system. After a reload both kept their own values (also confirmed in the database). |
| TC_E04S02_03 | Venue suitability should use each Session's own attendance and requirements | PASS | As coord_a on EVT-9401 venue search: Session A - Talks filled 40 attendees and Wheelchair access, and Lotus Room (50) was Suitable. Session B - Panel filled 120 attendees and Theatre, and the same Lotus Room was a Near match ("Required room layout is not supported") while Orchid Hall (Theatre 120) was Suitable. Lotus Room did not also list a capacity shortfall because capacity is judged by the requested layout (existing E06-S02 rule). |
| TC_E04S02_04 | The same venue may have separate bookings for different Sessions of one Event | PASS | Requested Orchid Hall for Session B (13:00-15:00), then for Session A (09:00-11:00). The booking list showed two separate Pending Orchid Hall requests, each naming its Session and its own period; the Event moved to Planning. |
| TC_E04S02_05 | Deleting a Session should release its confirmed booking and retain history | PASS | As organiser_a on EVT-9403, Remove session on Session A - Morning asked for confirmation first; confirming showed "Session removed. 1 venue booking released. The venue's staff have been notified." with only Session B left. As coord_a: Session A's Lotus Room booking Released, Session B's still Confirmed; activity log showed "Session deleted - Session: Session A - Morning" and "Booking released"; the Lotus Room calendar for 27 Mar 2027 showed only 13:00-15:00 Confirmed. venue_a had "Venue booking released". The first attempt on EVT-9402 also passed (database checked) but was not screenshotted, so EVT-9403, an identical copy, was set up and the case repeated for the evidence. |

Set up with `docs/testing/manual/E04-S02-preconditions.sql` on a fresh reset and seed of the local Docker database `connectsphere_dev_stack`, plus a copy of EVT-9402 as EVT-9403 for the repeat. Steps are in `docs/testing/manual/E04-S02-click-through.md`. Seen in passing, outside this story: "Event update" notices to Venue Staff show a raw UTC timestamp ("Changed at 2026-11-01T17:28:16.415Z"), visible in TC_E04S02_05-6; passed on for E11-S01.

## Screenshots

Taken by hand by the tester; Claude Code saved the pasted images under their TC_ID.

- [TC_E04S02_01](evidence/20261102-010000-amareetkm2024-del-frontend-e2e/TC_E04S02_01.png): one Session, "Session saved.", Remove greyed out
- [TC_E04S02_02-1](evidence/20261102-010000-amareetkm2024-del-frontend-e2e/TC_E04S02_02-1.png): first Session's own values after reload
- [TC_E04S02_02-2](evidence/20261102-010000-amareetkm2024-del-frontend-e2e/TC_E04S02_02-2.png): Session B's own values after reload
- [TC_E04S02_03-1](evidence/20261102-010000-amareetkm2024-del-frontend-e2e/TC_E04S02_03-1.png): Session A - Talks chosen in venue search
- [TC_E04S02_03-2](evidence/20261102-010000-amareetkm2024-del-frontend-e2e/TC_E04S02_03-2.png): Lotus Room Suitable for Session A
- [TC_E04S02_03-3](evidence/20261102-010000-amareetkm2024-del-frontend-e2e/TC_E04S02_03-3.png): Session B - Panel chosen, criteria refilled
- [TC_E04S02_03-4](evidence/20261102-010000-amareetkm2024-del-frontend-e2e/TC_E04S02_03-4.png): Lotus Room Near match, Orchid Hall Suitable for Session B
- [TC_E04S02_04](evidence/20261102-010000-amareetkm2024-del-frontend-e2e/TC_E04S02_04.png): two Orchid Hall requests, one per Session
- [TC_E04S02_05-1](evidence/20261102-010000-amareetkm2024-del-frontend-e2e/TC_E04S02_05-1.png): removal confirmation for Session A - Morning
- [TC_E04S02_05-2](evidence/20261102-010000-amareetkm2024-del-frontend-e2e/TC_E04S02_05-2.png): "1 venue booking released", Session B left
- [TC_E04S02_05-3](evidence/20261102-010000-amareetkm2024-del-frontend-e2e/TC_E04S02_05-3.png): Session B Confirmed, Session A Released
- [TC_E04S02_05-4](evidence/20261102-010000-amareetkm2024-del-frontend-e2e/TC_E04S02_05-4.png): activity log with Session deleted and Booking released
- [TC_E04S02_05-5](evidence/20261102-010000-amareetkm2024-del-frontend-e2e/TC_E04S02_05-5.png): Lotus Room calendar, 27 Mar 2027
- [TC_E04S02_05-6](evidence/20261102-010000-amareetkm2024-del-frontend-e2e/TC_E04S02_05-6.png): venue_a's "Venue booking released" notice
