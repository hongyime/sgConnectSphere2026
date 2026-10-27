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

To be written with the preconditions SQL
(`docs/testing/manual/E09-S05-preconditions.sql`) before the manual run: the
seed's E09 events are dated October 2026 and its registrations have no
Sessions, so the cases' events, Sessions, deadlines and waiting list are set
up by SQL (D84), as setup and never as a test step.

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
