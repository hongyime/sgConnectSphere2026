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
| Every reserve, change and release writes an entry to the event's Activity log (D43), with the actor and time | "Equipment reserved — <date> by <name> (Microphone-Wireless × 2)" | Database tests; click-through |
| Reserve and change notify the assigned Coordinator (never the actor) once, through the shared writer, with the activity entry's id as the change id (ADR-006). Release sends no notice (D42) | "Equipment reserved" / "Equipment partly reserved" / "Equipment reservation changed": "<event>, 15 Oct 2026, 9:00 am – 5:00 pm: Portable Stage × 2 of 3 reserved; 1 outstanding." | TC_E07S04_01, _02, _07 |

## Test plan

| TC ID | Type | What the user sees | Backend test | Screen tests |
|---|---|---|---|---|
| TC_E07S04_01 | Happy path | Reserved; the Coordinator's notice names the event, date, time, item and quantity | `equipmentReservations.integration.test.ts` | `EquipmentReservations.test.tsx`; `e07.spec.ts` |
| TC_E07S04_02 | Negative | Partial: 2 of 3 reserved; notice says 1 outstanding | `equipmentReservations.integration.test.ts` | `EquipmentReservations.test.tsx`; `e07.spec.ts` |
| TC_E07S04_03 | Boundary | Availability shows 0 free once every unit is reserved | `equipmentReservations.integration.test.ts` (with E07-S03's check) | `e07.spec.ts` |
| TC_E07S04_04 | Happy path | Released; free quantity goes back up by the released units | `equipmentReservations.integration.test.ts` | `EquipmentReservations.test.tsx`; `e07.spec.ts` |
| TC_E07S04_05 | Boundary (just below) | 3 of 4 free reserved: status Reserved, 1 left free | `equipmentReservations.integration.test.ts` | `e07.spec.ts` |
| TC_E07S04_06 | Boundary (exactly at) | 4 of 4 free reserved: status Reserved, 0 left free, no shortfall notice | `equipmentReservations.integration.test.ts` | `e07.spec.ts` |
| TC_E07S04_07 | Boundary (just above) | 4 reserved against 5 requested: Partial, 1 outstanding. **Its last step (confirmation blocked) belongs to E08-S03 (SCRUM-60) and is tested there (D48)** | `equipmentReservations.integration.test.ts` | `e07.spec.ts` |

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

Written after the screens are built and re-checked against them (see the Run
log for the F3 run that confirmed it).

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
