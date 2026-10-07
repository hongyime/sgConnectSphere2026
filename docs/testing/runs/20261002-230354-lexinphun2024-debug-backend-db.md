---
date: 2026-10-02T23:03:54+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: manual
test_case_version: "021026"
commit: 28f5572
---

Sprint 2 evidence for E05-S04 (venue maintenance blocks), the backend from
PR #151. `npx tsx --test tests/venueBlocks.integration.test.ts` in `backend/`
on Windows against a disposable local PostgreSQL 17 database
(`TEST_DATABASE_URL`, random schema per test, every migration applied); 5/5
passed. Real database, no faked responses.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S04_01 | Verify that blocking a venue for a period with no bookings should make it unavailable for those dates | PASS | Block 05/01/2027–10/01/2027 ("Annual fire safety inspection") saved; venue search shows the venue unavailable on 5, 7 and 10 Jan and available on 4 and 11 Jan. Activity log entry "Venue blocked" by the Venue Staff member; an overlapping second block is refused (`block_overlap`). |
| TC_E05S04_02 | Verify that attempting to block a venue over a period with a confirmed booking should warn of the conflict before the block takes effect | PASS | Refused with 409 `booking_conflict` naming the confirmed booking "Charity Run"; no block was saved. |
| TC_E05S04_03 | Verify that creating a block over an upcoming event's dates should notify the affected Coordinators | PASS | One affected event; its Coordinator received exactly one in-app notification titled "Venue blocked", with an email delivery job queued. |
| TC_E05S04_04 | Verify that removing or shortening an existing block should restore the venue's availability for the released period | PASS | Lengthening refused (400); shortening to end 07/01/2027 left 7 Jan blocked and 8 Jan available, and the calendar shows the block ending 7 Jan with 8 Jan Free. Removing the block made 5 Jan available again. Activity log: blocked, shortened, removed. |
| MULTIPLE | Block saved with hours | PASS | A block saved with hours accepts its own day back and keeps those hours. |
