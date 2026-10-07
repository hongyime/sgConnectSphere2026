---
date: 2026-10-06T22:34:09+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: 031026
database: real
commit: decd1ae
pr: 228
---

E07-S07 dry run on the real stack. This is a scripted Playwright run in
Chromium; the manual run is SCRUM-151. The stack was:

- the frontend (Vite, 127.0.0.1:5173)
- the local API (`backend/src/dev.ts`, with `ADDITIONAL_ALLOWED_ORIGINS`
  set)
- a freshly reset and seeded local PostgreSQL 17 database in Docker
  (`connectsphere_dev_stack`), never the shared database

The code under test is identical to `decd1ae`, which adds only the handoff
note. `date` is the time of the run's last database write, read from
`notifications.created_at`; the script finished seconds later.

Set-up: `coord_a` created support requests through the API on EVT-3001
(25 Oct, 7–11 pm SGT) and EVT-3003 (6–10 pm), which overlap. The script then
signed in through the login page as `tech_a` and `tech_b`, using the accounts
in `docs/testing/test-accounts.md`. Screenshots were kept at 1280px and
393px.

11/11 checks passed. Two earlier attempts on the same build failed on
script problems: a locator matched two elements, and the inbox was read
before it loaded. The database showed every notice delivered; the script
was fixed and the database re-seeded before this run. Run by Claude for
Amareet.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S07_01 | A colleague with no conflicting assignment is assigned | PASS | tech_a assigned Technical Support B to EVT-3001: "Technical Support B is assigned and has been notified. It's on their schedule." |
| TC_E07S07_02 | The assignment shows on the assigned staff member's schedule | PASS | tech_b: Technician staffing → My schedule lists "EVT-3001 Approved Annual Conference" under Upcoming |
| TC_E07S07_03 | Assigning a colleague with an overlapping assignment is blocked, conflicting event identified | PASS | On EVT-3003, Technical Support B showed "Busy: EVT-3001 Approved Annual Conference, 25 Oct 2026, 7:00 pm – 11:00 pm"; assigning gave "Technical Support B is already assigned to EVT-3001 Approved Annual Conference at an overlapping time." |
| TC_E07S07_04 | Removing an assignment frees the slot | PASS | Removing Technical Support B from EVT-3001: "…no longer assigned and has been notified. Their time is free again."; "Nobody is assigned yet."; the request shows "Needs a technician" |
| TC_E07S07_05 | A replacement goes through the same conflict check | PASS | Back on EVT-3003, Technical Support B now showed "Free for these times" and was assigned |
| TC_E07S07_06 | The staff member is notified when assigned and when removed | PASS | tech_b's inbox: two "Technical support assignment" notices and one "Technical support assignment removed" |
| MULTIPLE | Phone width (393px) | PASS | Queue, request page and schedule stack; scrollWidth 393, no sideways scroll |
