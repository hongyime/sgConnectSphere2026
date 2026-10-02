---
date: 2026-10-02T16:18:41+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: regression
test_case_version: 011026
commit: 1780b3c
---

Final E06-S01 / SCRUM-45 browser rerun after correcting loading-label ellipses
and making the mocked minimum-capacity filter lower than expected attendance,
so the fixture's stated capacity shortfall remains consistent. This supplements,
and does not edit, 20261002-161552-jininggg-full-regression.md. HEAD is the base;
the tests include uncommitted changes on fix/SCRUM-45-venue-search-design.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S01_01 | Combined filters and suitable-result presentation | PASS | `npx playwright test tests/e2e/venue-search.spec.ts --workers=1`: 8 passed, desktop/mobile, mocked API; exact query parameters preserved. |
| TC_E06S01_02 | Near-match failures remain visible | PASS | Same command; explicit unsuitable label and mismatch list. |
| TC_E06S01_03 | Layout capacity and undersized venue | PASS | Same command; capacity and supported layouts retained. |
| TC_E06S01_04 | Unavailable venue is not suitable | PASS | Same command; explicit unavailable result. |
| MULTIPLE | Safe access denial, field errors, empty state and responsive presentation | PASS | Same command; associated validation messages, one main heading and 320px no-overflow assertions. |

Final screenshots are local ignored artifacts under test-results, produced by
the combined-filter case on desktop and mobile. No production API or data writes.
