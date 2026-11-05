# SCRUM-181 / E07-S08 implementation status

Link equipment requests and reservations to Sessions. This file records what
was built, which test proves each acceptance criterion, and **every run of
those tests**, so each result can be traced back to the exact code it ran
against.

## Scope

From `docs/backlog/product/E07-equipment-technical-support.md`, E07-S08
Scenarios 1 to 4 (BDR C-107, T-74, T-79). Cases TC_E07S08_01 to _04 in
`docs/testing/cases/E07.md`.

**Starting point** (`main` at `5ea9ab58`, 4 Nov 2026). Migration 0014
(E04-S02) already gives `equipment_requests` and `equipment_reservations` a
`session_id`, with composite foreign keys to `sessions (id, event_id)` (so a
Session of another Event can't be stored) and a reservation key to its
request's `(id, event_id, session_id)` (so a reservation always has its
request's Session). Its trigger `assign_single_event_session` fills the
Session in when the Event has exactly one, and **refuses the insert when it
has two or more**. The equipment module never sent a `session_id`, so on a
multi-Session Event every new equipment request and reservation failed, and
reservations used the Event's dates rather than their Session's.

**Two PRs** (D136; Aaron's rule: split PRs rather than cut scope):

- **PR 1, SCRUM-253, backend** (`feature/SCRUM-253-equipment-sessions`):
  the equipment module, Session deletion notices, readiness, their unit and
  real-database tests. No story key, so its merge doesn't close the story.
- **PR 2, SCRUM-181, frontend and evidence**
  (`feature/SCRUM-181-equipment-sessions`, stacked on PR 1): the Session
  picker and Session names on the equipment screens and readiness page,
  Vitest and Playwright, Aaron's manual run. It carries the story key;
  Bryan records PO acceptance on it before it is queued (D129).
- **#432, SCRUM-255, manual-run evidence**
  (`test/SCRUM-255-e07s08-manual-evidence`, from `main`): both manual-run
  records, their 20 screenshots and the setup SQL, split out of #427 on
  5 Nov so that #427 fits the 40-file `pr-guardrails` cap (Ji Ning's
  review). Unchanged copies; it merges before #427, which stays last.

**Decisions** (Aaron's task list, 4 Nov 2026; listed in the PRs for Bryan
as PO):

- **D122:** a Session is chosen only when the Event has two or more; with
  one it is filled in. Precedent: E05's booking request
  (`bookingSubmission.ts`) and `VenueSearch`'s picker.
- **D123:** a request's Session can change only while nothing is reserved
  against it: the existing rule that a reserved request can't be amended.
- **D124:** a reservation's period is its Session's: availability, the
  reserved range, and a later change or reconfirmation all use the
  Session's current period. Reservations don't move by themselves when a
  Session's time changes (T-108); E10 flags them for review.
- **D125:** no migration (`docs/db_schema.md`: 0014 added the links).
- **D126:** Aaron owns the story.
- **D129:** the story key goes in the last PR.
- **D130:** Aaron's manual run covers TC_E07S08_01, _02 and _04; TC_03 is
  proved by real-database and API tests (the picker lists only the Event's
  own Sessions, so the screen can't pick another Event's).
- **D131:** on a multi-Session Event, equipment notices and Activity log
  entries name the Session and use its dates. Single-Session Events keep
  today's wording.
- **D132:** a Session deletion in Planning releases its reservations and
  leaves its requests with no Session (0014's `ON DELETE SET NULL`). Such a
  request is flagged "No Session: choose one"; reserving it is refused until
  the Coordinator picks one, unless the Event now has one Session, which is
  filled in.
- **D133:** TC_04's "add a third Session" can't be done in the app once
  staff can be assigned (Sessions are added only on drafts; staff are
  assigned from Approved). The real-database test adds one in SQL and also
  edits and deletes one; the manual run edits a Session's time in Planning.
- **D134:** deleting a Session tells the Coordinator which reservations were
  released and which requests now need a Session, and tells the Event's
  equipment staff their reservations were released.
- **D135:** readiness names each equipment line's Session on a
  multi-Session Event, and a request with no Session blocks as "needs a
  Session".
- **D136:** two PRs (above).
- **D137** (Aaron, 4 Nov, after Xiang Ying's review on #426): filling in the
  last Session when reserving a request with none is refused if that Session
  already has a request for the same item, so one item is never reserved
  twice for one Session. So that such a request can't block readiness for
  good, a Coordinator can remove a request with no Session even if it has
  reservation history; it can only have released reservations (0014). A
  request with a Session keeps E07-S02's rule.
- **D138** (Aaron, 5 Nov, after Le Xin's review on #427): the equipment
  screens name a Session as readiness and the notices do, `Session "Morning"`
  (or "Session 2" untitled), not the bare title the other Session screens
  use, so one Session reads the same on every equipment screen and notice.
  Steps 1 to 6 of the manual run show the new names, so Aaron reran
  TC_E07S08_01 and _02 (5 Nov, PASS). A shared Session-name helper for all
  screens is a follow-up (Le Xin's point; it would change other stories'
  screens).

## Rules this story applies

The messages are the code's wording, word for word. PR 1 is the backend, so
"what the user sees" is the API's answer until PR 2's screens show it.
"Session label" is `Session "<title>"`, or `Session <n>` for an untitled
Session, numbered by start time as the Session screens are.

| Rule | What the user sees | Test case |
|---|---|---|
| On an Event with two or more Sessions a request names one; with one Session it is filled in (D122) | Without one: 400, `errors.sessionId` "Choose a Session for this equipment request." | TC_E07S08_01 |
| The Session must be one of the Event's own; the database's composite key backs this up | 400, `errors.sessionId` "Choose a Session of this event." Nothing is stored | TC_E07S08_03 |
| An edit that leaves the Session out keeps it; a reserved request's Session can't change (D123) | 409 "This request has been reserved and cannot be amended or removed here." | TC_E07S08_01 |
| One request per item per Session, so each Session reserves its own | 409 "This equipment is already requested for this Session. Edit its existing request." ("…for this event." on a single-Session Event, as before) | TC_E07S08_01, _02 |
| A reservation takes its request's Session and that Session's period; availability is for that period (D124) | The reservation response adds `session`; Technical Support's free quantity is the Session's | TC_E07S08_02 |
| A change or reconfirmation resets the reservation to its Session's current period; a Session time change alone moves nothing (T-108) | — | TC_E07S08_02 |
| Not enough free for a Session | 409 "None are free for this Session's dates." / "Only <n> are free for this Session's dates." | TC_E07S08_02 |
| A request whose Session was deleted has none; it can be edited to choose one, and reserving it is refused until then, unless one Session is left, which is filled in (D132) | 409 "Choose a Session for this request before reserving it." | D132 test |
| Filling in the last Session is refused when that Session already requests the item; a request with no Session can be removed despite released reservations (D137) | 409 "This equipment is already requested for this event. Reserve its other request; the Coordinator can remove this one." Nothing changes | D137 test |
| On a multi-Session Event, notices name the Session and its dates (D131) | e.g. "EVT-S8 Tech Conference, Session "Afternoon", 15 Nov 2026, 1:00 pm – 3:00 pm: Wireless Microphone × 3 reserved." Technical Support's request notice: "EVT-S8A, Session "B", 1 Feb 2027, 1:00 pm – 3:00 pm: Wireless Microphone × 2 requested. …" A withdrawal lists each affected Session, separated by "; " | TC_E07S08_01, _02; D131 test |
| On a multi-Session Event, Activity log entries name the Session (D131) | "Wireless Microphone × 3 for Session "Morning"", "… returned to the available pool" | TC_E07S08_02 |
| Deleting a Session tells the Coordinator what it released and, while two or more Sessions remain, which requests need a Session (D134) | **Equipment reservation released**: "<Event>: Session 1 was deleted, so its equipment reservations were released: Wireless Microphone × 1. These requests now need a Session: Projector × 1, Wireless Microphone × 2. Choose one for each on the event's equipment requests." With nothing reserved: **Equipment request needs a Session** | TC_E07S08_04 |
| The Event's equipment staff (assigned Technical Support, Venue Staff of a booked venue, captured before anything is released) hear of the releases; the actor never does (D134) | **Equipment reservation released**: the first sentence above, then "Changed at <time>." | TC_E07S08_04 |
| Readiness names each equipment line's Session on a multi-Session Event; a request with no Session blocks (D135) | "Projector (Session 2) — 1 of 3 reserved; 2 outstanding"; "Projector — needs a Session; choose one on the equipment requests" | D135 unit test |
| Technical Support staff assignment stays Event-level | Adding, editing or deleting Sessions leaves it unchanged | TC_E07S08_04 |

**On screen (PR 2).** Sessions are named as readiness and the notices name
them (D138): `Session "<title>"`, or "Session <n>" untitled.

| Screen | What the user sees | Test case |
|---|---|---|
| Event equipment page, two or more Sessions | One card per Session, titled with its name, showing its dates ("1 Dec 2026, 1:00 pm – 3:00 pm") and its requests, or "No equipment requested for this Session yet." | TC_E07S08_01 |
| Request form, two or more Sessions | **Session** (required): "Choose a Session", then each Session's name; hint "<chosen Session's dates>. The equipment is reserved for this Session's dates." (the dates left the option, which clipped on a phone, D138) The item list leaves out items already requested for the chosen Session, and choosing such a Session clears that item | TC_E07S08_01 |
| Request form, one Session | No **Session** field; a `sessionId` refusal from the API shows in the form's error alert | D122 |
| Request form, a refused Session | The API's sentence under **Session**, e.g. "Choose a Session of this event." | TC_E07S08_03 |
| A request whose Session was deleted (or isn't one of the Event's) | Card **Requests with no Session**: "Their Session was deleted. Choose a Session for each request before it can be reserved."; pill **No Session: choose one**; the Coordinator gets **Edit** and **Remove**; Technical Support sees "Waiting for a Session" instead of **Reserve** | D132, D137 |
| Technical Support's banner | "Reserve each request from the units free for its Session's dates. The Coordinator is notified of each reservation and change." | TC_E07S08_02 |
| Reserve form | **Session** and **Session dates** instead of **Event dates**; "None are free for this Session's dates." / "Only <n> are free for this Session's dates."; a line with no Session: "Choose a Session for this request before reserving it." | TC_E07S08_02 |
| Confirmations | "<item> × <n> reserved for <event>, <Session name>, <Session dates>."; a release: "… returned to the available pool for <event>, <Session name>, <dates>." | TC_E07S08_02 |
| Readiness page | A **Session** column (`Session "Morning"`, or "No Session") when the server's `multiSession` is true | D135 |
| Single-Session Event | As before: no picker, no Session cards, the Event's dates | D122 |

## Test plan

| TC ID | What it proves | Automated tests |
|---|---|---|
| TC_E07S08_01 | A request on a two-Session Event saves with the chosen Session and still belongs to the Event; the other Session's request and other Events are unchanged; a single-Session Event needs no choice | `equipmentRequests.integration.test.ts` (real database); `equipmentRequests.test.ts` (unit); `EquipmentRequests.test.tsx` (Vitest, StrictMode); `tests/e2e/equipmentRequests.spec.ts` (Playwright, desktop and Pixel 7); manual run |
| TC_E07S08_02 | A reservation takes its request's Session and Session period; stock reserved in Session A doesn't block Session B; a change or reconfirmation uses the Session's current period | `equipmentReservations.integration.test.ts` (real database); `equipmentReservations.test.ts` (unit); `EquipmentReservations.test.tsx` (Vitest, StrictMode); `tests/e2e/equipmentReservations.spec.ts` (Playwright, desktop and Pixel 7); manual run |
| TC_E07S08_03 | A Session of another Event, or an unknown one, is refused with a 400 and nothing is stored; the database's foreign key refuses it too | `equipmentRequests.integration.test.ts` (real database); `equipmentRequests.test.ts` (unit); `EquipmentRequests.test.tsx` (the refusal on screen) |
| TC_E07S08_04 | Adding (by SQL, D133), editing and deleting Sessions leaves the Event's Technical Support staff assignment as it was; deletions send D134's notices | `eventSessionsRoutes.integration.test.ts` (real database; it already deletes Sessions in a rolled-back schema); manual run |

## Test gates

Every gate must pass, and be recorded in the Run log, before each PR is
marked ready.

1. **Backend unit tests**: `npm test --workspace backend`.
2. **Database tests**: the changed `*.integration.test.ts` files and the
   whole `npm run test:db --workspace backend`, against a disposable
   PostgreSQL 17 database named `connectsphere_notification_test`, including
   TC_E07S09 (it reads `reservation_range`).
3. **Coverage**: 100% of new and changed backend lines
   (`npm run test:coverage --workspace backend`, changed-line check).
4. **Typecheck**: `npm run typecheck` (root).
5. **PR 2 only**: Vitest, Playwright, Aaron's manual run (T-93).
6. **Repository checks**: `python scripts/check.py`; `tc-coverage.md`
   regenerated as the last commit; CI green.

No production check is needed for the schema: the story adds no migration.

## Click-through script (Aaron's manual run, D130, D133)

**Setup, by SQL, never a test step.** `docs/testing/manual/E07-S08-preconditions.sql` (in #432),
on the local Docker database `connectsphere_dev_stack` after a fresh reset
and seed, makes item **E07-S08 Microphone** (stock 2) and Planning Event
**EVT-9301 Two-Session Expo** (organiser_a, coord_a), 1 Dec 2026, with
Sessions **Morning** 9:00–11:00 am and **Afternoon** 1:00–3:00 pm. The
Morning already has 2 microphones requested and reserved by tech_a, and
Morning technical support staffed by tech_a. No screen can make this:
Sessions are added only on drafts, equipment and technicians only from
Approved.

**Before step 1:** API on port 3001, frontend on http://localhost:5173.
Password for all three: `ValidPass123` (`tests/seed/SEED_DATA.md`). <!-- pragma: allowlist secret -->
One browser profile per account: `coord_a@connectsphere.com` (Chrome),
`tech_a@connectsphere.com` (Chrome Incognito), `organiser_a@clienta.com`
(Edge). **Screenshots:** the whole browser window, address bar and signed-in
role visible, bookmarks bar hidden (Ctrl + Shift + B); zoom out rather than
crop. Name each one as below.

### TC_E07S08_01: a request linked to Session B (here "Afternoon")

1. coord_a: open http://localhost:5173/coordinator/events/EVT-9301/equipment.
   Card **Session "Morning"** (1 Dec 2026, 9:00 am – 11:00 am): E07-S08
   Microphone, 2, **Reserved**. Card **Session "Afternoon"** (1:00 pm –
   3:00 pm): "No equipment requested for this Session yet." →
   `tc01-1-before.png`
2. **Add equipment request**. **Session**: Session "Afternoon" (the hint
   under it reads "1 Dec 2026, 1:00 pm – 3:00 pm. The equipment is reserved
   for this Session's dates."); **Equipment item**: E07-S08 Microphone;
   **Quantity requested**: 2 → `tc01-2-form.png` (before saving)
3. **Save equipment request**. Green "Equipment request saved." The
   **Session "Afternoon"** card now lists E07-S08 Microphone, 2, **Not
   reserved**; the **Session "Morning"** card is unchanged →
   `tc01-3-saved.png`

### TC_E07S08_02: the reservation uses Session B's time

4. tech_a: open http://localhost:5173/support/events/EVT-9301/equipment.
   "Reserve each request from the units free for its Session's dates. …"
   → `tc02-1-page.png`
5. In the **Session "Afternoon"** card, **Reserve E07-S08 Microphone**.
   **Session**: Session "Afternoon"; **Session dates**: 1 Dec 2026, 1:00 pm – 3:00 pm; **Free for
   these dates**: 2 (all 2 are reserved in the Morning, which doesn't
   overlap) → `tc02-2-form.png`
6. **Reserve equipment**. Green **Reserved**: "E07-S08 Microphone × 2
   reserved for EVT-9301 Two-Session Expo, Session "Afternoon", 1 Dec 2026,
   1:00 pm – 3:00 pm." Both cards show **Reserved** → `tc02-3-reserved.png`
7. **Equipment availability**: Start 01/12/2026 09:00, End 01/12/2026 11:00,
   **Check availability**. E07-S08 Microphone: 0 free → `tc02-4-morning.png`
8. Start 01/12/2026 13:00, End 01/12/2026 15:00, **Check availability**.
   E07-S08 Microphone: 0 free (only Session B's reservation counts here;
   11:00–13:00 would show 2) → `tc02-5-afternoon.png`

### TC_E07S08_04: the technician stays assigned to the Event

9. tech_a: **Technician staffing**, filter **Staffed**. EVT-9301
   Two-Session Expo, "Sound desk for the Morning keynote", Technicians:
   **Technical Support A**, **Staffed** → `tc04-1-before.png`
10. organiser_a: open http://localhost:5173/organiser/requests/EVT-9301. In
    **Event Sessions**, the **Afternoon** row: Starts 1 Dec 2026 2:00 pm,
    Ends 4:00 pm → **Save session**. The check opens: "Equipment to
    reconfirm: E07-S08 Microphone: date or time changed" →
    `tc04-2-review.png`
11. **Save and ask staff to reconfirm**. "Session saved." →
    `tc04-3-saved.png`
12. tech_a: **Technician staffing**, filter **Staffed** again: the same row,
    **Technical Support A**, **Staffed**; no Session-level assignment was
    needed → `tc04-4-after.png`

(After step 11 the Afternoon reservation keeps 1:00–3:00 pm and shows
**Needs review**: T-108; reconfirming takes the new time, D124. Not a step
of this run.)

## Known limits

- **No screen yet (PR 1).** Until PR 2, the equipment pages send no
  `sessionId`: requests on single-Session Events work as before; on a
  multi-Session Event a new request is refused with "Choose a Session for
  this equipment request." (it failed with a database error before), and an
  edit keeps its Session.
- **Removing a request whose Session was deleted** was at first still
  refused while it had released reservation history; since D137 (#426
  review) it can be removed as well as edited to choose a Session (D132).
  PR 2's screen offers both.
- **Readiness on a single-Session Event** shows a request without a Session
  as its released reservation, not as "needs a Session": reserving fills the
  only Session in (D132).
- **A withdrawal notice** still sums the affected reservations into one
  "The reservation of <n> needs review." across Sessions (E07-S05's
  wording); it now lists each affected Session.

## Run log

| Date and time (SGT) | Commit | Gate | TCs | Command | Where | Result | Exact message or note |
|---|---|---|---|---|---|---|---|
| 2026-11-04 ≈16:31 | `4594848+local` | 1 | — | `npm test` (backend), before the unit tests were updated | local | 724 tests: 721 passed, **2 failed**, 1 skipped | Expected: `validateRequestInput` now returns `sessionId: null`; readiness lines now carry `sessionId` and `sessionName`. Tests updated |
| 2026-11-04 ≈16:34 | `4594848+local` | 2 | _01 to _04, TC_E07S09 | the changed DB suites (requests, reservations, unavailability, readiness, Session routes, support, catalogue) before new tests | local, Docker `connectsphere_notification_test` | 53/53 passed | The existing behaviour holds on the changed code |
| 2026-11-04 ≈16:36 | `4594848+local` | 2 | _02 | `npx tsx --test --test-name-pattern="E07S08\|E07-S08" tests/equipmentReservations.integration.test.ts` | local, same | 1 passed, **1 failed** | Test's own mistake: a change excludes its own units, so "Only 2 are free for this Session's dates." was right, not "None are free…". Expectation fixed |
| 2026-11-04 ≈16:39 | `4594848+local` | 3 | — | unit + whole `test:db` under c8, then the changed-line and changed-branch checks | local, same | 263/263 lines; **2 branches never taken** | `requests.ts` (an Event with no code on a multi-Session notice) and `reservations.ts` (`session ?? null`, unreachable). The fallback is computed once with a new test case; the unreachable `?? null` removed |
| 2026-11-04 16:41–16:43 | `8135c42` | 1, 2, 3, 4 | _01 to _04, TC_E07S09 | `npm run typecheck` (root); `npm test` (backend); `npx c8 --clean=false tsx --test <test:db files>`; `npx c8 report` | local, Docker `connectsphere_notification_test` | typecheck clean; unit 727: 726 passed, 1 skipped; `test:db` 362/362; 315/315 changed lines and 115/115 changed branches covered | Records `20261104-164122-Bl0oper-backend-unit.md`, `20261104-164205-Bl0oper-backend-db.md` |
| 2026-11-04 ≈17:20 | `0ddba25+local` | 5 | _01, _02 | `npx playwright test tests/e2e/equipmentRequests.spec.ts tests/e2e/equipmentReservations.spec.ts -g TC_E07S08` | local | 4/4 passed (desktop, mobile) | Screenshots looked at: the form's Session option was clipped in the two-column form ("…3:00 p"); the Session field made full width and rerun, 1/1 passed |
| 2026-11-04 17:24–17:28 | `c789569` | 4, 5 | _01 to _03 | `npm run typecheck` (root); `npx vitest run --no-file-parallelism --coverage` (frontend) | local | **typecheck failed**; Vitest 847/847 | `EquipmentReservations.test.tsx` passed a `sessionId` the shared fixture's type didn't have. Fixed in `50ada3b` |
| 2026-11-04 17:29–17:33 | `50ada3b` | 4, 5 | _01 to _03 | the same, then the changed-line and changed-branch checks | local | clean; 847/847; 45/45 lines; **2 branches never taken** | Xiang Ying's "Exceeds total stock" pill, unchanged but moved into the per-Session table; covered only by Playwright. A Vitest check added in `db7d723` |
| 2026-11-04 17:34–17:39 | `db7d723` | 4, 5 | _01 to _03 | the same | local | typecheck clean; Vitest 847/847 in 76 files; 45/45 changed lines and 115/115 changed branches covered | Record `20261104-173450-Bl0oper-frontend-vitest.md` |
| 2026-11-04 17:39–17:42 | `db7d723` | 5 | _01, _02 | `npx playwright test --reporter=list` (whole suite) | local | 466 passed, 218 skipped, 0 failed | Record `20261104-173922-Bl0oper-frontend-e2e.md` |
| 2026-11-04 ≈17:45 | `db7d723+local` (setup SQL not yet committed) | 5 (dry run, not evidence) | _01, _02, _04 | Claude's headless script of the click-through steps on the local real stack | local, Docker `connectsphere_dev_stack` | every step showed the scripted screen and wording | The staffing queue opens on "Needs a technician", so step 9 picks **Staffed**. Database reset and setup SQL re-applied afterwards |
| 2026-11-04 17:49–18:09 | `d05f38b` (code of `db7d723`) | 5 (manual, T-93) | _01, _02, _04 | Aaron's click-through of the script above, by hand, 12 screenshots | local real stack, Docker `connectsphere_dev_stack` | **PASS** all three | Run by: Aaron. Database checked afterwards: both reservations on their own Sessions; after the edit the Afternoon reservation keeps 1:00–3:00 pm and is flagged (T-108); the one assignment unchanged; five notices, one delivery each. Record `20261104-174900-Bl0oper-frontend-e2e.md` (in #432) |
| 2026-11-04 ≈23:32 | `c6bcf02+local` | 2 | — | the new D137 test (`--test-name-pattern=D137`, `equipmentReservations.integration.test.ts`) with the old `reservations.ts` | local, Docker `connectsphere_notification_test` | **1 failed**, as intended | "Missing expected rejection.": the orphan was reserved for the Session that already had the item (the bug in Xiang Ying's #426 review) |
| 2026-11-04 ≈23:32 | `c6bcf02+local` | 2 | — | the same test with the old `requests.ts` | local, same | **1 failed**, as intended | The orphan's removal was refused: "This request has been reserved and cannot be amended or removed here." (D137) |
| 2026-11-04 23:34–23:35 | `696c9fa` | 1, 2, 3, 4 | _01 to _04, TC_E07S09 | `npm run typecheck` (root); `npm test` (backend); `npx c8 --clean=false tsx --test <test:db files>`; `npx c8 report` | local, Docker `connectsphere_notification_test` | typecheck clean; unit 727: 726 passed, 1 skipped; `test:db` 363/363; 332/332 changed lines and 117/117 changed branches covered | After the #426 review fix. Records `20261104-233410-Bl0oper-backend-unit.md`, `20261104-233424-Bl0oper-backend-db.md` |
| 2026-11-04 23:39–23:43 | `c6ef27f` | 4, 5 | _01 to _03 | `npm run typecheck` (root); `npx vitest run --no-file-parallelism --coverage` (frontend), then the changed-line and changed-branch checks against the backend branch | local | typecheck clean; Vitest 847/847 in 76 files; 45/45 changed lines and 113/113 changed branches covered | After the merge of the #426 fix; Remove now offered on a request with no Session (D137). Record `20261104-233907-Bl0oper-frontend-vitest.md` |
| 2026-11-04 23:43–23:46 | `c6ef27f` | 5 | _01, _02 | `npx playwright test --reporter=list` (whole suite) | local | 466 passed, 218 skipped, 0 failed | Record `20261104-234311-Bl0oper-frontend-e2e.md`. Aaron's manual run (17:49–18:09) still stands: none of its steps removes a request with no Session |
| 2026-11-05 ≈15:05 | `2c95f0d8+local` | 5 | _01 to _03 | `npx vitest run --no-file-parallelism src/features/support src/features/coordinator/EventReadiness.test.tsx` (frontend), after Le Xin's #427 fixes, before the tests were updated | local | 107/108, **1 failed** | Expected: TC_E07S08_01 looked for the table "Equipment requested for Morning", now "… for Session "Morning"" (D138). Test updated; 111/111 |
| 2026-11-05 ≈15:10 | `2c95f0d8+local` | 5 | — | the same support files with each new fix reverted in turn | local | **2 failed**, then **1 failed**, as intended | Without the fixes, "Waiting for a Session" and the single-Session `sessionId` alert tests failed. The item-clearing test still passed (jsdom shows an empty select once the option is filtered out), so it was strengthened to switch back to the first Session; it then failed without the fix ("expected 'eq1' to be ''") and passed with it |
| 2026-11-05 15:13–15:14 | `1d1c70c` | 1, 2, 3, 4 | _01 to _04, TC_E07S09 | `npm run typecheck` (root); `npm test` (backend); `npm run test:db` (backend); `npm run test:coverage --workspace backend` and the changed-line check against `2c95f0d8` | local, Docker `connectsphere_notification_test` | typecheck clean; unit 727: 726 passed, 1 skipped; `test:db` 363/363; 1/1 changed runtime line covered (`types.ts` is types only) | The readiness snapshot's `multiSession`. Records `20261105-151321-Bl0oper-backend-unit.md`, `20261105-151403-Bl0oper-backend-db.md` |
| 2026-11-05 15:13–15:17 | `1d1c70c` | 5 | _01 to _03 | `npx vitest run --no-file-parallelism --coverage` (frontend) | local | 850/851, **1 failed** | Not this PR's code: `SessionEditor.test.tsx` "TC_E10S02_14 …" (a focus check, "expected <body> to be <div tabindex="-1">"). Passed 3/3 on its own; intermittent |
| 2026-11-05 15:18–15:22 | `1d1c70c` | 5 | _01 to _03 | the same, then the changed-line and changed-branch checks against the merge base `0d1609d8` | local | 851/851 in 76 files; 48/48 changed lines, 126/126 changed branches | — |
| 2026-11-05 15:38–15:40 | `1d1c70c` | 5 | _01, _02 | `npx playwright test --reporter=list` (whole suite) | local | 466 passed, 218 skipped, 0 failed | Screenshots looked at: on Pixel 7 the closed Session picker cut off the option ("Session "B", 20 Nov 2026, 1:00 pm – :"). `8054ee2` shows the name only and the chosen Session's dates in the hint |
| 2026-11-05 15:41–15:47 | `8054ee2` | 4, 5 | _01 to _03 | `npm run typecheck` (root); `npx vitest run --no-file-parallelism --coverage` (frontend) and the changed-line and changed-branch checks; `npx playwright test --reporter=list` | local | typecheck clean; Vitest 851/851 in 76 files; 49/49 changed lines, 128/128 changed branches; Playwright 466 passed, 218 skipped, 0 failed | Pixel 7 screenshot now shows Session "B" and its dates in full. Records `20261105-154146-Bl0oper-frontend-vitest.md`, `20261105-154538-Bl0oper-frontend-e2e.md` |
| 2026-11-05 ≈15:49 | `8054ee2+local` (story record only) | 5 (dry run, not evidence) | _01, _02 | Claude's headless script of steps 1 to 8 on the local real stack | local, Docker `connectsphere_dev_stack` | every step showed the scripted screen and wording | Database reset and setup SQL re-applied afterwards |
| 2026-11-05 15:52–16:00 | `8054ee2` | 5 (manual, T-93) | _01, _02 | Aaron's rerun of steps 1 to 8 by hand, 8 screenshots (D138 changed their screens; TC_04's run of 4 Nov stands) | local real stack, Docker `connectsphere_dev_stack` | **PASS** both | Run by: Aaron. Database checked afterwards: each reservation on its own Session's period; three notices, one delivery each, naming Session "Afternoon" and its dates. Record `20261105-155200-Bl0oper-frontend-e2e.md` (in #432) |
