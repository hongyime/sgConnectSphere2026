---
date: 2026-10-03T12:46:35+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "021026"
database: real                     # mocked | real | none
commit: c6c9aab
---

E05-S03 (SCRUM-42) click-through in Chromium against the real stack: frontend
(5173), local API (3001) and a reset, seeded Docker `postgres:17` database.
Signed in as coord_a and coord_b on `/coordinator/calendar`. Run by Claude for
lexinphun2024-debug.

Seeded data used for names not in the seed: Grand Ballroom -> Orchid Hall,
coordinator_1 -> coord_a, other Coordinator -> coord_b, booked event ->
EVT-2001, pending booking -> EVT-3003, November -> October 2026.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S03_01 | Each calendar state shown and visually distinguishable | PASS | Free, Tentative, Confirmed and Blocked each have their own label, icon and colour. Blocked read on Maple Room (no seeded venue has a booking and a block) |
| TC_E05S03_02 | Period the Coordinator may not view shown as Unavailable, no details | PASS | coord_b: "Unavailable", "Booked. Event details are not shown.", no event name |
| TC_E05S03_03 | Maintenance block visually distinct from a booking | PASS | Blocked (red, striped, reason shown) vs Confirmed (blue, event name) |
| TC_E05S03_04 | Navigate months and select a date range | PASS | Next month, Previous month and custom range 05/10/2026-10/10/2026 |
| TC_E05S03_05 | Permitted period shows event name, code, date and time | PASS | EVT-2001: name, code, Tue, 6 Oct 2026, 09:00-12:00 |
