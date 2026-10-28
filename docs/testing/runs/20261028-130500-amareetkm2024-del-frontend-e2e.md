---
date: 2026-10-28T13:05:00+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "281026"
database: real
commit: f3df479
---

E09-S02 (SCRUM-64; manual-run subtask SCRUM-212) manual click-through with screenshots (T-93), run by hand by Amareet.

Local real stack on branch `test/SCRUM-209-e09-manual-runs`, which is `main` at
`f3df479` plus this PR's two setup files: the frontend (Vite, 5173), the local API
(`backend/src/dev.ts`, 3001) and `connectsphere_dev_stack` (Docker `postgres:17`).
Claude reset and seeded it at 12:56 on 28 October 2026, then ran the `setup` stage of
`docs/testing/manual/E09-S01-S03-preconditions.sql` (setup only, never a test
step). Amareet ran `docs/testing/manual/E09-S01-S03-click-through.md` by hand from
about 12:57 to 13:25 on 28 October 2026, with Attendees in a normal Chrome window
and the Organiser (`organiser_a`) in a private one. The three stories were run in
one sitting; this record holds E09-S02's rows.

**Not independent of the code.** Amareet owns the story and wrote it with Claude
(#326, #327, #353, #354). After each step, Claude cross-checked the database
(registrations, statuses, stored dates); those checks are noted in Remarks.

**Screenshots:** taken by hand by Amareet with the Windows Snipping Tool and
pasted into the chat. Claude saved them unchanged under their TC_ID names (T-93).

**Setup stand-in:** EVT-9203's Session 1 holds three registrations in a one-place room, set by SQL, to stand in for a capacity drop (for example a smaller layout). That's the only way an Event can be full while a Session has room, because Event capacity is the sum of its Sessions (#353).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E09S02_12 | Combined Event capacity should reflect confirmed Session layout capacities | PASS | Organiser Registrations for EVT-9201: Event 2 of 5 taken; Talks 2 of 2 Full, Mixer 1 of 3 (5 = Grand Auditorium's 2 + Seminar Room B's 3). |
| TC_E09S02_08 | A registration should be confirmed up to the approved capacity of every selected Session | PASS | Same screen: attendee_c's registration (E09-S01 run) took Talks' last place, 2 of 2, not over it. |
| TC_E09S02_09 | A registration exceeding a selected Session capacity should remain Pending | PASS | attendee_a ticked full Talks: hint and button "Send request for review", no waiting-list link; "Request sent for review". DB: attendee_a `pending`; registered places unchanged. |
| TC_E09S02_11 | An Organiser should approve a Pending request only if both capacity limits still allow it | PASS | Before: Pending row with Capacity "Talks" is full (2 of 2 places), Approve greyed out, places 2 of 5. Claude then ran stage `tc11` (Talks gains Seminar Room D, 3 places). After: Fits, Approve: "Attendee A is now registered.", Event 4 of 8, Talks 3 of 5, no pending requests (audit `Registration Approved` 13:12:11). |
| TC_E09S02_07 | A manual addition should be blocked when either capacity is full | PASS | attendee_i to full Talks: refused with Can't add them. "Talks" is full (2 of 2 places). Places unchanged; DB: no row for attendee_i on EVT-9201. |
| TC_E09S02_06 | An Organiser may manually add an attendee only when both capacities have room | PASS | attendee_j to Mixer: "attendee_j@example.com is registered and marked as a manual addition." Event 3 of 5, Mixer 2 of 3. DB: `registered`, `manually_added` true. |
| TC_E09S02_10 | A registration exceeding combined Event capacity should remain Pending | PASS | Sold-out Seminar (EVT-9203, 4 of 4, waiting list off): "This event is full … You can still send a registration request"; Session 1 Full, Session 2 not; Session 2 sent: "Request sent for review". DB: attendee_a `pending`, 4 registered unchanged. |
| TC_E09S02_04 | A full combined Event should offer its enabled Event-level waiting list | PASS | Run as the E09-S03 run's last step: after the Organiser turned EVT-9203's waiting list on, attendee_b saw "This event is full … You can join the waiting list, or send a registration request" with one Join the waiting list button, no per-Session list (T-98). |
| TC_E09S02_03 | Concurrent registration attempts should not exceed a Session or combined Event capacity | SKIP | Two submissions at the same instant can't be done by hand; covered on real PostgreSQL by `backend/tests/attendeeCapacity.integration.test.ts` (green in CI on #353). |

**Seen outside this run** (not failures, and not from this script's steps): the
audit log has 11 `Access Denied` rows between 13:05 and 13:18. They are attendee_k
and attendee_a refused `/internal/planning/EVT-9201` and `EVT-9204`, attendee_k
refused the Organiser `events` screen, and organiser_a refused `attendee_events`.
No link in the app leads there; most likely the browser preloaded address-bar
suggestions from earlier sessions. Each was correctly refused.

## Screenshots

Taken by hand by Amareet during the run (T-93) and saved unchanged.

- [TC_E09S02_12](evidence/20261028-130500-amareetkm2024-del-frontend-e2e/TC_E09S02_12.png)
- [TC_E09S02_08](evidence/20261028-130500-amareetkm2024-del-frontend-e2e/TC_E09S02_08.png)
- [TC_E09S02_09](evidence/20261028-130500-amareetkm2024-del-frontend-e2e/TC_E09S02_09.png)
- [TC_E09S02_11-1](evidence/20261028-130500-amareetkm2024-del-frontend-e2e/TC_E09S02_11-1.png)
- [TC_E09S02_11-2](evidence/20261028-130500-amareetkm2024-del-frontend-e2e/TC_E09S02_11-2.png)
- [TC_E09S02_07](evidence/20261028-130500-amareetkm2024-del-frontend-e2e/TC_E09S02_07.png)
- [TC_E09S02_06](evidence/20261028-130500-amareetkm2024-del-frontend-e2e/TC_E09S02_06.png)
- [TC_E09S02_10](evidence/20261028-130500-amareetkm2024-del-frontend-e2e/TC_E09S02_10.png)
- [TC_E09S02_04](evidence/20261028-130500-amareetkm2024-del-frontend-e2e/TC_E09S02_04.png)
