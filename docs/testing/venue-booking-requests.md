# E06-S03 venue booking requests

SCRUM-47; implementation snapshot: 15 October 2026, based on main `5c22e26`.
This increment remains partial: responsible Venue Staff routing, decision/primary
venue behaviour and a human manual run are not claimed complete.

## Implemented in this increment

- Assigned Coordinators can submit from the event's **Venue suitability** screen
  while Approved or Planning. Shared cards, controls, alerts and buttons provide
  the desktop/mobile presentation.
- `POST /api/venues`, action `request_booking`, requires an `Idempotency-Key`
  UUID header. Fields: `event_id`, `venue_id`, RFC 3339 `starts_at`/`ends_at`,
  optional `purpose` (80 characters) and positive integer `headcount`.
  Identity, status, primary flags and recipients are server-controlled.
- Submission locks and rechecks event, account, venue and (on conversion) hold.
  Periods stay within the event and its single compatibility Session. Multi-Session
  events are refused explicitly until the later selection journey (T-73/T-79).
- Requests are Pending and non-primary; the calendar shows tentative occupancy.
  Multiple venues or non-conflicting periods are permitted. Conflicts include
  live Tentative, Pending and Confirmed bookings through `occupied_window()`.
  Maintenance uses advertised periods, consistent with merged #261. Messages
  show unavailable windows without other events' identities.
- Suitability uses booking headcount when supplied, otherwise event attendance
  for Sprint 3. Layout, accessibility, facilities and operating-hours assessment
  is reused. Unsuitability remains advisory, saved as `suitability_snapshot` for
  the later staff decision screen. E06-S01 opening-hours matching is unchanged.
- Booking, Approved-to-Planning, audit and notification/outbox persistence share
  one transaction; an outbox failure rolls everything back. The Organiser receives
  the status update; the acting Coordinator is excluded.
- Existing `convert_hold` uses the same service, retains the hold id, stops expiry,
  checks expiry after locks and supports safe retries. Direct retries return the
  saved assessment without duplicate rows or effects.
- The assigned-event list keeps newest-first ordering and retired-venue history,
  adding purpose, headcount, persisted advisory failures and primary flags when
  supplied by the decision workflow.

## Modules and migration

`bookingSubmission.ts` owns the reusable transaction; `bookingSubmissionHandler.ts`
owns the mutation HTTP boundary; `VenueBookingForm.tsx` composes shared UI. Existing
list, assessment, action router and hold conversion modules are extended.

Migration `0019_venue_bookings_contract.sql` adds nullable request metadata,
retry payload and advisory snapshot, plus confirmed-only/unique-primary checks.
Legacy rows remain valid. It preserves the merged `0016` buffer guard and computes
occupancy from current buffers rather than persisting a stale copy.
Migration ownership is recommended for E06-S03 as first consumer but still needs
agreement with E06-S04. Open PR #271 uses `0016` for staff assignments, colliding
with the merged guard; its owner must renumber it. No production migration was run.

## Acceptance and remaining integration

| Area | Evidence / remaining work |
| --- | --- |
| Pending, calendar and Planning transition | Unit, real PostgreSQL and intercepted browser coverage. Responsible staff routing is still needed to finish Scenario 1. |
| Multiple requests, purpose/headcount, periods, assignment/status gates | Implemented; database tests cover retries, simultaneous submissions and refusals. |
| Advisory suitability (TC_E06S02_04) | A real unsuitable Pending request and failing criteria are persisted; staff presentation remains E06-S04. |
| Responsible staff notifications | SCRUM-189 / #271 and #272. With no injected resolver, notices go to the requested venue's staff in `venue_staff_assignments`; a venue with no current assignment is reported in `unresolved_venue_ids` rather than broadcasting or inferring `decided_by`. Production also needs the real assignment rows after migration 0018. |
| Staff decisions and primary venue | E06-S04. Schema invariants exist; confirmation and primary selection are not implemented here. |
| Session selection | Post-Sprint-3 follow-up under T-73/T-79; no Session UI here. |
| Human manual E2E | Follow [the script](manual/E06-S03-click-through.md), then create a fresh T-65 record. Automated screenshots are not a manual run. |

TC_E06S03_03 still describes the superseded single-Pending restriction in the
catalogue. Use current multiple-booking rules and TC_E06S03_07; no obsolete
restriction is implemented or claimed. Withdrawal in TC_E06S03_08 is outside
this submission increment.

## Verification commands

```text
npm test --workspace backend
npm test --workspace frontend -- --no-file-parallelism
npm run test:venue-booking-requests:db --workspace backend
node --import tsx --test backend/tests/venueHolds.integration.test.ts backend/tests/venueBufferConflicts.integration.test.ts backend/tests/venueSearch.integration.test.ts
npm run test:db --workspace backend
npx playwright test tests/e2e/venue-booking-submission.spec.ts tests/e2e/venue-booking-requests.spec.ts tests/e2e/venue-search.spec.ts tests/e2e/venue-suitability.spec.ts --workers=1
npm run typecheck
npm run build
npm run test:runtime
python scripts/check.py
```

Use `TEST_DATABASE_URL` for disposable native loopback PostgreSQL; never shared
Supabase or Docker Desktop. Full DB regression also needs the disposable public
schema migrated for the existing registration fixture. Browser tests intercept APIs
with synthetic data. Fresh T-65 records report observed outcomes and coverage;
Windows tooling and event-visibility fixture failures remain explicit.

## Human manual verification (15 October 2026)

[Partial manual execution record](runs/20261015-014746-jininggg-frontend-e2e.md):
advisory Pending creation, Planning transition, multiple requests, ordering,
period refusals, blank values, Coordinator isolation, mobile presentation,
hold conversion and Tentative calendar display were observed by the human tester.
Read-only local DB checks corroborated metadata, cleared expiry, audits and queued
status-notice delivery. Buffer-only overlap, retries/expiry races and actual
staff/provider receipt are not claimed as manual results. Screenshot files still
need saving/linking through the team's PostPlan convention before PR evidence use.


## Review follow-up verification

Migration is now `0019_venue_bookings_contract.sql`: 0017 is reserved for SCRUM-184
and #271 is coordinating 0018. E06-S03 owns the shared booking columns.
Suggested-venue switches use a new Pending request with `replaces_booking_id`;
unit/component, browser and real PostgreSQL regressions cover prefilling, retained
rejection, retries, invalid provenance and duplicate-switch serialization.
Approved ? Planning uses the shared lifecycle status path and updates
`status_changed_at`. Targeted staff audience lookup reuses the shared notification
service; production default routing still depends on unmerged #272. The owner will
coordinate #245 separately. Earlier manual screenshots do not evidence these new
review fixes; repeat the added manual steps before claiming human verification.


### Hold-owner review follow-up

The E06-S05 owner confirmed that E06-S03 owns conversion?s Pending state,
expiry clearing, Approved ? Planning, shared checks, audit and notices; E06-S05
owns hold creation/release/extension/expiry. An unassigned Coordinator receives
403 on conversion, preserving the existing out-of-transaction Access Denied
log through `convertHold`?s audited wrapper. Missing holds and direct unassigned
requests remain 404. Booking activity names the requested venue and uses a
?Venue booking? fallback label; expiry changes still show their dates.
Occupancy/formatting/expiry-message helpers now live in `bookingShared.ts`,
removing the workflow import cycle. Conversion reuses the same expired-hold copy.


## Recorded withdrawal follow-up decisions (15 October; T-94 to T-96)

Pending-only withdrawal and replacement retry/chain rules are now recorded in
the canonical backlog, BDR and booking contract. They remain **unimplemented**
by this documentation change. Confirmed cancellation is excluded. Reuse Released,
preserve other bookings and event status, lock venue before booking, and persist
the booking-specific audit and requested-venue staff inbox/email outbox atomically.
Withdrawal of a converted hold never recreates that hold.

Follow-up work must add the staff withdrawal routing (not Coordinator-only
booking_decided released), revise the replacement index in a new migration to
exclude Released rows only, and align service duplicate checks and switch UI.
Rejected replacements still block their predecessor's slot; a new suggestion on
that latest rejection starts the next link without a fixed two-attempt limit.
TC_E06S03_08 is clarified; new cases TC_E06S03_09 to _13 cover Pending-only access,
decision races, staff notifications/rollback, withdrawal retry and rejection chains.
No passing execution evidence is claimed for these new requirements. Obtain peer
review of the shared index/routing contract before implementation, and record
fresh automated and human manual outcomes afterward. No Jira edits in this task.


### Review planning note (16 October 2026)

The Product Owner confirmed on 16 October that TC_E06S03_09 to _13 remain under
E06-S03's current Sprint 3 plan and that the remaining work should be completed.
Record anything unfinished honestly at sprint close. The cases remain
unimplemented until actual code and verification evidence exist; this is not a
Sprint 4 assignment, automatic carryover or completion claim. The prior request
for PO/Scrum Master scheduling confirmation is resolved.

References remain T-94/T-95/T-96 because #279 reserved T-93 first. Earlier dated
exports and immutable run records retain their historical references. Current-main
integration regenerates the 359-case workbook and coverage inventory; #268's
fixed-354 assertion was repaired per the PO's review comment. No unrelated tooling
test or story estimate is changed by this documentation correction.
