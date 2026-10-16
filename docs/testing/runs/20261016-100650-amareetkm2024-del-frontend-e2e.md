---
date: 2026-10-16T10:06:50+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 141026
database: real
commit: 0379cb2
---

Sprint 3 re-run of the E07-S07 manual check (story SCRUM-57) with screenshots,
as T-93 requires for Sprint 3 Done stories before the Sprint 3 Review. The
story stays Done (T-74); this is a new record, and the earlier SCRUM-151
record is unchanged.

Amareet ran `docs/testing/manual/E07-S07-click-through.md` by hand in a real
browser, using a normal window (`coord_a`) and a private window (`tech_a`,
then `tech_b`), signing in through the login page, and took every screenshot
below herself. The stack was:

- the frontend (Vite, 127.0.0.1:5173)
- the local API (`backend/src/dev.ts`, 3001)
- a freshly reset and seeded local PostgreSQL 17 database in Docker
  (`connectsphere_dev_stack`, migrations 0001 to 0019), never the shared
  database

The code under test is `main` at `0379cb2`. Claude set up the stack, checked
each screenshot as it arrived and checked the database afterwards; the
database facts below come from that check. Every step matched the script.

Database check after the run (times Singapore):

- 10:06:50 — EVT-3003 support request "1 AV technician for the full event",
  25 Oct 2026, 6:00 pm – 10:00 pm; now `staffed`.
- 10:08:12 — EVT-3001 support request "1 AV technician for the evening
  reception", 25 Oct 2026, 7:00 pm – 11:00 pm; now `open` again.
- 10:14:33 — tech_b assigned to EVT-3001; the row is now `released` (removed
  in step 13, kept rather than deleted).
- 10:39:54 — tech_b assigned to EVT-3003; the row is `assigned`.
- tech_b's notifications: "Technical support requested" for EVT-3003 (10:06)
  and EVT-3001 (10:08); "You're assigned to EVT-3001 Approved Annual
  Conference: 1 AV technician for the evening reception" (10:14); "You're no
  longer assigned to EVT-3001 Approved Annual Conference. That time is free
  again." (10:38); "You're assigned to EVT-3003 Planning Phase Gala: 1 AV
  technician for the full event" (10:39).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S07_01 | A colleague with no conflicting assignment is assigned | PASS | Steps 5–7: Technician staffing showed "Needs a technician 2" with EVT-3003 Planning Phase Gala and EVT-3001 Approved Annual Conference, both "None yet". EVT-3001: "Nobody is assigned yet."; Technical Support A and B both "Free for these times", Available. "Assign Technical Support B?" with "…added to their schedule for 25 Oct 2026, 7:00 pm – 11:00 pm."; Assign technician showed "Technical Support B is assigned and has been notified. It's on their schedule.", the pill Staffed, and Technical Support B under Assigned technicians. Database: tech_b assigned to EVT-3001. |
| TC_E07S07_02 | The assignment shows on the assigned staff member's schedule | PASS | Step 8: tech_b's My schedule, Upcoming: "EVT-3001 Approved Annual Conference", "25 Oct 2026, 7:00 pm – 11:00 pm · 1 AV technician for the evening reception". Step 16: after the removal and reassignment, My schedule listed only "EVT-3003 Planning Phase Gala", "25 Oct 2026, 6:00 pm – 10:00 pm · 1 AV technician for the full event". |
| TC_E07S07_03 | Assigning a colleague with an overlapping assignment is blocked, conflicting event identified | PASS | Steps 10–11: on EVT-3003, Technical Support B read "Busy: EVT-3001 Approved Annual Conference, 25 Oct 2026, 7:00 pm – 11:00 pm" with Overlapping assignment (Technical Support A Available). Assign technician showed "Technical Support B is already assigned to EVT-3001 Approved Annual Conference at an overlapping time." inside the panel; EVT-3003 stayed "Needs a technician". Database: no new assignment. |
| TC_E07S07_04 | Removing an assignment frees the slot | PASS | Steps 12–13: "Remove Technical Support B?" with "Technical Support B will be notified, and their time is freed for other events."; Remove assignment showed "Technical Support B is no longer assigned and has been notified. Their time is free again.", "Nobody is assigned yet." and the pill Needs a technician. Database: the EVT-3001 assignment is `released`. |
| TC_E07S07_05 | A replacement goes through the same conflict check | PASS | Steps 14–15: on EVT-3003, Technical Support B now read "Free for these times", Available; Assign technician showed "Technical Support B is assigned and has been notified. It's on their schedule." and the pill Staffed. The seed has two technicians, so the "replacement also blocked" variant is covered by `tests/auth-e2e/technicalSupport.spec.ts`, not this run. |
| TC_E07S07_06 | The staff member is notified when assigned and when removed | PASS | Steps 9 and 16: tech_b's notifications listed "Technical support assignment" (10:39), "Technical support assignment removed" (10:38) and "Technical support assignment" (10:14), plus two "Technical support requested" notices from steps 2–3. The 10:14 one read "You're assigned to EVT-3001 Approved Annual Conference: 1 AV technician for the evening reception"; the removal read "You're no longer assigned to EVT-3001 Approved Annual Conference. That time is free again."; the 10:39 one read "You're assigned to EVT-3003 Planning Phase Gala: 1 AV technician for the full event". |
| MULTIPLE | A Coordinator cannot open technician staffing | PASS | Step 4: as coord_a, /support/technicians showed "Access refused" and "Access denied. Only Technical Support Staff can assign technicians." Steps 2–3 (setup) matched: "Technical support requested" and "2 Technical Support Staff members have been notified."; the EVT-3001 request listed at "25 Oct 2026, 7:00 pm – 11:00 pm" with Awaiting a technician. |

## Screenshots

Taken by hand by Amareet during this run (T-93). Six were saved by her
directly; the other eleven were pasted into the agent chat and saved unchanged
by Claude under their TC_ID names.

- [MULTIPLE-coordinator-refused](evidence/20261016-100650-amareetkm2024-del-frontend-e2e/MULTIPLE-coordinator-refused.png): step 4, the Coordinator refused at /support/technicians.
- [TC_E07S07_01-1](evidence/20261016-100650-amareetkm2024-del-frontend-e2e/TC_E07S07_01-1.png): step 5, Needs a technician (2).
- [TC_E07S07_01-2](evidence/20261016-100650-amareetkm2024-del-frontend-e2e/TC_E07S07_01-2.png): step 6, both colleagues free.
- [TC_E07S07_01-3](evidence/20261016-100650-amareetkm2024-del-frontend-e2e/TC_E07S07_01-3.png): step 7, "Assign Technical Support B?".
- [TC_E07S07_01-4](evidence/20261016-100650-amareetkm2024-del-frontend-e2e/TC_E07S07_01-4.png): step 7, assigned and Staffed.
- [TC_E07S07_02-1](evidence/20261016-100650-amareetkm2024-del-frontend-e2e/TC_E07S07_02-1.png): step 8, tech_b's schedule with EVT-3001.
- [TC_E07S07_06-1](evidence/20261016-100650-amareetkm2024-del-frontend-e2e/TC_E07S07_06-1.png): step 9, the assignment notice for EVT-3001.
- [TC_E07S07_03-1](evidence/20261016-100650-amareetkm2024-del-frontend-e2e/TC_E07S07_03-1.png): step 10, Technical Support B Busy, Overlapping assignment.
- [TC_E07S07_03-2](evidence/20261016-100650-amareetkm2024-del-frontend-e2e/TC_E07S07_03-2.png): step 11, the overlap refusal.
- [TC_E07S07_04-1](evidence/20261016-100650-amareetkm2024-del-frontend-e2e/TC_E07S07_04-1.png): step 12, "Remove Technical Support B?".
- [TC_E07S07_04-2](evidence/20261016-100650-amareetkm2024-del-frontend-e2e/TC_E07S07_04-2.png): step 13, removed, Needs a technician.
- [TC_E07S07_05-1](evidence/20261016-100650-amareetkm2024-del-frontend-e2e/TC_E07S07_05-1.png): step 14, Technical Support B free again.
- [TC_E07S07_05-2](evidence/20261016-100650-amareetkm2024-del-frontend-e2e/TC_E07S07_05-2.png): step 15, reassigned to EVT-3003.
- [TC_E07S07_06-2](evidence/20261016-100650-amareetkm2024-del-frontend-e2e/TC_E07S07_06-2.png): step 16, tech_b's notification list.
- [TC_E07S07_06-3](evidence/20261016-100650-amareetkm2024-del-frontend-e2e/TC_E07S07_06-3.png): step 16, the removal notice.
- [TC_E07S07_06-4](evidence/20261016-100650-amareetkm2024-del-frontend-e2e/TC_E07S07_06-4.png): step 16, the assignment notice for EVT-3003.
- [TC_E07S07_02-2](evidence/20261016-100650-amareetkm2024-del-frontend-e2e/TC_E07S07_02-2.png): step 16, My schedule with only EVT-3003.
