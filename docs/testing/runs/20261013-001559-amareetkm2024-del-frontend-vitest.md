---
date: 2026-10-13T00:15:59+08:00
runner: amareetkm2024-del
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: 091026
database: mocked
commit: 74850af
---

E06-S05 hold screens (SCRUM-143) on `74850af`, Windows, stubbed API shaped
like `holdsHandler.ts`. Run by Claude for Amareet.

1. `npx vitest run --no-file-parallelism` in `frontend/`: 41 files, 376/376
   passed.
2. `npx vitest run src/features/coordinator/VenueHolds.test.tsx
   src/features/venue/TentativeHolds.test.tsx --coverage` scoped to
   `VenueHolds.tsx`, `TentativeHolds.tsx` and `holdsApi.ts`: 20/20 passed;
   100% statements (161/161), branches (149/149), functions (49/49), lines
   (125/125).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S05_03 | Hold form starts from the event period with the 48-hour default and returns to the event | PASS | Request body `{action: 'hold', event_id, venue_id, starts_at, ends_at}`; "Venue held" flash |
| TC_E06S05_01 | A clash is refused with the server sentence | PASS | "This venue can't be held" plus the sentence naming the hold in the way |
| TC_E06S05_04 | Submit booking request converts the hold and reloads | PASS | `{action: 'convert_hold', booking_id}` |
| TC_E06S05_07 | Venue Staff move an expiry later; earlier or over 14 days refused before sending | PASS | `{action: 'extend_hold', booking_id, expires_at}` |
| MULTIPLE | Release confirm, refusals, field errors, empty and error states, search link | PASS | 20 tests in the two new files plus the search-link test |
| MULTIPLE | Full frontend Vitest suite | PASS | 376/376 |
