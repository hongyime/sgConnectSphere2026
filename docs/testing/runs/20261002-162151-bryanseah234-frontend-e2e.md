---
date: 2026-10-02T16:19:00+08:00
runner: bryanseah234
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 011026
commit: f39e81e
---

`npx playwright test tests/e2e/e05.spec.ts --grep E05-S04 --project=desktop`
in the repository root on Windows. Flips the four `test.fixme('TC_E05S04_...')`
scaffold cases to live tests that fake `/api/venues`, `/api/venues?blocks=1`
and `POST /api/venues` with `page.route` and sign in through
`tests/e2e/helpers/fakeSession.ts` as `venue_staff`. Mobile project not run
separately; the screen uses the shared `PageLayout` and `DataTable` which are
already covered on mobile by `AppShell.test.tsx` and `shared.test.tsx`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S04_01 | Blocking a venue for a period with no bookings makes it unavailable for those dates | PASS | `tests/e2e/e05.spec.ts` (desktop) |
| TC_E05S04_02 | Attempting to block over a confirmed booking warns of the conflict before the block takes effect | PASS | `tests/e2e/e05.spec.ts` (desktop) |
| TC_E05S04_03 | Creating a block over an upcoming event's dates notifies the affected Coordinators | PASS | `tests/e2e/e05.spec.ts` (desktop) |
| TC_E05S04_04 | Shortening an existing block restores the venue's availability for the released period | PASS | `tests/e2e/e05.spec.ts` (desktop) |
