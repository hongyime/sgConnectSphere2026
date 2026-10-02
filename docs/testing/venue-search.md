# E06-S01 / SCRUM-45: Search for suitable venues

## Decisions and scope

Jira SCRUM-45 and related SCRUM-28, SCRUM-39, SCRUM-40, SCRUM-41,
SCRUM-42 and SCRUM-46 were inspected. The user confirmed event-based search:
event_id, event_range, event_accessibility_needs and event_facility_needs.
The live Supabase database has no SESSIONS table. T-48 withdraws sessions;
older session references are superseded. No new session model is introduced.

The user confirmed pending and confirmed overlapping bookings and venue blocks
all make a venue unavailable, consistent with T-49. Search never returns
conflicting event identifiers, event names or block reasons. PostgreSQL range
overlap uses [start,end) search periods; adjacent bookings do not overlap.

T-63: return all active venues matching the literal case-insensitive name query,
with suitability and individual mismatch flags. Preserve catalogue alphabetical
ordering with ID tie-breaks; no invented proximity score or filter relaxation.
Location uses case-insensitive substring matching. Both attendance and optional
minimum capacity apply; requested layout capacity replaces venue maximum for
matching. Missing layouts, predefined accessibility features and facilities are
identified. Free-text accessibility notes are shown for manual review only.
Operating hours remain catalogue information, not a new availability policy.

## Usage

Open /coordinator/venues or /coordinator/events/<eventCode>/venues after login.
Coordinator navigation and event planning links lead to search. Coordinator assignment
and event editing are now live; unfinished booking/planning actions still have
scaffolds. Venue search uses live data. Booking creation remains E06-S03 scope;
the separate E05-S03 calendar is now implemented.

GET /api/venues?mode=suitability returns options and optional event_id defaults.
Add search=1, start/end timestamps with timezone, attendance, optional capacity,
layout ID, location, q, and comma-separated accessibility/facilities IDs to search.
Explicit filters are alternatives for the search only; they never edit the event.
Existing cookie sessions and active/unlocked Coordinator authorization apply.
Invalid criteria return 400 with field messages; anonymous/unauthorized requests
return 401/403. No migration or new environment variable is needed.

## Verification

- npm run test:venue-search --workspace backend
- node --env-file=.env --import tsx --test backend/tests/venueSearch.integration.test.ts
- npm run test:e2e -- tests/e2e/venue-search.spec.ts
- npm run typecheck
- npm run build
- python scripts/check.py

The PostgreSQL test uses a unique schema inside one transaction and rolls back
all fixture changes and schema DDL on success or failure. Existing pgcrypto and
btree_gist extensions are required. It uses TEST_DATABASE_URL or configured
DATABASE_POOLER_URL/DATABASE_URL; fixtures never target public tables.
Browser tests mock APIs and do not claim live browser-to-database coverage.
Search is an availability snapshot, not a reservation. Booking must recheck
constraints. Review/merge and manual verification remain separate completion steps.

## Current implementation review (2026-10-02)

Jira SCRUM-45 is Done. Original search implementation: merged PR #133.
This local, uncommitted presentation increment follows the now-merged shared
skeleton (#171, #172, #173), design language (#178), and alignment work (#179,
#180). It does not claim a fresh peer review or deployment.

- `frontend/src/features/venue/VenueSearch.tsx`: shared PageLayout, Card,
  FormField/FormSection/FormActions, Button, FactList and feedback states;
  apiCall/useLoad preserve cookie authentication and discard stale route loads.
  The keyed event form and request guard prevent old search responses replacing
  the current event. Field errors are associated with their controls.
- `frontend/src/features/venue/venue.css`: scoped grid spacing and checkbox target
  size only; shared components retain ownership of colours, type and controls.
- `tests/e2e/venue-search.spec.ts`: shared fake-session helper; desktop/mobile
  filters, mismatch display, denied access, suitable/empty/error states and
  no horizontal overflow at 320px. These browser tests intercept the API.
- Unchanged backend: `backend/src/modules/venueBooking/search.ts` and the
  suitability branches in `api/venues/index.ts`. No API, ranking, range-overlap,
  schema or environment-variable change. Local-time input conversion is retained.

### Acceptance traceability

| Criterion | Automated evidence | Boundary |
| --- | --- | --- |
| TC_E06S01_01 matching venues and combined filters | venueSearch.test.ts; venueSearch.integration.test.ts; venue-search.spec.ts | Browser API is mocked; PostgreSQL suite verifies real matching |
| TC_E06S01_02 near matches and failing criteria | Same suites | T-63 ordering and mismatch logic unchanged |
| TC_E06S01_03 undersized/layout-specific capacity | Same suites | Both maximum and effective capacity remain visible |
| TC_E06S01_04 unavailable venues | Same suites | Pending/Confirmed overlaps and blocks tested in PostgreSQL |
| Route changes cannot retain stale search results | VenueSearch.navigation.test.tsx | Both late success and late failure covered |

### Limitations and follow-ups

Search does not reserve a venue; E06-S03 must recheck availability. Free-text
accessibility notes remain manual-review information. No business-session model
exists. Font loading is already open PR #182; screen inventory is open PR #183,
so neither is duplicated here. Visual comparisons use shared templates at 1280px
and 393px, with a separate 320px overflow assertion.

Live read-only schema review found the migration ledger through 0008; repository
0009_keepalive_logs.sql is not recorded there. This unrelated deployment discrepancy
was not changed. Fresh test execution evidence is linked below after verification;
old execution session records remain immutable under T-65.

## Fresh verification (2026-10-02)

[Execution session](runs/20261002-161552-jininggg-full-regression.md) records the actual commands, outcomes,
base commit and working-tree qualification. Frontend 201, selected PostgreSQL
51, email/provider 26, Redis 2, runtime 15, venue browser 8 and real auth/inbox
browser 10 checks passed. Backend units, typecheck/build and repository hygiene
also passed. Provider tests do not prove deployed mailbox delivery.

[Final venue browser rerun](runs/20261002-161841-jininggg-frontend-e2e.md): 8 passed after the final copy/fixture corrections.

Publication refresh: main f0c4264 now includes font PR #182. The open-PR
snapshot above predates that merge; only screen-inventory PR #183 remains open.

Publication postplan with desktop/mobile screenshots: https://gnoj0c9eujtz.postplan.dev.
