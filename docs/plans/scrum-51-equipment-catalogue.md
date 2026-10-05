# E07-S01 equipment catalogue implementation

SCRUM-51 delivers the Technical Support Staff equipment catalogue for Sprint 3,
following the canonical E07-S01 backlog, its Jira description, ADR-017,
`design.md` and `docs/frontend-guide.md`.

## Behaviour and contract

- `GET /api/equipment` lists active equipment for Technical Support Staff and
  Event Coordinators. `GET /api/equipment?id=<uuid>` returns one record and
  reservation history, including retired equipment.
- `POST /api/equipment` accepts `action: create`, `update` or `retire`.
  Only active, unlocked Technical Support Staff can mutate; session identity
  and the configured same-origin allowlist are enforced. Denied roles are audited.
- Create/update fields are `name`, `category` (type), `description`,
  `total_quantity`, `home_location` and `operational_status`. Working maps to
  the existing `available` enum; Under maintenance maps to `maintenance`.
  Retirement uses its guarded action rather than a freely editable status.
- Quantity reductions compare simultaneous reserved/partial demand within
  each active reservation. Non-overlapping events are not summed together;
  past and released reservations do not cause stock warnings. Affected rows
  retain their quantities and are marked `requires_reconfirmation`.
- Each affected event's active Coordinator receives one targeted notification
  per save, with the existing transactional email outbox. Stock, flags and
  notification preparation roll back together on a notification failure.
  Live provider delivery is outside this local verification.
- Retirement is blocked by active future or ongoing reserved/partial records.
  Otherwise the record becomes inactive/retired, disappears from the catalogue,
  and keeps all reservation history. Released future records do not block it.

The endpoint rewrites to the existing venue function with `task=equipment`,
with matching local dev routing. No new serverless function, schema migration,
environment variable, provider or package dependency is needed.

Reservation writers in E07-S04 should lock the same equipment row before
checking stock and inserting a reservation, and refuse inactive equipment.
That owning story must integrate this lock protocol; this catalogue change
cannot establish concurrency guarantees for an unimplemented reservation writer.

## Frontend

- `/support/catalogue`: shared responsive DataTable, new/edit links and an
  inline ConfirmPanel for retirement.
- `/support/catalogue/new` and `/support/catalogue/:equipmentId/edit`:
  separate narrow form routes with FormSection, FormField and busy save feedback.
- `/support/catalogue/:equipmentId`: details and retained reservation history.
- The Technical Support header includes the catalogue link. Coordinator reads
  have no catalogue mutation controls; server permissions apply to direct calls.

Pages use the existing shell, PageLayout, StatusPill, Alert, loading/empty/error
states and useLoad. No feature stylesheet, token or visual system is introduced.
Desktop/mobile screenshots are generated in ignored `artifacts/` during browser
verification; browser tests also check one main heading and 320px overflow.

## Traceability

| Acceptance criterion | Implementation | Verification |
| --- | --- | --- |
| Add item with full details, available for reservation | saveEquipment creates active equipment using the existing schema | TC_E07S01_01, PostgreSQL integration and real API/browser journey |
| Quantity below reserved demand flags affected reservations and notifies Coordinators | overlapping-demand query, requires_reconfirmation, shared notification writer/outbox | TC_E07S01_02; collective demand, independent periods, released/past exclusions and forced rollback regression |
| Retire without future reservations, retain history | row lock, reservation guard, inactive flag and historical detail | TC_E07S01_03, blocked retirement and retained rows in PostgreSQL and real browser |
| Update equipment attributes | validated update and separate edit route | TC_E07S01_04, persisted location after reopening |
| Access and input boundaries | role/activity/lockout checks, origin guard, UUID and input validation | equipmentCatalogue.test.ts, equipmentHandler.test.ts and direct API refusals in real browser test |

E07-S03's period-based availability workflow and E07-S04's reservation UI remain
separate stories. These tests establish active stock and exclusion after retirement,
not completion of those dependent stories. No new business acceptance criteria
or estimates have been introduced.

## Evidence and delivery status

Final observed runs are recorded in `docs/testing/runs/` under SCRUM-51.
The component and intercepted browser suites are explicitly mock-backed; the
PostgreSQL and authenticated browser suites use disposable local schemas and
synthetic users. No application database migration or live email was performed.

Implementation is on `feature/SCRUM-51-equipment-catalogue`.
The user authorized commit, push and PR creation after local verification.
Peer review, final remote CI and merge remain outstanding.
Do not claim Jira Done before the repository Definition of Done is satisfied.


## Delivery checklist

- [x] Add equipment with name, type, description, quantity, location and status.
- [x] Update each equipment attribute with validation and save feedback.
- [x] Store new items as active equipment for downstream reservation checks.
- [x] Flag affected active reservations after stock reductions.
- [x] Prepare Coordinator notifications and email outbox entries atomically.
- [x] Block retirement while active reservations remain.
- [x] Exclude retired items from the active catalogue and retain history.
- [x] Enforce server permissions, session authentication and origin checks.
- [x] Use the frontend skeleton and separate list/detail/form routes.
- [x] Verify real PostgreSQL persistence and desktop/mobile API/browser journeys.
- [x] Record test runs and regenerate the test coverage inventory.
- [ ] Final-head remote CI passes.
- [ ] Teammate approves the frontend and backend behaviour.
- [ ] Reviewed PR merges into main and Jira is reconciled against full evidence.
