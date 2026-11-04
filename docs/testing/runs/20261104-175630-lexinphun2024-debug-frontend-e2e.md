---
date: 2026-11-04T17:56:30+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: "031126"
database: real
commit: abb833c
---

Automated click-through of sections K and L of
`docs/testing/manual/E10-S02-click-through.md` on the real local stack after
#416 and Amareet's #422 (Session screen reuses `ArrangementReview`): native
PostgreSQL 17 `connectsphere_dev_stack` on 127.0.0.1:5432 (reset and seeded
with every migration, then `E10-S02-preconditions.sql` stage `setup`), the local
API (`backend/src/dev.ts`, `DATABASE_URL` and `APP_URL` only,
`DATABASE_POOLER_URL` empty) and Vite on 5173, driven by a temporary Playwright
script in Chromium (Asia/Singapore), one sign-in per role, with read-only
database checks alongside. 2 sections, 3 cases, 19 checks, all passed. Story
SCRUM-71; this is the automated real-stack run before Le Xin's manual re-run, not
the manual T-93 evidence.

Fixture substitutions, as the guide lists: `organiser_a`, `tech_a` ("Technical
Support A"), `tech_b`, `coord_a` and `venue_a` stand in for the cases' accounts;
EVT-1029 Design Week and EVT-1030 Design Summit replace the cases' Event E-1.

The first attempt, on the same kind of fresh data and the same application code,
had 18 of 19 checks pass. The one failure was the guide's, not the app's:
section K step 6 said tech_b's **Support to reconfirm** would not list Sound
desk, but that list is shared because any Technical Support Staff member may
reconfirm (the T-104 decision recorded in the SCRUM-244 handoff); TC_E10S02_15
only requires that tech_b is not asked to reconfirm, which held (no
reconfirmation notice). Section L also showed a second, correct reason, "40
people for 20 places" (Day 2 expects 40; Scenario 1). Both guide lines and the
script's check were corrected in abb833c, the data reset and seeded again, and
the recorded run made from the start. No application code changed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_14 | Moving a Session on the Session screen lists the staffed Technical Support requests it flags before saving | PASS | Day 2 moved to 13 Mar 2:00–4:30 pm: "Check what this change affects", under Technical Support to reconfirm "Sound desk: 13 Mar 2027, 12:00 pm – 2:00 pm → 13 Mar 2027, 1:00 pm – 3:00 pm", no booking or equipment; database unchanged before confirming; after "Save and ask staff to reconfirm" "Session saved.", 14:00–16:30 saved and shown after reload |
| TC_E10S02_15 | Moving a Session on the Session screen asks only the technicians on the flagged Technical Support request to reconfirm | PASS | Sound desk flagged, moving 12:00 → 13:00; Lighting unchanged; tech_a one reconfirmation notice; tech_b and coord_a one "Design Week: Session date, time changed." each; organiser_a none; tech_a's and tech_b's shared Support to reconfirm list Sound desk only |
| TC_E10S02_16 | A Session change on the Session screen that leaves fewer places than registered Attendees warns without removing anyone | PASS | Day 2 layout to Boardroom: "E10 Seminar Room B: room layout changed; 40 people for 20 places" and "More people are registered than there are places: A Session: 30 registered for 20 places. The whole event: 30 registered for 20 places. No one will be removed or moved to the waiting list."; nothing saved before confirming; after confirming Boardroom saved, booking flagged, 30 still registered, venue_a one reconfirmation notice |

Observations (not failures): notices end "Changed at <UTC ISO time>" (E11
wording, seen in earlier runs). In full-page screenshots the sticky header
lands mid-page (capture artefact).
