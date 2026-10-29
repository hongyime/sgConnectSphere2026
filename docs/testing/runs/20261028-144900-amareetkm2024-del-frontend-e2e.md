---
date: 2026-10-28T14:49:00+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "281026"
database: real
commit: 215a684
---
E09-S07 (SCRUM-69; manual-run subtask SCRUM-218) manual click-through with screenshots (T-93), run by hand by Amareet.

Local real stack on branch `feature/SCRUM-216-e09-registration-list`: the frontend
(Vite, 5173), the local API (`backend/src/dev.ts`, 3001) and
`connectsphere_dev_stack` (Docker `postgres:17`), reset and seeded on 28 October
2026 at about 14:45. Claude then ran `docs/testing/manual/E09-S07-preconditions.sql`
(setup only, never a test step), which reported EVT-9301 at 100 registered with 150
places and EVT-9302 at 5 registered and 2 waitlisted. Amareet ran
`docs/testing/manual/E09-S07-click-through.md` by hand from about 14:50 to 14:57 in
one Chrome window, signing out between accounts. The tree was committed unchanged
afterwards as `215a684`.

**Not independent of the code.** Amareet owns the story and wrote it with Claude.
Claude checked the setup and the access audit row in the database; those checks
are noted in Remarks. An earlier `Access Denied` row at 14:47:57 came from Claude's
own API check before the run, not from this script.

**Screenshots:** taken by hand by Amareet with the Windows Snipping Tool and pasted
into the chat. Claude saved them unchanged under their TC_ID names (T-93).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E09S07_01 | Verify that opening the registration list for an event with registered Attendees should show each Attendee's name, email address and contact number | PASS | organiser_a, Tech Conference 2026 (EVT-9301): Registered attendees (100) lists each Attendee with name, email and contact number only, including Attendee A (attendee_a@example.com, +65 9500 0001) and Attendee B (attendee_b@example.com, +65 9500 0002). The seed's contact numbers stand in for the case's example numbers. |
| TC_E09S07_02 | Verify that the registration list should show the registered count and remaining capacity per event | PASS | Places: "100 registered", "50 remaining" and Event "100 of 150 taken". |
| TC_E09S07_04 | Verify that waitlisted Attendees should be shown separately from registered Attendees on the registration list | PASS | Community Meetup (EVT-9302): Places 5 of 5 Full, waiting list "On, 2 waiting"; Registered attendees (5) lists A to E, and a separate Waiting list (2) has Attendee I (1) then Attendee J (2); neither list contains the other's people. |
| TC_E09S07_03 | Verify that attempting to open the registration list for an event that does not belong to the Organiser's client organisation should be refused | PASS | organiser_c@clientb.com (Client B) opening EVT-9301's list: "Registrations unavailable", Access refused, "Access denied. This event is not available to your organisation.", no list. DB: `Access Denied` / `registrations` audit row for organiser_c and EVT-9301 at 14:55:58. The case names organiser_b as Client B, but the seed has organiser_b in Client A, so organiser_c was used. Supporting, E01-S02 Scenario 3: colleague organiser_b (Client A) sees the lists with the colleague note and no Decision column (screenshot -2). |

**Observation, not a failure:** the refused page still shows the "Registration period"
header button, which would only lead to another refusal. It's noted as a small
follow-up.

## Screenshots

Taken by hand by Amareet during the run (T-93) and saved unchanged.

- [TC_E09S07_01](evidence/20261028-144900-amareetkm2024-del-frontend-e2e/TC_E09S07_01.png)
- [TC_E09S07_02](evidence/20261028-144900-amareetkm2024-del-frontend-e2e/TC_E09S07_02.png)
- [TC_E09S07_04-1](evidence/20261028-144900-amareetkm2024-del-frontend-e2e/TC_E09S07_04-1.png)
- [TC_E09S07_04-2](evidence/20261028-144900-amareetkm2024-del-frontend-e2e/TC_E09S07_04-2.png)
- [TC_E09S07_03-1](evidence/20261028-144900-amareetkm2024-del-frontend-e2e/TC_E09S07_03-1.png)
- [TC_E09S07_03-2](evidence/20261028-144900-amareetkm2024-del-frontend-e2e/TC_E09S07_03-2.png)
