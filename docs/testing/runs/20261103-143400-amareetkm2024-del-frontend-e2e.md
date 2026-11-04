---
date: 2026-11-03T14:34:00+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 021126
database: real
commit: ce335a9
pr: 415
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E04S02_01 | Creating one Session should support a single-session Event without extra lifecycle setup | PASS | As organiser_a: saved "E04 Opening Event" as a draft and reopened it. One Session, Remove greyed out, new wording "One Session beneath this Event, with no extra setup needed." Titled it "Opening": "Session saved." |
| TC_E04S02_02 | Multiple Sessions should retain their own dates, times, attendance, and requirements | PASS | Same draft. Opening 12 Mar 2027 09:00-11:00, 40, Hall A, Projector, facility Projector. Session B 13 Mar 2027 13:00-16:00, 120, Hall B, Microphones, Theatre, facility PA system. Each kept its own values after a reload. |
| TC_E04S02_03 | Venue suitability should use each Session’s own attendance and requirements | PASS | As coord_a on EVT-9401. Session A - Talks (40, Wheelchair access): Lotus Room Suitable. Session B - Panel (120, Theatre): Lotus Room Near match ("Required room layout is not supported"), Orchid Hall Suitable. |
| TC_E04S02_04 | The same venue may have separate bookings for different Sessions of one Event | PASS | As coord_a: submitted Orchid Hall for Session B, then Session A. The list shows two Pending Orchid Hall requests, each naming its Session and period. |
| TC_E04S02_05 | Deleting a Session should release its confirmed booking and retain history | PASS | As organiser_a on EVT-9402: removed Session A - Morning, which held the primary venue. Message: "Session removed. 1 venue booking released. The venue's staff have been notified. That was the event's primary venue, so your Coordinator needs to choose another." As coord_a: Session A's booking Released, Session B's Confirmed, "No primary venue" warning, activity log shows Session deleted and Booking released, Lotus Room calendar for 20 Mar 2027 shows only 13:00-15:00. coord_a has "Primary venue needed" and "Event update". venue_a has "Venue booking released" and "Event update". The event now shows 1:00-3:00 pm and 30 attendees, matching Session B. Later event edits as coord_a left the event and Session B at those values. |

Every row ran on the application code at `ce335a9`, which includes the #415 changes. The guide is `docs/testing/manual/E04-S02-click-through.md`, set up on the local Docker database `connectsphere_dev_stack` with a fresh reset and seed, then `docs/testing/manual/E04-S02-preconditions.sql`, with `DATABASE_POOLER_URL` empty. The guide's wording for TC_E04S02_01 and the removal message in TC_E04S02_05 predate #415, so this record gives the wording seen.

The run was paused by a laptop restart after TC_E04S02_02 and continued on the same database and commit. TC_E04S02_01 and _02 ran on ports 3002 and 5174, because older servers still held the usual ports; the rest ran on 3001 and 5173.

Beyond the test case's expected result, TC_E04S02_05 also checked the new #415 behaviour. These checks are not new test cases:

- **The event's details before the delete** have no screenshot, because the delete went ahead first. A database read just before it showed 9:00 am-3:00 pm and 60 attendees on the event.
- **The later event edit.** Changing only Purpose does not fire the 0014 sync trigger, so it proves nothing about the overwrite and has no screenshot here. Changing Venue requirements does fire it. After that edit, a database read showed the event and Session B both at 1:00-3:00 pm, 30 attendees and "Studio room with tables".
- **Not seen by hand:** no registered Attendee was on this event, so the Attendee notice is covered only by `eventSessionsRoutes.integration.test.ts`.

## Screenshots

Taken by hand by the tester; Claude Code saved the pasted images under their TC_ID.

- [TC_E04S02_01](evidence/20261103-143400-amareetkm2024-del-frontend-e2e/TC_E04S02_01.png): one Session, new wording, "Session saved."
- [TC_E04S02_02](evidence/20261103-143400-amareetkm2024-del-frontend-e2e/TC_E04S02_02.png): both Sessions after a reload
- [TC_E04S02_03-1](evidence/20261103-143400-amareetkm2024-del-frontend-e2e/TC_E04S02_03-1.png): Session A chosen
- [TC_E04S02_03-2](evidence/20261103-143400-amareetkm2024-del-frontend-e2e/TC_E04S02_03-2.png): Lotus Room Suitable for Session A
- [TC_E04S02_03-3](evidence/20261103-143400-amareetkm2024-del-frontend-e2e/TC_E04S02_03-3.png): Session B chosen
- [TC_E04S02_03-4](evidence/20261103-143400-amareetkm2024-del-frontend-e2e/TC_E04S02_03-4.png): Lotus Room Near match, Orchid Hall Suitable for Session B
- [TC_E04S02_04](evidence/20261103-143400-amareetkm2024-del-frontend-e2e/TC_E04S02_04.png): two Pending Orchid Hall requests
- [TC_E04S02_05-1](evidence/20261103-143400-amareetkm2024-del-frontend-e2e/TC_E04S02_05-1.png): both Sessions before the delete
- [TC_E04S02_05-2](evidence/20261103-143400-amareetkm2024-del-frontend-e2e/TC_E04S02_05-2.png): removal confirmation
- [TC_E04S02_05-3](evidence/20261103-143400-amareetkm2024-del-frontend-e2e/TC_E04S02_05-3.png): removal message, Session B left
- [TC_E04S02_05-4](evidence/20261103-143400-amareetkm2024-del-frontend-e2e/TC_E04S02_05-4.png): "No primary venue" warning, bookings Confirmed and Released
- [TC_E04S02_05-5](evidence/20261103-143400-amareetkm2024-del-frontend-e2e/TC_E04S02_05-5.png): event now 1:00-3:00 pm, 30 attendees
- [TC_E04S02_05-6](evidence/20261103-143400-amareetkm2024-del-frontend-e2e/TC_E04S02_05-6.png): activity log; a Snipping Tool popup covers the right side, both rows readable
- [TC_E04S02_05-7](evidence/20261103-143400-amareetkm2024-del-frontend-e2e/TC_E04S02_05-7.png): coord_a's notices
- [TC_E04S02_05-8](evidence/20261103-143400-amareetkm2024-del-frontend-e2e/TC_E04S02_05-8.png): Lotus Room calendar, 20 Mar 2027
- [TC_E04S02_05-9](evidence/20261103-143400-amareetkm2024-del-frontend-e2e/TC_E04S02_05-9.png): venue_a's notices
- [TC_E04S02_05-10](evidence/20261103-143400-amareetkm2024-del-frontend-e2e/TC_E04S02_05-10.png): Venue requirements edited as coord_a, time and attendance unchanged
- [TC_E04S02_05-11](evidence/20261103-143400-amareetkm2024-del-frontend-e2e/TC_E04S02_05-11.png): Session B unchanged after that edit
