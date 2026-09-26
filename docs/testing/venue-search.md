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
Coordinator home and planning workspace link to search. Existing planning screens
remain fixture-backed; venue search independently uses live data. No booking
creation (E06-S03) or calendar (E05-S03) functionality is introduced.

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
