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
- `/support/catalogue/:equipmentId`: details and retained reservation history,
  with a visible heading and shared "No reservations yet" empty state.
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
Application CI passed on implementation commit `38b4f5f` (recorded in the
CI execution session). Peer review and merge remain outstanding.
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
- [x] Application CI passes on implementation commit `38b4f5f`; recorded CI session.
- [ ] Teammate approves the frontend and backend behaviour.
- [ ] Reviewed PR merges into main and Jira is reconciled against full evidence.

## Manual validation from the user's point of view — 6 October 2026

Review record: [20261006-012313-xiangyingg-frontend-e2e.md](../testing/runs/20261006-012313-xiangyingg-frontend-e2e.md).
Observations below come from the user's local browser screenshots and reports.
They establish what was visible, not an unobserved save/refresh sequence. The
local runtime commit was not captured. Automated results are separate evidence.

| Check | Before / setup | User action | Expected after-action view | Observed manual result |
| --- | --- | --- | --- | --- |
| New equipment (TC_E07S01_01) | Technical Support account; planned new Test Microphone with Audio, Test item, 10 units, Main Storage, Working | Add equipment and save all fields | New item appears in catalogue and details with the entered values; remains after refresh | Screenshots show Test Microphone in catalogue and details, with Audio, Test item, Main Storage and Working. Quantity is already 0. Original creation values, save sequence and refresh persistence were not captured. |
| Edit quantity (TC_E07S01_04) | Existing Test Microphone; original quantity not captured | User reports reducing stock | Catalogue and detail quantity reflect the saved total; Working remains if operational status was not edited | Quantity 0 and Working are visible in both screenshots. Refresh persistence and changes to other attributes remain manually unconfirmed. |
| History clarity | Before fix, detail view has an empty Event / Period / Quantity / Status header row | Open an item with no reservations after updating to 8557f2d | Reservation history heading and No reservations yet; no misleading empty table | Before view confirmed by user screenshot. After view verified by agent desktop/mobile screenshots and eight intercepted-API tests; user confirmation after refresh pending. |
| Stock warning (TC_E07S01_02) | Test item must have an active future reservation, e.g. 6 units; initial stock 10 | Reduce total stock to 4 and save | Save result lists the affected event; history shows Needs review; assigned event Coordinator sees Equipment reservation needs review in Notifications | Not manually confirmed. The new item's empty history does not establish a reservation. Separate real PostgreSQL and authenticated browser tests passed. |
| Retirement protection (TC_E07S01_03) | Item has an active future/ongoing reservation | Retire and confirm | Retirement is refused; equipment and reservation remain visible | Not manually confirmed; covered by automated real-database/browser evidence. |
| Retirement and history (TC_E07S01_03) | Item has no active future/ongoing reservations; retain its detail URL before retirement | Retire and confirm, then reopen the detail URL | Item disappears from active catalogue; detail shows Retired and retains any historical reservation rows | Not manually confirmed; covered by automated real-database/browser evidence. |
| Field validation | Open new/edit form | Submit an empty required field or negative quantity | Save is blocked and relevant field validation is shown | Not manually confirmed; covered by automated validation tests. |

Quantity is total stock, not units remaining for a selected period. Working
is physical operational status, not stock sufficiency. Reservation flags require
existing active reservations. Reservation creation through the full application
workflow belongs to E07-S04; record preparation is needed to manually exercise
E07-S01's reservation interactions before that workflow is available.

Do not mark the pending manual rows as passed until the user performs the stated
steps and supplies the observed result. Add a new immutable execution session for
that later run rather than rewriting the existing session record.

## Screenshot-backed manual validation — 16 October 2026

SCRUM-51 / E07-S01, following T-65 and the hand-taken screenshot rules proposed in PR #279 (T-93). Screenshots were taken and supplied by Xiang Ying; the agent copied original PNGs unchanged, prepared synthetic data and documented the visible results. No agent screenshots substitute for manual evidence. Original merged records are unchanged; the story stays Done.

| Case | Actual result | Tested application | Evidence |
| --- | --- | --- | --- |
| TC_E07S01_01 | Save confirmation, full item details and Technical Support availability showing 10 free are captured. Explicit refresh/input confirmation and canonical Coordinator selection were not established in that session; full-case verdict deferred. | 7a3368e | [Partial practice record](../testing/runs/20261016-005043-xiangyingg-frontend-e2e.md), images 01-1/01-2/01-3 |
| TC_E07S01_04 | PASS: Annex Storage, quantity 10, Audio and Working visible; tester explicitly confirmed persistence after reopening/refreshing. | 7a3368e | Same practice record, TC_E07S01_04.png |
| TC_E07S01_02 | PASS: 6 reserved for 16 November 09:00–12:00; stock 10→4 flags the reservation; Coordinator receives opened review notification naming the event/item and total stock 4. | ef18a96 (current main at run) | [Current-main record](../testing/runs/20261016-011435-xiangyingg-frontend-e2e.md), images 02-1/02-2/02-3 |
| TC_E07S01_03 | PASS: retired projector retains two past one-unit reservations (10/11 October); complete availability results for 16–26 November exclude it. | ef18a96 | Same current-main record, images 03-3/03-4 |

### Setup and limits

Agent prepared synthetic future event EVT-S01-MANUAL-16OCT for seeded Coordinator A; an extra Session mistakenly inserted during setup caused an initial request refusal and was removed before the successful human request/reservation. EVT-3001 was unchanged. Agent also prepared a separate synthetic projector with two historical reservations; the human performed retirement. Database was real and remote; no reset/reseed was run.

Nine human PNGs are stored under the records' matching `docs/testing/runs/evidence/` folders, with TC_ID filenames and record links. The supplied 03-3 filename describes retired details/history; 03-4 shows availability exclusion. Each original is under 1000 KB and contains no visible secrets or real personal data. Record dates describe evidence intake; exact capture times are not independently certified.

This evidence PR does not claim a complete current-main re-run: TC_E07S01_01 remains incomplete and TC_E07S01_04 was run on the older commit. Finish those current-code checks before claiming the whole T-93 re-run complete. No new application automated tests or production deployment are claimed. Teammate review and evidence PR merge remain required.

Current-main add/edit follow-up session 20261016-014025: Final Check item creation save visible, then corrected human image shows Annex Storage and stock 10; tester reported completion after edit/reopen/refresh instructions. TC_E07S01_04 PASS on ef18a96. TC_E07S01_01 availability/details evidence remains pending. Corrected screenshot preserved separately as TC_E07S01_04-3.png to avoid overwriting the earlier different image.
