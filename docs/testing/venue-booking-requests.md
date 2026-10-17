# E06-S03 venue booking requests

SCRUM-47; implementation snapshot: 15 October 2026, based on main `5c22e26`.
The original increment was partial. The 16 October withdrawal implementation
and current verification boundaries are recorded at the end of this guide;
historical run outcomes below are unchanged. Whole-story completion is not claimed.

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
Migration ownership is E06-S03 as agreed with E06-S04. Staff assignments use
merged migration 0018. The withdrawal branch adds 0020 after 0019; it has not
been applied to production by this task.

## Acceptance and remaining integration

| Area | Evidence / remaining work |
| --- | --- |
| Pending, calendar and Planning transition | Unit, real PostgreSQL and intercepted browser coverage. Default staff routing from merged #272 has real PostgreSQL evidence; fresh human receipt verification remains. |
| Multiple requests, purpose/headcount, periods, assignment/status gates | Implemented; database tests cover retries, simultaneous submissions and refusals. |
| Advisory suitability (TC_E06S02_04) | A real unsuitable Pending request and failing criteria are persisted; staff presentation remains E06-S04. |
| Responsible staff notifications | SCRUM-189 / #271 and #272. With no injected resolver, notices go to the requested venue's staff in `venue_staff_assignments`; a venue with no current assignment is reported in `unresolved_venue_ids` rather than broadcasting or inferring `decided_by`. Production also needs the real assignment rows after migration 0018. |
| Staff decisions and primary venue | E06-S04 #298 owns decisions/automatic first primary; the E06-S03 follow-up below implements explicit Coordinator reselection and tests real-service races. |
| Session selection | Post-Sprint-3 follow-up under T-73/T-79; no Session UI here. |
| Human manual E2E | Follow [the script](manual/E06-S03-click-through.md), including switch, default staff routing and withdrawal/retry, then create a fresh T-65 record. Automated screenshots are not a manual run. |

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
staff/provider receipt are not claimed as manual results. The [archived human screenshots](runs/evidence/20261015-014746-jininggg-frontend-e2e/README.md)
now retain all 24 saved images in the repository. The immutable pre-cutoff run
record is unchanged; these are historical attachments, not a current rerun.


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

## Pending withdrawal implementation (16 October 2026)

The `feature/e06-s03-pending-withdrawal` working tree implements T-94/T-95/T-96.
`POST /api/venues` with `action: withdraw_booking` and a UUID `booking_id` uses
the submission handler's origin/authentication boundary. Only the currently
assigned active Coordinator may withdraw a Pending request. Other statuses
return 409; unknown/foreign requests return 404. No submission key is required.
Repeat withdrawal returns 409 with no repeated effects.

The transaction locks Venue before Booking and rechecks Pending. Assignment
and account are protected with `FOR SHARE NOWAIT` after those locks: a busy
event/account returns 409 instead of waiting in the reverse order of the
event-first submission workflow. It changes only that booking to Released,
writes the booking-specific `Booking Withdrawn` audit, and persists the scoped
`booking_withdrawn` staff notification and email outbox atomically. It does not
restore a converted hold, alter another booking, change event status or cancel
a Confirmed primary. Actual email-provider receipt is not claimed.

New migration `0020_released_booking_replacement_retry.sql` rebuilds only
`venue_booking_replacement_idx` with `status <> 'released'`. Applied 0019 is
unchanged. The submission duplicate check and list `has_replacement` use the
same predicate. Released history permits a fresh key/row; replay of an old key
returns that old row. Rejected replacements still consume their predecessor's
slot; next links must follow the latest rejection's own suggestion.

The shared UI adds a confirmation panel, busy controls, success notice and
refresh action after refusal. Local unit/component, intercepted desktop/mobile
browser and real PostgreSQL tests exercise these paths. The race fixtures use
competing database decision writers with E06-S04's lock/status contract; they
do not establish full staff decision UI integration. The fresh partial human
switch/notification/withdrawal run is linked below; peer review, merge and
remaining acceptance integration are still outstanding.
Older statements above describe their dated increments and are superseded by
this section for current implementation status.

Observed local verification (baseline `8599ad2` plus this working tree):

- [Backend unit record](runs/20261016-161925-jininggg-backend-unit.md): 403 passed; withdrawal service 100% coverage.
- [Real PostgreSQL record](runs/20261016-161926-jininggg-backend-db.md): 44 passed, including populated index upgrade and both competing writer orders.
- [Component coverage record](runs/20261016-161927-jininggg-frontend-vitest.md): 17 passed; booking request screen/API and form each 100% coverage.
- [Intercepted browser record](runs/20261016-161928-jininggg-frontend-e2e.md): 16 passed across desktop/mobile; not a human manual run.
- [Runtime record](runs/20261016-161929-jininggg-runtime.md): 18 compiled API smoke tests passed.
- [Build/tooling record](runs/20261016-161930-jininggg-tooling.md): typecheck/build passed; repository check retains the existing Windows worktree-fixture 3 failures/11 errors among 146 tests.

## Human verification and final preparation (16 October 2026)

[Fresh partial manual record](runs/20261016-162300-jininggg-frontend-e2e.md)
links 24 original human screenshots and separates observed UI outcomes from
agent read-only PostgreSQL corroboration. It covers independent Pending
requests, withdrawal/cancel/mobile controls, retained Released history, new
requests after withdrawal, default Venue Staff inbox receipt, suggested-venue
retry/chain, converted-hold withdrawal without resurrection, foreign list
privacy and Confirmed booking UI protection. It is not a full-story PASS.

Two issues found during that run were fixed and manually retested:

- After an embedded suggested-venue submission, **View venue booking requests**
  now closes that form and reloads the list through an explicit callback.
  Assessment-page forms retain their navigation link. The human confirmed
  repeated updates without F5. Component and browser regressions cover refresh.
- Assigned event details now expose **Venue bookings** beside the existing
  actions for all event statuses, including Confirmed. The human clicked it
  from EVT-2001 and reached its Confirmed booking list. Viewing does not grant
  submission or withdrawal permission.

All 24 supplied images decode, follow TC_ID filenames and remain below
1000 KB each (largest 124750 bytes). Agent visual inspection found synthetic
seed data only, with no passwords, tokens, connection strings or real personal
data. Original screenshots and prior run records are unchanged.

### Before whole-story completion

Commit/push readiness is separate from satisfying the Definition of Done:

1. Have another developer review the implementation **and test cases**, including
   the new index predicate, venue-before-booking locks and targeted staff notices.
2. Review the combined real-service race evidence below with Le Xin and integrate
   E06-S04 when #298 is permitted to merge. Synthetic manual rejection fixtures
   still do not establish the staff UI integration. E06-S04 owns automatic
   first-confirmed primary assignment; E06-S03 owns explicit primary reselection.
   Human primary-reselection verification is now recorded in
   [the later run](runs/20261016-221852-jininggg-frontend-e2e.md); see the
   current completion summary below for review and dependency gates.
3. Review the manual SKIPs and limited PASS scopes against the canonical cases.
   Direct API refusals, replay, buffer-only clashes, rollback and extended chains
   have automated evidence, but were not human-executed in this session. Record
   any additional agreed human checks in a new immutable run with screenshots;
   never relabel the current record as having performed them.
4. Open the implementation PR with honest evidence/limits and its PostPlan,
   satisfy required CI and review, resolve conversations, and merge through the
   normal process. Check the migration number again when integrating latest
   main. Applying 0020 to shared Supabase requires the owning production
   migration workflow and a separate run record; this task does not do it.
5. Keep SCRUM-47 In Progress until the complete accepted scope meets the DoD;
   reconcile it with the final PR evidence, not just a docs-only merge.

The earlier 17:34 read-only GitHub snapshot found main ahead of local baseline
`8599ad2` through docs/tooling/evidence merges, with no new merged booking SQL
migration in the comparison. #294 has merged separately. No E06-S04 decision
implementation appeared in that snapshot's main comparison/open PR list. PR #298
was subsequently supplied and verified as documented below. Do not
treat stale earlier “unmerged #272” prose as a current dependency: #272 is
merged and default staff routing was exercised in this manual run.

Final preparation records for the complete local working tree:

- [Backend unit](runs/20261016-173359-jininggg-backend-unit.md): 403 passed.
- [Frontend components](runs/20261016-173400-jininggg-frontend-vitest.md): 32 passed across booking and Coordinator workspace files; booking form/list/API coverage remains 100%.
- [Desktop/mobile browser](runs/20261016-173401-jininggg-frontend-e2e.md): 16 passed, including the embedded switch-list refresh regression.
- [Build/tooling and screenshot review](runs/20261016-173402-jininggg-tooling.md): build passed, all original images reviewed, known Windows tooling failures retained.

No commit/push has been made by this preparation. No further manual rerun is
required merely to save this partial increment; whole-story sign-off still
requires the completion gates above. Publishing a PR and applying production
migrations are separate actions.

## E06-S04 coordination follow-up: primary selection and actual races

Le Xin confirmed explicit primary reselection belongs to E06-S03 Scenario 3c,
with the control on the Coordinator booking list. E06-S04 #298 implements only
automatic first-confirmed primary assignment. The earlier ownership statement
in the shared contract is corrected; no further product scope is introduced.

`POST /api/venues`, `action: set_primary`, UUID `booking_id`, shares the
submission handler's authentication/origin boundary. The assigned active
Coordinator may select any Confirmed booking for that event, including while
the event is Confirmed. Pending and other statuses are refused. Event row is
locked first with `FOR NO KEY UPDATE`, followed by account authority and the
target/existing-primary booking locks. Clear-old then set-new occurs with a
transactional `Primary Venue Changed` audit. Replaying the current choice is a
no-op. No status, period, expiry, occupancy or event-status change, no new schema
columns, and no primary cancellation workflow are introduced.

The shared UI exposes **Set as primary venue** only on Confirmed non-primary
cards, with confirmation/cancel, busy/error controls and list refresh. Primary
flags display after a successful selection. The
[16 October primary manual run](runs/20261016-221852-jininggg-frontend-e2e.md)
records human confirmation/cancellation, selection, switching between two
Confirmed bookings, refresh persistence and absence of primary controls on
non-Confirmed cards. Its original screenshots and initial stale-API failure
are retained; synthetic fixture preparation is distinguished from staff approval.

### Deterministic real E06-S04 integration tests

`backend/tests/bookingDecisionIntegration.integration.test.ts` calls the actual
`decideBooking` from #298, not a simulated decision writer. The dependency is
still unmerged at reviewed head `463f0e8ef982f2680fa644c8292ab4d631c90a70`.
For local verification, an isolated detached checkout of that exact head was
overlaid with the E06-S03 working source/test files. `decisions.ts` was left
byte-for-byte unchanged (verified with Git). The user's working branch and PR
were not merged, committed or pushed.

Each service owns BEGIN/COMMIT on its own real PostgreSQL client. Test barriers
pause after executed lock statements; `pg_blocking_pids` confirms the competing
transaction is blocked before the barrier is released. Both approval and
rejection are covered in each withdrawal ordering:

- Withdrawal has written Released and commits first: decision returns 409
  with the Coordinator-withdrew message; no decision audit or notification.
- Decision holds Event first: withdrawal's Event `FOR SHARE NOWAIT` returns
  busy 409; no withdrawal write, audit or notification.
- Withdrawal holds Venue while decision holds Event and waits on Venue:
  withdrawal's NOWAIT check rolls back, frees Venue and lets decision complete.
  No deadlock or overwritten status.

Two additional tests serialize explicit primary selection with automatic
assignment in both event-lock orders and leave exactly one primary. The combined
run also includes submission/withdrawal/replacement regressions and primary
audit rollback, with 27 tests passing and no skips in the isolated checkout.

On a checkout without `decisions.ts`, the eight combined-service cases explicitly
skip with a dependency message. They are included in the backend DB commands;
after #298 lands they run normally without changes. A green root run containing
these skips must not be claimed as combined-service verification. The isolated
27-test run is the real evidence until the dependency is integrated. To reproduce,
use an isolated #298 checkout, overlay the E06-S03 source/test changes while
preserving its original `decisions.ts`, and run the two DB files against the
guarded disposable native loopback PostgreSQL database. Do not run these suites
against shared Supabase. No human race/primary run or whole-story completion
is claimed by the automated results.

Observed coordination-follow-up records:

- [Backend unit](runs/20261016-215604-jininggg-backend-unit.md): 407 passed; primary service100% coverage.
- [Actual PR #298 + E06-S03 PostgreSQL](runs/20261016-215605-jininggg-backend-db.md): 27 passed, zero skips in the isolated checkout, including all eight real-service races.
- [Primary component tests](runs/20261016-215606-jininggg-frontend-vitest.md): 19 passed; booking list/API100% coverage.
- [Desktop/mobile browser](runs/20261016-215607-jininggg-frontend-e2e.md): 20 passed.
- [Compiled API](runs/20261016-215608-jininggg-runtime.md): 19 passed.
- [Build/repository](runs/20261016-215609-jininggg-tooling.md): build/typecheck pass; existing Windows worktree fixture3 failures/11 errors remain disclosed.

### Completion status after PR #299 review (17 October)

The earlier commit-readiness snapshot and pending-primary-test statements are
historical. Primary-selection manual testing is recorded above. Le Xin's
[integration review](https://github.com/hongyime/sgConnectSphere2026/pull/299#pullrequestreview-5550788308)
reports 48/48 real PostgreSQL tests with zero skips using this branch at
db6da30 combined with #298 at a4b2cf9, including all eight combined races.
That is reviewer-reported isolated integration, not a fresh execution by this
document update or root CI. Her activity-formatting and conflict-copy findings
were fixed in 216b66b, with regression records
[frontend](runs/20261017-004600-jininggg-frontend-vitest.md) and
[backend](runs/20261017-004601-jininggg-backend-unit.md).
Xiang Ying's
[bounded static review](https://github.com/hongyime/sgConnectSphere2026/pull/299#issuecomment-6229087555)
found no new blocking functional issue; it did not run application tests.

Remaining gates are current-head human approval, required PR checks and reviewed
merges. Integrate #298 through its own approval process, preserve both backend
test lists if package.json conflicts, regenerate the coverage inventory, and
verify the combined tests execute without dependency skips. Earlier isolated
passes do not establish results against a later dependency head. This document
does not authorise merging #298 or assume its product decisions are resolved.

Migration 0020 is not production-applied or verified by these tests/reviews.
The deploy owner must follow the
[production migration runbook](../ops/production-migrations.md), including the
migration-only/application release split or a reviewed deployment control,
pre-run ledger check, exact-file application, post-run verification and a
sanitized committed run record before dependent application deployment.

Production Venue Staff routing also needs the PO-approved roster tracked by
SCRUM-195 under SCRUM-75. Local fixture assignments and notification evidence
do not establish production roster provisioning or live delivery. These
operational gates and reviewed integration remain distinct from the completed
human UI checks; no whole-story Done claim is made here.
