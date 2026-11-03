# SCRUM-245 / E07-S09 implementation status

Preserve reservation warnings when stock reductions overlap withdrawals.
This file records what was built, which test proves each acceptance
criterion, and **every run of those tests**, so each result can be traced
back to the exact code it ran against.

## Scope

From `docs/backlog/product/E07-equipment-technical-support.md`, E07-S09
Scenarios 1 to 3 and the checklist (BDR C-07, C-20). A follow-up to E07-S01
(#214), raised in E07-S05's review (#249) and listed in SCRUM-55's Known
limits ("E07-S01's stock-drop check ignores withdrawals").

**Who wrote what.** Xiang Ying's #265 (merged 14 Oct 2026, `ea46909`,
reviewed by Le Xin) built the behaviour, the backlog entry, TC_E07S09_01 to
_03 and their real-database tests, in `equipmentSupport/catalogue.ts` and
`backend/tests/equipmentCatalogue.integration.test.ts`. #265 left one item
open: "Human manual acceptance of E07-S09". This branch (Aaron, with Claude)
changes no product code. It adds this record, a fresh real-database run on
current `main`, Aaron's manual run (T-93) and the setup SQL for it.

**Decisions** (Aaron's task list, D119–D121, D127; listed in the PR for
Bryan as PO):

- evidence only, no product change, unless a check finds a gap (D119).
  #265's stated unit-coverage exception (SQL temporal logic and
  transactional persistence, proved on PostgreSQL instead) and Le Xin's
  review of its code and tests are cited, not redone;
- one notice per affected Event per stock edit (D120). Scenario 1 asks for
  one notice for the one reservation; TC_01 asserts one per Coordinator per
  Event; E07-S05 (SCRUM-55) uses the same rule. The checklist's "once per
  stock edit" means no repeat within one edit;
- the manual run covers TC_E07S09_01 in full and two TC_E07S09_02 variants:
  a withdrawal starting mid-reservation (flagged) and one ending exactly at
  the reservation's start (not flagged). TC_E07S09_03 stays automated only:
  its case needs a synthetic outbox failure on a disposable database (D121);
- the branch carries the story key; only Subtasks auto-close on merge, so
  SCRUM-245 goes Done by hand after Bryan's acceptance (D127).

## Rules this story applies

The messages are the code's wording, word for word.

| Rule | What the user sees | Test case |
|---|---|---|
| A stock reduction counts dated withdrawals: reserved units plus withdrawn units at the busiest instant of each remaining reservation must fit the new stock | Technical Support, after **Save equipment**: "<item> saved." and, when something no longer fits, amber **Reservations need review**: "Affected reservations were flagged and eligible Coordinators notified." with one line per reservation, "<event code>: <n> units reserved" | TC_E07S09_01 |
| An exact fit is not flagged | "<item> saved." only | TC_E07S09_01 |
| A flagged reservation stays reserved and is marked for review, never released | Item page, Reservation history: status **Needs review**. Equipment requests line: pills **Reserved** and **Needs review** | TC_E07S09_01 |
| The Event's active assigned Coordinator (never the actor) gets one notice per stock edit, with an outbox row; Technical Support and Venue Staff assigned to the Event get it too (E11-S01) | Bell, **Equipment reservation needs review**: "<event code>: <item> stock or operational status changed. Reservations need review; total stock is <n>." | TC_E07S09_01 |
| Only simultaneous demand counts: a withdrawal starting during the reservation counts; one on other dates, ending exactly at its start, starting exactly at its end or already ended does not; non-overlapping withdrawals count at their peak, not their sum | As above when flagged; "<item> saved." only otherwise | TC_E07S09_02 |
| A notification failure rolls back the stock change, the flags and the notices | The save fails; stock, flags and notices are unchanged | TC_E07S09_03 |

## Test plan

| TC ID | What it proves | Automated tests |
|---|---|---|
| TC_E07S09_01 | Stock 10, 4 withdrawn, 5 reserved: 9 flags nothing; 8 flags the reservation, keeps it reserved, one notice and one delivery | `equipmentCatalogue.integration.test.ts` (real database); manual run |
| TC_E07S09_02 | Seven variants: mid-period start (flagged), unrelated dates, starts at the reservation's end, ends at its start, ended, two separate withdrawals of 2 (not flagged), two overlapping withdrawals of 2 (flagged) | `equipmentCatalogue.integration.test.ts` (real database); manual run of the first and fourth |
| TC_E07S09_03 | A forced delivery failure leaves stock 10, no flag and no notice | `equipmentCatalogue.integration.test.ts` (real database) |

No unit tests or Playwright: #265 stated the coverage exception above, and
the screens it uses (E07-S01's form, E07-S05's withdrawals) are covered by
their own stories' tests.

## Test gates

Every gate must pass, and be recorded in the Run log, before the PR is
marked ready.

1. **E07-S09 database tests**: `equipmentCatalogue.integration.test.ts` and
   the whole `npm run test:db --workspace backend`, against a disposable
   PostgreSQL 17 database named `connectsphere_notification_test`.
2. **Backend unit tests**: `npm test --workspace backend`.
3. **Typecheck**: `npm run typecheck` (root).
4. **Aaron's manual run** of TC_E07S09_01 and the two TC_E07S09_02 variants
   on the local real stack, his own screenshots (T-93).
5. **Repository checks**: `python scripts/check.py`; `tc-coverage.md`
   regenerated as the last commit; CI green.

No production check is needed: the story adds no migration, and #265's
tables (`equipment_unavailability`, `requires_reconfirmation`) are already
used by E07-S05 in production.

## Click-through script

**Setup, by SQL, never a test step (D121).** No screen can make a
reservation for a chosen item and period in one go, and the seed's
Projector-HD has other commitments. So
`docs/testing/manual/E07-S09-preconditions.sql` makes, on the local Docker
database `connectsphere_dev_stack` after a fresh reset and seed:

- two items, **E07-S09 Light Kit A** and **E07-S09 Light Kit B**, each
  Working with Quantity 10;
- two Planning Events assigned to `coord_a`, each running 1 Dec 2026 00:00
  to 3 Dec 2026 00:00 (Singapore time): **EVT-9201 Overnight Hackathon A**
  with 5 × Light Kit A reserved, and **EVT-9202 Overnight Hackathon B** with
  5 × Light Kit B reserved, each by `tech_a`.

The Events start at midnight because a withdrawal covers whole Singapore
days, so a withdrawal "To 30 Nov 2026" ends exactly when the reservation
starts.

**Before step 1:** the API runs on port 3001 and the frontend on
http://localhost:5173. Passwords are in `tests/seed/SEED_DATA.md`. Use two
browser profiles so `tech_a@connectsphere.com` and
`coord_a@connectsphere.com` stay signed in side by side. **Screenshots:**
the whole browser window, address bar and signed-in role visible,
bookmarks bar hidden (Ctrl + Shift + B); zoom out rather than crop. Name
each one as below.

### TC_E07S09_01: the withdrawal is counted (Light Kit A, EVT-9201)

1. `tech_a`: **Equipment catalogue** → **E07-S09 Light Kit A** →
   **Mark unavailable**. From **1 Dec 2026**, To **2 Dec 2026**, Units **4**,
   Reason **Lens repair** → **Mark unavailable**. Green: 4 units out of
   service for those dates, "No reservations were affected." (4 + 5 = 9
   fits 10.)
2. **Edit equipment** → Quantity **9** → **Save equipment**. Back on the
   catalogue: "E07-S09 Light Kit A saved." and **no** amber box.
   **Screenshot `TC_E07S09_01-1.png`.**
3. **Edit E07-S09 Light Kit A** → Quantity **8** → **Save equipment**.
   "E07-S09 Light Kit A saved." and amber **Reservations need review**:
   "Affected reservations were flagged and eligible Coordinators
   notified.", "EVT-9201: 5 units reserved". **Screenshot
   `TC_E07S09_01-2.png`.**
4. Open **E07-S09 Light Kit A**: Quantity **8**; Reservation history,
   EVT-9201, 5, status **Needs review** (not released).
   **Screenshot `TC_E07S09_01-3.png`.**
5. `coord_a`: the bell → **Equipment reservation needs review**: "EVT-9201:
   E07-S09 Light Kit A stock or operational status changed. Reservations
   need review; total stock is 8." Only one such notice for EVT-9201.
   **Screenshot `TC_E07S09_01-4.png`.**
6. `coord_a`: **Equipment requests** → **EVT-9201**: the Light Kit A line
   shows **Reserved** and **Needs review**.
   **Screenshot `TC_E07S09_01-5.png`.**

### TC_E07S09_02: only simultaneous demand counts (Light Kit B, EVT-9202)

1. `tech_a`: **E07-S09 Light Kit B** → **Mark unavailable**. From and To
   **30 Nov 2026**, Units **4**, Reason **Lens repair** → **Mark
   unavailable**. "No reservations were affected."
2. **Edit equipment** → Quantity **8** → **Save equipment**. "E07-S09 Light
   Kit B saved." and **no** amber box: the withdrawal ends exactly when the
   reservation starts. **Screenshot `TC_E07S09_02-1.png`.**
3. **Edit E07-S09 Light Kit B** → Quantity **10** → **Save equipment** (an
   increase; nothing is checked).
4. **E07-S09 Light Kit B** → **Mark unavailable**. From and To **2 Dec
   2026**, Units **4**, Reason **Cable check** → **Mark unavailable**. "No
   reservations were affected." (4 + 5 = 9 fits 10.)
5. **Edit E07-S09 Light Kit B** → Quantity **8** → **Save equipment**.
   Amber **Reservations need review**, "EVT-9202: 5 units reserved": the
   withdrawal starts halfway through the reservation.
   **Screenshot `TC_E07S09_02-2.png`.**

### After the run (Claude, by SQL)

- Both reservations `reserved` with `requires_reconfirmation` true; stock 8
  for both items; three withdrawals.
- `coord_a` has exactly one "Equipment reservation needs review" notice per
  Event, each with one delivery row. Nobody else is notified: the setup
  Events have no assigned Technical Support or Venue Staff, and `tech_a`
  is the actor.

## Known limits

- **An open-ended reservation range would count as ended** (Le Xin's #265
  note: `upper(range) > now()` is null for an unbounded upper end). No
  screen can make one: the reservation form always sets both ends.
- **Reservations follow the Event's period, not their Session's.** E07-S08
  (SCRUM-181) moves them onto Sessions; its tests rerun TC_E07S09 as
  regression.
- **Emails are not actually sent.** Tests check the in-app notice and the
  outbox row, not delivery.
- **Not tested on the deployed site.** All runs are local.
- **TC_E07S09_03 is proved by the automated test only** (D121).
- **The manual run sets its preconditions by SQL** (setup only).

## Run log

One row per run, newest at the bottom. Add a row every time the tests are run
for this story, whether they pass or fail. A failed run stays in the log; the
fix gets its own row.

| When (SGT) | Commit | Gate | TC IDs | Command | Where | Result | What was seen | Run by |
|---|---|---|---|---|---|---|---|---|
| 2026-11-04 01:48 | `316c339` | 1 | _01, _02, _03 | `npx tsx --test tests/equipmentCatalogue.integration.test.ts` (backend) | local, Docker `postgres:17`, `connectsphere_notification_test` | 10/10 passed | TC_01; all seven TC_02 variants; TC_03; E07-S01's catalogue test | Claude (for Aaron) |
| 2026-11-04 01:48–01:49 | `316c339` | 1 | _01, _02, _03 | `npm run test:db --workspace backend` | local, Docker `postgres:17`, `connectsphere_notification_test` | 349/349 passed | record `20261104-014823-Bl0oper-backend-db.md` | Claude (for Aaron) |
| 2026-11-04 01:49 | `316c339` | 2, 3 | — | `npm test --workspace backend`; `npm run typecheck` (root) | local | 717 passed, 0 failed, 1 skipped; typecheck clean | record `20261104-014920-Bl0oper-backend-unit.md` | Claude (for Aaron) |
| 2026-11-04 ≈01:56 | `316c339+local` (setup SQL uncommitted; no code change) | 4 (dry run) | _01, _02 | `E07-S09-preconditions.sql`, then an API script signing in as `tech_a` and `coord_a` and following the click-through script's steps (scratchpad, not committed) | local API on 3001, Docker `postgres:17`, `connectsphere_dev_stack` | all as expected | TC_01: withdrawal of 4 on 1–2 Dec affected nothing; stock 9 affected nothing; stock 8 listed "EVT-9201: 5"; reservation `reserved`, needs review; `coord_a` had one notice "EVT-9201: E07-S09 Light Kit A stock or operational status changed. Reservations need review; total stock is 8.". TC_02: withdrawal on 30 Nov, stock 8 affected nothing; stock 10, withdrawal on 2 Dec affected nothing; stock 8 listed "EVT-9202: 5". Database reset afterwards | Claude (for Aaron) |
