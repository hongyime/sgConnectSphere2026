---
date: 2026-10-17T12:25:15+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "161026"
database: real
commit: 7fb3c58
---

SCRUM-197 / E14-S03 manual click-through by Le Xin in Chrome (Singapore time)
on `feature/SCRUM-197-activity-log-singapore-time` at 7fb3c58. Set-up:

- a freshly reset and seeded local PostgreSQL 17 database (local container,
  127.0.0.1 only)
- the local API (`backend/src/dev.ts`) started with only `DATABASE_URL`
  (`DATABASE_POOLER_URL` unset), so nothing reached the shared database
- the Vite frontend on http://127.0.0.1:5173

As `organiser_a@clienta.com`, EVT-101 (Submitted) was edited several times:
start, end, registration dates and the event name. Both existing Activity
logs were then read: the Organiser's (`/events/EVT-101`) and the assigned
Coordinator's (`coord_a@connectsphere.com`, `/coordinator/events/EVT-101`).
Every displayed value was compared with its stored audit row, read-only.
Start time is the first edit's audit timestamp.

The edit writer stores only the new value of an edited field, so both views
show the new value alone (no "old → new"). TC_E14S03_02's test data allows
this: it does not require the writer to capture old values.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E14S03_01 | Organiser reads an edited date/time value in Singapore time | PASS | Organiser Activity log: endAt "(5 Oct 2026, 10:30 am)", stored 2026-10-05T02:30:00.000Z; startAt "(1 Oct 2026, 11:59 pm)" and "(5 Oct 2026, 9:00 am)", stored 2026-10-01T15:59:00.000Z and 2026-10-05T01:00:00.000Z. No raw ISO strings on date rows. |
| TC_E14S03_02 | Assigned Coordinator reads existing before/after date/time values in Singapore time | PASS | Coordinator table: "Start: 1 Oct 2026, 11:59 pm", "End: 2 Oct 2026, 1:30 am", "Start: 5 Oct 2026, 9:00 am", "End: 5 Oct 2026, 10:30 am", "Registration dates: 1 Oct 2026, 11:59 pm to 2 Oct 2026, 2:30 am". By "Organiser A"; When column matches the stored time (e.g. 12:25 pm for 04:25 UTC). New value only, as noted above. |
| TC_E14S03_03 | Both views convert the calendar date across Singapore midnight | PASS | endAt stored 2026-10-01T17:30:00.000Z shows "2 Oct 2026, 1:30 am" in both views; registrationDates stored "2026-10-01T15:59:00.000Z to 2026-10-01T18:30:00.000Z" shows "1 Oct 2026, 11:59 pm to 2 Oct 2026, 2:30 am" in both views. |
| TC_E14S03_04 | Invalid and missing date/time values retain existing helper and omission behavior | N/A | Not set up by hand: needs malformed audit rows that the edit form and API refuse to write. Covered by the automated test in `20261017-114437-lexinphun2024-debug-frontend-vitest.md`. |
| TC_E14S03_05 | Text, status badges and venue hold expiry are preserved | PASS | Event name set to the literal text "2026-10-15T09:30:00Z": Organiser log shows "(2026-10-15T09:30:00Z)" and Coordinator table shows "Event name: 2026-10-15T09:30:00Z", unconverted. Status badges and hold expiry not exercised by hand (EVT-101 has no status change or hold); covered by the automated test. |
| TC_E14S03_06 | Formatting preserves immutable UTC evidence and existing reader access | PASS | Stored audit values stayed UTC after display (read-only check). `organiser_c@clientb.com` opening `/events/EVT-101` got "Access denied. This event is not available to your organisation." with no event details. Its two access-denial rows are stored against EVT-101 but organiser_a's Activity log still showed only the 7 edit entries. |

## Screenshots

- [TC_E14S03_01](evidence/20261017-122515-lexinphun2024-debug-frontend-e2e/TC_E14S03_01.png): Organiser log, endAt in Singapore time; the startAt rows are in TC_E14S03_03
- [TC_E14S03_02](evidence/20261017-122515-lexinphun2024-debug-frontend-e2e/TC_E14S03_02.png): Coordinator Activity log table, all seven edits in Singapore time
- [TC_E14S03_03](evidence/20261017-122515-lexinphun2024-debug-frontend-e2e/TC_E14S03_03.png): Organiser log, start/end and registration dates across midnight
- [TC_E14S03_05](evidence/20261017-122515-lexinphun2024-debug-frontend-e2e/TC_E14S03_05.png): Organiser log, timestamp-like event name left as text
- [TC_E14S03_06-1](evidence/20261017-122515-lexinphun2024-debug-frontend-e2e/TC_E14S03_06-1.png): another client's Organiser refused
- [TC_E14S03_06-2](evidence/20261017-122515-lexinphun2024-debug-frontend-e2e/TC_E14S03_06-2.png): after the refusals, organiser_a's log still shows only the seven edits
