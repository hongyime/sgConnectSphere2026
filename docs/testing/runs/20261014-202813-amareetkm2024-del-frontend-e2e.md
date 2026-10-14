---
date: 2026-10-14T20:28:13+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 131026
database: real
commit: 73e7e4b
pr: 252
---

SCRUM-144, the manual end-to-end check for E06-S05 (SCRUM-49). Amareet ran
`docs/testing/manual/E06-S05-click-through.md` by hand in a real browser,
using a normal window (`coord_a`) and a private window (`venue_a`), signing in
through the login page. The stack was:

- the frontend (Vite, 127.0.0.1:5173)
- the local API (`backend/src/dev.ts`, 3001)
- a freshly reset and seeded local PostgreSQL 17 database in Docker
  (`connectsphere_dev_stack`, migrations 0001 to 0013), never the shared
  database

The code under test is #252 at `73e7e4b`, which includes #245 (merged to
`main` as `74b0151`). Claude set up the stack, ran the step-15 database update
that moves a live hold's expiry into the past, and checked the database
afterwards; the database facts below come from that check. Amareet reported
that every step matched the script. Run by Amareet.

A first attempt was abandoned before step 8: "Submit booking request" was
clicked right after step 6, turning the hold into a booking request (audit
12:02:29 and 12:02:38 UTC), so Venue Staff correctly saw no holds. The database
was reset to a fresh seed and the whole script was run again; only that second
run is recorded here. In the second run Jasmine Hall was held, released and
held again before step 15; the extra release does not affect any step.

Database check after the run (times Singapore):

- 20:28:13 — "Tentative hold placed on Cedar Auditorium" by coord_a; expires
  16 Oct 2026, 8:28 pm (48 hours).
- 20:28:47 — "Tentative hold on Cedar Auditorium extended" by venue_a;
  16 Oct 2026, 8:28 pm → 16 Oct 2026, 10:30 pm.
- 20:29:16 — "Tentative hold on Cedar Auditorium submitted as a booking
  request" by coord_a; the Cedar Auditorium row is now `pending` with no expiry.
- 20:30:08 and 20:30:22 — Lotus Room hold placed, then released, by coord_a;
  the row is `released`.
- 20:32:02 — "Tentative hold placed on Jasmine Hall" by coord_a; the step-15
  update moved its expiry to 20:31:03, and the row is still `tentative` (the
  expiry job does not run locally).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S05_03 | A new hold carries a 48-hour expiry that Venue Staff can change | PASS | Steps 2–6 and 8–10: EVT-3003's Venue holds card empty; search showed Orchid Hall Unavailable with no hold link and Cedar Auditorium Suitable with "Hold this venue"; form defaulted to 25 Oct 2026 6:00 pm – 10:00 pm and "48 hours from now (default)"; "Venue held" and the pill "Tentative · expires …" shown. Database: expiry exactly 48 hours after placing. Venue Staff saw the hold under Tentative holds and moved the expiry to 16 Oct 2026, 10:30 pm (2 hours later than before rather than the script's "3 days from now"; any later time is a valid extension). |
| TC_E06S05_01 | A second hold on the same venue and period is refused, naming the hold | PASS | Step 7: after Back, Hold venue again showed "This venue can't be held" and "This venue already has a tentative hold for EVT-3003 Planning Phase Gala from 25 Oct 2026, 6:00 pm to 25 Oct 2026, 10:00 pm." Database: only one hold placed on Cedar Auditorium. |
| TC_E06S05_04 | Submitting a booking request completes the hold so it no longer expires | PASS | Steps 11–12: "Booking request submitted for Cedar Auditorium. The hold no longer expires."; the hold left the list. Database: the same row is `pending` with no expiry. |
| TC_E06S05_07 | Venue Staff can extend an unexpired hold, and the extension is logged | PASS | Steps 9–11: an earlier time was refused with "Choose a later expiry than the current one."; the later time saved with "Expiry changed"; the event's Activity log listed "Tentative hold placed on Cedar Auditorium" (Coordinator A) and "Tentative hold on Cedar Auditorium extended" with "Hold expiry: … → …" (Venue Staff A). Database: audit actor `venue_a`, old and new expiry recorded. |
| TC_E06S05_05 | A hold whose expiry has passed no longer holds the venue | PASS | Steps 15–16 (display only): after the expiry was moved into the past, Jasmine Hall showed "Expired …" and "This hold no longer holds the venue. Place a new hold if it's still needed." with no buttons. The expiry job and its notice are covered by the automated tests, not this run. |
| MULTIPLE | An expiry under 1 hour is refused; a hold can be released | PASS | Step 5: "Check the highlighted fields and try again." and "A hold must last at least 1 hour from now." Steps 13–14: "Release this hold?", Keep changed nothing, then "Hold on Lotus Room released. The period is free again." Database: Lotus Room `released`. |
