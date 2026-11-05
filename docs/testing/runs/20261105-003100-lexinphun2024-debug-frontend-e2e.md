---
date: 2026-11-05T00:31:00+08:00
runner: lexinphun2024-debug
environment: local
run_type: manual
test_case_version: "041126"
scope: frontend/e2e
database: real
commit: 6867c9a
---

Le Xin's manual run of section F of `docs/testing/manual/E08-S04-click-through.md`
(E08-S04 / SCRUM-61, subtask SCRUM-250): TC_E08S04_05 with E08-S06's real
Safety Officer check before and after. Real local stack: native PostgreSQL 17
`connectsphere_dev_stack` on 127.0.0.1:5432 (reset, seeded, then
`E08-S04-preconditions.sql` stage `setup`), the local API (`DATABASE_URL` only)
and Vite on http://localhost:5173, in a real browser, signed in with the seed
accounts. Screenshots are hand-taken (T-93).

Fixture substitutions, as the guide lists: `coord_a`, `venue_a` and
`safety_officer` stand in for the case's `coordinator_1` and `venue_staff_1`;
EVT-1085 Charity Gala replaces the case's Charity Run. Step 7 has two
screenshots (-19 the Activity log, -20 the status), so the final approval is
-21. The `check` stage afterwards matched: EVT-1085 `confirmed`, E08 Gala Hall
on 21 Dec 18:00 and not flagged, one "Entered Safety Review after
reconfirmation" by venue_a, and two separate "Safety check approved" checklist
rows (00:31 and 00:39).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E08S04_05 | A reverted Event enters Safety Review automatically after all arrangements are reconfirmed, with the real Operational Safety Check (EVT-1085) | PASS | Safety Officer approved Charity Gala, it went Confirmed. Reverted it and moved it to 21 Dec, readiness said "needs reconfirmation by Venue Staff", no capacity text. Venue Staff reconfirmed and it went to Safety Review on its own, no submit. Safety Officer got it back with all 7 factors on "Choose..." and empty comments, and the notice says the earlier approval does not carry over. Activity log still has "Safety check approved". Approved again and it is Confirmed. |

## Screenshots

- [TC_E08S04_05-14](evidence/20261105-003100-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-14.png): first approval, Confirmed
- [TC_E08S04_05-15](evidence/20261105-003100-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-15.png): readiness, "E08 Gala Hall — needs reconfirmation by Venue Staff"
- [TC_E08S04_05-16](evidence/20261105-003100-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-16.png): Venue Staff reconfirmed, "now in Safety Review"
- [TC_E08S04_05-17](evidence/20261105-003100-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-17.png): new review, every factor unanswered
- [TC_E08S04_05-18](evidence/20261105-003100-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-18.png): Safety Officer's "Safety check needed" notice
- [TC_E08S04_05-19](evidence/20261105-003100-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-19.png): Activity log keeps "Safety check approved"
- [TC_E08S04_05-20](evidence/20261105-003100-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-20.png): status Safety Review
- [TC_E08S04_05-21](evidence/20261105-003100-lexinphun2024-debug-frontend-e2e/TC_E08S04_05-21.png): second approval, Confirmed
