# SCRUM-67 / E09-S05 implementation status

Withdraw my registration. This file records what was built, which test
proves each acceptance criterion, and **every run of those tests**, so each
result can be traced back to the exact code it ran against.

## Scope

From `docs/backlog/product/E09-attendee-registration.md`, E09-S05 Scenarios 1
and 2 and the checklist (BDR C-24, T-48, B-10, T-79, T-85). Built on E09-S01
(#326, #327), E09-S02 (#353) and E09-S03 (#354), all merged.

**Who wrote what.** Amareet wrote the registration service, the event page
and the registration form (E09-S01 to S03). This branch (Aaron, with Claude)
adds withdrawal to her `attendeeRegistration/service.ts`,
`api/attendee/events.ts`, `EventRegistration.tsx` and `registrationApi.ts`,
and keeps her Discover list and event page reachable for an existing
registration after registration closes. The `place_released` notice is Ji
Ning's existing E11-S01 hook, called here.

**Decisions** (Aaron's task list, D80–D106; listed in the PR for Bryan as PO):

- the deadline binds approved (`registered`) places only; Pending and
  waiting-list rows can leave until the Event starts (D88);
- the assistance contact is the client organisation's contact email, else
  the Organiser's email (D89);
- no reason field, no audit row, no notice to the Attendee (D90, D97, D98);
- the only notice is `place_released` to the waiting list, when an approved
  place frees room (D82, D83);
- Withdraw sits on the event page behind a confirm panel (D100, D106), which
  shows the deadline (D101) and stays reachable after registration closes
  (D105); afterwards the event reads as not registered (D102).

## Rules this story applies

The messages are the code's wording, word for word.

| Rule | What the user sees | Test case |
|---|---|---|
| One withdrawal cancels the Event registration and releases its place in every selected Session and in the Event | Card "Your registration": "You can withdraw until 25 Mar 2027, 11:59 pm." (or "You can withdraw until the event starts."), button "Withdraw…"; panel "Withdraw your registration?", "Your place in every Session you chose is released for someone else. This cannot be undone.", button "Withdraw registration"; then "Registration withdrawn. Your place in every Session you chose has been released." and the pill reads "Open for registration" | TC_E09S05_01, _02, _05 |
| Exactly at the deadline is still allowed; one second later is not | as above | TC_E09S05_04 |
| After the deadline an approved place can't be withdrawn | Event page: "Withdrawal has closed" / "For help, contact events@…" (a mail link) in place of the button. Server: 409 "Withdrawal has closed. For help, contact <email>." | TC_E09S05_03 |
| A released approved place, leaving the Event below capacity, tells everyone on the waiting list | In-app and email notice "Event update": "<event name>: A place is available. Apply on a first-come basis; no place has been reserved for you. Changed at <time>." | TC_E09S05_04 |
| A Pending request can be withdrawn until the Event starts, even after the deadline; it releases nothing and tells nobody | "Withdraw request…", panel "Withdraw your request?", "The organiser will no longer review your request.", then "Request withdrawn. The organiser will not review it." | (D88) |
| Only the Attendee's own registration; a repeat is refused | 404 "You don't have a registration for this event."; 409 "You've already withdrawn from this event." | (AC 6) |
| An event with an active registration stays in Discover and its page loads after registration closes or is switched off | The event is listed with the Attendee's status pill | (D105) |

## Test plan

| TC ID | What the user sees | Automated tests |
|---|---|---|
| TC_E09S05_01 | One withdrawal; both Sessions and the Event drop by one; other registrations unchanged | `attendeeRegistration.integration.test.ts` (real database); `attendeeRegistration.test.ts` (unit); `EventRegistration.test.tsx` (Vitest) |
| TC_E09S05_02 | Withdrawing from one event leaves the other registration in place | `attendeeRegistration.integration.test.ts` (other registrations unchanged); manual run |
| TC_E09S05_03 | "Withdrawal has closed" with the contact; nothing changes | `attendeeRegistration.integration.test.ts`; `attendeeRegistration.test.ts`; `EventRegistration.test.tsx` |
| TC_E09S05_04 | Allowed exactly at the deadline; the waiting list is told | `attendeeRegistration.test.ts` (`withdrawalOpen`, fixed clock); `attendeeRegistration.integration.test.ts` (notice and email delivery) |
| TC_E09S05_05 | Three Sessions and the Event released together | `attendeeRegistration.integration.test.ts` (two Sessions, counts from status); `attendeeRegistration.test.ts` |

No Playwright (D87); the `test.fixme` scaffolds for _03 and _04 are removed
because live tests now cover them. The old Playwright test that carried
TC_E09S05_01 checked the mock page's "Reason (required)" field, which no
criterion asks for; it is removed with the mock page.

## Test gates

Every gate must pass, and be recorded in the Run log, before the PR opens.

1. **Backend unit tests**: `npm test --workspace backend`.
2. **E09 database tests**: `attendeeRegistration`, `attendeeCapacity`,
   `registrationPeriod` and `attendeeVisibility` integration tests against a
   disposable PostgreSQL 17 database named `connectsphere_notification_test`.
3. **Coverage**: 100% of new and changed lines and branches (Definition of
   Done, #215).
4. **Typecheck and build**: `npm run typecheck` and `npm run build` (root).
5. **F1, component tests**: the whole frontend Vitest suite
   (`--no-file-parallelism` on Windows).
6. **Deliberate-bug check**: bugs put in on purpose must make tests fail.
7. **F4, Aaron's manual run** of TC_E09S05_01 to _05 on the local real stack,
   his own screenshots (T-93), before the PR opens.
8. **Repository checks**: `python scripts/check.py`; `tc-coverage.md`
   regenerated as the last commit; CI green.

**Before the demo:** a read-only check of production inside `BEGIN READ ONLY`
… `ROLLBACK`, returning only counts and names: `events` has
`withdrawal_deadline`, `event_registrations` has `withdrawn_at`, and the
`registration_status` enum has `withdrawn`. No migration is needed.

## Click-through script

**Setup, by SQL, never a test step (D84).** The seed's E09 events are dated
October 2026 and its registrations have no Sessions, and the cases name
accounts (`attendee_c`, `attendee_d`) and events ("Community Meetup", "Tech
Conference 2026") the seed doesn't have. So
`docs/testing/manual/E09-S05-preconditions.sql` makes them on the local
Docker database `connectsphere_dev_stack`, in three stages: `setup` before
the run, `tc04` just before TC_04, `tc03` just before TC_03. Its header lists
everything each stage makes. Every account uses the seed's public password
(`tests/seed/SEED_DATA.md`).

**Before step 1:**
- Reset and seed `connectsphere_dev_stack`, run stage `setup`, start the API
  and `npm run dev`; open `http://localhost:5173`.
- One browser window is enough: the cases run one account at a time, so sign
  out between them.
- **Screenshots:** the whole browser window, with the address bar and the
  signed-in role visible; bookmarks bar hidden (Ctrl + Shift + B); zoom out
  rather than crop. Name each one as below, under
  `docs/testing/runs/evidence/<record>/`. One per case is required (T-93);
  the ones marked *optional* only if the PR stays under 40 files.

### TC_E09S05_01: withdraw once, both Sessions released (attendee_a)

1. Sign in as `attendee_a@example.com`; open **Discover**, then **Community
   Meetup**.
2. Check: "You're registered for this event"; both Sessions read
   **Selected**; the card **Your registration** reads "You can withdraw until
   5 Dec 2026, 6:00 pm".
3. Click **Withdraw…**. The panel **Withdraw your registration?** says "Your
   place in every Session you chose is released for someone else. This cannot
   be undone." Click **Withdraw registration**.
4. Check: "Registration withdrawn. Your place in every Session you chose has
   been released."; the pill reads **Open for registration**; no Session reads
   Selected. **Screenshot `TC_E09S05_01-1.png`.**
5. *Optional:* sign in as `organiser_a@clienta.com`, open
   `/organiser/requests/EVT-9101/registrations`: **Places by Session** reads
   Morning keynote 2 of 120, Afternoon workshops 0 of 120; Event 2 of 240
   (before: 3, 1 and 3). `TC_E09S05_01-2.png`.

### TC_E09S05_05: three full Sessions released together (attendee_b)

1. Sign in as `attendee_b@example.com`; open **Three-Session Workshop**
   (Sessions 1, 2 and 3 all Selected).
2. **Withdraw…**, then **Withdraw registration**; check the success message.
3. Sign in as `organiser_a@clienta.com`, open
   `/organiser/requests/EVT-9103/registrations`: Session 1, 2 and 3 each read
   **0 of 1** (they were 1 of 1, Full) and the Event **0 of 3**.
   **Screenshot `TC_E09S05_05-1.png`.**

### TC_E09S05_02: leave one event, keep the other (attendee_d)

1. Sign in as `attendee_d@example.com`; open **Community Meetup**;
   **Withdraw…**, then **Withdraw registration**; check the success message.
2. Open **My events** (`/attendee/events`): **Tech Conference 2026** is still
   listed, Community Meetup isn't. **Screenshot `TC_E09S05_02-1.png`.**

### TC_E09S05_04: withdraw just before the deadline; the waiting list hears (attendee_a, attendee_i)

1. **Claude runs stage `tc04`**: EVT-2001's deadline becomes 10 minutes from
   now, and the time is noted.
2. Sign in as `attendee_a@example.com`; open **EVT-2001 Confirmed
   Registration Event**: the card reads "You can withdraw until <that time>".
3. **Withdraw…**, then **Withdraw registration**, before that time. Check the
   success message. **Screenshot `TC_E09S05_04-1.png`.** The record says the
   withdrawal was shortly before the deadline: the exact instant is proved by
   the automated test with a fixed clock (D84).
4. Sign in as `attendee_i@example.com` (on the waiting list); open
   **Notifications** and click the **Event update** title for EVT-2001: "EVT-2001
   Confirmed Registration Event: A place is available. Apply on a first-come
   basis; no place has been reserved for you." **Screenshot
   `TC_E09S05_04-2.png`.** (`attendee_j` gets the same notice; checked in the
   database afterwards.)

### TC_E09S05_03: after the deadline, refused with a contact (attendee_c)

1. **Claude runs stage `tc03`**: Community Meetup's deadline becomes one
   minute ago.
2. Sign in as `attendee_c@example.com`; open **Community Meetup**.
3. Check: no Withdraw button; instead **Withdrawal has closed**, "For help,
   contact events@clienta.com" (a mail link). The registration still reads
   "You're registered for this event". **Screenshot `TC_E09S05_03-1.png`.**

### After the run (Claude, by SQL)

- Statuses: attendee_a (Community Meetup, EVT-2001), attendee_b (Workshop) and
  attendee_d (Community Meetup) `withdrawn` with `withdrawn_at`; attendee_c
  and attendee_d's Tech Conference 2026 still `registered`.
- `place_released` notices: attendee_j for the Workshop; attendee_i and
  attendee_j for EVT-2001; none for Community Meetup (nobody waiting); none to
  the withdrawing Attendees or the Organiser (D98, D104).

The automated dry run of these steps through the API (Run log, 27 Oct
≈23:25) gave exactly the counts, messages and notices above.

## Known limits

- **Capacity increases don't notify the waiting list** (D82, C-05: capacity
  impacts are handled manually). Only a withdrawal of an approved place does;
  SCRUM-66 adds the deactivation trigger.
- **No notice to the Organiser, or to Pending requests, when a place frees**
  (D104). E09-S02 leaves Pending approval to the Organiser.
- **The exact deadline instant is proved by automated tests only** (D84). The
  manual run withdraws shortly before the deadline and says so; nobody
  changes the system clock.
- **After withdrawing, the event page hides Register until it is reopened.**
  The capacity it loaded predates the withdrawal.
- **The manual run is not independent of the code**: Aaron tests what he and
  Claude built.

## Run log

One row per run, newest at the bottom. Add a row every time the tests are run
for this story, whether they pass or fail. A failed run stays in the log; the
fix gets its own row.

| When (SGT) | Commit | Gate | TC IDs | Command | Where | Result | What was seen | Run by |
|---|---|---|---|---|---|---|---|---|
| 2026-10-27 ≈22:50 | `7b5a2f5+local` (uncommitted while commits were blocked; committed as `35a0bb8` and `9b4b8ec`) | 1 | _01, _03, _04, _05 | `npx tsx --test tests/attendeeRegistration.test.ts` (backend) | local | 22/22 passed | — | Claude (for Aaron) |
| 2026-10-27 ≈22:51 | `7b5a2f5+local` | 2 | _01, _03, _04, _05 | `npx tsx --test tests/attendeeRegistration.integration.test.ts` | local, Docker `postgres:17`, `connectsphere_notification_test` | 1/1 passed | withdrawal steps included: counts drop by one in both Sessions and the Event; repeat 409; handler race 200 + 409; two `place_released` notices with email delivery; contact then Organiser fallback; D105 listing; Pending after the deadline | Claude (for Aaron) |
| 2026-10-27 ≈22:52 | `7b5a2f5+local` | 2 | — | `npx tsx --test tests/attendeeCapacity.integration.test.ts tests/registrationPeriod.integration.test.ts tests/attendeeVisibility.integration.test.ts` | local, Docker `postgres:17`, `connectsphere_notification_test` | 3/3 passed | E09-S02, E09-S03 and E01-S03 unaffected | Claude (for Aaron) |
| 2026-10-27 ≈22:53 | `7b5a2f5+local` | 1 | — | `npm test` (backend) | local | 545/545 passed | — | Claude (for Aaron) |
| 2026-10-27 ≈22:56 | `7b5a2f5+local` | 3 | _01, _03, _04, _05 | `npx c8 --include=src/modules/attendeeRegistration/service.ts npx tsx --test tests/attendeeRegistration.test.ts`; `npx vitest run --coverage` on `EventRegistration.test.tsx` | local | service.ts 100% lines and branches; `EventRegistration.tsx` and `registrationApi.ts` 100% | one uncovered fallback (`?? ''` for the contact) removed as dead code, since the server always sends one | Claude (for Aaron) |
| 2026-10-27 ≈22:58 | `7b5a2f5+local` | 4, 5 | _01, _03 | `npm run typecheck` (root); `npx vitest run --no-file-parallelism` (frontend) | local | typecheck clean; 626/626 passed in 63 files | — | Claude (for Aaron) |
| 2026-10-27 ≈23:10 | `7b5a2f5+local` (committed as `35a0bb8`) | 1, 2 | _01, _03, _04, _05 | `npx tsx --test tests/attendeeRegistration.test.ts`; `npx tsx --test tests/attendeeRegistration.integration.test.ts tests/attendeeVisibility.integration.test.ts` | local, Docker `postgres:17`, `connectsphere_notification_test` | 22/22; 2/2 passed | rerun after the review fix: Discover keeps a registered event only until it starts | Claude (for Aaron) |
| 2026-10-27 ≈23:18 | `577cf0d+local` (committed as `83620e3`) | 3, 4, 5 | _01, _03 | `npx vitest run --no-file-parallelism --coverage src/features/attendee/EventRegistration.test.tsx`; `npm run typecheck` (root) | local | 26/26 passed; `EventRegistration.tsx` 100%; typecheck clean | after review fixes 1-3: a deadline after the event start reads "until the event starts" | Claude (for Aaron) |
| 2026-10-27 ≈23:20 | `577cf0d+local` (committed as `83620e3`) | 5 | — | `npx playwright test tests/e2e/attendee-registration.spec.ts tests/e2e/e09.spec.ts tests/e2e/layout-and-focus.spec.ts` | local, Vite on 5173 started by Playwright, fake API | 60 passed, 26 skipped (other stories' `test.fixme`), 0 failed | the edited files still pass on desktop and mobile after the mock page's removal | Claude (for Aaron) |
| 2026-10-27 ≈23:25 | `83620e3` | 7 (dry run) | _01–_05 | `E09-S05-preconditions.sql` stages `setup`, `tc04`, `tc03`, then an API script signing in as each account (scratchpad, not committed) | local API on 3001, Docker `postgres:17`, `connectsphere_dev_stack` | all as expected | TC_01 Event 3→2 of 240, Morning 3→2, Afternoon 1→0 of 120; repeat 409. TC_05 Sessions 1/1→0/1 each, Event 1→0 of 3; attendee_j notified. TC_02 "My events" keeps Tech Conference 2026. TC_04 withdrawn 10 min before the deadline; attendee_i and attendee_j notified. TC_03 `{open:false, contact:"events@clienta.com"}`; POST 409 "Withdrawal has closed. For help, contact events@clienta.com."; counts unchanged. Database reset afterwards | Claude (for Aaron) |
| 2026-10-28 ≈00:05 | `93dc745` | 6 | _01, _03, _04, _05 | 12 bugs planted one at a time in `service.ts` and `EventRegistration.tsx`, each followed by `npx tsx --test tests/attendeeRegistration.test.ts` or `npx vitest run src/features/attendee/EventRegistration.test.tsx`, then `git checkout` (script in scratchpad) | local | 12/12 caught | Caught: the deadline made exclusive; the deadline applied to Pending; no waiting-list notice; a notice while still full; no Event lock; a repeat not refused; past events kept in Discover; no contact after the deadline; a Withdraw button for waitlisted rows; a deadline after the start shown; the page still reading registered. Dropping the owner filter (`attendee_id = $2`) passes the unit tests, whose scripted database ignores SQL, and fails the real-database test (`attendeeRegistration.integration.test.ts`, Docker `postgres:17`). Source restored after each | Claude (for Aaron) |
| 2026-10-28 00:30–00:55 | `93dc745` | 7 (F4) | _01–_05 | Aaron's manual click-through on the local real stack, stages `setup`, `tc04`, `tc03` run by Claude on his cue | local, frontend 5173, API 3001, Docker `postgres:17`, `connectsphere_dev_stack` | 5/5 PASS, 8 screenshots | every "What the user sees" line as scripted; TC_04 withdrawn at 00:45:38.735 against a 00:51:17 deadline; "A place is available" to attendee_j (Workshop) and attendee_i and attendee_j (EVT-2001), nothing else sent. Record `docs/testing/runs/20261028-005630-Bl0oper-frontend-e2e.md` | Aaron (by hand), Claude (setup, record) |
