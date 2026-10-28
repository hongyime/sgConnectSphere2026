---
date: 2026-10-28T13:15:00+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "281026"
database: real
commit: f3df479
---

E09-S03 (SCRUM-65; manual-run subtask SCRUM-215) manual click-through with screenshots (T-93), run by hand by Amareet.

Local real stack on branch `test/SCRUM-209-e09-manual-runs`, which is `main` at
`f3df479` plus this PR's two setup files: the frontend (Vite, 5173), the local API
(`backend/src/dev.ts`, 3001) and `connectsphere_dev_stack` (Docker `postgres:17`).
Claude reset and seeded it at 12:56 on 28 October 2026, then ran the `setup` stage of
`docs/testing/manual/E09-S01-S03-preconditions.sql` (setup only, never a test
step). Amareet ran `docs/testing/manual/E09-S01-S03-click-through.md` by hand from
about 12:57 to 13:25 on 28 October 2026, with Attendees in a normal Chrome window
and the Organiser (`organiser_a`) in a private one. The three stories were run in
one sitting; this record holds E09-S03's rows.

**Not independent of the code.** Amareet owns the story and wrote it with Claude
(#326, #327, #353, #354). After each step, Claude cross-checked the database
(registrations, statuses, stored dates); those checks are noted in Remarks.

**Screenshots:** taken by hand by Amareet with the Windows Snipping Tool and
pasted into the chat. Claude saved them unchanged under their TC_ID names (T-93).

**Observation, not a failure:** the page accepts a withdrawal deadline that falls before registration opens. The acceptance criteria don't forbid it; it's noted as a possible improvement.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E09S03_01 | Verify that an Event Organiser should be able to set the registration opening and closing dates for an event | PASS | Autumn Workshop (EVT-9204), Registration period: opens 29/10/2026 09:00, closes 20/11/2026 17:00, "Registration period saved."; DB stored 29 Oct 09:00 and 20 Nov 17:00 (+08). |
| TC_E09S03_02 | Verify that an Event Organiser should be able to set a withdrawal deadline for an event | PASS | Saved "withdrawals until 5 Dec 2026, 5:00 pm"; DB 5 Dec 17:00. Entered 05/12/2026, the script's date at the time, not the case's example 10/12/2026: the behaviour (saved as entered) is the same. A first save took the date picker's default, 28/10/2026, and was corrected. |
| TC_E09S03_03 | Verify that an Attendee viewing an event before its registration opening date should see registration as not yet open, with the opening date stated | PASS | attendee_a: Opening soon pill; "Registration opens on 29 Oct 2026, 9:00 am."; no Register button. |
| TC_E09S03_09 | One Event-level registration window should apply to all of its selected Sessions | PASS | Before opening: register page shows only "Registration opens on …", no Session to tick. Organiser moved opening to 27/10/2026 09:00; then both Morning and Afternoon were tickable and one registration took both (DB: one `registered` row, 2 Sessions). |
| TC_E09S03_05 | Verify that setting a registration closing date that falls after the event has started should warn the Organiser and ask them to confirm | PASS | Closes 14/12/2026 10:00 (event starts 09:00): "Confirm the closing date … would close after the event starts on 14 Dec 2026, 9:00 am …", Save greyed out, nothing stored (DB still 20 Nov). Save anyway: saved, DB 14 Dec 10:00. A first attempt was lost to a page reload before Save anyway, which correctly saved nothing; repeated. |
| TC_E09S03_04 | Verify that an Attendee trying to register after the registration closing date has passed should be refused | PASS | Window set to 26/10 09:00 to 28/10 12:00 (no warning); at 13:24 attendee_b saw "Registration for this event has closed.", no Session to tick; DB: no registration for attendee_b. |
| TC_E09S03_06 | Verify that enabling the waiting list for an event should offer it to Attendees once a event becomes full | PASS | Organiser ticked Offer a waiting list for EVT-9203 (full, 4 of 4) and saved (DB `waitlist_enabled` true); attendee_b then saw This event is full with Join the waiting list. |
| TC_E09S03_07 | Verify that registration succeeds at the exact opening timestamp | SKIP | Depends on the database clock; covered by the `registrationState` unit test (`backend/tests/attendeeRegistration.test.ts`) and `registrationPeriod.integration.test.ts`. |
| TC_E09S03_08 | Verify that registration still succeeds at the exact closing timestamp | SKIP | As TC_E09S03_07. |

**Seen outside this run** (not failures, and not from this script's steps): the
audit log has 11 `Access Denied` rows between 13:05 and 13:18. They are attendee_k
and attendee_a refused `/internal/planning/EVT-9201` and `EVT-9204`, attendee_k
refused the Organiser `events` screen, and organiser_a refused `attendee_events`.
No link in the app leads there; most likely the browser preloaded address-bar
suggestions from earlier sessions. Each was correctly refused.

## Screenshots

Taken by hand by Amareet during the run (T-93) and saved unchanged.

- [TC_E09S03_01](evidence/20261028-131500-amareetkm2024-del-frontend-e2e/TC_E09S03_01.png)
- [TC_E09S03_02](evidence/20261028-131500-amareetkm2024-del-frontend-e2e/TC_E09S03_02.png)
- [TC_E09S03_03](evidence/20261028-131500-amareetkm2024-del-frontend-e2e/TC_E09S03_03.png)
- [TC_E09S03_09-1](evidence/20261028-131500-amareetkm2024-del-frontend-e2e/TC_E09S03_09-1.png)
- [TC_E09S03_09-2](evidence/20261028-131500-amareetkm2024-del-frontend-e2e/TC_E09S03_09-2.png)
- [TC_E09S03_05-1](evidence/20261028-131500-amareetkm2024-del-frontend-e2e/TC_E09S03_05-1.png)
- [TC_E09S03_05-2](evidence/20261028-131500-amareetkm2024-del-frontend-e2e/TC_E09S03_05-2.png)
- [TC_E09S03_04](evidence/20261028-131500-amareetkm2024-del-frontend-e2e/TC_E09S03_04.png)
- [TC_E09S03_06](evidence/20261028-131500-amareetkm2024-del-frontend-e2e/TC_E09S03_06.png)
