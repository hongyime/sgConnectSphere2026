---
date: 2026-11-03T00:24:00+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: 031126
database: real
commit: 75980fe
---

Automated click-through of section K of
`docs/testing/manual/E10-S02-click-through.md` on the real local stack: native
PostgreSQL 17 `connectsphere_dev_stack` on 127.0.0.1:5432 (reset and seeded with
every migration, then `E10-S02-preconditions.sql` stage `setup`), the local API
(`backend/src/dev.ts`, `DATABASE_URL` only, `DATABASE_POOLER_URL` empty) and Vite
on 5173, driven by a temporary Playwright script in Chromium (Asia/Singapore),
one sign-in per role, with read-only database checks alongside. 1 section, 2
cases, 11 checks, all passed. E10-S02 follow-up on the E04-S02 Session screen
(T-104), story SCRUM-71, subtask SCRUM-244. This is the automated real-stack run
before Le Xin's manual run; it is not the manual T-93 evidence.

Fixture substitutions, as the guide lists: `organiser_a`, `tech_a` (shown as
"Technical Support A") and `tech_b` stand in for the cases' `organiser_1`,
`tech_support_1` and `tech_support_2`; EVT-1029 Design Week replaces the cases'
Event E-1, with Session B as Day 2.

The first attempt stopped at sign-in: the API had been started without
`APP_URL`, so it refused the browser's origin (`[csrf] no allowed origins
configured`). Nothing was written. The API was restarted with
`APP_URL=http://localhost:5173` and the recorded run made from the start on the
same fresh data. No application code or check changed between the attempts.
The `check` stage afterwards matched the guide: EVT-1029 Sound desk flagged at
13 Mar 12:00 moving to 13 Mar 13:00, one "Reconfirmation required: date or time
changed" row, Lighting not flagged, one notice for tech_a and none for anyone
else.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_14 | Moving a Session on the Session screen counts the staffed Technical Support requests it flags before saving | PASS | organiser_a moved Day 2 to 13 Mar 2027 2:00–4:30 pm: "Save this Session change? This change flags 0 booking(s), 0 reservation(s) and 1 Technical Support request(s) for reconfirmation."; database still 1:00 pm and Sound desk unflagged before confirming; after Save anyway "Session saved.", database 14:00–16:30 and the reloaded page shows 02:00 pm |
| TC_E10S02_15 | Moving a Session on the Session screen notifies only the technicians on the Technical Support request it flags | PASS | Sound desk flagged, moving 13 Mar 12:00 → 13:00; Lighting not flagged and unchanged; tech_a has one Design Week notice "An event change (date or time) means venue bookings, equipment reservations or Technical Support requests need reconfirmation." (screen and database); tech_a's Support to reconfirm lists only EVT-1029 Sound desk, Staffed for 12:00 pm – 2:00 pm, Reconfirm for 1:00 pm – 3:00 pm; tech_b sees "No notifications yet." and nobody else got a Design Week notice |

Observations (not failures): the notice text ends "Changed at
2026-11-02T16:24:13.737Z", a raw UTC time (E11 notice wording, seen in earlier
runs; not changed here). The Session screen shows the confirm box above the
Session list rather than beside Day 2.
