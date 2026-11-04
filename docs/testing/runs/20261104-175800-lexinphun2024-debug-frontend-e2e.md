---
date: 2026-11-04T17:58:00+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "031126"
database: real
commit: e0cd021
---

Story owner's manual re-run of E10-S02 on the Organiser's Session screen (story
SCRUM-71) after #416 (Session date notice, stale-check sentence) and Amareet's
#422 (the screen reuses `ArrangementReview`). Le Xin followed sections K and L of
`docs/testing/manual/E10-S02-click-through.md` by hand in a real browser. Every
screenshot below was taken by Le Xin by hand (T-93); Claude saved each pasted
screenshot under its TC_ID and added a label strip above it, as Le Xin asked
(the screenshot below the strip is unchanged).

The stack: Vite on 127.0.0.1:5173; the local API (`backend/src/dev.ts`) with
only `DATABASE_URL` and `APP_URL=http://localhost:5173`; native PostgreSQL 17
`connectsphere_dev_stack` on 127.0.0.1:5432, reset (every migration), seeded and
loaded with `E10-S02-preconditions.sql` stage `setup` before the run. Application
code as `main` 5ea9ab58 (#422); e0cd021 adds only the guide, setup SQL and the
automated record `20261104-175630`. No code changed during the run.

The first attempt at section K was stopped after step 3: "Sign language
interpreter" had been ticked on Day 2 by mistake and was saved with the time
change (the screen does not tick it by itself: EVT-1030's Sessions loaded with
nothing ticked). Its screenshot was discarded, the data reset and seeded again,
and sections K and L run from the start. The read-only checks afterwards matched
the screens: Day 2 of EVT-1029 at 13 Mar 14:00–16:30 with no needs, Sound desk
flagged moving to 13:00, Lighting not flagged; tech_a one reconfirmation notice,
tech_b and coord_a one "Session date, time changed" each, organiser_a none;
EVT-1030 Day 2 on Boardroom with its booking flagged, one "Reconfirmation
required: room layout changed, attendance above capacity" row, venue_a one
notice, 30 still registered.

Fixture substitutions, as the guide lists: `organiser_a`, `tech_a` ("Technical
Support A"), `tech_b` and `venue_a` stand in for the cases' accounts; EVT-1029
Design Week and EVT-1030 Design Summit replace Event E-1, with Session B as
Day 2.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_14 | Moving a Session on the Session screen lists the staffed Technical Support requests it flags before saving | PASS | Moved Day 2 to 2:00–4:30 pm and clicked Save session. The review listed Sound desk, 12:00–2:00 pm moving to 1:00–3:00 pm, with no booking or equipment. Nothing saved until I clicked Save and ask staff to reconfirm; after reload Day 2 shows 2:00–4:30 pm with nothing ticked. |
| TC_E10S02_15 | Moving a Session on the Session screen asks only the technicians on the flagged Technical Support request to reconfirm | PASS | tech_a got 1 notice that Technical Support requests need reconfirmation, and Support to reconfirm shows only Sound desk, 12:00–2:00 pm to 1:00–3:00 pm. tech_b only got "Session date, time changed", no reconfirm notice. |
| TC_E10S02_16 | A Session change on the Session screen that leaves fewer places than registered Attendees warns without removing anyone | PASS | Changed Day 2's layout to Boardroom. The review flagged E10 Seminar Room B (room layout changed; 40 people for 20 places) and warned 30 registered for 20 places, no one removed. After saving, "Session saved." with Boardroom; still 30 registered. |

Observation (not a failure): notices end "Changed at <UTC ISO time>", for
example "Changed at 2026-11-04T10:13:36.744Z" (E11 notice wording, seen in
earlier runs; not changed here).

## Screenshots

- [TC_E10S02_14-2](evidence/20261104-175800-lexinphun2024-debug-frontend-e2e/TC_E10S02_14-2.png): review names Sound desk, 12:00–2:00 pm → 1:00–3:00 pm, before saving
- [TC_E10S02_14-3](evidence/20261104-175800-lexinphun2024-debug-frontend-e2e/TC_E10S02_14-3.png): after saving and reload, Day 2 at 2:00–4:30 pm, nothing ticked
- [TC_E10S02_15-4](evidence/20261104-175800-lexinphun2024-debug-frontend-e2e/TC_E10S02_15-4.png): tech_a's one Design Week notice, Technical Support requests need reconfirmation
- [TC_E10S02_15-5](evidence/20261104-175800-lexinphun2024-debug-frontend-e2e/TC_E10S02_15-5.png): tech_a's Support to reconfirm, only Sound desk, 12:00–2:00 pm → 1:00–3:00 pm
- [TC_E10S02_15-6](evidence/20261104-175800-lexinphun2024-debug-frontend-e2e/TC_E10S02_15-6.png): tech_b's only notice, "Session date, time changed", not asked to reconfirm
- [TC_E10S02_16-2](evidence/20261104-175800-lexinphun2024-debug-frontend-e2e/TC_E10S02_16-2.png): Boardroom review, Seminar Room B flagged, 30 registered for 20 places, no one removed
- [TC_E10S02_16-3](evidence/20261104-175800-lexinphun2024-debug-frontend-e2e/TC_E10S02_16-3.png): "Session saved.", Day 2 on Boardroom
