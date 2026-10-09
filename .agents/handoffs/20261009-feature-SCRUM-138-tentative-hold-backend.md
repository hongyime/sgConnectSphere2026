# E06-S05 tentative holds: backend (SCRUM-138)

Goal: build the backend for E06-S05 "Hold a venue tentatively" (story SCRUM-49;
subtasks SCRUM-138 to 141): place, convert, release and extend a hold, expire
it on schedule with one notice, and make the calendar, venue search, blocks and
venue retirement treat an unexpired hold as taken. Scenario 5 (buffers) waits on
E05-S05 (#231); the frontend is SCRUM-143 and the browser tests SCRUM-144.

## Done

- `backend/database/migrations/0013_tentative_venue_holds.sql`: `tentative` and
  `expired` statuses, `venue_bookings.expires_at`, an index for the expiry job.
  Number agreed with Bryan (0011 E05-S05, 0012 T-72 roles).
- `backend/src/modules/venueBooking/holds.ts` and `holdsHandler.ts`; routed from
  `api/venues/index.ts` (the four POST actions, and `?task=holds` for GET).
- `api/cron/outbox-relay.ts?task=holds` runs `expireHolds`.
- `calendar.ts`, `search.ts`, `blocks.ts` (Scenario 3 notices), `catalogue.ts`
  (retire refusal) use `holdsVenue()`, so a hold counts until `expires_at`.
- Docs: T-79 (Bryan's 7 October answers; renumbered from T-78, which Jining's #243 uses), O-31, O-33 and O-34 closed (O-32 is #243's), story Scenarios
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

1. **Production needs 0013 before this code deploys.** Production is at 0008;
   without 0013 the calendar, venue search, block creation and venue retire all
   fail (`expires_at` missing). Same blocker as the 0009/0010 catch-up.
2. Scenario 5 after #231: call Bryan's `occupied_window()` in `findClash`.
3. Frontend (SCRUM-143), browser tests (SCRUM-144), manual run before review.
4. Correct the SCRUM-48 comment (show the text to the user first).

## Commands

See the T-65 records in `docs/testing/runs/` cited by the PR. Local-only
failures that also fail on clean main: `test:runtime` health check (Windows),
`registration.db.test.ts`, `eventVisibility.integration.test.ts`.
