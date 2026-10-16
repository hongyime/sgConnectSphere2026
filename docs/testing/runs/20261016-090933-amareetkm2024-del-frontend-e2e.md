---
date: 2026-10-16T09:09:33+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 141026
database: real
commit: 0379cb2
---

Sprint 3 re-run of the E06-S05 manual check (story SCRUM-49) with screenshots,
as T-93 requires for Sprint 3 Done stories before the Sprint 3 Review. The
story stays Done (T-74); this is a new record, and the 14 October record
`20261014-202813-amareetkm2024-del-frontend-e2e.md` is unchanged.

Amareet ran `docs/testing/manual/E06-S05-click-through.md` by hand in a real
browser, using a normal window (`coord_a`) and a private window (`venue_a`),
signing in through the login page, and took every screenshot below herself.
The stack was:

- the frontend (Vite, 127.0.0.1:5173)
- the local API (`backend/src/dev.ts`, 3001)
- a freshly reset and seeded local PostgreSQL 17 database in Docker
  (`connectsphere_dev_stack`, migrations 0001 to 0019), never the shared
  database

The code under test is `main` at `0379cb2`, which includes the hold screens
(#252), the venue setup and turnaround buffers (#261) and the shared booking
submission that "Submit booking request" now uses (#274). Claude set up the
stack, ran the step-15 database update that moves Jasmine Hall's expiry into
the past (at Amareet's request), checked each screenshot as it was saved, and
checked the database afterwards; the database facts below come from that
check.

Timing: the frontmatter `date` and the filename are the run's start, the
first screenshot (`TC_E06S05_03-1.png`, saved 09:09:33). The run finished at
the last screenshot (`TC_E06S05_05.png`, saved 09:59:27, Singapore time); the
last recorded database action was 09:57:01. Both times come from the saved
screenshot files and the database audit rows listed below.

Scope: the 6/6 below covers the click-through script only, not every canonical
E06-S05 test case. The cases the script leaves to the automated tests (a
different Coordinator refused, the calendar view, the expiry job and its notice,
the deadline races) were not re-run here. The hold rules under test are the
Sprint 3 rules in T-92; the Sprint 4 rules in T-84 do not apply to this run.

Two differences from the script, neither a failure:

- **Two extensions instead of one (steps 9–10).** Venue Staff first saved an
  expiry of 18 Oct 2026, 11:21 am (the date field kept the current expiry's
  date). That is later than the current expiry, so it was correctly accepted
  and logged. The earlier time (16 Oct 2026, 11:21 am) was then refused, and
  the 3-days-from-now expiry was saved. Step 11's Activity log therefore shows
  three hold rows, not two.
- **Lotus Room released twice (steps 13–14).** On the first attempt "Release
  hold" was clicked without trying "Keep" first. Lotus Room was held again and
  step 14 was repeated in full; the screenshots come from the second attempt.

Database check after the run (times Singapore):

- 09:19:42 — "Tentative hold placed on Cedar Auditorium" by coord_a; expires
  18 Oct 2026, 9:19 am (48 hours).
- 09:25:08 — "Tentative hold on Cedar Auditorium extended" by venue_a;
  18 Oct 2026, 9:19 am → 18 Oct 2026, 11:21 am.
- 09:27:08 — "Tentative hold on Cedar Auditorium extended" by venue_a;
  18 Oct 2026, 11:21 am → 19 Oct 2026, 9:27 am.
- 09:44:04 — "Venue booking requested for Cedar Auditorium" by coord_a (the
  wording #274 uses); the Cedar Auditorium row is now `pending` with no expiry.
- 09:51:30 / 09:51:45 and 09:53:01 / 09:54:01 — Lotus Room hold placed, then
  released, by coord_a, twice; both rows are `released`.
- 09:57:01 — "Tentative hold placed on Jasmine Hall" by coord_a; the step-15
  update moved its expiry to 16 Oct 2026, 9:57 am, and the row is still
  `tentative` (the expiry job does not run locally).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S05_03 | A new hold carries a 48-hour expiry that Venue Staff can change | PASS | Steps 2–6 and 8–10: Venue holds card read "No venue is held for this event. A hold keeps a venue for 48 hours while you finalise the arrangements."; search showed Cedar Auditorium Suitable with "Hold this venue" and Orchid Hall Unavailable ("Unavailable during the requested period.") with no hold button; Jasmine Hall, Lotus Room and Maple Room showed Near match with "Hold this venue". Form for EVT-3003 defaulted to 25/10/2026 06:00 pm – 10:00 pm and "48 hours from now (default)". "Venue held: Cedar Auditorium is held tentatively until 18 Oct 2026, 9:19 am…" with the pill "Tentative · expires 18 Oct 2026, 9:19 am" and Submit booking request / Release. Venue Staff saw the hold under Tentative holds (Event EVT-3003 Planning Phase Gala, Held for 25 Oct 2026, 6:00 pm – 10:00 pm) and moved the expiry to 19 Oct 2026, 9:27 am: "Expiry changed: The hold on Cedar Auditorium now expires 19 Oct 2026, 9:27 am. The change is recorded in the event's activity log." Database: first expiry exactly 48 hours after placing. |
| TC_E06S05_01 | A second hold on the same venue and period is refused, naming the hold | PASS | Step 7: after Back, Hold venue again showed "This venue can't be held" and "This venue already has a tentative hold for EVT-3003 Planning Phase Gala from 25 Oct 2026, 6:00 pm to 25 Oct 2026, 10:00 pm." Database: only one hold on Cedar Auditorium. |
| TC_E06S05_04 | Submitting a booking request completes the hold so it no longer expires | PASS | Steps 11–12: pill read "Tentative · expires 19 Oct 2026, 9:27 am"; Submit booking request showed "Booking request submitted for Cedar Auditorium. The hold no longer expires." and the card returned to "No venue is held for this event…". Database: the same row is `pending` with no expiry. |
| TC_E06S05_07 | Venue Staff can extend an unexpired hold, and the extension is logged | PASS | Steps 9–11: 16 Oct 2026, 11:21 am was refused with "Choose a later expiry than the current one."; later expiries saved. The event's Activity log listed "Tentative hold placed on Cedar Auditorium" (Hold expires 18 Oct 2026, 9:19 am; Coordinator A) and two "Tentative hold on Cedar Auditorium extended" rows (18 Oct 9:19 am → 18 Oct 11:21 am, and 18 Oct 11:21 am → 19 Oct 9:27 am; Venue Staff A). Two extensions because the first save kept the current date; both were valid later expiries. Database: audit actor `venue_a`, old and new expiry recorded on each. |
| TC_E06S05_05 | A hold whose expiry has passed no longer holds the venue | PASS | Steps 15–16 (display only): after the expiry was moved into the past and the page reloaded, Jasmine Hall showed "Expired 16 Oct 2026, 9:57 am" and "This hold no longer holds the venue. Place a new hold if it's still needed." with no buttons (the "Venue held" banner above it is from placing the hold before the reload). The expiry job and its notice are covered by the automated tests, not this run. |
| MULTIPLE | An expiry under 1 hour is refused; a hold can be released | PASS | Step 5: an expiry of 16/10/2026 10:00 am showed "Check the highlighted fields and try again." and "A hold must last at least 1 hour from now." Steps 13–14 (second attempt): "Release this hold?" with Release hold / Keep; Keep left the hold in place and closed the question; Release hold showed "Hold on Lotus Room released. The period is free again." and the card emptied. Database: Lotus Room `released`. |

## Screenshots

Taken by hand by Amareet during this run (T-93).

- [TC_E06S05_03-1](evidence/20261016-090933-amareetkm2024-del-frontend-e2e/TC_E06S05_03-1.png): step 2, the empty Venue holds card.
- [TC_E06S05_03-2](evidence/20261016-090933-amareetkm2024-del-frontend-e2e/TC_E06S05_03-2.png): step 3, search results with Cedar Auditorium Suitable and Orchid Hall Unavailable.
- [TC_E06S05_03-3](evidence/20261016-090933-amareetkm2024-del-frontend-e2e/TC_E06S05_03-3.png): step 4, the hold form's defaults.
- [TC_E06S05_03-4](evidence/20261016-090933-amareetkm2024-del-frontend-e2e/TC_E06S05_03-4.png): step 6, "Venue held" and the Tentative pill.
- [TC_E06S05_01](evidence/20261016-090933-amareetkm2024-del-frontend-e2e/TC_E06S05_01.png): step 7, the second hold refused.
- [TC_E06S05_07-1](evidence/20261016-090933-amareetkm2024-del-frontend-e2e/TC_E06S05_07-1.png): step 8, Venue Staff's Tentative holds list.
- [TC_E06S05_07-2](evidence/20261016-090933-amareetkm2024-del-frontend-e2e/TC_E06S05_07-2.png): step 9, an earlier expiry refused.
- [TC_E06S05_07-3](evidence/20261016-090933-amareetkm2024-del-frontend-e2e/TC_E06S05_07-3.png): step 10, "Expiry changed".
- [TC_E06S05_07-4](evidence/20261016-090933-amareetkm2024-del-frontend-e2e/TC_E06S05_07-4.png): step 11, the Activity log with the placement and both extensions.
- [TC_E06S05_04-1](evidence/20261016-090933-amareetkm2024-del-frontend-e2e/TC_E06S05_04-1.png): step 11, the pill with the new expiry.
- [TC_E06S05_04-2](evidence/20261016-090933-amareetkm2024-del-frontend-e2e/TC_E06S05_04-2.png): step 12, "Booking request submitted" and the empty card.
- [MULTIPLE-expiry-too-short](evidence/20261016-090933-amareetkm2024-del-frontend-e2e/MULTIPLE-expiry-too-short.png): step 5, an expiry under 1 hour refused.
- [MULTIPLE-release-1](evidence/20261016-090933-amareetkm2024-del-frontend-e2e/MULTIPLE-release-1.png): step 14, "Release this hold?" with Release hold / Keep.
- [MULTIPLE-release-2](evidence/20261016-090933-amareetkm2024-del-frontend-e2e/MULTIPLE-release-2.png): step 14, "Hold on Lotus Room released".
- [TC_E06S05_05](evidence/20261016-090933-amareetkm2024-del-frontend-e2e/TC_E06S05_05.png): step 16, Jasmine Hall Expired with no buttons.
