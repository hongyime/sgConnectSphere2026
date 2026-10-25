---
date: 2026-10-16T22:20:13+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 161026
database: real
commit: 8599ad2
---

E06-S03 / SCRUM-47 Scenario 3c primary-selection follow-up. Ji Ning drove
the local browser, reported cancellation and refresh results in chat, and
saved these nine original screenshots. The agent transcribed the observations
and inspected all nine files; each is a valid displayed PNG under 1000 KB
(largest 89,414 bytes). No screenshots were generated or modified by the agent.
Runner uses the authenticated GitHub identity established earlier this session.
The filename timestamp is evidence-folder creation time; the interactive test
preceded that time, and the frontmatter records documentation completion.

Code under test: feature/e06-s03-pending-withdrawal, HEAD 8599ad2 plus
uncommitted primary-selection implementation. The SHA alone does not contain
the implementation. No commit, push or merge was performed.

Setup used the existing disposable native loopback PostgreSQL manual database
and local API/frontend. Initially EVT-2001 had one Confirmed Orchid booking
without a primary designation. The first confirmation failed while the API
was still the process started before the feature existed. The agent inspected
that process and restarted only the API with current code and the same guarded
local database; the subsequent human retry succeeded. No source-code fix was
made in response to that failure, and no HTTP response diagnosis was captured.

To exercise switching, the agent inserted one synthetic non-primary Confirmed
Cedar booking for EVT-2001 with purpose Manual primary selection fixture,
headcount 100 and the event's existing 6 October 09:00-12:00 SGT period.
The helper checked the loopback host, port and disposable database name, locked
event then venue and retained Orchid's primary flag. This was fixture setup,
not a human Venue Staff approval or automatic-primary test. Existing EVT-3003
Pending, Rejected and Released rows were used only to inspect action visibility.
No shared Supabase or production database was changed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_07 | Several bookings per event: primary selection cancellation | PASS | Orchid confirmation named the venue. Human explicitly confirmed Cancel closed the panel, left Orchid Confirmed and did not add a Primary venue label. Screenshot 1 shows the panel before cancellation; cancellation outcome was reported in chat. |
| TC_E06S03_07 | Primary selection initial attempt before API restart | FAIL | Confirmation displayed Unable to update the primary venue and Refresh booking list. Screenshot 2 retains the failure. API had not loaded the newly added feature; no HTTP status/body was captured. |
| TC_E06S03_07 | Primary selection retry after API restart | PASS | Human retry showed Primary venue updated, Orchid Primary venue, and unchanged Confirmed event/booking. After F5, human confirmed designation, status and 6 October 09:00-12:00 period persisted; screenshots 3-4. |
| TC_E06S03_07 | Switch primary between two Confirmed bookings and refresh | PASS | After synthetic Cedar setup, human selected Cedar. Screenshot 5 shows Cedar Primary venue and Orchid's Set as primary venue action; both remain Confirmed with the same periods. Screenshot 6 after the requested F5 shows the same designation. No intervening F5 was requested between selection and screenshot 5. |
| TC_E06S03_07 | Primary-selection controls restricted by booking status | PASS | EVT-3003 Pending Lotus/Orchid, Rejected Maple/Cedar and Released Cedar/Maple cards showed no Set as primary venue action; screenshots 7-9. This establishes UI visibility only, not direct API refusal. |

## Limits and remaining review

This record covers the explicit primary-selection UI subset of TC_E06S03_07,
not every clause of that case or full-story completion. No human staff approval,
automatic first-confirmed primary assignment, decision/withdrawal race, foreign
mutation request, non-Confirmed mutation request, audit inspection or repeated
API replay was exercised here. Separate automated evidence must remain labelled
separately. Human review of implementation and tests, required PR checks and
reviewed integration remain necessary.

## Screenshots

- [TC_E06S03_07-1](evidence/20261016-221852-jininggg-frontend-e2e/TC_E06S03_07-1.png): Orchid confirmation before Cancel.
- [TC_E06S03_07-2](evidence/20261016-221852-jininggg-frontend-e2e/TC_E06S03_07-2.png): failed initial attempt before API restart.
- [TC_E06S03_07-3](evidence/20261016-221852-jininggg-frontend-e2e/TC_E06S03_07-3.png): retry success, Orchid primary and Confirmed event.
- [TC_E06S03_07-4](evidence/20261016-221852-jininggg-frontend-e2e/TC_E06S03_07-4.png): Orchid designation persists after refresh.
- [TC_E06S03_07-5](evidence/20261016-221852-jininggg-frontend-e2e/TC_E06S03_07-5.png): Cedar selected, Orchid available for reselection.
- [TC_E06S03_07-6](evidence/20261016-221852-jininggg-frontend-e2e/TC_E06S03_07-6.png): Cedar designation persists after refresh.
- [TC_E06S03_07-7](evidence/20261016-221852-jininggg-frontend-e2e/TC_E06S03_07-7.png): Released Cedar and Pending Lotus without primary controls.
- [TC_E06S03_07-8](evidence/20261016-221852-jininggg-frontend-e2e/TC_E06S03_07-8.png): Rejected and Released Maple without primary controls.
- [TC_E06S03_07-9](evidence/20261016-221852-jininggg-frontend-e2e/TC_E06S03_07-9.png): Rejected Cedar and Pending Orchid without primary controls.
