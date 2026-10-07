---
date: 2026-10-02T23:03:19+08:00
runner: lexinphun2024-debug
scope: frontend/vitest
environment: local
run_type: manual
test_case_version: "021026"
commit: 28f5572
---

Sprint 2 evidence for E05-S04 (venue maintenance blocks), the blocks screen.
`npx vitest run src/features/venue/VenueBlockout` in `frontend/` on Windows;
7/7 passed. The screen tests fake the blocks API with `stubApi`, so they check
the screen, not the database.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S04_01 | Verify that blocking a venue for a period with no bookings should make it unavailable for those dates | PASS | The picked venue's current and upcoming blocks are listed, and a new block is created and shown. |
| TC_E05S04_02 | Verify that attempting to block a venue over a period with a confirmed booking should warn of the conflict before the block takes effect | PASS | On a 409 `booking_conflict` the server's message is shown and the conflicting booking is named. |
| TC_E05S04_03 | Verify that creating a block over an upcoming event's dates should notify the affected Coordinators | PASS | The success message states how many Coordinators were notified. |
| TC_E05S04_04 | Verify that removing or shortening an existing block should restore the venue's availability for the released period | PASS | Shortening restores the released dates; lengthening is refused before anything is sent. |
| MULTIPLE | Other maintenance blocks screen tests | PASS | 3/3: removing a block goes through the confirm step and reloads the list; loading state shows while blocks load; an empty form is refused before any request is sent. |
