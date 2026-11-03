---
date: 2026-11-02T23:23:00+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 011126
database: real
commit: 9b899c5
pr: 409
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E04S02_05 | Deleting a Session should release its confirmed booking and retain history | PASS | Re-run because #408's review fixes changed what happens when deleting goes from two Sessions to one; the first run was against 1f2f149. As organiser_a on EVT-9402, Remove session on Session A - Morning asked for confirmation first; confirming showed "Session removed. 1 venue booking released. The venue's staff have been notified." with only Session B - Afternoon left. As coord_a: Session A's Lotus Room booking Released, Session B's still Confirmed; activity log showed "Session deleted - Session: Session A - Morning" and "Booking released"; the Lotus Room calendar for 20 Mar 2027 showed only 13:00-15:00 Confirmed. venue_a had "Venue booking released". |

The application code at 9b899c5 is the same as `main` at b03b8bf2, which includes #408's fixes. Set up on the local Docker database `connectsphere_dev_stack`: fresh reset and seed, then `docs/testing/manual/E04-S02-preconditions.sql`, with `DATABASE_POOLER_URL` unset. Docker was used because this machine has no native PostgreSQL; the guide describes the native route. A first attempt in this sitting also passed (database checked) but the confirmation was clicked before its screenshot, so the database was reset and the case repeated; these screenshots are from the repeat.

Only this case was repeated. Session B had no accessibility or facility needs, so this run does not show a survivor keeping needs of its own; the database test in `eventSessionsRoutes.integration.test.ts` covers that.

Seen in passing, not part of this case's expected result: after the deletion the event still shows 9:00 am-3:00 pm and 60 attendees while the remaining Session is 1:00-3:00 pm with 30, the editor says the Session "uses the event's own requirements", and the remaining booking offers "Set as primary venue" because the released booking was the primary one (TC_E04S02_05-2, -3). Raised with the Product Owner in #409.

## Screenshots

Taken by hand by the tester; Claude Code saved the pasted images under their TC_ID.

- [TC_E04S02_05-1](evidence/20261102-232300-amareetkm2024-del-frontend-e2e/TC_E04S02_05-1.png): removal confirmation for Session A - Morning
- [TC_E04S02_05-2](evidence/20261102-232300-amareetkm2024-del-frontend-e2e/TC_E04S02_05-2.png): "1 venue booking released", Session B left
- [TC_E04S02_05-3](evidence/20261102-232300-amareetkm2024-del-frontend-e2e/TC_E04S02_05-3.png): Session A's booking Released, Session B's Confirmed
- [TC_E04S02_05-4](evidence/20261102-232300-amareetkm2024-del-frontend-e2e/TC_E04S02_05-4.png): activity log with Session deleted and Booking released
- [TC_E04S02_05-5](evidence/20261102-232300-amareetkm2024-del-frontend-e2e/TC_E04S02_05-5.png): Lotus Room calendar, 20 Mar 2027
- [TC_E04S02_05-6](evidence/20261102-232300-amareetkm2024-del-frontend-e2e/TC_E04S02_05-6.png): venue_a's "Venue booking released" notice
