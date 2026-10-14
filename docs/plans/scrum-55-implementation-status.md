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

What the customer sees, step by step, on the real frontend, real API and a
freshly reset and seeded local database. Note pass or fail for each step; on a
fail, copy the exact words seen. The run uses EVT-3001 (approved, 15 Oct
2026, 9:00 am – 5:00 pm, Coordinator `coord_a`), so **run it on or before
15 October 2026**; after that, the 15 October withdrawals in steps 9 to 11
are refused as already ended.

**Before you start:** the database is reset and seeded, the API runs on
port 3001 and the frontend on http://localhost:5173. Every seeded account's
password is `ValidPass123`. Use two browser windows (one private) so
`tech_a@connectsphere.com` and `coord_a@connectsphere.com` stay signed in
side by side.

**Setting up a reservation to flag** (E07-S02 and E07-S04's screens):

1. `coord_a`: **Equipment requests** → **EVT-3001** → **Add equipment
   request** → Equipment item **Projector-HD**, Quantity requested **2** →
   **Save equipment request**. You see "Equipment request saved".
2. `tech_a`: **Equipment requests** → **EVT-3001** → **Reserve Projector-HD**
   → **Reserve equipment**. You see "Projector-HD × 2 reserved for EVT-3001
   Approved Annual Conference, 15 Oct 2026, 9:00 am – 5:00 pm."

**TC_E07S05_01, an item with no reservations:**

3. `tech_a`: **Equipment catalogue** → **Microphone-Wireless**. Below the
   item's card is a card **Unavailable periods** with "No unavailable
   periods" and a **Mark unavailable** button.
4. Click **Mark unavailable**. The page is headed **Mark equipment
   unavailable**, with a card **Microphone-Wireless** showing Total stock
   **6** and In service for these dates **Choose the dates**; **Units to take
   out** shows **6**. From and To sit level, side by side.
5. Click **Mark unavailable** with nothing filled in. Red at the top: "Fix the
   highlighted fields, then save again." Under From: "Start date must be a
   real date." Under To: "End date must be a real date." Under Reason: "Enter
   a reason."
6. From **1 Oct 2026**, To **5 Oct 2026**, then **Mark unavailable**. Under
   To: "The end date must be today or later."
7. From **1 Dec 2026**, To **5 Dec 2026**, Reason **Sensor repair** (Units
   stays 6; In service for these dates shows 6) → **Mark unavailable**. Back
   on the item's page, green **Marked unavailable**: "Microphone-Wireless × 6
   out of service for 1 Dec 2026 – 5 Dec 2026 (Sensor repair). No
   reservations were affected." The table lists **1 Dec 2026 – 5 Dec 2026 |
   6 of 6 | Sensor repair | Return to service…**
8. **Equipment availability**: Start **3 Dec 2026, 9:00 am**, End **3 Dec
   2026, 5:00 pm** → **Check availability**. Microphone-Wireless shows **0**
   free. Change both dates to **6 Dec 2026**: it shows **6** free.

**TC_E07S05_02, an item reserved for an event:**

9. **Equipment catalogue** → **Projector-HD** → **Mark unavailable**. From
   and To **15 Oct 2026**, Units **1**, Reason **Lamp check** → **Mark
   unavailable**. Green: "Projector-HD × 1 out of service for 15 Oct 2026
   (Lamp check). No reservations were affected." (9 are still in service and
   EVT-3001 needs only 2, so it isn't flagged.) Under Reservation history,
   EVT-3001's status still reads **reserved**.
10. **Mark unavailable** again, From and To **15 Oct 2026**. In service for
    these dates now shows **9**, and Units to take out defaults to **9**. Type
    **10** → **Mark unavailable**. Under the field: "Only 9 units are in
    service for these dates." Nothing is saved.
11. Units **8**, Reason **Lamp replacement** → **Mark unavailable**. Green:
    "Projector-HD × 8 out of service for 15 Oct 2026 (Lamp replacement)."
    Below it, amber **Reservations need review**: "These reservations no
    longer fit and are flagged for review:", "EVT-3001 Approved Annual
    Conference: 2 reserved", "Its Coordinator has been notified." Reservation
    history now reads **Needs review**. Unavailable periods lists two rows:
    **15 Oct 2026 | 1 of 10 | Lamp check** and **15 Oct 2026 | 8 of 10 |
    Lamp replacement**.
12. `tech_a`: **Equipment requests** → **EVT-3001**. The Projector-HD line
    shows the pills **Reserved** and **Needs review**.
13. `coord_a`: the bell → **Equipment reservation needs review** (click the
    title to open it). It reads: "EVT-3001 Approved Annual Conference, 15 Oct
    2026, 9:00 am – 5:00 pm: Projector-HD is unavailable from 15 Oct 2026 to
    15 Oct 2026 (Lamp replacement), 8 units out of service. The reservation
    of 2 needs review." There is only one such notice.
14. `coord_a`: **Equipment requests** → **EVT-3001**. The Projector-HD line
    shows **Reserved** and **Needs review**.

**TC_E07S05_03, return to service:**

15. `tech_a`: **Equipment catalogue** → **Microphone-Wireless** → **Return to
    service…**. A panel **Return Microphone-Wireless to service?** reads "The
    6 units out for 1 Dec 2026 – 5 Dec 2026 (Sensor repair) count as
    available again. Reservations already flagged for review stay flagged
    until they are changed or released." **Cancel** closes it. Open it again
    → **Return to service**. Green **Returned to service**:
    "Microphone-Wireless × 6 is back in service for 1 Dec 2026 – 5 Dec 2026."
    The card reads "No unavailable periods".
16. **Equipment availability** for **3 Dec 2026, 9:00 am – 5:00 pm**:
    Microphone-Wireless shows **6** free again.
17. **Projector-HD** → **Return to service…** on the **Lamp replacement** row
    → **Return to service**. Only the Lamp check row is left. Reservation
    history still reads **Needs review** (returning doesn't clear flags), and
    `coord_a` gets no new notice: still only the one from step 13.

**Who can do it:**

18. `coord_a`: type **http://localhost:5173/support/catalogue** in the address
    bar → **Projector-HD**. The Unavailable periods card lists the Lamp check
    row with **View only**, and there is no Mark unavailable button. Add
    **/unavailable** to the end of the address: "Access denied. Only Technical
    Support Staff can maintain equipment; Coordinators can view it."
19. `tech_a`, DevTools device toolbar at **393 px** wide: Projector-HD's page
    and its Mark unavailable form fit with no sideways scroll; the table rows
    stack into cards; From and To stack one above the other.

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
- **Coverage gaps outside this story:** `handler.ts` lines 26–28 and 40–42
  (availability and update/retire dispatch), `EquipmentCatalogue.tsx` lines
  31, 42 and 105 and `equipmentApi.ts` line 25 have no test in the suites
  measured here; they are Xiang Ying's lines, unchanged. Every new or changed
  line and branch of this story is covered (Run log, gate 4).
- **The click-through needs EVT-3001's date still ahead** (15 October 2026):
  after it, the 15 October withdrawals in steps 9 to 11 are refused as
  already ended, which is the rule working, not a fault.

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
| 2026-10-12 00:46 | `d8ce717+local` (committed as `aae3df7`) | 2 | _01–_03 | `npx tsx --test tests/equipmentUnavailability.integration.test.ts` (backend) | local, Docker `postgres:17` (17.11), `connectsphere_notification_test` | 10/10 passed | — | Claude (for Aaron) |
| 2026-10-12 00:46 | `d8ce717+local` | 1 | — | `npx tsx --test tests/equipmentUnavailability.test.ts` | local | **5/6, failed "E07-S05 D51 invalid dates quantities and reasons are refused with field errors"** | Expected "The end date must be today or later.", got "End date must be on or after the start date.": the test's end date was also before its start date. Fault in the test; fixed | Claude (for Aaron) |
| 2026-10-12 00:46 | `d8ce717+local` | 1 | — | The same | local | 6/6 passed | — | Claude (for Aaron) |
| 2026-10-12 ≈00:49 | `aae3df7+local` | F1 | _01–_03 | `npx vitest run --no-file-parallelism src/features/support/EquipmentUnavailability.test.tsx` | local | **9/10, failed TC_01** | "Unable to find an accessible element with the role "link" and name "Mark unavailable"": the test looked before the session had loaded; it now waits | Claude (for Aaron) |
| 2026-10-12 00:51 | `aae3df7+local` | F1 | _01–_03 | The same, plus `EquipmentCatalogue.test.tsx` | local | 17/17 passed | — | Claude (for Aaron) |
| 2026-10-12 ≈00:52 | `aae3df7+local` | F2 | _01–_03 | `npx playwright test tests/e2e/equipmentUnavailability.spec.ts tests/e2e/equipmentCatalogue.spec.ts tests/e2e/equipmentAvailability.spec.ts` | local, fake API | 20/20 passed (desktop and Pixel 7) | — | Claude (for Aaron) |
| 2026-10-12 ≈00:53 | `aae3df7+local` (committed as `09ddf6f`) | 1, 5, F1 | — | `npm run typecheck` (root); `npm test` (backend); `npx vitest run --no-file-parallelism` (whole frontend) | local | all passed: 327/327; 361/361 | — | Claude (for Aaron) |
| 2026-10-12 ≈00:55 | `09ddf6f` | 4 | — | `npx c8 --src src npx tsx --test` over the E07-S05 unit and database files, the handler and catalogue unit files | local, same container | 21/21 passed; `unavailability.ts` 100% lines, **98.05% branches (264, 405)**; `handler.ts` every changed line covered | Gaps: the one-unit wording; a return that waited while its period was removed; the route listing the catalogue (changed branch). `handler.ts` 26–28 and 40–42 are Xiang Ying's unchanged availability and update/retire lines | Claude (for Aaron) |
| 2026-10-12 00:56 | `09ddf6f+local` | 4 | — | The same, with tests added | local, same container | 22/22 passed; **branch 405 still uncovered** | Two returns at once didn't overlap in time, so the second was refused one step earlier; the test now holds the item's lock in a second transaction | Claude (for Aaron) |
| 2026-10-12 00:57 | `09ddf6f+local` | 4 | — | The same | local, same container | 22/22 passed; `unavailability.ts` **100% lines and branches** | — | Claude (for Aaron) |
| 2026-10-12 00:58 | `09ddf6f+local` (committed as `f899019`) | 4 | — | `npx vitest run --coverage` over `EquipmentUnavailability.tsx` and `unavailabilityApi.ts` | local | First 10/10 with 90.97% branches; after removing two guards that could not be reached and adding four tests, 14/14 and **100% statements, branches, functions and lines** | Remaining gaps are Xiang Ying's unchanged lines (Known limits) | Claude (for Aaron) |
| 2026-10-12 00:59 | `f899019`, with bugs put in on purpose | deliberate bug | _01–_03 | `equipmentUnavailability.integration.test.ts`, three times, each with one bug, restored from git afterwards | local, Docker `postgres:17` (17.11), `connectsphere_notification_test` | **Each bug was caught**: every overlapping reservation flagged failed the D54 test; the in-service check removed failed the D51 and two-at-once tests; return not deleting failed TC_03 | Shows the tests check these rules | Claude (for Aaron) |
| 2026-10-12 00:59 | `f899019`, with bugs put in on purpose | deliberate bug | _02 | `EquipmentUnavailability.test.tsx`, twice, restored from git afterwards | local | **Each bug was caught**: units in service ignoring existing periods failed 3 tests; flagged reservations not listed failed TC_02 and 2 more | — | Claude (for Aaron) |
| 2026-10-12 ≈01:02 | `f899019` | F3 | _01–_03 | Click-through script driven in Chromium (`f3_55.mjs`, outside the repo) | local real stack: Vite 5173, API 3001, freshly reset and seeded `connectsphere_dev_stack` | **35/36** | Step 7 "row listed" read the periods table before the page had reloaded: the script's own fault; it now waits | Claude (for Aaron) |
| 2026-10-12 01:03 | `f899019` | F3 | _01–_03 | The same, after a fresh reset | local real stack | 36/36 passed. Session record `20261012-010325-Bl0oper-frontend-e2e.md` | Messages word for word in the session record | Claude (for Aaron) |
| 2026-10-12 01:03 | `f899019` | 2, 3 | _01–_03 | `npm run test:db --workspace backend` | local, Docker `postgres:17` (17.11), `connectsphere_notification_test` | **81/82, failed E01-S02 (`eventVisibility`)**; all 11 SCRUM-55 tests passed. Session record `20261012-010355-Bl0oper-backend-db.md` | "column e.venue_requirements does not exist": on `main` since #161, not from this story | Claude (for Aaron) |
| 2026-10-12 01:04 | `f899019` | F2 | _01–_03 | `npx playwright test` (full) | local, fake API | 268 passed, 0 failed, 316 skipped. Session record `20261012-010414-Bl0oper-frontend-e2e.md` | — | Claude (for Aaron) |
| 2026-10-12 01:06 | `f899019` | 1 | — | `npm test` (backend) | local | 327/327 passed. Session record `20261012-010622-Bl0oper-backend-unit.md` | — | Claude (for Aaron) |
| 2026-10-12 01:06 | `f899019` | F1 | _01–_03 | `npx vitest run --no-file-parallelism` (whole frontend) | local | 365/365 passed. Session record `20261012-010635-Bl0oper-frontend-vitest.md` | — | Claude (for Aaron) |
| 2026-10-12 01:08 | `f899019` | 5, 10 | — | `npm run typecheck`; `npm run build`; `python scripts/check.py` (root) | local | all passed | — | Claude (for Aaron) |
| 2026-10-12 ≈01:27 | `80c4431` (application code as `f899019`) | F4 | _01–_03 | Aaron's own click-through, the 19-step script, by hand | local real stack, freshly reset and seeded `connectsphere_dev_stack` | 19/19 steps passed. Session record `20261012-012700-Bl0oper-frontend-e2e.md` | Every message as scripted | Aaron |
| 2026-10-14 ≈12:58 | `b428853` + `main` `367b279`, merged (committed as `543e259`) | 1, 5, F1 | _01–_03 | `npm test` (backend); `npm run typecheck` (root); `npx vitest run --no-file-parallelism` (whole frontend); `python scripts/check.py` (root) | local | all passed: 364/364; 369/369. Re-run after merging `main` (#245 tentative holds and later) to clear the conflicts in `backend/package.json` and `tc-coverage.md`; the PR's own diff is unchanged. The SCRUM-55 database tests were not re-run locally (Docker not running); CI's `application-checks` runs `equipmentUnavailability.integration.test.ts` on PostgreSQL for this head | — | Claude (for Aaron) |
| 2026-10-14 13:02 | `3e05237` | 2, 3, 5 | _01–_03 | `application-checks` workflow, including `equipmentUnavailability.integration.test.ts` | ci, PostgreSQL service container: [run 38514538963](https://github.com/hongyime/sgConnectSphere2026/actions/runs/38514538963) | passed; every other PR check passed too | — | CI (for Aaron) |
| 2026-10-14 ≈13:17 | `3e05237` + `main` `c0797ec`, merged (committed as `3fcf018`) | 1, 5 | — | `npm test` (backend); `npm run typecheck` (root); `python scripts/check.py` (root) | local | backend 375/375 and typecheck passed. **`check.py` failed: 14 failures and errors, all in `test_worktree_hygiene`** | "Lists differ: ['git', 'worktree', 'remove', '\\repo\\scratch'] != ['git', 'worktree', 'remove', '/repo/scratch']": #248's new tooling tests expect POSIX paths and fail on Windows. Not from this story: the files are identical to `main`, whose CI (Linux) passes. Re-run after merging `main` again (#258's test now shares the same `package.json` line); the PR's own diff is unchanged | Claude (for Aaron) |
