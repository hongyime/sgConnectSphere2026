# SCRUM-55 / E07-S05 implementation status

Mark equipment as unavailable. This file records what was built, which test
proves each acceptance criterion, and **every run of those tests**, so each
result can be traced back to the exact code it ran against.

## Scope

From `docs/backlog/product/E07-equipment-technical-support.md`:

- Scenario 1: Technical Support marks an item with no reservations in the
  period as unavailable, with a reason and a period, and it is excluded from
  availability checks for that period.
- Scenario 2: when the item is reserved for an upcoming event, marking it
  unavailable flags the affected events and notifies their Coordinators.
- Checklist: return an item to service, restoring it to availability checks.
- Decisions: B-04 (a standing operational status on the item, E07-S01, is
  separate from a dated withdrawal, a row in `equipment_unavailability`).

Built on E07-S01 (catalogue and its detail page, #214), E07-S03 (the
availability check already subtracts `equipment_unavailability` rows, #229)
and E07-S04 (reservations to flag, #236). The closest precedent is E05-S04
"Block a venue for maintenance" (`venueBooking/blocks.ts`). No migration:
every table and column already exists.

## Rules this story applies

These rules were settled by the story owner before building (D36 and D49–D54
in the story's task list). Each has a test below. The messages are the code's
wording, word for word.

| Rule | What the user sees | Test case |
|---|---|---|
| Only Technical Support Staff mark items unavailable or return them to service. Other roles are refused and the refusal is audited (E14-S02). Coordinators can still read the item and its periods | 403 "Access denied. Only Technical Support Staff can maintain equipment; Coordinators can view it." (E07-S01's guard, reused) | Database and unit tests |
| A withdrawal takes a chosen number of units out for a period, defaulting to the units still in service (D36, D51) | Field "Units to take out", hint "From 1 to N." | TC_E07S05_01 |
| The period is whole Singapore days, first and last day included, stored as `[first day 00:00, day after last 00:00)` (D51, as E05-S04's venue blocks) | "Start date must be a real date." / "End date must be on or after the start date." | Unit tests |
| A period whose last day has already passed is refused (D51) | "The end date must be today or later." | Unit tests |
| A reason is required, up to 255 characters (D51; the column limit) | "Enter a reason." / "Reason must be at most 255 characters." | Unit tests |
| Withdrawals may overlap; together they can't take out more units than the item has (D51) | 409 "Only 3 units are in service for these dates." / "No units are in service for these dates." | Database tests |
| Retired items can't be marked unavailable or returned to service; items "Under maintenance" can still be marked (B-04) | 409 "This equipment has been retired, so its availability can't be changed." | Database tests |
| The availability check excludes the withdrawn units for any time in the period (E07-S03's calculation, unchanged) | Availability shows the free quantity reduced, e.g. 0 when the whole item is out | TC_E07S05_01 |
| Reserved or partial reservations that **no longer fit** because of the withdrawal are flagged "Needs review" (`requires_reconfirmation`). Fit is judged with E07-S03's calculation, leaving the reservation itself out, as E07-S04's recheck does (D50, D54). The withdrawal is never blocked by reservations | The saved message lists the affected events; the reservation shows "Needs review" on the equipment page and the event's equipment page | TC_E07S05_02 |
| Each affected event's assigned, active Coordinator (never the actor) gets one notice, with a stable change id per withdrawal (ADR-006) | "Equipment reservation needs review": "<event>, 1 Dec 2026, 9:00 am – 5:00 pm: HD Camera × 2 unavailable 1 Dec 2026 to 5 Dec 2026 (Sensor repair). The reservation needs review." | TC_E07S05_02 |
| Return to service deletes the withdrawal; the units count as free again (D49, as E05-S04's "Remove block"). Only current and future periods are listed, so only those can be returned | The period disappears from the list; availability goes back up | TC_E07S05_03 |
| Returning to service clears no flags and sends no notice. A flag clears only when Technical Support changes or releases that reservation (D53, D45) | "Needs review" stays until Technical Support acts | Database tests |
| Every withdrawal and every return writes an audit entry against the withdrawal, with the actor, time, item, units, period and reason (D52, as E05-S04). The table has no "created by" column, so this is the record of who did it | Not shown in any screen (the Activity log screen is per event; a global log is Release 2) | Database tests |
| Locking: the equipment row (`FOR UPDATE`, the same lock as E07-S01's stock changes and E07-S04's reservation writers), then the reservation rows | Two changes at once wait for each other | Database tests |

## Test plan

Backend tests are in `backend/tests/equipmentUnavailability.integration.test.ts`
(real database) and `equipmentUnavailability.test.ts` (unit); screen tests in
`frontend/src/features/support/EquipmentUnavailability.test.tsx` (Vitest) and
`tests/e2e/equipmentUnavailability.spec.ts` (Playwright, which replaces the
`test.fixme` cases in `e07.spec.ts`). Each title contains its TC ID.

| TC ID | Type | What the user sees | Backend test | Screen tests |
|---|---|---|---|---|
| TC_E07S05_01 | Happy path | The period is listed on the item's page; availability for a day inside it shows 0 free | "TC_E07S05_01 …" | Vitest and Playwright "TC_E07S05_01 - …" |
| TC_E07S05_02 | Negative | The saved message names the affected event; its reservation reads "Needs review"; the Coordinator's notice names the item, period and reason | "TC_E07S05_02 …" | Vitest and Playwright "TC_E07S05_02 - …" |
| TC_E07S05_03 | Happy path | After "Return to service…" and confirming, the period is gone and the units are free again | "TC_E07S05_03 …" | Vitest and Playwright "TC_E07S05_03 - …" |

Decision and rule tests without a catalogue case are titled "E07-S05 …".

**Test data (D47, carried over from SCRUM-54):** the test cases name
"HD Camera", `tech_support_1` and `coordinator_1`, which the seed doesn't
have; #230 is renaming the accounts in `E07.md`. The automated tests create
their own data, and the click-throughs use seeded items (`Projector-HD`,
`Microphone-Wireless`) and accounts (`tech_a`, `coord_a`).

## Test gates

Every gate below must pass, and be recorded in the Run log, before the PR is
opened. The PR is re-run in full if the code changes after that. Runs cited
as evidence also get a session file in `docs/testing/runs/` (T-65).

1. **Backend unit tests**: `npm test --workspace backend`, the whole suite.
2. **SCRUM-55 database tests**: `equipmentUnavailability.integration.test.ts`
   against a disposable PostgreSQL 17 database named
   `connectsphere_notification_test`.
3. **Neighbouring database tests**: the E07-S01 to S04 suites (catalogue,
   requests, availability, reservations), and the full `test:db` batch.
4. **Coverage**: `npm run test:coverage`; 100% of new and changed lines, or a
   stated reason (Definition of Done, #215).
5. **Typecheck and build**: `npm run typecheck` and `npm run build` from the
   repository root.
6. **F1, component tests**: `npm test --workspace frontend` (Windows:
   `--no-file-parallelism`).
7. **F2, browser tests**: the Playwright suite, including TC_E07S05_01 to
   _03.
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
object names: the `equipment_unavailability` table exists with its columns,
and how many rows it holds.

## Click-through script

Written once the screens are built.

## Known limits

What the tests above do **not** prove. If a customer reports a problem in one
of these areas, it is outside what was tested:

- **Emails are not actually sent.** Tests check the in-app notice and the
  email-outbox row, not delivery.
- **Not tested on the deployed site.** All runs are local.
- **Returned periods leave no row behind** (D49). The audit entry keeps the
  period, units and reason, but no screen shows audit entries for equipment;
  a global log viewer is Release 2.
- **E07-S01's stock-drop check ignores withdrawals** (Xiang Ying's
  `catalogue.ts`, unchanged here). Example: stock 10, 4 withdrawn and 5
  reserved for the same dates; cutting stock to 8 leaves 4 free but flags
  nothing. Until this story, nothing in the app created withdrawals; raised
  with Xiang Ying.
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
