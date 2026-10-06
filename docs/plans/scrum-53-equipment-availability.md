# SCRUM-53 / E07-S03 — Check equipment availability

Draft PR: [#229](https://github.com/hongyime/sgConnectSphere2026/pull/229).
Review page: [implementation and screenshots](https://gnxd10tqiilh.postplan.dev/v/1).

## Goal and authoritative scope

Technical Support Staff can check how many units of each active equipment item
are free throughout a selected date/time period. Requirements follow
[Release 1 E07-S03](../backlog/release-1/E07-equipment-technical-support.md),
[TC_E07S03_01–03](../testing/cases/E07.md), customer clarifications C-07/C-20,
and boundary B-04. There is no transport allowance, venue filter, full-day lock,
reservation creation or dated-withdrawal writer in this story.

## Dependencies and boundaries

| Dependency | Status / implication |
| --- | --- |
| E07-S01 catalogue, PR #214 | Merged on main; reused equipment records and existing API/function. |
| Existing schema, migration 0001 | equipment, equipment_reservations and equipment_unavailability already exist. No new migration needed. |
| E07-S02 requests, PR #216 | Not required to read availability; this branch starts from main and does not carry #216's unmerged code. |
| E07-S04 reservation writer, SCRUM-54 | Reads reserved/partial rows and excludes released rows. Reservation creation/release remains that story's responsibility. Fixtures exercise the existing table until its writer is delivered. |
| E07-S05 dated withdrawal writer, SCRUM-55 | Reads quantity/range from equipment_unavailability; creating damage/maintenance withdrawals remains that story. Standing maintenance on the catalogue excludes the whole item. |
| Notifications | No mutation or notification introduced: this is an authenticated read-only query. |
| Venue setup/turnaround changes | Venue buffers do not apply to equipment; C-07/C-20 exclude transit modelling. |

No new environment variables, dependencies, deployment functions, secrets or
schema changes. Existing local equipment rewrite and Vercel route are reused.

## Availability calculation

The API selects active catalogue items plus overlapping reservations and dated
withdrawals in one PostgreSQL statement, giving them a single statement snapshot.
Only reserved and partial reservation states consume capacity. Released rows do
not. Retired catalogue items are excluded.

Intervals are clipped to the requested period and their start/end quantity
changes are swept in time order. The maximum simultaneous reservation plus
withdrawal quantity is deducted from total stock. Thus 10 owned, 3 reserved and
2 damaged at the same time yields 5 free. Consecutive 4-unit reservations consume
4 units, not 8. Free capacity cannot become negative.

Periods use [start, end) boundaries: a reservation ending at noon does not reduce
availability for a new event beginning at noon. Range writers should continue
using the existing half-open convention. Standing maintenance makes free quantity
zero for the whole equipment item, independent of dated withdrawals.

The screen shows reservation and withdrawal quantities at the most constrained
instant. Free quantity is the minimum over the complete selected period. Location
is informational and never changes capacity. This is a current snapshot, not a
reservation guarantee; a future reservation writer must recheck atomically.

## API, permissions and validation

`GET /api/equipment?mode=availability&start=<offset timestamp>&end=<offset timestamp>`
returns `{period, equipment}`. Optional `id` selects one active equipment item.
Each row includes totalStock, reservedQuantity, unavailableQuantity, freeQuantity,
location and standing operational status.

Only active, unlocked Technical Support Staff may query availability. Wrong-role
attempts are audited and denied before validating period details or reading stock.
POST for availability is refused. Timestamps must have explicit offsets, valid
calendar dates and end later than start. Malformed item identifiers are rejected;
a requested retired/nonexistent item is not treated as available.

## Frontend design and skeleton

- Main route: `/support/availability`, live E07-S03 in the route registry.
- Existing `/support/conflicts` link also renders the live availability screen.
- Technical Support navigation includes Equipment availability.
- Uses PageLayout, Card, FormSection/FormField/FormActions, Button, DataTable,
  Alert, EmptyState, LoadingState, ErrorState and useLoad from the shared skeleton.
- No feature stylesheet, colour/token or custom layout rule introduced.
- Input timezone is stated; explicit UTC instants reach the API. Results use the
  shared Singapore date/time formatter.
- Results have a caption and collapse through the shared responsive table.
- Changing the period cancels prior loading; late responses cannot replace the
  new period. Rechecking the same period fetches fresh quantities. Refresh is
  available for checking changes made by other staff.
- Invalid ranges attach an error to End. Retry and empty-catalogue states exist.

## Traceability and observed verification

| Acceptance criterion | Tests and evidence |
| --- | --- |
| TC_E07S03_01: reservations and faulty stock excluded | Backend sweep units; real PostgreSQL 10 − 3 − 2 = 5; standing-maintenance exclusion; real authenticated desktop/mobile screen displays 5. |
| TC_E07S03_02: another location does not restrict availability | Query has no venue/location condition; PostgreSQL and real browser show Projector at Grand Ballroom with full quantity. |
| TC_E07S03_03: non-overlapping periods share equipment | Unit sweep checks adjacent commitments; PostgreSQL checks noon endpoint and afternoon; real browser checks both free periods. |
| Access and validation | Wrong/inactive/locked role denial, offset/date/range/id validation, authenticated read-only handler, real Coordinator API returns 403. |
| Frontend resilience | Late response, repeated period refresh, field errors, retry and empty state component tests; desktop/mobile browser overflow assertion. |

Test files: backend/tests/equipmentAvailability.test.ts,
backend/tests/equipmentAvailability.integration.test.ts,
frontend/src/features/support/EquipmentAvailability.test.tsx,
tests/e2e/equipmentAvailability.spec.ts and
tests/auth-e2e/equipmentAvailability.spec.ts.

Final local evidence on the SCRUM-53 working tree based on main ccb32b6
(the execution records capture the exact HEAD used):

- Backend units: 270 passed.
- Frontend component suite: 277 passed; mocked API.
- PostgreSQL acceptance: 1 combined test passed, all three story cases.
- Intercepted browser acceptance: 6 passed, desktop/mobile.
- Authenticated browser acceptance: 2 passed, desktop/mobile, real login/API/PostgreSQL.
- Typecheck and frontend/backend build passed; existing bundle-size warning remains.
- Desktop/mobile screenshots were visually inspected; no document overflow in browser assertions.

The initial real mobile test used desktop-only cell names; it failed because the
shared mobile table includes column labels in each cell. The locator was corrected
and both real browser projects passed. No application fix was needed for that issue.

Execution records are under `docs/testing/runs/` with 7 October 2026 timestamps
and actual command completion times. The database is a dedicated disposable
local PostgreSQL 17 container; no shared application database was reset or seeded.
CI runs the new PostgreSQL and authenticated browser suites after installing Chromium.

## Repeatable manual checklist — pending human execution

Use active Technical Support credentials and a test environment. The seeded
catalogue quantities may differ; use a prepared disposable fixture for exact
10/3/2 values. Do not reset a shared database to follow this walkthrough.

| Setup / before | Action | Expected result | Manual result |
| --- | --- | --- | --- |
| Signed in as Technical Support | Open Equipment availability | Start/End fields and Choose a period state | Pending |
| Microphone total 10, 3 reserved and 2 damaged 15 Nov 2026 09:00–12:00 Singapore | Enter the period and Check availability | Total 10, reserved 3, withdrawn 2, free 5 | Pending |
| Projector working at Grand Ballroom; no commitments | Check same period | Full free quantity; location shown; no transport adjustment | Pending |
| Microphone commitments finish at noon | Check 12:00–14:00 and 14:00–17:00 | Full free quantity in both periods | Pending |
| Catalogue item standing Under maintenance | Check any period | Free 0 | Pending |
| Reservation released or dated withdrawal ends | Check/refresh after release or end | Capacity becomes available again | Pending |
| Start later than End | Submit | End field error; no new availability query | Pending |
| Coordinator or other role | Request the availability API directly | Access refused; stock not disclosed | Pending |
| Same period; another staff member changes commitments | Check availability again | Updated quantity, not stale previous results | Pending |
| Phone viewport | Repeat a check and scroll results | Readable fields and equipment cards; no page overflow | Pending |

## Remaining delivery steps

- Run human manual checklist and record actual results separately.
- Obtain skeleton/design review (Amareet) and backend peer review.
- Require final-head CI green and reviewed merge before Jira Done.
- E07-S04/E07-S05 must independently deliver their write workflows; fixture-backed
  validation of this reader does not mark those stories complete.

## Execution records

- [20261007-003344-xiangyingg-frontend-vitest.md](../testing/runs/20261007-003344-xiangyingg-frontend-vitest.md)
- [20261007-003352-xiangyingg-backend-db.md](../testing/runs/20261007-003352-xiangyingg-backend-db.md)
- [20261007-003356-xiangyingg-backend-unit.md](../testing/runs/20261007-003356-xiangyingg-backend-unit.md)
- [20261007-003409-xiangyingg-full-regression.md](../testing/runs/20261007-003409-xiangyingg-full-regression.md)
- [20261007-003425-xiangyingg-frontend-e2e.md](../testing/runs/20261007-003425-xiangyingg-frontend-e2e.md)
- [20261007-003426-xiangyingg-frontend-e2e.md](../testing/runs/20261007-003426-xiangyingg-frontend-e2e.md)

## CI route-regression follow-up

Initial CI on 884dc52 passed backend, frontend, PostgreSQL and authenticated
browser steps but failed the full scaffold on two old desktop/mobile assertions
expecting the mock Conflict state screen. The legacy route now correctly opens
live equipment availability. Updated tests/e2e/support.spec.ts to check that live
form and regenerated coverage. Full local scaffold then passed: 238 passed,
342 deliberate skips. This does not turn the skipped stories into delivered work.

- [Initial CI failure record](../testing/runs/20261007-004922-xiangyingg-frontend-e2e.md)
- [Full local scaffold regression](../testing/runs/20261007-013825-xiangyingg-full-regression.md)

## Latest main integration

Merged main 3f8de45 (PR #222, E07-S06 backend) after it landed during this task.
Resolved backend/package.json by retaining both availability and support-request
unit/database commands; regenerated the combined coverage inventory. No other
conflict occurred. Typecheck and the combined 289 backend tests pass. Re-ran the
real authenticated availability journey after main's API routing additions:
2 desktop/mobile tests pass against isolated PostgreSQL.

- [Combined backend regression](../testing/runs/20261007-014057-xiangyingg-backend-unit.md)
- [Post-merge real browser acceptance](../testing/runs/20261007-014058-xiangyingg-frontend-e2e.md)
