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
  the system clock or uses a past date. Workbook regenerated as
  `PROJECT TEST CASES CAA 281026.xlsx` (copied over the undated one);
  `docs/source-of-truth.md` points at it.
- **Review fixes** (two passes): Discover keeps a registered event only until
  it starts; a deadline after the event start isn't shown.
- **Evidence** (story record `docs/plans/scrum-67-implementation-status.md`,
  Run log): backend unit 545/545, `test:db` 249/249, Vitest 626/626,
  Playwright 400 passed / 0 failed, all on `a728b57`; coverage of changed
  code 100%; 12/12 deliberate bugs caught; an API dry run of all five cases.
- **Aaron's manual run, 28 October 00:30–00:55 on `93dc745`: 5/5 PASS**, 8
  screenshots (`docs/testing/runs/20261028-005630-Bl0oper-frontend-e2e.md`),
  set up by `docs/testing/manual/E09-S05-preconditions.sql` (stages `setup`,
  `tc04`, `tc03`).
- **PR #361** opened as a draft, postplan posted, all checks green, marked
  ready for review on 28 October; `main` merged in (#359, #360) without
  conflicts.

## Not done / next step

- A teammate's review and approval of the final commit.
- **Bryan's PO acceptance (Definition of Done since #330) before merging:**
  the merge closes SCRUM-67. He also confirms the TC_E09S05_02 and _04
  wording changes.
- After the merge: check that SCRUM-67 and SCRUM-219 to 221 move to Done.
- Then E09-S04 (SCRUM-66): its "Leave the waiting list" uses this endpoint,
  which already accepts waitlisted rows.

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
- `npm run typecheck`; `npm run build`; `npm run test:db --workspace backend`
- `npx vitest run --no-file-parallelism` and `npx playwright test` (whole suites)
- `.venv-tools/Scripts/python.exe scripts/export_testcases_xlsx.py`, then
  `scripts/tc_coverage_audit.py`; `python scripts/check.py`

## Learnings

- `stubApi` matches any address that has a stub's parameters, so the
  withdraw stub (`?registration=1&withdraw=1&id=`) must be listed before the
  register stub (`?registration=1&id=`).
- Extending an existing real-database test file avoids a new
  `backend/package.json` entry and a new CI step.
- Count a PR's files with three dots, `git diff origin/main...HEAD`. Two dots
  also count `main`'s own new commits: after `main` moved, this branch showed
  74 files that way against a real 34. #357's 40-file cap counts screenshots
  too; keeping the click-through script inside the story record saved a file.
- The coverage audit reads only full TC IDs: "(TC_E09S05_01, _04, _05)"
  counts _01 alone. Write each ID out.
- Since #360, `docs/source-of-truth.md` names the current test-case workbook;
  update that row when a PR exports a new dated one.
- The seed has no `event_publications` rows, and EVT-2001's seeded booking
  isn't primary, so a manual run that needs Discover publishes by SQL and
  sets `is_primary`.
- A bug planted in SQL text passes unit tests that script the database; only
  the real-database test caught a dropped owner filter.
- postplan.dev uploads need a signed-in account since about 25 October
  (`npx --yes postplan auth login`); anonymous uploads are refused.
