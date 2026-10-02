---
date: 2026-10-02T23:03:40+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "021026"
commit: 28f5572
---

Sprint 2 evidence for E05-S04 (venue maintenance blocks).
`npx playwright test tests/e2e/e05.spec.ts --grep E05S04` on Windows, desktop
and mobile projects; 8/8 passed. These cases fake `/api/venues` with
`page.route`, so they check the screen, not the database.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S04_01 | Verify that blocking a venue for a period with no bookings should make it unavailable for those dates | PASS | Venue with "No current or upcoming blocks"; a block for 05/01/2027–10/01/2027 with reason "Annual fire safety inspection" was saved and "Block saved" was shown. |
| TC_E05S04_02 | Verify that attempting to block a venue over a period with a confirmed booking should warn of the conflict before the block takes effect | PASS | Blocking 14/01/2027–16/01/2027 over a confirmed booking showed an error alert naming the booking "Charity Run". |
| TC_E05S04_03 | Verify that creating a block over an upcoming event's dates should notify the affected Coordinators | PASS | Blocking 20/01/2027–25/01/2027 for "Renovation" showed "2 Coordinators were notified". |
| TC_E05S04_04 | Verify that removing or shortening an existing block should restore the venue's availability for the released period | PASS | The "Annual fire safety inspection" block was shortened to end 07/01/2027 and "Block shortened" was shown. |
