---
date: 2026-10-30T13:49:46+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: 281026
database: mocked
commit: 5fdddca
---

Command: `npx playwright test` (desktop Chrome and Pixel 7, API replies faked with
`page.route`). 420 passed, 264 skipped (`test.fixme` scaffolds), 0 failed.
E10-S02 / SCRUM-71, frontend subtask SCRUM-237. These prove the Coordinator
screen; the database behaviour is the PostgreSQL record
`20261029-204828-lexinphun2024-debug-backend-db.md`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_02 | Editing only the event description should flag nothing | PASS | Desktop and mobile: no review step, saved message, one preview then one save |
| TC_E10S02_03 | Saving a change that affects confirmed arrangements shows them before it takes effect | PASS | Desktop and mobile: Riverside Hall and Projector listed; nothing saved until confirmed |
| TC_E10S02_04 | Over-subscription warns without removing or waitlisting anyone | PASS | Desktop and mobile: "The whole event: 100 registered for 80 places", nobody removed |
| TC_E10S02_06 | Venue Staff and Technical Support Staff both named | PASS | Desktop and mobile: review step and saved message name both |
| TC_E10S02_01 | Attendance above capacity flags the booking | SKIP | test.fixme: proved against PostgreSQL and in the manual run |
| TC_E10S02_05 | Date change flags venue booking and equipment | SKIP | test.fixme: proved against PostgreSQL and in the manual run |
| TC_E10S02_07 | Booking headcount override governs | SKIP | test.fixme: proved against PostgreSQL |
| MULTIPLE | Full Playwright suite | PASS | 420 passed, 264 skipped, 0 failed; includes E03-S07's Coordinator edit test with the updated fake backend |
