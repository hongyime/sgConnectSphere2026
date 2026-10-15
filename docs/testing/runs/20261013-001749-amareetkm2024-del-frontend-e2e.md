---
date: 2026-10-13T00:17:49+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: 091026
database: mocked
commit: 74850af
---

Full mocked Playwright suite (`npx playwright test --reporter=line`) on
`74850af`, desktop and Pixel 7, Windows: **226 passed, 106 skipped, 0
failed** (4.0 minutes). Includes the new `tests/e2e/venueHolds.spec.ts`
(5 tests x 2 viewports). Run by Claude for Amareet.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S05_03 | From the event, a free venue is held for the event period with the 48-hour default | PASS | Unavailable venue offers no hold link |
| TC_E06S05_01 | A clashing hold is refused, naming the hold in the way | PASS | Stays on the form |
| TC_E06S05_04 | A hold is submitted as a booking request; another is released after confirming | PASS | Also covers Scenario 4 |
| TC_E06S05_07 | Venue Staff see live holds soonest first and move an expiry later | PASS | Reached from the new "Tentative holds" nav link |
| MULTIPLE | Hold list and form fit the screen without sideways scrolling | PASS | Both viewports |
| MULTIPLE | Rest of the mocked suite | PASS | 226 passed in total, 0 failed |
