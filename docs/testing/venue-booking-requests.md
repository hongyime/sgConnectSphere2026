# E06-S03 booking request foundation

SCRUM-47; implementation snapshot: 12 October 2026, based on main `01ad35b`.
This is a partial implementation, not evidence that E06-S03 is Done.

## Available now

- Assigned Event Coordinators can open **View venue booking requests** from an
  event's venue search. `/coordinator/events/:eventCode/venue-bookings` lists
  persisted bookings, newest first, including venue, period, status and decision
  reason. Historical bookings remain visible when a venue is retired.
- `GET /api/venues?mode=booking_requests&event_id=<UUID-or-event-code>` derives
  identity from authentication and checks assignment in both event and booking
  queries. Anonymous, inactive, locked and other-role users cannot read it.
  Another Coordinator receives 404 for an unassigned event. Responses are private
  and not cached. Other HTTP methods receive 405; there is no booking write API.
- Following Bl0oper's PR #256 review, unused preparation/validation helpers and
  the unmounted request form were removed. They belong in the submission PR
  alongside the workflow that actually uses them.
- CI now runs `test:venue-booking-requests:db` explicitly in
  `.github/workflows/application-checks.yml` using its disposable PostgreSQL service.

The read path covers the status-display portion of TC_E06S03_05. It is an
event-scoped list, not the workbook's all-events "My Booking Requests" journey.
Existing submission scaffolds remain deferred. No Pending creation is implemented or claimed.

## Integration still required

| Dependency | Remaining work |
| --- | --- |
| #231 / E05-S05 buffers, shared booking contract | Integrate buffered occupancy and blocks, then the agreed 0014 exclusion/booking-field migration. No migration is added here. |
| E06-S05 holds (#245 merged) | Integrate the existing holds workflow with future submission and test conversion/expiry races. Preserve its merged code and tests. |
| E06-S03 submission | Persist Pending request and requester/purpose/headcount; atomic Approved-to-Planning, audit and notification/outbox writes; repeat/concurrent submission tests. |
| Venue-to-staff relationship / E06-S04 | Resolve actual responsible staff, deliver request notices and expose advisory assessment to the decision workflow. Do not substitute decided_by or broadcast to all staff. |
| E06-S04 primary venue | First-confirmed primary selection and confirmed-only replacement follow the owning decision workflow. |

The future submission service must validate input inside its transaction,
lock/revalidate the event, venue and hold, and perform final conflict protection.
A read-only status result is not authorization to commit. Raw request periods stay
inside the event; setup/turnaround occupancy may extend beyond it (T-78 and
`docs/contracts/venue-bookings.md`). E06-S01/S02 matching logic is unchanged.

## Verification

```text
npm test --workspace backend
npm test --workspace frontend -- --run --no-file-parallelism src/features/venue/VenueBookingRequests.test.tsx src/features/venue/VenueSearch.navigation.test.tsx
npm run test:venue-booking-requests:db --workspace backend
npx playwright test tests/e2e/venue-booking-requests.spec.ts tests/e2e/venue-search.spec.ts tests/e2e/venue-suitability.spec.ts --workers=1
npm run typecheck
npm run build
npm run test:runtime
python scripts/check.py
```

Database tests require `TEST_DATABASE_URL` pointing at a disposable local
Postgres instance with pgcrypto/btree_gist installed. They create a unique schema
in a transaction and roll it back; do not use the shared database. The focused
test verifies SQL ownership, ordering, historical visibility against base-schema fixtures. It does not exercise future buffer or
hold-conversion migrations. Browser tests intercept the API; they are not a real
database submission journey or a human manual run.

Historical test records describe the original foundation, including helpers
subsequently removed in review. The 14 October review record describes the
remaining read-only code and current checks. No human manual run is claimed.

## Source discrepancies

- Jira SCRUM-47 was incorrectly marked **Done** by automation after docs-only
  PR #244. On 12 October 2026 it was restored to **In Progress**, following the
  team's chosen correction. Jira comment 10254 supersedes comment 10253:
  implementation continues under this story and its existing subtasks, without
  a duplicate follow-up story. The full submission workflow remains incomplete.
- The shared contract still has Draft/proposal labels and attributes merged 0013
  to #245; the migration actually merged in #246. This slice does not rewrite
  another workflow's contract or allocate its migration independently.
- TC_E06S03_03 and its old scaffold still describe a one-Pending-per-event rule,
  superseded by confirmed multiple-booking rules. Do not implement that old rule.

Before claiming story completion, finish the dependent transaction, reconcile
the stale case wording and perform/log the actual human booking journey.
