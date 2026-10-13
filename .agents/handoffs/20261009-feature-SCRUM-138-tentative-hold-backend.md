# E06-S05 tentative holds: backend (SCRUM-138)

Goal: build the backend for E06-S05 "Hold a venue tentatively" (story SCRUM-49;
subtasks SCRUM-138 to 141): place, convert, release and extend a hold, expire
it on schedule with one notice, and make the calendar, venue search, blocks and
venue retirement treat an unexpired hold as taken. Scenario 5 (buffers) waits on
E05-S05 (#231); the frontend is SCRUM-143 and the browser tests SCRUM-144.

## PR #245 follow-up: hold creation lock-wait race (12 October 2026)

Diagnosis: confirmed from the current implementation. `placeHold`'s default
`now = new Date()` is captured on entry, and `validateHoldInput(data, event,
now)` runs before the venue `FOR NO KEY UPDATE` lock. A request that waits for
that lock therefore validates a default expiry or an explicit 1-hour/14-day
bound against arrival time, then can insert later with less time remaining.
`convertHold`, `releaseHold` and `extendHold` already use `databaseNow()` after
their row locks; the missing path is hold creation.

Evidence: `holds.ts` lines 160-174 show validation before the venue lock, while
`databaseNow()` at lines 186-189 uses `SELECT clock_timestamp()` and is already
used after locks by the other hold operations. The existing PostgreSQL
lock-wait regression covers convert and extend, but not `placeHold`.

Fix plan: make `placeHold` acquire the event and venue locks, read database
time, then compute/default and validate expiry. Add PostgreSQL lock-wait
coverage for both the 48-hour default and a chosen expiry that crosses below
the 1-hour minimum while waiting. Keep the pure `validateHoldInput` boundary
tests and add a unit assertion for query ordering.

Done: added the lock-wait regression first and observed it fail against the
unfixed code because the default expiry was short of 48 hours after the wait.
`placeHold` now acquires the event and venue locks, reads `clock_timestamp()`,
then defaults and validates expiry; the same database time is used to find
clashes. The unit test asserts event-lock → venue-lock → clock → clash order.
An exploratory attempt to make a lock wait cross the 14-day maximum was
discarded: a fixed expiry gets closer, not farther away, while the request
waits. Existing unit tests cover that upper-bound check.

Verification on `cf021bd` before the fix commit: `npm test --workspace backend`
passed 358/358 with `holds.ts` at 100% statements, branches, functions and
lines; the PostgreSQL 17 venue-holds integration file passed 6/6; backend
typecheck passed. T-65 records: `20261012-202913-bryanseah234-backend-unit.md`
and `20261012-203241-bryanseah234-backend-db.md`.

`python3 scripts/check.py` passed: repository hygiene, 87 tooling tests and 197
test-run records validated. The local hook needed a temporary `python` shim
because this shell provides `python3` only.

Next: commit and push this fix to PR #245. Do not merge the PR.

## Done

- `backend/database/migrations/0013_tentative_venue_holds.sql`: `tentative` and
  `expired` statuses, `venue_bookings.expires_at`, an index for the expiry job.
  Number agreed with Bryan (0011 E05-S05, 0012 T-72 roles).
- `backend/src/modules/venueBooking/holds.ts` and `holdsHandler.ts`; routed from
  `api/venues/index.ts` (the four POST actions, and `?task=holds` for GET).
- `api/cron/outbox-relay.ts?task=holds` runs `expireHolds`.
- `calendar.ts`, `search.ts`, `blocks.ts` (Scenario 3 notices), `catalogue.ts`
  (retire refusal) use `holdsVenue()`, so a hold counts until `expires_at`.
- Docs: T-92 (Bryan's 7 October answers; renumbered from T-78, which Jining's #243 uses), O-31, O-33 and O-34 closed (O-32 is #243's), story Scenarios
  7 and 8, TC_E06S05_06/_07, `api-changes-week7.md` Change 4, E11 matrix row,
  `db_schema.md`; exports regenerated (CAA 091026) and `source-of-truth.md`.
- Tests: `backend/tests/venueHolds.test.ts` (unit, 100% of both new files),
  `backend/tests/venueHolds.integration.test.ts` (real PostgreSQL, added to CI),
  a runtime test for `?task=holds`, and the three older fixtures (calendar,
  search, catalogue) now also apply 0013.

## Aligned with the shared contract (#244, choice A agreed with Amareet)

- 0013 stays holds-only. The shared columns (purpose, headcount, requested_by/at,
  is_primary, submission_key, occupancy_range) and the exclusion constraint on
  the occupancy range go in a later migration after #231 merges.
- Body fields follow the contract: `event_id`, `venue_id`, `starts_at`, `ends_at`,
  `expires_at`, `booking_id`. The event is found from the booking.
- `convert_hold` is idempotent: a converted booking returns 200 again with no
  second write or audit entry.
- T-78 (O-29): a hold must lie within its event's period.
- Not done here, left to the shared E06-S03 submission service: setting
  requested_by/requested_at (no columns yet) and the Approved-to-Planning move on
  the first formal request. 400 `validation_failed` is kept (repo convention)
  rather than the contract's proposed 422.

## Bryan's PO review (10 October), addressed

- Convert, extend and release judge expiry at database time (`clock_timestamp()`,
  read in its own statement after the row locks), not a time captured before
  the lock wait.
- Release refuses a hold whose expiry has passed, leaving it to the job so the
  notice is still sent.
- Extend locks the venue row before the hold, the same lock placing a hold
  takes, so extensions and new holds are serialised.
- Real-PostgreSQL deadline-race test added; it fails on the old code ("Missing
  expected rejection") and passes with the fix.
- Migration 0013 merged separately as #246 (deploy order per the runbook).

## Decisions for the reviewer to check

- **A hold stops holding the venue the moment `expires_at` passes**, not when
  the job runs ("live" = `status = 'tentative' AND expires_at > now()`). The job
  only flips the status and sends the notice, so a late or missing job can't
  keep a venue held.
- **Overlap is enforced in the application**, under a `FOR NO KEY UPDATE` lock
  on the venue row (blocks already take `FOR UPDATE` on it, so they serialise
  too). The exclusion constraint still covers pending/confirmed only;
  recreating it on the occupancy range belongs to E05-S05/E06-S06. E06-S03
  (booking requests) should take the same venue lock so a request and a hold
  can't race.
- A hold is refused on a **pending** overlap as well as confirmed or another
  live hold, per `api-changes-week7.md`. (The SCRUM-48 Jira comment said the
  opposite and needs a correction.)
- `release` here releases holds only; pending/confirmed release stays E06-S04.
- `'tentative'` is compared as text in `holdsVenue()` so the search test, which
  migrates inside one transaction, can use it.
- Expiry job is a new `?task=holds` branch rather than part of the default relay
  run, because the relay path returns 503 when the relay is disabled. Nothing
  calls it on a schedule yet: Bryan's GitHub Actions 15-minute trigger and its
  secret are his separate decision.

## Not done / next

1. The production prerequisite is cleared: migration 0013 was applied and
   verified on 14 October; the run record is in PR #260. Do not run 0013 again.
2. Scenario 5 still waits on the correctly keyed replacement for #231, PR #261,
   to merge; then use `occupied_window()` in `findClash`.
3. PR #252 contains SCRUM-143 and SCRUM-144 and remains stacked on this PR.
   Amareet's manual run is still required before Sprint Review.
4. T-73 keeps active Sprint 3 acceptance through 17 October. After the sprint
   closes, recheck Jira and create follow-up work for T-84 and the Week 9
   Session-linked hold changes; do not mix those new criteria into the active
   sprint implementation without that reconciliation.
5. The SCRUM-48 comment correction remains unposted; no Jira credentials are
   available in this environment.

## Commands

See the T-65 records in `docs/testing/runs/` cited by the PR. Local-only
failures that also fail on clean main: `test:runtime` health check (Windows),
`registration.db.test.ts`, `eventVisibility.integration.test.ts`.

## PR #245 main merge (13 October 2026)

- Merged `origin/main` into `feature/SCRUM-138-tentative-hold-backend`.
- Resolved `api/venues/index.ts` with both the tentative-hold dispatcher and
  main's venue-assessment route; combined the hold and venue-suitability test
  entries in `backend/package.json`.
- Regenerated `docs/testing/tc-coverage.md`: 162 automated, 101 scaffolded,
  and 52 without tests (315 total).
- `scripts/check.py` passed, including repository hygiene and all 87 tooling
  tests. Ran it using the repository tooling environment on `PATH` because
  this shell does not define a `python` command.
- This was the earlier sync to the then-current main; PR #245 remained open.

## Current integration (14 October 2026)

- Fetched latest `origin/main` (`8f246ae`), which includes the merged Week 9
  backlog/test and architecture PRs #253–#255. Resolved the new documentation
  conflicts by retaining the current main versions of the API, shared booking
  contract and schema. Regenerated the ADR/BDR Word exports as CAA 141026 and
  updated `docs/source-of-truth.md` to point at those exports.
- T-73 explicitly keeps active Sprint 3 acceptance assumptions through
  17 October. This PR and stacked #252 therefore implement the existing
  Sprint 3 hold behavior. T-84 (configured expiry/warning, capped reasoned
  extensions) and the Session-linked model are post-sprint follow-up work; the
  Week 9 impact register says migrations and application behavior remain to be
  implemented. Reconcile actual Jira sprint state after close before creating
  those follow-up stories.
- The #246 migration is already on production, verified by the pre/post ledger
  checks recorded in #260. #245 still needs its merge conflicts resolved,
  required checks to pass and human review; do not merge before those gates.
- #231 closed during a branch rename. Replacement #261 carries the correctly
  keyed SCRUM-161 work; until it merges, the buffered-window scenario remains
  outstanding in this PR. #252 stays draft and stacked until #245 lands.
- The expiry route still has no configured scheduler. Cadence and secret remain
  a separate owner decision; no deployment secret or trigger was added here.
