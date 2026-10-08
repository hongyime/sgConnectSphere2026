# SCRUM-54 / E07-S04 implementation status

Reserve equipment for an event. This file records what was built, which test
proves each acceptance criterion, and **every run of those tests**, so each
result can be traced back to the exact code it ran against.

## Scope

From `docs/backlog/release-1/E07-equipment-technical-support.md`:

- Scenario 1: Technical Support reserves the requested quantity when enough is
  free for the period. The reservation is recorded against the event and the
  Event Coordinator is notified.
- Scenario 2: when only part of the requested quantity is free, Technical
  Support records a partial reservation, and the Coordinator is notified of
  the shortfall and the outstanding quantity.
- Scenario 3: once an item is fully committed, the availability check shows
  nothing free for that period.
- Scenario 4: when an event is cancelled or its equipment is no longer
  required, Technical Support releases the reservation and the quantity
  returns to the available pool.
- Checklist: an error when the quantity exceeds what is available, and a
  confirmation showing the event, date, time, item and quantity.
- Decisions: C-21 and T-24 (a partial reservation is a planning state;
  E08-S03 blocks confirmation on it), B-09 (E07-S03 owns the availability
  check), C-62 (equipment is requested per event).

Built on E07-S01 (catalogue, #214), E07-S02 (request lines, #216) and E07-S03
(availability, #229). No migration: every table and column already exists.

## Rules this story applies

These rules were settled by the story owner before building (D35–D48 in the
story's task list). Each has a test case below. The messages are the code's
wording, word for word.

| Rule | What the user sees | Test case |
|---|---|---|
| Only Technical Support Staff reserve, change or release. Other roles are refused and the refusal is audited (E14-S02). The assigned Coordinator and Technical Support can read the event's lines | 403 "Access denied. Only Technical Support Staff can reserve equipment." | TC_E07S04_01 (access part) |
| A reservation covers the event's own dates, `events.event_range` (D39; C-62). Venue buffers never apply to equipment | The confirmation and notice show the event's dates, e.g. "15 Oct 2026, 9:00 am – 5:00 pm" | TC_E07S04_01 |
| Reserve and change only while the event is Approved or Planning; release also while Cancelled; nothing once Confirmed (D40) | 409 "Equipment can only be reserved while the event is approved or planning." / "Reservations can only be released while the event is approved, planning or cancelled." / "This event is confirmed, so its equipment reservations can't be changed here." | TC_E07S04_04 (cancelled release); unit and database tests |
| Reserve at least 1 and at most the requested quantity (D41) | 400 "You can reserve at most the 3 requested." / "Enter a whole number greater than 0." | Checklist; database tests |
| Never more than is free for the event's dates. Free means total stock minus the **peak** simultaneous reservations and withdrawals in the period (E07-S03's calculation, reused) | 409 "Only 2 are free for this event's dates." ("Only 1 is free…", "None are free…") | Checklist; TC_E07S04_06 |
| Reserving the requested quantity records status `reserved`; fewer records `partial` (TC_07, T-24) | Line reads "Reserved" or "Partial: 2 of 3 reserved" | TC_E07S04_01, _02, _05, _06, _07 |
| One active reservation per request line. Changing it moves the quantity up or down, from 1 to the requested quantity; it becomes `reserved` at the requested quantity, `partial` below (D37, D45). Its own units count as free to it | 409 "This request is already reserved. Change the reservation instead." | Database tests |
| Any change clears "needs review" (`requires_reconfirmation`), even at the same quantity; an unchanged, unflagged reservation is not a change (D45) | Nothing is saved or sent | Database tests |
| Release sets `released`; the units count as free again; the row stays as history; the line can be reserved afresh, and stays protected from Coordinator edits (#216's rule) | Line reads "Released" | TC_E07S04_04 |
| Retired equipment can't be reserved | 409 "This equipment has been retired, so it can't be reserved." | Database tests |
| Equipment under maintenance has nothing free (E07-S03) | 409 "<item> is not available for use, so none can be reserved." | Unit tests |
| Locking: event row, then request line, then equipment row (`FOR UPDATE`, shared with E07-S01's stock changes), then the reservation row. The free quantity is recalculated inside that transaction, so two reservations at once can't oversell | The second waits, then sees the new free quantity | Database test (two at once) |
| Every reserve, change and release writes an entry to the event's Activity log (D43), with the actor and time. Today the event's organisation reads that log on `/events/:code`; Coordinators will read it once E14-S02 (T-75) lands | "Equipment reserved — 8 October 2026 by Technical Support A (Microphone-Wireless × 2)" | Database tests; click-through |
| Reserve and change notify the assigned Coordinator (never the actor) once, through the shared writer, with the activity entry's id as the change id (ADR-006). Release sends no notice (D42) | "Equipment reserved" / "Equipment partly reserved" / "Equipment reservation changed": "<event>, 15 Oct 2026, 9:00 am – 5:00 pm: Portable Stage × 2 of 3 reserved; 1 outstanding." | TC_E07S04_01, _02, _07 |

## Test plan

Backend tests are in `backend/tests/equipmentReservations.integration.test.ts`
(real database) and `equipmentReservations.test.ts` (unit); screen tests in
`frontend/src/features/support/EquipmentReservations.test.tsx` (Vitest) and
`tests/e2e/equipmentReservations.spec.ts` (Playwright, which replaces the
`test.fixme` cases that were in `e07.spec.ts`). Each title contains its TC ID.

| TC ID | Type | What the user sees | Backend test | Screen tests |
|---|---|---|---|---|
| TC_E07S04_01 | Happy path | "Microphone-Wireless × 2 reserved for EVT-3001 Approved Annual Conference, 15 Oct 2026, 9:00 am – 5:00 pm." and "The Coordinator has been notified."; line Reserved; the Coordinator's notice names the event, date, time, item and quantity | "TC_E07S04_01 reserving the requested quantity records the reservation…" | Vitest and Playwright "TC_E07S04_01 - …" |
| TC_E07S04_02 | Negative | "Partly reserved": "Portable Stage × 2 of 3 reserved for … 1 still outstanding."; line "Partial: 2 of 3 reserved"; notice "… × 2 of 3 reserved; 1 outstanding." | "TC_E07S04_02 TC_E07S04_07 a partial reservation records Partial…" | Vitest (two) and Playwright "TC_E07S04_02 - …" |
| TC_E07S04_03 | Boundary | Availability shows 0 free once every unit is reserved | "TC_E07S04_03 once every unit is reserved…" (with E07-S03's check) | Playwright "TC_E07S04_03 - …" |
| TC_E07S04_04 | Happy path | "Released": "× 2 returned to the available pool for …"; line Released; free goes back up by 2 | "TC_E07S04_04 releasing a reservation returns its units…" | Vitest and Playwright "TC_E07S04_04 - …" |
| TC_E07S04_05 | Boundary (just below) | 3 of 4 free reserved: status Reserved, 1 left free | "TC_E07S04_05 TC_E07S04_06 …" | Playwright "TC_E07S04_05 - …" |
| TC_E07S04_06 | Boundary (exactly at) | 4 of 4 free reserved: status Reserved, 0 left free, no shortfall wording | "TC_E07S04_05 TC_E07S04_06 …" | Playwright "TC_E07S04_06 - …" |
| TC_E07S04_07 | Boundary (just above) | 4 reserved against 5 requested: Partial, 1 outstanding. **Its last step (confirmation blocked) belongs to E08-S03 (SCRUM-60) and is tested there (D48)** | "TC_E07S04_02 TC_E07S04_07 …" | Playwright "TC_E07S04_07 - …" |

Decision and rule tests without a catalogue case are titled "E07-S04 …":
change up or down and needs review (D37, D45); confirmed, submitted, retired,
maintenance and unknown records (D40, D41); roles and audit; two reservations
at once; no active Coordinator.

### What the screens say

| Where | When | What the user sees |
|---|---|---|
| Event equipment page (`/support/events/:code/equipment`), Technical Support | Approved or Planning | "Reserve each request from the units free for this event's dates, 15 Oct 2026, 9:00 am – 5:00 pm. The Coordinator is notified of each reservation and change." Per line: **Reserve <item>**, or **Change <item> reservation** and **Release <item>…** |
| Same | Cancelled | "This event is cancelled. Release its reservations to return the units to the available pool." Release only; "Nothing to release" on other lines |
| Same | Confirmed | "This event is confirmed, so its equipment reservations can't be changed here." No actions |
| Same, any viewer | Status column | Pills: Not reserved, Reserved (green), "Partial: 2 of 3 reserved" (amber), Released (grey), and Needs review (amber) when a stock change flagged it. A request above total stock still reads "Exceeds total stock" (E07-S02) |
| Reserve form (`…/equipment/:requestId/reserve`) | Opened | Heading **Reserve equipment** (or **Change reservation**), a card named after the item with Event, Event dates, Quantity requested, Free for these dates (and Reserved now when changing); field **Quantity to reserve**, hint "From 1 to N. Reserving fewer than the N requested records a partial reservation."; **Cancel** and **Reserve equipment** ("Reserving…") or **Save reservation** ("Saving…") |
| Reserve form | Too many | Red "Fix the highlighted fields, then save again." and under the field "Only 2 are free for this event's dates." or "You can reserve at most the 3 requested."; the server's own sentence if it refuses |
| Reserve form | Not Technical Support | "Access denied. Only Technical Support Staff can reserve equipment." |
| Event page | After saving | Green "Reserved" / "Partly reserved" / "Reservation changed" with the item, quantity, event, date and time, and "The Coordinator has been notified." |
| Event page | Release… | Panel "Release <item>?" with "The 2 reserved units go back to the available pool for this event's dates. The request stays on the event and can be reserved again.", **Cancel** and a red **Release reservation** ("Releasing…"); then green "Released: <item> × 2 returned to the available pool for …" |
| Coordinator's event equipment page | Any | The same pills; no reserve or release actions; reserved lines read "Reserved requests are protected" |
| `/support/queue`, `/support/requests/:id` | Old mock routes | Go to the live Equipment requests list; the header's "Request queue" link is gone |

## Test gates

Every gate below must pass, and be recorded in the Run log, before the PR is
opened. The PR is re-run in full if the code changes after that. Runs cited
as evidence also get a session file in `docs/testing/runs/` (T-65).

1. **Backend unit tests**: `npm test --workspace backend`, the whole suite.
2. **SCRUM-54 database tests**: `equipmentReservations.integration.test.ts`
   against a disposable PostgreSQL 17 database named
   `connectsphere_notification_test`.
3. **Neighbouring database tests**: the E07-S01, S02 and S03 suites
   (catalogue, requests, availability), which this story changes or shares
   locks with, and the full `test:db` batch.
4. **Coverage**: `npm run test:coverage`; 100% of new and changed lines, or a
   stated reason (Definition of Done, #215).
5. **Typecheck and build**: `npm run typecheck` and `npm run build` from the
   repository root.
6. **F1, component tests**: `npm test --workspace frontend` (Windows:
   `--no-file-parallelism`).
7. **F2, browser tests**: the Playwright suite, including TC_E07S04_01 to
   _07.
8. **F3, full click-through** of the real frontend, real API and a freshly
   seeded disposable database: the "Click-through script" below, as each role,
   refusals included, with the database checked after each step and
   screenshots at 1280px and 393px.
9. **F4, Aaron's own click-through** of the same script on the same local
   stack, logged with "Run by: Aaron", before the PR opens.
10. **Repository checks**: `python scripts/check.py`, then `tc-coverage.md`
    regenerated as the last commit; CI green on the PR's head commit.

A **deliberate-bug check** shows the tests depend on the code: bugs are put in
on purpose, the tests must fail, and the code is restored.

**Before the demo:** a **read-only check of production** (Supabase), inside
`BEGIN READ ONLY` … `ROLLBACK`, writing nothing and returning only counts and
object names: the `equipment_reservations` table and `reservation_status`
values exist, and how many reservations exist by status.

## Click-through script

Re-checked against the built screens on `a9f4106` by the F3 run (41/41, Run
log). Note pass or fail for each step; on a fail, copy the exact words seen.

**Set up first:** Docker running; `connectsphere_dev_stack` reset and freshly
seeded; the local API on 3001; `npm run dev` on 5173. Password for every
seeded account: `ValidPass123`. Use a normal window for `tech_a` and a private
window for `coord_a` (and later `organiser_a`).

**Who's who (seed):** EVT-3001 Approved Annual Conference is Approved, runs
15 Oct 2026 from 9:00 am to 5:00 pm, and belongs to `coord_a`; its organiser
is `organiser_a@clienta.com`. Stock: Projector-HD 10, Microphone-Wireless 6.
No equipment requests or reservations are seeded.

**A. Set up the data**

1. Normal window, `tech_a@connectsphere.com`: header → **Equipment
   catalogue** → **Add equipment**: Equipment name "Portable Stage", Type
   "Staging", Description "Modular stage deck", Quantity 2, Location "Main
   Storage" → **Save equipment**.
2. Private window, `coord_a@connectsphere.com`: go to
   `/coordinator/events/EVT-3001/equipment`. **Add equipment request** three
   times: Projector-HD 3, Microphone-Wireless 2, Portable Stage 3 (each →
   **Save equipment request**).

**B. Full reservation (TC_E07S04_01)**

3. `tech_a`: header → **Equipment requests** → **EVT-3001**. The card says
   "Reserve each request from the units free for this event's dates, 15 Oct
   2026, 9:00 am – 5:00 pm. …". Projector-HD and Microphone-Wireless read
   **Not reserved**; Portable Stage reads **Exceeds total stock** (3 asked, 2
   exist). Each line has a **Reserve <item>** button.
4. **Reserve Microphone-Wireless**: the form shows Quantity requested 2, Free
   for these dates 6, and Quantity to reserve 2. **Reserve equipment**. Back
   on the event page, green **Reserved**: "Microphone-Wireless × 2 reserved
   for EVT-3001 Approved Annual Conference, 15 Oct 2026, 9:00 am – 5:00 pm."
   and "The Coordinator has been notified."; the line reads **Reserved**.
5. `coord_a`: bell → **Notifications** → click **Equipment reserved**: "EVT-3001
   Approved Annual Conference, 15 Oct 2026, 9:00 am – 5:00 pm:
   Microphone-Wireless × 2 reserved."

**C. Refusals (checklist; D41)**

6. `tech_a`: **Reserve Portable Stage**: Quantity to reserve starts at 2. Type
   3 → **Reserve equipment**: red "Fix the highlighted fields, then save
   again." and under the field "Only 2 are free for this event's dates."
7. **Cancel**, then **Reserve Projector-HD**: type 4 → **Reserve equipment**:
   "You can reserve at most the 3 requested." **Cancel**.

**D. Partial reservation (TC_E07S04_02; TC_E07S04_07 up to the notice)**

8. **Reserve Portable Stage** with 2 → green **Partly reserved**: "Portable
   Stage × 2 of 3 reserved for EVT-3001 Approved Annual Conference, 15 Oct
   2026, 9:00 am – 5:00 pm. 1 still outstanding."; the line reads **Partial: 2
   of 3 reserved**.
9. `coord_a`: **Equipment partly reserved**: "… Portable Stage × 2 of 3
   reserved; 1 outstanding."

**E. Fully committed item (TC_E07S04_03)**

10. `tech_a`: header → **Equipment availability**: Start 15 Oct 2026 9:00 am,
    End 15 Oct 2026 5:00 pm → **Check availability**: Portable Stage **0**
    free; Microphone-Wireless **4** free.

**F. Change a reservation (D37, D45)**

11. **Equipment catalogue** → **Edit Portable Stage** → Quantity 3 → **Save
    equipment**.
12. Back to EVT-3001's equipment page → **Change Portable Stage
    reservation**: heading **Change reservation**, Reserved now "2 (partial)".
    Type 3 → **Save reservation**: green **Reservation changed**: "Portable
    Stage × 3 reserved for …"; the line reads **Reserved**. `coord_a` gets a
    new **Equipment reservation changed** notice.

**G. Release (TC_E07S04_04; D42)**

13. **Release Microphone-Wireless…**: a panel "Release Microphone-Wireless?"
    with "The 2 reserved units go back to the available pool for this event's
    dates. …" → **Release reservation**: green **Released**:
    "Microphone-Wireless × 2 returned to the available pool for …"; the line
    reads **Released** and offers **Reserve Microphone-Wireless** again.
    `coord_a` gets no new notice.
14. **Equipment availability**, same period: Microphone-Wireless **6** free.

**H. Coordinator view and Activity log (D46, D43)**

15. `coord_a`: `/coordinator/events/EVT-3001/equipment`: Microphone-Wireless
    **Released**, Portable Stage **Reserved**, Projector-HD **Not reserved**;
    no reserve or release buttons; reserved lines read "Reserved requests are
    protected".
16. Sign the private window out and in as `organiser_a@clienta.com`; open
    `/events/EVT-3001`. **Activity log** lists "Equipment reserved" (twice),
    "Equipment reservation changed" and "Equipment reservation released", each
    "by Technical Support A".

**I. Access and the old pages (D35)**

17. Still `organiser_a`: open `/support/events/EVT-3001/equipment`: "Access
    refused" / "Access denied. Only the assigned Coordinator may maintain
    equipment requests."
18. `tech_a`: open `/support/queue`: it lands on **Equipment requests**; the
    header has no "Request queue" link.

**J. Phone width**

19. `tech_a`, DevTools device toolbar at 393 px wide: EVT-3001's equipment
    page and a reserve form fit with no sideways scroll.

## Known limits

What the tests above do **not** prove. If a customer reports a problem in one
of these areas, it is outside what was tested:

- **Emails are not actually sent.** Tests check the in-app notice and the
  email-outbox row, not delivery.
- **Not tested on the deployed site.** All runs are local.
- **Confirmation blocking is not here.** TC_E07S04_07's last step ("the
  Coordinator can't confirm") is E08-S03's (SCRUM-60), not yet built.
- **No live screen cancels an approved event yet** (E10-S04 is a mock), so
  release on a Cancelled event is proved by the database tests, not the
  click-through.
- **A request line stays protected once it has ever been reserved**, even
  after release (#216's rule, unchanged). The Coordinator can't edit its
  quantity; Technical Support reserves it again.
- **Seeded data has no equipment requests or reservations.** Real-stack runs
  create them through the app.
- **Coordinators can't read the event Activity log yet.** The reservation
  entries are written to it (D43), and today only the event's organisation
  reads it, on `/events/:code`. The Coordinator's view is E14-S02's (T-75,
  Le Xin).
- **An Organiser opening the Technical Support equipment page is refused with
  E07-S02's sentence**, "Access denied. Only the assigned Coordinator may
  maintain equipment requests." (the read guard in `requests.ts`, unchanged).
  The reservation writers and the reserve form use "Only Technical Support
  Staff can reserve equipment."
- **Coverage gaps outside this story:** `EquipmentRequests.tsx` lines 156 and
  495 (two double-click guards in E07-S02's remove and save) have no test;
  they are Xiang Ying's lines, unchanged here. Every new or changed line and
  branch of this story is covered (Run log, gate 4).
- **The Playwright cases use a fake API** shaped like the real one; the real
  stack is covered by F3 and F4 and the database tests.

**So that these tests keep running after this story merges:** the backend
test files are added to `backend/package.json`'s scripts, and the database
test file to `.github/workflows/application-checks.yml`.

## Run log

One row per run, newest at the bottom. Add a row every time the tests are run
for this story, whether they pass or fail. A failed run stays in the log; the
fix gets its own row.

- **When**: Singapore time, with the date.
- **Commit**: the short commit ID the run used. An uncommitted working tree
  is recorded as `<commit>+local`.
- **Gate**: which test gate above the run belongs to.
- **Where**: `local` (and which database), or a CI run link.
- **Result**: passed/total, and the IDs of any failures.
- **What was seen**: for failures and refusals, the actual status code and
  message, word for word, so it can be searched for later.

| When (SGT) | Commit | Gate | TC IDs | Command | Where | Result | What was seen | Run by |
|---|---|---|---|---|---|---|---|---|
| 2026-10-08 ≈13:43 | `7544067+local` | 2 | _01–_07 | `npx tsx --test tests/equipmentReservations.integration.test.ts` (backend) | local, Docker `postgres:17` (17.11), `connectsphere_notification_test` | **7/9, failed TC_01 and the roles test** | TC_01: "Access denied. Contact your administrator about your organisation access.": the test read the Activity log as a Coordinator, but `getEvent` serves the event's organisation only. Roles test: unhandled rejection "Access denied. Only Technical Support Staff can reserve equipment.": the test started its three attempts at once. Both faults were in the tests | Claude (for Aaron) |
| 2026-10-08 ≈13:44 | `7544067+local` | 2 | _01–_07 | The same, after fixing the roles test | local, same container | **8/9, failed TC_01** (the same organisation message) | — | Claude (for Aaron) |
| 2026-10-08 ≈13:45 | `7544067+local` | 2 | _01–_07 | The same, reading the Activity log as the event's organiser | local, same container | 9/9 passed | — | Claude (for Aaron) |
| 2026-10-08 ≈13:45 | `7544067+local` | 1 | — | `npx tsx --test tests/equipmentReservations.test.ts` | local | 6/6 passed | — | Claude (for Aaron) |
| 2026-10-08 ≈13:46 | `7544067+local` (committed as `4e7f93c`) | 1 | — | `npm test` (backend) | local | 318/318 passed | — | Claude (for Aaron) |
| 2026-10-08 ≈13:46 | `7544067+local` | 3 | _01–_07 and E07-S01 to S03 | The four equipment database suites in one command | local, same container | 12/12 passed | — | Claude (for Aaron) |
| 2026-10-08 ≈13:52 | `4e7f93c+local` | F1 | _01, _02, _04 | `npx vitest run --no-file-parallelism src/features/support/EquipmentReservations.test.tsx` | local | 12/12 passed | — | Claude (for Aaron) |
| 2026-10-08 ≈13:53 | `4e7f93c+local` | F1 | — | `npx vitest run --no-file-parallelism` (whole frontend) | local | 337/337 passed | — | Claude (for Aaron) |
| 2026-10-08 ≈13:56 | `4e7f93c+local` | F2 | _01–_07 | `npx playwright test tests/e2e/equipmentReservations.spec.ts tests/e2e/support.spec.ts` | local, fake API | **Failed to load** | "SyntaxError: … support.spec.ts: Unexpected token" (a regular expression mangled while editing); fixed | Claude (for Aaron) |
| 2026-10-08 ≈13:57 | `4e7f93c+local` | F2 | _01–_07 | The same | local, fake API | 26/26 passed (desktop and Pixel 7) | — | Claude (for Aaron) |
| 2026-10-08 ≈13:59 | `c4bc042` | F2 | _01–_07 | `npx playwright test` (full) | local, fake API | 260 passed, 0 failed, 320 skipped | — | Claude (for Aaron) |
| 2026-10-08 ≈13:59 | `c4bc042` | 4 | — | `npx c8 … npx tsx --test` over the equipment unit and database suites | local, same container | 35/35 passed; `reservations.ts` **99.46% lines (466–468 uncovered), 96.77% branches**; the other changed files 100% | Gap: changing a reservation whose equipment was retired | Claude (for Aaron) |
| 2026-10-08 ≈14:00 | `c4bc042+local` (committed as `7381155`) | 4 | — | The same, after adding tests | local, same container | 36/36 passed; every changed backend file **100% lines and branches** | A null guard that could not be reached was removed; a no-Coordinator test added | Claude (for Aaron) |
| 2026-10-08 ≈14:01 | `7381155`, with bugs put in on purpose | deliberate bug | _01–_07 | `equipmentReservations.integration.test.ts`, three times, each with one bug, restored from git afterwards | local, same container | **Each bug was caught**: over-free check removed failed TC_02, TC_03, the change test and the two-at-once test; partial stored as reserved failed TC_02 and the roles test; own reservation not excluded failed TC_01 and the change test | Shows the tests check these rules | Claude (for Aaron) |
| 2026-10-08 ≈14:02 | `7381155`, with bugs put in on purpose | deliberate bug | _02 | `EquipmentReservations.test.tsx`, twice, restored from git afterwards | local | **Each bug was caught**: a partial reservation shown as Reserved failed 2 tests; the free-quantity check removed from the form failed 2 tests | — | Claude (for Aaron) |
| 2026-10-08 ≈14:05 | `7381155+local` (committed as `40e2f90`) | 4 | — | `npx vitest run --coverage` over the support screens | local | 66/66 passed; every changed line and branch covered | Remaining gaps are Xiang Ying's unchanged lines (Known limits) | Claude (for Aaron) |
| 2026-10-08 ≈14:08 | `40e2f90+local` | F1 | _01 | `EquipmentReservations.test.tsx` after the role check on the form | local | **66/67, then 66/67 again, failed TC_01 and the change test** | Both read the form before the session had loaded ("Unable to find an element with the text: Free for these dates"); tests now wait for it | Claude (for Aaron) |
| 2026-10-08 ≈14:09 | `40e2f90+local` (committed as `a9f4106`) | F1, F2 | — | The same file (67/67); whole frontend (343/343); three Playwright specs (34/34) | local | all passed | — | Claude (for Aaron) |
| 2026-10-08 ≈14:11 | `a9f4106` | F3 | _01–_04 | Click-through script driven in Chromium (`f3_54.mjs`, outside the repo) | local real stack: Vite 5173, API 3001, freshly reset and seeded `connectsphere_dev_stack` | **38/41** | The script's own faults: it expected three "Not reserved" lines (Portable Stage correctly reads "Exceeds total stock") and read two screens before they loaded | Claude (for Aaron) |
| 2026-10-08 14:12 | `a9f4106` | F3 | _01–_04 | The same, after a fresh reset | local real stack | 41/41 passed. Session record `20261008-141228-Bl0oper-frontend-e2e.md` | Messages word for word in the session record | Claude (for Aaron) |
| 2026-10-08 14:13 | `a9f4106` | 1 | — | `npm test` (backend) | local | 318/318 passed. Session record `20261008-141318-Bl0oper-backend-unit.md` | — | Claude (for Aaron) |
| 2026-10-08 14:13 | `a9f4106` | 2, 3 | _01–_07 | `npm run test:db --workspace backend` | local, Docker `postgres:17` (17.11), `connectsphere_notification_test` | **63/64, failed E01-S02 (`eventVisibility`)**; all 10 SCRUM-54 tests passed. Session record `20261008-141332-Bl0oper-backend-db.md` | "column e.venue_requirements does not exist": on `main` since #161, not from this story | Claude (for Aaron) |
| 2026-10-08 14:15 | `a9f4106` | F2 | _01–_07 | `npx playwright test` (full) | local, fake API | 260 passed, 0 failed, 320 skipped. Session record `20261008-141526-Bl0oper-frontend-e2e.md` | — | Claude (for Aaron) |
| 2026-10-08 14:16 | `a9f4106` | F1 | _01, _02, _04 | `npx vitest run --no-file-parallelism` (whole frontend) | local | 343/343 passed. Session record `20261008-141658-Bl0oper-frontend-vitest.md` | — | Claude (for Aaron) |
| 2026-10-08 14:17 | `a9f4106` | 5, 10 | — | `python scripts/check.py`; `npm run typecheck`; `npm run build` (root) | local | all passed | — | Claude (for Aaron) |
