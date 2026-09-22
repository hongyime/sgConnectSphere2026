# SCRUM-35 / E03-S05 implementation status

## Completed

- Organiser event details show the current status in plain language.
- The date on which the current status was reached is shown as `Reached on <date>`.
- Event status history is read from immutable `audit_logs` status-change entries.
- History is returned only after the existing organiser organisation-access check.
- History is ordered oldest first and displays the previous and new status with its date.
- Backend unit coverage verifies the status date and ordered history response.
- E03-S05 browser acceptance coverage is live for desktop and mobile:
  - `TC_E03S05_01` current status and date;
  - `TC_E03S05_02` status transition history entry;
  - `TC_E03S05_03` complete status history.

## Verification completed

- `npm test --prefix frontend` — passed (17 tests).
- `npm test --prefix backend` — passed (144 tests).
- `npm run build --prefix frontend` — passed.
- `npm run build --prefix backend` — passed.
- `npx playwright test tests/e2e/e03.spec.ts --grep E03-S05 --project=desktop` — 3 passed.
- `npx playwright test tests/e2e/e03.spec.ts --grep E03-S05 --project=mobile` — 3 passed.
- `python scripts/check.py` — passed.

## Remaining work / limitations

The browser tests currently use deterministic mocked event-detail responses. The
repository's real E2E seed does not yet contain an `Annual Tech Summit` fixture,
and `tests/seed/global-setup.ts` remains scaffold-only unless an operator
provides a disposable database configuration.

The real coordinator venue-booking flow that changes an event from `Approved` to
`Planning` is an E06-S03 dependency and is not implemented in this repository's
API yet. To close that integration gap:

1. Add the Annual Tech Summit event, coordinator assignment, and status-change
   audit rows to the disposable E2E seed.
2. Implement or connect the E06-S03 first venue-booking request endpoint.
3. Assert that the first request changes `Approved` to `Planning` and writes a
   matching `audit_logs` row.
4. Run the E03-S05 scenario against the real seeded database, never a shared
   team database.

Until those dependencies land, SCRUM-35 is ready for review with its UI/API
contract validated, but should not be marked fully Done on the basis of a live
coordinator booking transition.
