---
date: 2026-11-03T00:32:00+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "031126"
database: real
commit: 4bb6cf3
---

Story owner's manual run of the E10-S02 Session-screen follow-up (T-104 on the
E04-S02 Session screen; story SCRUM-71, subtask SCRUM-244). Le Xin followed
section K of `docs/testing/manual/E10-S02-click-through.md` by hand in a real
browser. Every screenshot below was taken by Le Xin by hand (T-93); Claude saved
each pasted screenshot under its TC_ID.

The stack: Vite on 127.0.0.1:5173; the local API (`backend/src/dev.ts`) with
only `DATABASE_URL` and `APP_URL=http://localhost:5173`; native PostgreSQL 17
`connectsphere_dev_stack` on 127.0.0.1:5432, reset (every migration), seeded and
loaded with `E10-S02-preconditions.sql` stage `setup` after the automated run
`20261103-002400`, so this run started on fresh data. Application code as
d3c8b66 (4bb6cf3 adds only the guide, setup SQL and the automated record). No
code changed during the run.

Fixture substitutions, as the guide lists: `organiser_a`, `tech_a` (shown as
"Technical Support A") and `tech_b` stand in for the cases' `organiser_1`,
`tech_support_1` and `tech_support_2`; EVT-1029 Design Week replaces Event E-1,
with Session B as Day 2. Read-only database checks afterwards matched the
screens: Day 2 at 13 Mar 14:00–16:30 and Day 1 unchanged, Sound desk flagged
with one "Reconfirmation required: date or time changed" row, Lighting not
flagged, one Design Week notice for tech_a and none for tech_b.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_14 | Moving a Session on the Session screen counts the staffed Technical Support requests it flags before saving | PASS | Moved Day 2 to 2:00–4:30 pm and clicked Save session. Got "Save this Session change?" saying it flags 0 booking(s), 0 reservation(s) and 1 Technical Support request(s). Nothing saved until I clicked Save anyway, then "Session saved." with Day 2 at 02:00–04:30 pm. |
| TC_E10S02_15 | Moving a Session on the Session screen notifies only the technicians on the Technical Support request it flags | PASS | tech_a got 1 Event update for Design Week saying Technical Support requests need reconfirmation. Under Support to reconfirm only Sound desk shows, 12:00–2:00 pm moving to 1:00–3:00 pm, Lighting not there. tech_b has no notifications. |

Observation (not a failure): the notice ends "Changed at
2026-11-02T16:40:55.362Z", a raw UTC time (E11 notice wording, seen in earlier
runs; not changed here).

## Screenshots

- [TC_E10S02_14-2](evidence/20261103-003200-lexinphun2024-debug-frontend-e2e/TC_E10S02_14-2.png): Day 2 moved to 2:00–4:30 pm, confirm box counts 1 Technical Support request
- [TC_E10S02_14-3](evidence/20261103-003200-lexinphun2024-debug-frontend-e2e/TC_E10S02_14-3.png): "Session saved." with Day 2 at 02:00–04:30 pm
- [TC_E10S02_15-4](evidence/20261103-003200-lexinphun2024-debug-frontend-e2e/TC_E10S02_15-4.png): tech_a's Design Week notice, Technical Support requests need reconfirmation
- [TC_E10S02_15-5](evidence/20261103-003200-lexinphun2024-debug-frontend-e2e/TC_E10S02_15-5.png): tech_a's Support to reconfirm, only Sound desk, 12:00–2:00 pm to 1:00–3:00 pm
- [TC_E10S02_15-6](evidence/20261103-003200-lexinphun2024-debug-frontend-e2e/TC_E10S02_15-6.png): tech_b, "No notifications yet."
