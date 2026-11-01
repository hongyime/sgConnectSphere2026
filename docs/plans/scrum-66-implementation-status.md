# SCRUM-66 / E09-S04 implementation status

Join the waiting list. This file records what was built, which test proves
each acceptance criterion, and **every run of those tests**, so each result
can be traced back to the exact code it ran against.

## Scope

From `docs/backlog/product/E09-attendee-registration.md`, E09-S04 Scenarios
1-4 and the checklist (BDR C-23, C-98, T-33, T-46, T-54, T-85, T-98, B-10,
O-16). Built on E09-S01 to S03 (Amareet) and E09-S05 (SCRUM-67), all merged.

**Who wrote what.**
- Bryan's #379 (merged 30 Oct, `f91eb3e`) built the product code: join, the
  first-come claim through the registration form, the live waiting-list page
  with Leave, and the release notice on account deactivation.
- This branch (Aaron, with Claude, SCRUM-224) adds the test and acceptance
  work: TC_E09S04_04's wording, the preconditions SQL, the manual run and
  its records. It also fixes the deactivation real-database test so it can
  run, and removes one fallback that can never fire. Details are in the
  Run log.
- The `place_released` notice is Ji Ning's existing E11-S01 hook, called
  from E09-S05's withdrawal and from deactivation.

**Decisions** (Aaron's task list, D80-D99; listed in the PR for Bryan as PO):

- one Event-level list; a waiting-list entry has no Sessions (D80, T-98);
- a full Event with its list off still takes a Pending request (D81); with
  the list on, the Attendee can join or send a request, never both (D99);
- a place is released by an approved place's withdrawal or its account's
  deactivation; capacity increases don't count (D82, C-05);
- no automatic promotion, no hold window, no queue position (D93, D94; C-23,
  T-46);
- the claim uses the normal registration form; a lost race leaves the row
  `waitlisted` (D92);
- **D92 amended (Aaron, 30 Oct):** the notice has no link. The Attendee
  claims from the waiting-list page, because the notification inbox links
  no notice anywhere (see Known limits);
- leaving the list withdraws the `waitlisted` row; joining again is
  allowed (D95).

## Rules this story applies

The messages are the code's wording, word for word.

| Rule | What the user sees | Test case |
|---|---|---|
| A full Event with its list on offers the list and a request | Event page: "This event is full", "You can join the waiting list, or send a registration request for the organiser to review.", link **Join the waiting list** | TC_E09S04_01 |
| Joining creates one Event-level entry, no position | Waiting-list page: "You're on the waiting list", "We'll notify you when a place is released. Everyone on the list is notified; joining does not reserve a place. Claims are first come, with no queue position." | TC_E09S04_01 |
| A released approved place notifies everyone on the list | In-app and email "Event update": "<event name>: A place is available. Apply on a first-come basis; no place has been reserved for you. Changed at <time>." | TC_E09S04_02 |
| The first claim to submit gets the place | Claim form: "Claim a released place", button **Claim a place**; then "You're registered"; notice "Registration confirmed": "...you've claimed a released place and are registered for ..." | TC_E09S04_02, TC_E09S04_03 |
| A second claimant keeps their entry | "That place has just been taken; you're still on the waiting list." | TC_E09S04_02 |
| A full Event with its list off offers a request only | Event page: "This event is full", "You can still send a registration request. The organiser reviews requests over capacity." (no Join link); then "Request sent for review". Server refuses a join: 409 "This event is not accepting waiting-list entries." | TC_E09S04_04 |
| Leaving the list | **Leave waiting list…**, panel "Leave the waiting list?", button **Leave waiting list**; then "You've left the waiting list. You can join again if the event is still full and the list is enabled." | TC_E09S04_05 |
| Join refused when it shouldn't be possible | 409 "This event has places available; register directly.", "You're already on the waiting list for this event.", "You're already registered for this event.", "This event has no places available to wait for."; a closed or unconfirmed Event gives its registration message | (AC 6) |

## Test plan

| TC ID | What the user sees | Automated tests |
|---|---|---|
| TC_E09S04_01 | Join a full Event; one entry with no Sessions | `attendeeRegistration.test.ts` (unit); `attendeeRegistration.integration.test.ts` (real database, API join); `WaitingList.test.tsx` (Vitest) |
| TC_E09S04_02 | Everyone notified; first claim wins; the other stays waitlisted | `attendeeRegistration.test.ts`; `attendeeRegistration.integration.test.ts` (two simultaneous claims for one place); `deactivation.integration.test.ts` (deactivation releases a place and notifies); `WaitingList.test.tsx` |
| TC_E09S04_03 | The claim turns the same row into `registered` | `attendeeRegistration.test.ts`; `WaitingList.test.tsx` |
| TC_E09S04_04 | No list offered; a request is Pending; a join is refused | `attendeeRegistration.test.ts`; `EventRegistration.test.tsx`; `WaitingList.test.tsx` |
| TC_E09S04_05 | Leave after a confirm step; can join again | `WaitingList.test.tsx`; `attendeeRegistration.test.ts` (E09-S05's withdrawal of a waitlisted row) |

No Playwright (D87). The five `test.fixme` scaffolds for TC_E09S04_01 to _05
in `tests/e2e/e09.spec.ts` are removed because live tests now cover them;
their text still showed queue positions, which T-46 removed.

## Test gates

Every gate must pass, and be recorded in the Run log, before the PR opens.

1. **Backend unit tests**: `npm test --workspace backend`.
2. **E09 database tests**: `attendeeRegistration`, `attendeeCapacity`,
   `registrationPeriod` and `deactivation` integration tests against a
   disposable PostgreSQL 17 database named `connectsphere_notification_test`.
3. **Coverage**: 100% of new and changed lines and branches (Definition of
   Done, #215).
4. **Typecheck**: `npm run typecheck` (root).
5. **F1, component tests**: the whole frontend Vitest suite
   (`--no-file-parallelism` on Windows).
6. **Deliberate-bug check**: bugs put in on purpose must make tests fail.
7. **F4, Aaron's manual run** of TC_E09S04_01 to _05 on the local real stack,
   his own screenshots (T-93), before the PR opens.
8. **Repository checks**: `python scripts/check.py`; `tc-coverage.md`
   regenerated as the last commit; CI green.

**Before the demo:** no migration is needed. The schema has been on
production since E09-S01 to S05: the `waitlisted` and `withdrawn` statuses,
`events.waitlist_enabled` and the 0024 index.

## Click-through script

**Setup, by SQL, never a test step (D84).** The cases name accounts
(`attendee_k`, `attendee_m`) and events ("Community Meetup", "Tech
Conference 2026") the seed doesn't have. So
`docs/testing/manual/E09-S04-preconditions.sql` makes them on the local
Docker database `connectsphere_dev_stack`, in one stage. Its header lists
what it makes. Both events are at a 1-place venue, so one registration fills
each:
- Community Meetup (EVT-9201): list on, `attendee_m` registered,
  `attendee_j` waiting;
- Tech Conference 2026 (EVT-9202): list off, `attendee_a` registered.

Every account uses the seed's public password (`tests/seed/SEED_DATA.md`).

**Before step 1:**
- Reset and seed `connectsphere_dev_stack`, run the SQL, start the API and
  `npm run dev`; open `http://localhost:5173`.
- **Two browser profiles** (for example Chrome and Edge), because TC_02 has
  two Attendees claiming at once: `attendee_i` in one, `attendee_j` in the
  other. Every other step can use either; sign out between accounts.
- **Screenshots:** the whole browser window, with the address bar and the
  signed-in role visible; bookmarks bar hidden (Ctrl + Shift + B); zoom out
  rather than crop. Name each one as below, under
  `docs/testing/runs/evidence/<record>/`. One per case is required (T-93).

### TC_E09S04_04: list off, request only (attendee_k)

1. Sign in as `attendee_k@example.com`; open **Discover**, then **Tech
   Conference 2026**.
2. Check: "This event is full", "You can still send a registration request.
   The organiser reviews requests over capacity."; **no** "Join the waiting
   list" link. **Screenshot `TC_E09S04_04-1.png`.**
3. Click **Register**, tick the Session, click **Send request for review**.
4. Check: "Request sent for review". **Screenshot `TC_E09S04_04-2.png`.**

### TC_E09S04_01: join a full Event's list (attendee_i)

1. Sign in as `attendee_i@example.com` (browser 1); open **Discover**, then
   **Community Meetup**.
2. Check: "This event is full", "You can join the waiting list, or send a
   registration request for the organiser to review.", and the link **Join
   the waiting list**. **Screenshot `TC_E09S04_01-1.png`.**
3. Click **Join the waiting list**; on the waiting-list page click **Join the
   waiting list**.
4. Check: "You're on the waiting list", "...Claims are first come, with no
   queue position."; no position number anywhere. **Screenshot
   `TC_E09S04_01-2.png`.**

### TC_E09S04_02: everyone notified, first claim wins (attendee_m, attendee_i, attendee_j)

1. Browser 2: sign in as `attendee_m@example.com`; open **Community
   Meetup**; **Withdraw…**, then **Withdraw registration**. Sign out.
2. Browser 2: sign in as `attendee_j@example.com`; open **Notifications**:
   "Event update", "Community Meetup: A place is available. Apply on a
   first-come basis; no place has been reserved for you."
   **Screenshot `TC_E09S04_02-1.png`.**
3. Browser 1 (`attendee_i`): open **Notifications**: the same notice.
   **Screenshot `TC_E09S04_02-2.png`.**
4. Both browsers: open `/attendee/waitlist/EVT-9201` and click **Claim a
   released place**; tick the Session on both forms.
5. Browser 1 (`attendee_i`) clicks **Claim a place** first: "You're
   registered". **Screenshot `TC_E09S04_02-3.png`.**
6. Browser 2 (`attendee_j`) then clicks **Claim a place**: "That place has
   just been taken; you're still on the waiting list."
   **Screenshot `TC_E09S04_02-4.png`.**

### TC_E09S04_03: the claimed place leaves the list (attendee_i)

1. Browser 1: open `/attendee/waitlist/EVT-9201`.
2. Check: not on the waiting list; "You already have a registration", "An
   active registration means you can't join this Event's waiting list."
   **Screenshot `TC_E09S04_03-1.png`.**

### TC_E09S04_05: leave the list (attendee_j)

1. Browser 2: open `/attendee/waitlist/EVT-9201` (still "You're on the
   waiting list").
2. Click **Leave waiting list…**; the panel "Leave the waiting list?" says
   "You will no longer receive notices when a place is released."; click
   **Leave waiting list**.
3. Check: "You've left the waiting list. You can join again if the event is
   still full and the list is enabled." **Screenshot `TC_E09S04_05-1.png`.**
4. Browser 1 (`attendee_i`): open **Community Meetup**, **Withdraw…**, then
   **Withdraw registration**. This releases a place again, to show
   `attendee_j` no longer hears of it (checked in the database afterwards).

### After the run (Claude, by SQL)

- Statuses on Community Meetup: `attendee_m`, `attendee_i` and `attendee_j`
  `withdrawn`; `attendee_i`'s claimed row is the same row id as its
  waiting-list entry. Tech Conference 2026: `attendee_k` `pending`.
- `place_released` notices: `attendee_i` and `attendee_j`, one each, from
  `attendee_m`'s withdrawal; none from `attendee_i`'s later withdrawal; none
  to `attendee_m`, the Organiser or `attendee_k`.

The automated dry run of these steps through the API (Run log, 31 Oct
≈18:13) gave exactly the messages and notices above.

## Known limits

- **The notice has no link to the claim** (D92 amended). The notification
  inbox links no notice anywhere, and adding links would change shared code
  for every notice. The Attendee reaches the claim from the event page's
  "View waiting list" or the waiting-list page. Follow-up for the inbox's
  owner (E11-S01, Ji Ning).
- **Capacity increases don't notify the waiting list** (D82, C-05: capacity
  impacts are handled manually). Only an approved place's withdrawal or its
  account's deactivation does.
- **The claim UPDATE's `status = 'waitlisted'` guard has no test that can
  reach it.** The claim holds the Event lock and has already read the row as
  waitlisted; every withdrawal takes the same lock first. The guard and its
  409 are a second safety net (Run log, deliberate-bug check).
- **`deactivation.integration.test.ts` is not in CI** (no step in
  `application-checks.yml`), so it ran only locally here. Its SCRUM-66
  assertions never ran on #379 and failed on `main`; fixed on this branch.
- **The manual run is not independent of the code**: Aaron tests a story
  he reviewed and approved.

## Run log

One row per run, newest at the bottom. Add a row every time the tests are run
for this story, whether they pass or fail. A failed run stays in the log; the
fix gets its own row.

| When (SGT) | Commit | Gate | TC IDs | Command | Where | Result | What was seen | Run by |
|---|---|---|---|---|---|---|---|---|
| 2026-10-30 | #379 branch | 1 | _01-_03 | `npm test --workspace backend` | local | 620 passed, 1 database test skipped | [record](../testing/runs/20261030-010353-bryanseah234-backend-unit.md) | Bryan's agent |
| 2026-10-30 | #379 branch | 5 | _01-_05 | `npm run test:coverage --workspace frontend` | local | 688/688 passed | [record](../testing/runs/20261030-010501-bryanseah234-frontend-vitest.md) | Bryan's agent |
| 2026-10-30 | #379 branch | 8 | - | `python scripts/check.py` | local | 186 tooling tests passed | [record](../testing/runs/20261030-010559-bryanseah234-tooling.md) | Bryan's agent |
| 2026-10-30 | `7cae7f2` | 8 | _01-_05 | GitHub Actions Application Checks | ci | PASS | [record](../testing/runs/20261030-010735-bryanseah234-full-regression.md) | CI |
| 2026-10-31 ≈18:13 | `4da52a4+local` | 7 (dry run) | _01-_05 | `E09-S04-preconditions.sql`, then an API script signing in as each account (scratchpad, not committed) | local API on 3001, Docker `postgres:17`, `connectsphere_dev_stack` | all as expected | TC_04 join 409 "This event is not accepting waiting-list entries."; request 201 `pending`. TC_01 join 201 `waitlisted`, 0 Sessions; again 409 "You're already on the waiting list for this event.". TC_02 `attendee_m` withdrawn; one "A place is available" each to `attendee_i` and `attendee_j`; `attendee_i` claim 201 `registered`, 1 Session; `attendee_j` claim 409 "That place has just been taken; you're still on the waiting list.", still `waitlisted`. TC_03 `attendee_i` `registered`. TC_05 `attendee_j` withdrawn; `attendee_i`'s later withdrawal sent `attendee_j` nothing. Database reset afterwards | Claude (for Aaron) |
| 2026-10-31 ≈18:14 | `4da52a4+local` | 1 | _01-_04 | `npm test` (backend) | local | 643 passed, 1 skipped (a database contract with no `TEST_DATABASE_URL`) | - | Claude (for Aaron) |
| 2026-10-31 ≈18:15 | `4da52a4+local` | 2 | _01-_02 | `npx tsx --test tests/attendeeRegistration.integration.test.ts tests/deactivation.integration.test.ts tests/attendeeCapacity.integration.test.ts tests/registrationPeriod.integration.test.ts` | local, Docker `postgres:17`, `connectsphere_notification_test` | **3/4: deactivation FAILED** | "Cannot read properties of undefined (reading 'id')" at line 86. The test built its schema from migrations 0001 and 0003 only, so #379's new lines found no Session. Never run on #379 (no `TEST_DATABASE_URL`) and not in CI | Claude (for Aaron) |
| 2026-10-31 ≈18:16 | `4da52a4+local` | 2 | _02 | `npx tsx --test tests/deactivation.integration.test.ts` | as above | **FAILED** | after applying every migration: "pool.query is not a function" in `login()`. The test's fake pool had only `connect()`; `login` now calls `pool.query` (an older break, hidden because the test never ran) | Claude (for Aaron) |
| 2026-10-31 ≈18:17 | `4da52a4+local` | 2 | _02 | as above | as above | 1/1 passed | fake pool gets `query`; the deactivated Attendee's registered place is released and the waiting Attendee gets one "Place Release Event: A place is available." with an email delivery | Claude (for Aaron) |
| 2026-10-31 ≈18:18 | `4da52a4+local` | 3 | _01-_05 | `npx c8 --include=src/modules/attendeeRegistration/service.ts --include=src/modules/accessControl/deactivation.ts npx tsx --test tests/attendeeRegistration.test.ts tests/deactivation.test.ts` | local | `service.ts` 100%; `deactivation.ts` 100% lines, branches 93.33% | uncovered: line 30 (unchanged older code) and line 53, #379's moved `rowCount ?? 0` fallback, which can't fire after the rows are locked. Replaced by `registrations.length`; rerun: 100% lines, 96.55% branches, only line 30 left; unit 20/20, database 1/1 | Claude (for Aaron) |
| 2026-10-31 ≈18:20 | `4da52a4+local` | 6 | _01-_05 | 10 bugs planted one at a time in `service.ts`, `deactivation.ts`, `WaitingList.tsx` and `EventRegistration.tsx`, each followed by its unit, database or Vitest tests, then restored (script in scratchpad) | local, Docker `postgres:17` for the database tests | 9/10 caught | Caught: a claim on a still-full Event; a join with the list off; a join with room; a claim with no waitlisted row; deactivation notifying for a waitlisted row; deactivation notifying while still full; joining offered with the list off on the waiting-list page; the claim link hidden; the list offered with it off on the event page. Missed: removing the claim UPDATE's `status = 'waitlisted'` guard, which the Event lock makes unreachable (Known limits). Sources restored | Claude (for Aaron) |
| 2026-10-31 ≈18:21 | `4da52a4+local` | 4 | - | `npm run typecheck` (root) | local | clean | - | Claude (for Aaron) |
| 2026-10-31 ≈18:22 | `4da52a4+local` (committed as `f18a9bf` to `bb64b9e`) | 5 | _01-_05 | `npx vitest run --no-file-parallelism` (frontend) | local | 749/749 passed in 70 files | includes the renamed TC_E09S04_04 title in `EventRegistration.test.tsx` | Claude (for Aaron) |
| 2026-10-31 18:28-18:41 | `bb64b9e` | 7 (F4) | _01-_05 | Aaron's manual click-through on the local real stack, after `E09-S04-preconditions.sql` (18:17) | local, frontend 5173, API 3001 (restarted on `bb64b9e`), Docker `postgres:17`, `connectsphere_dev_stack` | 5/5 PASS, 10 screenshots | every "What the user sees" line as scripted; `attendee_i`'s claim (18:38:00) beat `attendee_j`'s, who saw "That place has just been taken; you're still on the waiting list."; one "A place is available" each to `attendee_i` and `attendee_j` at 18:34:45, nothing to anyone else, and nothing from `attendee_i`'s withdrawal after `attendee_j` left. Record `docs/testing/runs/20261031-184113-Bl0oper-frontend-e2e.md` | Aaron (by hand), Claude (setup, record) |
| 2026-10-31 18:43 | `ab99f61` | 1 | _01-_04 | `npm test --workspace backend` | local | 643 passed, 1 skipped | record `20261031-184332-Bl0oper-backend-unit.md` | Claude (for Aaron) |
| 2026-10-31 18:44 | `ab99f61` | 2 | _01, _02 | `npm run test:db --workspace backend`; `npx tsx --test tests/deactivation.integration.test.ts` | local, Docker `postgres:17`, `connectsphere_notification_test` | 293/293; 1/1 passed | record `20261031-184355-Bl0oper-backend-db.md` | Claude (for Aaron) |
| 2026-10-31 18:42-18:47 | `ab99f61` | 5 | _01-_05 | `npx vitest run --no-file-parallelism` (frontend) | local | 749/749 passed in 70 files | record `20261031-184240-Bl0oper-frontend-vitest.md` | Claude (for Aaron) |
