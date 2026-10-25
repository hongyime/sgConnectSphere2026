---
date: 2026-10-25T13:44:18+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: "241026"
database: mocked
commit: 86666e4
---

SCRUM-152 / E05-S06 frontend at `86666e4`. `npx playwright test
--reporter=list` from the repository root (default config: Vite dev server,
desktop and mobile projects), on Windows. Every API call is answered by
`page.route` mocks shaped like the backend replies; no database. This is an
automated run, not the manual end-to-end run with hand-taken screenshots that
T-93 requires before the Sprint Review. The `date` is when the run started.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S06_01 | Marking a venue unavailable with a reason category over a period with no bookings saves and shows the period as Blocked | PASS | Desktop and mobile |
| TC_E05S06_02 | Marking a venue unavailable over a Pending request and a Confirmed booking lists both and returns the Confirmed event to Planning | PASS | Desktop and mobile |
| TC_E05S06_03 | The affected Coordinator sees the in-app notice and the venue-conflict flag on the event | PASS | Desktop and mobile. The email is checked by the backend database test, not here |
| TC_E05S06_04 | An unavailability with no end is saved as open-ended, until lifted | PASS | Desktop and mobile |
| TC_E05S06_05 | Extending flags a newly covered booking and shortening clears it | PASS | Desktop and mobile |
| TC_E05S06_06 | E05-S04's block, shorten and remove still work for a free period | PASS | Desktop and mobile |
| TC_E05S06_07 | Editing and lifting keep a history and the lifted entry; the restored Coordinator is shown as notified | PASS | Desktop and mobile |
| TC_E05S06_08 | An unexpired tentative hold is flagged, listed, and restored on lift | PASS | Desktop and mobile |
| TC_E05S04_01 | Blocking a free period through the timed form | PASS | Desktop and mobile |
| TC_E05S04_02 | Superseded by TC_E05S06_02: a save over a confirmed booking succeeds and names the event | PASS | Desktop and mobile |
| TC_E05S04_03 | A save over upcoming events lists them with their Coordinators notified | PASS | Desktop and mobile |
| TC_E05S04_04 | Shortening through Edit and removing through Lift | PASS | Desktop and mobile |
| MULTIPLE | Full Playwright suite | PASS | 368 passed, 0 failed, 312 skipped (`test.fixme` scaffolds for other stories) |
