# SCRUM-44 / E05-S05 implementation status

Apply setup and turnaround time. This file records what was built, which test
proves each acceptance criterion, and **every run of those tests**, so each
result can be traced back to the exact code it ran against.

## Scope

From `docs/backlog/product/E05-venue-catalogue-availability.md`, Scenarios 1
to 7 and the checklist (BDR C-65, T-66, T-73, T-74, T-80). O-20, O-21 and O-22
are closed with the answers the scenarios already assume (C-109, C-116, C-117,
T-80), so no criterion changed.

**Who wrote what.** Most of this story was already on `main` before this
branch:

- **Bryan (#261, merged 14 October 2026):** migrations 0011 and 0016, the
  buffered occupancy window in booking requests, holds, search and the
  calendar, conflict marking and Coordinator notices when a venue's buffers
  change, and the real-database tests for TC_E05S05_01 to _05.
- **Bryan (#305, commit `11f0083`, cherry-picked here as `a8a72ed` with his
  authorship):** the Setup time and Turnaround time fields on the venue form
  and the venue detail. #305 was stacked on an unmerged branch, so it never
  reached `main`; Aaron and Bryan agreed on 19 October to carry the commit
  here and close #305 as replaced.
- **This branch (Aaron, with Claude):**
  - the venue form now **shows the conflicts a save creates** (Scenario 4,
    TC_E05S05_03), which the backend already returned but no screen showed;
  - venue search now **names the buffered overlap** for an unavailable venue
    (Scenario 7, TC_E05S05_07).

**Manual tester:** Aaron, replacing Amareet (agreed with Bryan, Jira
SCRUM-44 comment 10320). The manual run is therefore **not independent of
the code**; the run record says so.

## Rules this story applies

The messages are the code's wording, word for word.

| Rule | What the user sees | Test case |
|---|---|---|
| Venue Staff record a setup time and a turnaround time in whole minutes on a venue, 0 allowed and the default; both show on the venue's card in the inventory | Fields "Setup time" and "Turnaround time" (hints "Minutes reserved before the advertised event start." / "Minutes reserved after the advertised event end."); the card reads "Setup time 30 minutes", "Turnaround time 45 minutes" | TC_E05S05_01, _06 |
| Invalid values are refused before saving | "Setup time must be whole minutes between 0 and 2147483647." (and the same for Turnaround time) | Vitest |
| A booking or hold occupies [start − setup, end + turnaround) in every check: booking requests, holds, search and the calendar | The calendar shows "· Setup time" and "· Turnaround time" segments beside the event time | TC_E05S05_02 |
| A buffer change that makes bookings overlap is saved; nothing is released; the later booking of each clashing pair is flagged; each affected event's Coordinator gets one notice | **New:** the form stays put with a warning, "Changes saved, and some bookings now conflict", listing e.g. "EVT-2003 Client B Isolation Event (EVT-2003), 15 Jan 2027, 12:30 pm – 2:00 pm: conflicts with EVT-101 Client A Planning Event". The calendar adds "· Buffer conflict — needs review". Notice "Booking conflict detected": "The venue's buffer times have changed, creating a scheduling conflict for "<event>". Review is required; the booking still holds the venue." | TC_E05S05_03 |
| Maintenance blocks are compared on advertised times, never buffered ones (T-80) | A request that starts as a block ends is accepted as Pending | TC_E05S05_05 |
| Buffered windows that only touch don't conflict; one minute of overlap does | "This venue is unavailable from 15 Jan 2027, 9:30 am to 15 Jan 2027, 12:45 pm, including setup and turnaround." | TC_E05S05_04 |
| Search treats a venue as unavailable when a booking's buffered window overlaps the requested period's buffered window | **New:** the pill reads "Unavailable", and Unmet requirements adds "Unavailable during the requested period: another booking needs the venue from 15 Jan 2027, 12:30 pm to 15 Jan 2027, 12:45 pm, including setup and turnaround." The stretch is the earliest clashing booking's buffered window cut to the requested period; if they meet only buffer to buffer, it is cut to the requested period's own buffered window. No event is named | TC_E05S05_07 |

## Test plan

| TC ID | Type | What the user sees | Automated tests |
|---|---|---|---|
| TC_E05S05_01 | Happy path | Orchid Hall's card reads 30 and 45 minutes; a never-edited venue reads 0 and 0 | `venueBufferConflicts.integration.test.ts` (real database); `VenueForm.test.tsx` (Vitest, Bryan's) |
| TC_E05S05_02 | Happy path | Calendar: 9:30–10:00 "· Setup time", 10:00–12:00, 12:00–12:45 "· Turnaround time", all Confirmed | `venueBufferConflicts.integration.test.ts` |
| TC_E05S05_03 | Negative | The warning lists EVT-2003 conflicting with EVT-101; both stay Confirmed; the calendar flags EVT-2003; coord_b has a notice | `venueBufferConflicts.integration.test.ts`; `VenueForm.conflicts.test.tsx` (Vitest, new) |
| TC_E05S05_04 | Boundary | 1:15 pm accepted as Pending; 1:14 pm refused naming 9:30 am to 12:45 pm | `venueBufferConflicts.integration.test.ts` |
| TC_E05S05_05 | Negative | A 12:00 request next to a block ending at 12:00 is accepted as Pending | `venueBufferConflicts.integration.test.ts` |
| TC_E05S05_06 | Regression | A 0/0 venue's calendar matches the advertised times, with no buffer segments | Manual run only (Playwright scaffold kept, D77) |
| TC_E05S05_07 | Negative | Orchid Hall is Unavailable and the overlap 12:30 pm to 12:45 pm is named | `venueBufferConflicts.integration.test.ts` and `venueSearch.test.ts` (new tests); Playwright scaffold kept (D77) |

**Case wording (D73):** the run follows Bryan's #230 (SCRUM-179) at
`26b8ceb`, which rewrites these seven cases with the seed's names (Orchid
Hall, EVT-101, EVT-2003, EVT-2001, `venue_a`, `coord_a`, `coord_b`). #230
was not merged on 19 October 2026; `main`'s wording names Riverside Hall,
Charity Run and Alumni Dinner instead.

**Test data (D72):** the seed has no bookings on 15 January 2027, and a booking
can't be made Confirmed through the app until E06-S04's decision screen exists.
So each case's preconditions are set with SQL from
`docs/testing/manual/E05-S05-preconditions.sql`, one named stage at a time,
on the local disposable database. That is setup only, never a test step
(Bryan's `docs/testing/manual/E05-S05-click-through.md`). It moves EVT-101,
EVT-2003 and EVT-3001 (and their single Sessions, which follow the event)
to 15 January 2027.

## Test gates

Every gate must pass, and be recorded in the Run log, before the PR opens.

1. **Backend unit tests**: `npm test --workspace backend`.
2. **E05-S05 database tests**: `venueBufferConflicts.integration.test.ts` and
   `venueSearch.integration.test.ts` against a disposable PostgreSQL 17
   database named `connectsphere_notification_test`.
3. **Full `test:db` batch.**
4. **Coverage**: 100% of new and changed lines and branches (Definition of
   Done, #215).
5. **Typecheck and build**: `npm run typecheck` and `npm run build` (root).
6. **F1, component tests**: the whole frontend Vitest suite
   (`--no-file-parallelism` on Windows).
7. **Deliberate-bug check**: bugs put in on purpose must make tests fail.
8. **F3, automated dry run** of the click-through script on the local real
   stack, with screenshots at 1280 px and 393 px.
9. **F4, Aaron's manual run** of the click-through script, his own
   screenshots (T-93), before the PR opens.
10. **Repository checks**: `python scripts/check.py`; `tc-coverage.md`
    regenerated as the last commit; CI green.

**Before the demo:** a read-only check of production inside `BEGIN READ ONLY`
… `ROLLBACK`, returning only counts and names: `venues` has
`setup_time_minutes` and `turnaround_time_minutes`, `venue_bookings` has
`buffer_conflict`, and 0011 and 0016 are in `_connectsphere_migrations`.

## Click-through script

What the customer sees, step by step, on the real frontend, real API and a
freshly reset and seeded local database. Note pass or fail for each step; on a
fail, copy the exact words seen.

**Before you start:** the database is reset and seeded, the API runs on port
3001 and the frontend on http://localhost:5173. Every seeded account's
password is `ValidPass123`. <!-- pragma: allowlist secret -->
You'll switch between `venue_a@connectsphere.com`,
`coord_a@connectsphere.com` and `coord_b@connectsphere.com`; sign out and in,
or keep one window per account (a normal window, a private one, and another
browser).

**Setup stages:** before steps 1, 6, 9, 10, 11 and 12, the named stage of
`docs/testing/manual/E05-S05-preconditions.sql` is run (Claude runs it when
you say you're ready). Each stage prints what Orchid Hall holds afterwards.

**Screenshots:** take each one of the whole browser window, so the address bar
and the signed-in role show, and save it under the name given.

### TC_E05S05_06: a 0/0 venue is unchanged (stage `tc06` first)

1. `venue_a`: **Inventory**. Orchid Hall's card reads **Setup time 0 minutes**
   and **Turnaround time 0 minutes**. → `TC_E05S05_06-1.png`
2. `coord_a`: **Venue calendar** → Venue **Orchid Hall** → From **06/10/2026**
   To **08/10/2026** → **Show range**. You see, each day:
   - 6 Oct: 09:00–12:00 **Confirmed** "EVT-2001 Confirmed Registration Event";
   - 7 Oct: 09:00–12:00 **Tentative** "EVT-3003 Planning Phase Gala";
   - 8 Oct: 09:00–12:00 **Blocked** "Maintenance block · E05-S05 TC_06
     maintenance";
   - Free 08:00–09:00 and 12:00–22:00 on each day, and **no** "Setup time" or
     "Turnaround time" segment anywhere. → `TC_E05S05_06-2.png`

### TC_E05S05_01: save the buffers

3. `venue_a`: **Inventory** → Orchid Hall → **Edit**. Under "Availability
   buffers", Setup time and Turnaround time both read **0**. Enter Setup
   time **30** and Turnaround time **45**. → `TC_E05S05_01-1.png`
4. Click **Save changes**. You're back on **Venue inventory**; Orchid Hall
   reads **Setup time 30 minutes** and **Turnaround time 45 minutes**.
5. Scroll to **Lotus Room**: still **0 minutes** and **0 minutes**.
   → `TC_E05S05_01-2.png` (Orchid Hall's card and Lotus Room's in one shot
   if they fit; otherwise `TC_E05S05_01-3.png` for Lotus Room)

### TC_E05S05_02: the calendar shows the buffered window (stage `s1` first)

6. `coord_a`: **Venue calendar** → Orchid Hall → From and To **15/01/2027** →
   **Show range**. You see:
   - 09:30–10:00 **Confirmed** "EVT-101 Client A Planning Event · Setup time";
   - 10:00–12:00 **Confirmed** "EVT-101 Client A Planning Event";
   - 12:00–12:45 **Confirmed** "EVT-101 Client A Planning Event · Turnaround
     time";
   - Free 08:00–08:45 and 13:15–22:00. → `TC_E05S05_02-1.png`

   The gaps from 08:45 to 09:30 and from 12:45 to 13:15 are expected: "Free"
   only shows times a new event could start or end and still fit its own
   setup and turnaround (the page's intro says so).

### TC_E05S05_07: search names the overlap

7. `coord_a`: open http://localhost:5173/coordinator/events/EVT-3001/venues
   (EVT-3001 now runs 15 Jan 2027, 12:30 pm – 2:00 pm). Type **Orchid Hall**
   in **Venue name** and click **Search venues**.
8. Orchid Hall's card shows the pill **Unavailable**, no **Hold this venue**
   button, and under **Unmet requirements**:
   - "Capacity 120 is below the required 150 places." (EVT-3001 needs 150;
     not part of this case)
   - "Unavailable during the requested period: another booking needs the
     venue from 15 Jan 2027, 12:30 pm to 15 Jan 2027, 12:45 pm, including
     setup and turnaround." → `TC_E05S05_07-1.png`

### TC_E05S05_04: touching windows (stage `s2` first, then `s2restore`)

9. `coord_b`: open
   http://localhost:5173/coordinator/events/EVT-2003/venues → **Search
   venues** → Orchid Hall → **Check recorded event requirements**. Under
   **Request this venue**, set Booking start **15/01/2027 01:15 pm** and
   Booking end **15/01/2027 03:00 pm** → **Submit booking request**. You see
   **Booking request submitted** and "Your request is Pending. The venue is
   reserved tentatively while a decision is outstanding."
   → `TC_E05S05_04-1.png`
10. *(stage `s2restore` removes that request)* Reload the same page. Set
    Booking start **01:14 pm** and Booking end **03:00 pm** → **Submit booking
    request**. A red message reads: "This venue is unavailable from 15 Jan
    2027, 9:30 am to 15 Jan 2027, 12:45 pm, including setup and turnaround."
    → `TC_E05S05_04-2.png`

### TC_E05S05_05: blocks use advertised times (stage `s3` first)

11. `coord_a`: open
    http://localhost:5173/coordinator/events/EVT-3001/venues → **Search
    venues** → Orchid Hall → **Check recorded event requirements**. Booking
    start **15/01/2027 12:00 pm**, Booking end **15/01/2027 02:00 pm** (the
    event's own period, already filled in) → **Submit booking request**. You
    see **Booking request submitted** ("Your request is Pending…"), although
    a maintenance block runs 08:00–12:00 and Orchid Hall needs 30 minutes of
    setup. → `TC_E05S05_05-1.png`

### TC_E05S05_03: a buffer change creates a conflict (stage `s4` first)

12. `venue_a`: **Inventory** → Orchid Hall → **Edit**. Setup time reads
    **30**, Turnaround time **0**. Change Turnaround time to **45** →
    **Save changes**. You **stay on Edit venue**, and a yellow warning at the
    top reads **"Changes saved, and some bookings now conflict"**, then
    "With the new setup and turnaround time, these bookings overlap another
    booking at this venue. They keep their status, the calendar marks them
    for review, and their assigned Coordinators have been notified.", then
    one line: "EVT-2003 Client B Isolation Event (EVT-2003), 15 Jan 2027,
    12:30 pm – 2:00 pm: conflicts with EVT-101 Client A Planning Event".
    → `TC_E05S05_03-1.png`
13. Same page at phone width (DevTools device toolbar, 393 px wide): the
    whole warning shows under the page heading, with nothing cut off and no
    sideways scrolling. → `TC_E05S05_03-2.png`
14. `venue_a`: **Availability** → Orchid Hall → From and To **15/01/2027** →
    **Show range**. EVT-101's three segments are plain **Confirmed**.
    EVT-2003's read **Confirmed** "EVT-2003 Client B Isolation Event · Setup
    time · Buffer conflict — needs review" (12:00–12:30), "… · Buffer
    conflict — needs review" (12:30–14:00) and "… · Turnaround time · Buffer
    conflict — needs review" (14:00–14:45). → `TC_E05S05_03-3.png`
15. `coord_b`: the bell → **Booking conflict detected** → click the title.
    It reads: "The venue's buffer times have changed, creating a scheduling
    conflict for "EVT-2003 Client B Isolation Event". Review is required; the
    booking still holds the venue." → `TC_E05S05_03-4.png`

## Known limits

What the tests above do **not** prove. If a customer reports a problem in one
of these areas, it is outside what was tested:

- **Confirmed bookings were made with SQL** (D72): the decision screen for
  Venue Staff (E06-S04, #298) isn't merged. The setup script is
  `docs/testing/manual/E05-S05-preconditions.sql`; every screen step in the
  click-through is real.
- **Case wording is #230's, not yet `main`'s** (D73).
- **Not tested on the deployed site.** All runs are local.
- **Emails are not actually sent.** Tests check the in-app notice, not
  delivery.
- **Coordinators see other coordinators' events as "Booked. Event details
  are not shown."** on the calendar (E05-S03's privacy rule). So `coord_a`
  doesn't see that EVT-2003 is flagged; Venue Staff and `coord_b` do.
- **The event code shows twice on seeded events** ("EVT-2003 Client B
  Isolation Event (EVT-2003)"): seeded titles start with their code, and the
  warning adds the code in brackets, as the maintenance-block screen does.
  Real titles show it once. The same was noted for SCRUM-60.
- **Search names the earliest clash only.** When several bookings overlap
  the requested period, the sentence gives the first by start time.
- **TC_E05S05_06 and _07 keep their Playwright scaffolds** (D77); the
  manual real-database run is their end-to-end evidence.
- **Coverage gaps outside this story:** the rest of `VenueForm.tsx`
  (Amareet's tag and layout fields) and `venueApi.ts` (retire) have untested
  lines; they are unchanged. Every new or changed line and branch is
  covered (Run log, gate 4).

## Run log

One row per run, newest at the bottom. Add a row every time the tests are run
for this story, whether they pass or fail. A failed run stays in the log; the
fix gets its own row.

| When (SGT) | Commit | Gate | TC IDs | Command | Where | Result | What was seen | Run by |
|---|---|---|---|---|---|---|---|---|
| 2026-10-19 13:50 | `7deecd7` + Bryan's `11f0083` cherry-picked, uncommitted (committed as `a8a72ed`) | F1 | _01 | `npx vitest run --no-file-parallelism src/features/venue/` | local | 68/68 passed | Bryan's tests pass on today's `main` | Claude (for Aaron) |
| 2026-10-19 13:53 | `a8a72ed+local` (committed as `0a8eb0e`) | F1 | _01, _03 | `npx vitest run --no-file-parallelism src/features/venue/VenueForm` | local | 16/16 passed | — | Claude (for Aaron) |
| 2026-10-19 ≈13:56 | `0a8eb0e+local` (committed as `b1600a0`) | 1, 5 | _07 | `npx tsx --test tests/venueSearch.test.ts tests/venueSuitability.test.ts`; `npm run typecheck` (root) | local | 30/30 passed; typecheck clean | — | Claude (for Aaron) |
| 2026-10-19 ≈13:57 | `0a8eb0e+local` | 2 | _01–_05, _07 | `npx tsx --test tests/venueBufferConflicts.integration.test.ts tests/venueSearch.integration.test.ts` | local, Docker `postgres:17` (17.11), `connectsphere_notification_test` | 12/12 passed | — | Claude (for Aaron) |
| 2026-10-19 ≈13:58 | `0a8eb0e+local` | 4 | _03 | `npx vitest run --coverage` over `VenueForm.tsx` and `venueApi.ts`, then a changed-lines check | local | 16/16 passed; **one changed branch uncovered**: the list key's `?? 'no-code'` (a conflicting booking without an event code). A second flag, on line 44, was the checker's own fault (its pattern also matched `BRDA:` lines) | The chain test now includes a booking with no code | Claude (for Aaron) |
| 2026-10-19 ≈13:59 | `0a8eb0e+local` | 4 | _03, _07 | The same, rerun; and `npx c8` over `assessment.ts` and `search.ts` with the unit and both database files | local, same container | Frontend 16/16, backend 42/42; **every changed line and branch covered** | — | Claude (for Aaron) |
| 2026-10-19 ≈14:01 | `b1600a0`, with bugs put in on purpose | 7 | _03, _07 | Four bugs, one at a time, each restored from git | local, same container | **Each bug was caught**: (1) the form ignoring conflicts failed 4 Vitest tests; (2) no buffer-to-buffer fallback, (3) the latest clash named instead of the earliest, and (4) the overlap left out of the sentence each failed the TC_E05S05_07 database test, and (4) also the unit test | Shows the tests check these rules | Claude (for Aaron) |
| 2026-10-19 ≈14:05–14:09 | `b1600a0` | F3 | _01–_07 | `node f3_44.mjs` (Playwright, headless Chromium 153.0.8010.12; script in the F3 session record) | local real stack: Vite 5173, API 3001, `connectsphere_dev_stack` reset and seeded before each attempt | **Four attempts stopped or failed on the script's own faults**: an ambiguous "To" label ("Custom date range" also matched); an inventory locator that read Cedar Auditorium's card and the article role it needed; a SQL cast missing in stage `s4` (`column "booking_range" is of type tstzrange but expression is of type text`); and the conflict calendar read as `coord_a`, who sees EVT-2003 only as "Booked. Event details are not shown." | Fixed in the script and setup file; no application change | Claude (for Aaron) |
| 2026-10-19 14:10 | `b1600a0` | F3 | _01–_07 | The same, after a fresh reset | local real stack | 19/19 checks passed. **Screenshots showed a fault**: after a conflicting save the warning's title sat under the sticky header at 1280 px and 393 px | `scrollIntoView` aligned the Alert with the top of the window; fixed in `e1d6f01` by scrolling the page to the top | Claude (for Aaron) |
| 2026-10-19 ≈14:12 | `b1600a0+local` (committed as `e1d6f01`) | F1 | _03 | `npx vitest run --no-file-parallelism src/features/venue/VenueForm`, twice | local | **First run 15/16, failed "TC_E05S05_03: a save that creates a conflict stays on the form and lists the pair"**; second run 16/16 | "expected "vi.fn()" to be called with arguments: [ { top: +0 } ]": the scroll runs in a passive effect, after the Alert appears. The test now waits for it | Claude (for Aaron) |
| 2026-10-19 ≈14:13 | `b1600a0+local` (committed as `e1d6f01`) | F1, 4 | _03 | The same, three times; then coverage and the changed-lines check | local | 16/16 three times; every changed line and branch covered | — | Claude (for Aaron) |
| 2026-10-19 14:13 | `b1600a0+local` (committed as `e1d6f01`) | F3 | _01–_07 | `node f3_44.mjs`, after a fresh reset | local real stack | 19/19 checks passed; the warning shows in full under the page heading at both widths. Session record `20261019-141333-Bl0oper-frontend-e2e.md` | Messages word for word in the session record | Claude (for Aaron) |
| 2026-10-19 14:14 | `e1d6f01` | 1 | _07 | `npm test` (backend) | local | 417/417 passed. Session record `20261019-141444-Bl0oper-backend-unit.md` | — | Claude (for Aaron) |
| 2026-10-19 14:14–14:15 | `e1d6f01` | 2, 3 | _01–_05, _07 | `npm run test:db --workspace backend` | local, Docker `postgres:17` (17.11), `connectsphere_notification_test` | **132/133, failed E01-S02 (`eventVisibility`)**; every E05-S05 test passed. Session record `20261019-141457-Bl0oper-backend-db.md` | "column e.venue_requirements does not exist": on `main` since #161, not from this story (rerun alone, same message) | Claude (for Aaron) |
| 2026-10-19 14:15–14:17 | `e1d6f01` | F1 | _01, _03 | `npx vitest run --no-file-parallelism` (whole frontend) | local | 50 files, 449/449 passed. Session record `20261019-141518-Bl0oper-frontend-vitest.md` | — | Claude (for Aaron) |
| 2026-10-19 14:18 | `e1d6f01` | 5 | — | `npm run typecheck`; `npm run build` (root) | local | both passed | — | Claude (for Aaron) |
| 2026-10-21 17:45–18:09 | `394461d` | F4 | _01–_07 | The 15-step click-through script by hand, with setup stages `tc06`, `s1`, `s2`, `s2restore`, `s3`, `s4` run by Claude on Aaron's cue | local real stack: Vite 5173, API 3001, `connectsphere_dev_stack` (Docker `postgres:17`) reset and seeded at 17:45; Chrome (venue_a), Chrome Incognito (coord_a), Edge (coord_b) | **7/7 passed**, 13 screenshots. Session record `20261021-180929-Bl0oper-frontend-e2e.md` | Messages word for word in the session record. Step 5's screenshot was retaken at 18:09, after step 15 (the first was cropped to the cards), with the venues' settings the same as after step 4. coord_a was also notified about EVT-101, as Scenario 4 intends | Aaron (setup stages by Claude) |
