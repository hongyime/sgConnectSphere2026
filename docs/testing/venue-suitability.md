# E06-S02 / SCRUM-46: Event venue suitability

## Scope and approved rule

T-77 records the Product Owner clarification relayed on 8 October 2026.
E06-S02 includes operating hours in advisory suitability. E06-S01 does not.
Both use the same capacity/layout/accessibility/facility evaluator, extracted
unchanged from search.ts into assessment.ts. No schema migration is required.

The event period is checked in Asia/Singapore, following the venue calendar.
Venues currently validate opening before closing on the same day. Exact opening
and closing boundaries pass; starting before opening, ending after closing, or
spanning the closed overnight period adds "Event is outside operating hours."
No overnight-opening or 24-hour venue model is introduced by this story.

The effective capacity is the selected layout's capacity, otherwise venue
maximum. Every required predefined accessibility feature and facility must be
present. Free-text accessibility notes are displayed for manual review. No
location requirement is inferred from free text. Current Pending/Confirmed
overlaps and blocks still produce the search evaluator's unavailable reason,
without exposing the other event or block details. Assessment is a snapshot,
not booking authorisation; advisory failure cannot override overlap constraints.

## API and UI

`GET /api/venues?mode=assessment&event_id=<id-or-code>&venue_id=<id>` requires
the existing active/unlocked Coordinator authentication. It uses the existing
search event-visibility rule (non-draft events); it does not implement the future
Lead/assigned-only story. The service ignores client-supplied dates, attendance,
features and role, loading recorded event requirements instead.

The response contains event identity/period/manual notes and an `assessment`:
`suitable`, `mismatches`, `advisory: true`, `operating_hours_pass`, `timezone`,
`comparisons` (criterion, required and provided values), and venue capabilities.
Missing/invalid identifiers or event requirements return 400; anonymous access
401; denied roles 403; missing/draft events and inactive/missing venues 404.
The existing response wrapper converts database errors to a safe 503 response.

The event-context E06-S01 result links to
`/coordinator/events/:eventCode/venues/:venueId/suitability`. This page reuses
PageLayout, Card, StatusPill, FactList, ButtonLink, loading/error handling and
Singapore date formatting. There is no new CSS or visual system. Search filters,
sorting, query contract and operating-hours behaviour are unchanged.

## Traceability and boundaries

Implementation branch: `feature/e06-s02-advisory-suitability` (renamed before publication to avoid premature Jira auto-closure).

| Acceptance criterion | Automated evidence | Remaining boundary |
| --- | --- | --- |
| TC_E06S02_01 event-specific assessment | venueSuitability.test.ts, venueSearch.integration.test.ts, VenueSuitability.test.tsx, venue-suitability.spec.ts | Manual assessment run passed; peer review pending |
| TC_E06S02_02 every failure identified | Same tests: capacity, layout, accessibility, facilities, availability and hours | Free text is manual review |
| TC_E06S02_03 all requirements met | Pure evaluator and PostgreSQL assertions; suitable UI state | No reservation is made |
| TC_E06S02_04 unsuitable venue can be requested and shown to staff | Advisory result and no-write boundary tested only | Actual request/decision workflows require E06-S03/S04; scaffold remains pending |
| TC_E06S02_05 operating hours | Within/exact boundaries, early start, late end, midnight, timezone and E06-S01 regression | No new overnight-opening policy |

## Run and verify

For the human acceptance check of this partial delivery, follow the
[E06-S02 click-through script](manual/E06-S02-click-through.md). It uses a
dedicated local database, records each hours boundary separately, and leaves
the E06-S03/S04 booking journey explicitly pending. Create the manual T-65
execution record only after the tester reports actual browser observations.

Start the existing API/frontend development environment as described in
`backend/README.md` and `docs/frontend-guide.md`. Sign in as a Coordinator,
open an event's venue search, search, then choose **Check recorded event requirements**.

```text
npm run test:venue-suitability --workspace backend
npm run test:venue-search --workspace backend
node --env-file=.env --import tsx --test backend/tests/venueSearch.integration.test.ts
npm test --workspace frontend -- --run --no-file-parallelism src/features/venue/VenueSuitability.test.tsx src/features/venue/VenueSearch.navigation.test.tsx
npx playwright test tests/e2e/venue-search.spec.ts tests/e2e/venue-suitability.spec.ts --workers=1
npm run typecheck
npm run build
python scripts/check.py
```

The database test uses a unique schema inside a transaction and always rolls it
back; no public application data is written. It requires existing pgcrypto and
btree_gist extensions. Browser tests intercept API responses: they are not live
browser-to-database acceptance evidence. Screenshots were inspected and a human manual assessment run is linked below.
Full booking E2E and peer review of code/tests remain required by the DoD.

## Dependencies and current-state findings

- E06-S03 must consume the advisory assessment without rejecting capability or
  hours failures. E06-S04 must show those failures in the staff decision flow.
  `assessEventVenue` is a pure reusable function; no booking workflow is fabricated.
- O-27 booking-specific headcount and O-29 booking periods belong to E06-S03.
  Its caller must construct criteria from the authoritative booking requirements
  (including capacity/attendance), not accept browser-provided assessment results.
- Buffer work belongs to E05-S05 / open PR #231, which also changes search.ts.
  This branch leaves the search SQL unchanged so that work can be integrated.
- Current Supabase venue/booking columns still have no buffer, headcount or
  expiry fields. No migration was applied. Week 7 target-schema docs describe
  planned changes rather than the inspected deployed schema.
- Jira SCRUM-46 was To Do and did not yet include the operating-hours clarification.
  Reconcile after the documentation merges; this task does not change Jira.

The story is partially delivered until TC_E06S02_04 and the human DoD steps are
complete. A passing advisory evaluator does not prove successful booking creation.

## Observed verification, 8 October 2026

- [Human manual assessment run](runs/20261008-212539-jininggg-frontend-e2e.md):
  suitable/unsuitable screens, hours boundaries, search regression, mobile and
  signed-out access verified by Ji Ning. Booking integration remains skipped;
  the missing-wheelchair combination was not part of the manual fixture.
- [Execution record](runs/20261008-155059-jininggg-full-regression.md)
- [Execution record](runs/20261008-155059-jininggg-backend-db.md)

Coverage is scoped to the four new/extracted modules named in the record.
The API dispatch and route registration are thin composition changes; the browser
checks exercise routing with intercepted APIs, not real HTTP authentication.
No whole-application 100% coverage or full AC4 integration claim is made.

## Files created or modified

| File | Purpose |
| --- | --- |
| `api/venues/index.ts` | Authenticated assessment dispatch in the existing API. |
| `backend/package.json` | Include suitability unit tests and expose a focused test command. |
| `backend/src/modules/venueBooking/assessment.ts` | Extract the existing pure search evaluator unchanged. |
| `backend/src/modules/venueBooking/search.ts` | Reuse and re-export evaluator/types; share existing authorisation. |
| `backend/src/modules/venueBooking/suitability.ts` | Recorded-event assessment, hours rule, readable comparisons and advisory result. |
| `backend/tests/venueSuitability.test.ts` | Unit, authorisation, validation and hours/search regression tests. |
| `backend/tests/venueSearch.integration.test.ts` | Extend existing isolated PostgreSQL fixtures with suitability regressions. |
| `frontend/src/app/routes.tsx` | Register event-context suitability route. |
| `frontend/src/features/venue/VenueSearch.tsx` | Link event search results to the recorded-requirements assessment. |
| `frontend/src/features/venue/VenueSuitability.tsx` | Shared-component suitability detail screen. |
| `frontend/src/features/venue/venueSuitabilityApi.ts` | Typed API helper with abort support. |
| `frontend/src/features/venue/VenueSuitability.test.tsx` | Presentation, error/retry and stale-route-response tests. |
| `tests/e2e/venue-search.spec.ts` | Assert the new detail link without altering search expectations. |
| `tests/e2e/venue-suitability.spec.ts` | Desktop/mobile suitable, unsuitable and access-error checks. |
| `docs/backlog/release-1/E06-venue-search-booking.md` | Canonical PO hours clarification and corrected withdrawn decision reference. |
| `docs/backlog/product/E06-venue-search-booking.md` | Mirror the release-story clarification. |
| `docs/bdr/B-team-decisions.md` | Record approved clarification T-77. |
| `docs/bdr/G-change-log.md` | Record the dated clarification and downstream changes. |
| `docs/source-of-truth.md` | Point at regenerated dated exports. |
| `docs/testing/cases/E06.md` | Add TC_E06S02_05 for hours and E06-S01 regression. |
| `docs/testing/venue-suitability.md` | API, rules, traceability, commands and honest integration limitations. |
| `docs/testing/tc-coverage.md` | Regenerated automation inventory. |
| `docs/testing/PROJECT TEST CASES.xlsx` | Regenerated compatibility input for coverage auditing. |
| `docs/testing/PROJECT TEST CASES CAA 081026.xlsx` | Regenerated canonical acceptance-case export. |
| `docs/CONNECTSPHERE BACKLOGS CAA 081026.xlsx` | Regenerated backlog export. |
| `docs/BACKLOG DECISION REVIEW CAA 081026.docx` | Regenerated BDR export. |
| `docs/testing/runs/20261008-155059-jininggg-full-regression.md` | Observed local unit/browser/build/tooling results. |
| `docs/testing/runs/20261008-155059-jininggg-backend-db.md` | Observed real PostgreSQL results and isolation boundary. |
| `.agents/handoffs/20261008-feature-SCRUM-46-venue-suitability.md` | Task continuity, decisions, evidence and remaining dependencies. |

Pre-PR regression after updating to main `1086940`: see
[rerun evidence](runs/20261008-213559-jininggg-full-regression.md).
