---
date: 2026-10-28T12:57:00+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "281026"
database: real
commit: f3df479
---

E09-S01 (SCRUM-63; manual-run subtask SCRUM-209) manual click-through with screenshots (T-93), run by hand by Amareet.

Local real stack on branch `test/SCRUM-209-e09-manual-runs`, which is `main` at
`f3df479` plus this PR's two setup files: the frontend (Vite, 5173), the local API
(`backend/src/dev.ts`, 3001) and `connectsphere_dev_stack` (Docker `postgres:17`).
Claude reset and seeded it at 12:56 on 28 October 2026, then ran the `setup` stage of
`docs/testing/manual/E09-S01-S03-preconditions.sql` (setup only, never a test
step). Amareet ran `docs/testing/manual/E09-S01-S03-click-through.md` by hand from
about 12:57 to 13:25 on 28 October 2026, with Attendees in a normal Chrome window
and the Organiser (`organiser_a`) in a private one. The three stories were run in
one sitting; this record holds E09-S01's rows.

**Not independent of the code.** Amareet owns the story and wrote it with Claude
(#326, #327, #353, #354). After each step, Claude cross-checked the database
(registrations, statuses, stored dates); those checks are noted in Remarks.

**Screenshots:** taken by hand by Amareet with the Windows Snipping Tool and
pasted into the chat. Claude saved them unchanged under their TC_ID names (T-93).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E09S01_06 | The Event summary should show its primary venue while selected Sessions show their own venues | PASS | Spring Networking Night (EVT-9201): Event venue Grand Auditorium, Level 1; Sessions Talks at Grand Auditorium and Mixer at Seminar Room B; one Register button (attendee_c). |
| TC_E09S01_01 | Submitting an open Event registration should reserve one place in each selected Session | PASS | Talks and Mixer ticked, Confirm registration: "You're registered", Your Sessions Talks and Mixer. DB: one `registered` row for attendee_c at 13:00:12; the bell showed 1 notification. |
| TC_E09S01_07 | An Attendee should be able to select multiple Sessions in one Event registration | PASS | Event page afterwards: "You're registered for this event", Registered pill, both Sessions Selected. DB: exactly one registration for attendee_c. |
| TC_E09S01_03 | A second active registration for the same account and Event should be prevented | PASS | /attendee/register/EVT-9201 again: "You're already registered for this event … Your Sessions: Talks, Mixer." No second row. |
| TC_E09S01_05 | Verify that attempting to register for an event that is not Confirmed should be refused | PASS | EVT-9202 (Planning): "Couldn't load registration for this event" / "Registration is only open for confirmed events that take registrations." |
| TC_E09S01_04 | Verify that submitting registration with a required field empty should block registration and identify the missing fields | PASS | attendee_k (no contact number): Contact number Missing, warning "Missing: Contact number" with Update your profile; Mixer ticked and submitted, refused with "Add your contact number to your profile before registering." DB: 0 registrations for attendee_k. |

**Seen outside this run** (not failures, and not from this script's steps): the
audit log has 11 `Access Denied` rows between 13:05 and 13:18. They are attendee_k
and attendee_a refused `/internal/planning/EVT-9201` and `EVT-9204`, attendee_k
refused the Organiser `events` screen, and organiser_a refused `attendee_events`.
No link in the app leads there; most likely the browser preloaded address-bar
suggestions from earlier sessions. Each was correctly refused.

## Screenshots

Taken by hand by Amareet during the run (T-93) and saved unchanged.

- [TC_E09S01_06](evidence/20261028-125700-amareetkm2024-del-frontend-e2e/TC_E09S01_06.png)
- [TC_E09S01_01](evidence/20261028-125700-amareetkm2024-del-frontend-e2e/TC_E09S01_01.png)
- [TC_E09S01_07](evidence/20261028-125700-amareetkm2024-del-frontend-e2e/TC_E09S01_07.png)
- [TC_E09S01_03](evidence/20261028-125700-amareetkm2024-del-frontend-e2e/TC_E09S01_03.png)
- [TC_E09S01_05](evidence/20261028-125700-amareetkm2024-del-frontend-e2e/TC_E09S01_05.png)
- [TC_E09S01_04](evidence/20261028-125700-amareetkm2024-del-frontend-e2e/TC_E09S01_04.png)
