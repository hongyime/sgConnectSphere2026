# feature/SCRUM-67-withdraw-registration

Build E09-S05 "Withdraw my registration" (SCRUM-67) as one full-stack PR: backend subtask SCRUM-219 (withdraw before the deadline and tell the waiting list), frontend subtask SCRUM-220 (the event page's Withdraw… button, its confirm panel, the deadline and the after-deadline contact), and tests subtask SCRUM-221 (Aaron's manual run and the records). Branched from `main` at `7b5a2f5`, after E09-S01 (#326, #327), E09-S02 (#353) and E09-S03 (#354) merged.

## Done so far

- **Backend (SCRUM-219), `attendeeRegistration/service.ts`:**
  - `withdrawRegistration`: locks the Event, then the account, then the
    registration (the order #326 uses); marks the row `withdrawn` with
    `withdrawn_at`; counts come from status, so every selected Session and
    the Event release together.
  - The deadline binds `registered` rows only; Pending and waitlisted rows
    can leave until the Event starts; exactly at the deadline is allowed
    (`withdrawalOpen`).
  - After the deadline: 409 "Withdrawal has closed. For help, contact …"
    with the client's `contact_email`, else the Organiser's email.
  - A released approved place sends `place_released` to the waiting list,
    in the same transaction, when the Event has room afterwards
    (`notifyEventChange`, the existing hook).
  - Discover and the event page keep an event for anyone with an active
    registration after registration closes or is switched off, until the
    event starts, so they can still reach Withdraw.
  - The event page's read now returns `event.withdrawalDeadline` and
    `withdrawal: { open, contact }`.
  - Route: `POST /api/attendee/events?registration=1&withdraw=1&id=`, in
    the existing file (no new `api/` file).
- **Frontend (SCRUM-220), `EventRegistration.tsx`:** a "Your registration"
  card with the deadline and "Withdraw…" ("Withdraw request…" for Pending),
  a danger `ConfirmPanel`, a success Alert, then the page reads as not
  registered; after the deadline an Alert with the contact replaces the
  button. The mock `/attendee/withdraw/:eventCode` page, its route, its
  Playwright test and its layout-test entry are removed.
- **Tests:** unit tests in `attendeeRegistration.test.ts`; real-database
  steps added to `attendeeRegistration.integration.test.ts` (already in
  `test:db` and CI's E09 step); Vitest in `EventRegistration.test.tsx`
  (StrictMode included). The `test.fixme` scaffolds for TC_E09S05_03 and _04
  are removed.
- **Cases (`E09.md`):** TC_E09S05_02's lost heading restored and its
  "the event … the event" wording fixed; TC_E09S05_04 no longer asks to set
  the system clock or uses a past date.

## Not done / next step

- Regenerate the test-case workbook on the PR's day (today's dated file
  already exists on `main`), copy it over the undated one.
- Preconditions SQL for the manual run, then Aaron's manual run
  (TC_E09S05_01 to _05), T-65 records, `tc-coverage.md` last, then the PR.

## Blockers

- **27 October: commits blocked on this Windows machine.** Seven
  `pre-commit-hooks` hooks fail with "WinError 4551: An Application Control
  policy has blocked this file": Windows blocks the `.exe` launchers in
  pre-commit's cached environment, while that environment's `python.exe`
  still runs. Run through `python.exe -m pre_commit_hooks.<hook>`, all seven
  pass on every changed file. Hooks are not skipped without the owner's
  explicit agreement, so the work waited uncommitted. **Resolved the same
  evening:** Aaron chose to keep Smart App Control on (turning it off is
  permanent) and agreed to skip exactly those ten hooks after running them
  through `python.exe`; CI's `repository-checks` still runs all of them.
  Commits `35a0bb8` (backend) and `9b4b8ec` (frontend).

## Decisions taken without team sign-off

All agreed with Aaron (D80–D106 in his task list); the PR lists them for
Bryan to confirm as PO.

- The deadline applies only to approved places; Pending and waiting-list
  rows can leave until the Event starts.
- The assistance contact is the client organisation's contact email, else
  the Organiser's email (the client table has no phone column).
- No reason field, no audit row, and no notice to the Attendee; the only
  notice is `place_released` to the waiting list.
- Discover and the event page stay reachable for an existing registration
  after registration closes (touches Amareet's E09-S01 code).

## Commands run

- `npx tsx --test tests/attendeeRegistration.test.ts` and `npm test` (backend)
- `npx tsx --test tests/attendeeRegistration.integration.test.ts tests/attendeeCapacity.integration.test.ts tests/registrationPeriod.integration.test.ts tests/attendeeVisibility.integration.test.ts`
  with `TEST_DATABASE_URL` pointing at a disposable `connectsphere_notification_test`
- `npx vitest run --no-file-parallelism src/features/attendee/EventRegistration.test.tsx`
- `npm run typecheck`

## Learnings

- `stubApi` matches any address that has a stub's parameters, so the
  withdraw stub (`?registration=1&withdraw=1&id=`) must be listed before the
  register stub (`?registration=1&id=`).
- Extending an existing real-database test file avoids a new
  `backend/package.json` entry and a new CI step.
