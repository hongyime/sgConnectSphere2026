---
date: 2026-10-03T12:46:35+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "021026"
commit: c6c9aab
---

Sprint 2 real-data evidence for E05-S03 (SCRUM-42, venue availability
calendar), following the earlier fake-API records of 2 October. A 12-step
click-through driven in a real Chromium browser against the real stack: the
frontend (`npm run dev`, 5173), the local API (`backend/src/dev.ts`, 3001) and
a freshly reset and seeded `connectsphere_dev_stack` database (Docker
`postgres:17`, migrations 0001–0010). Signed in through the login page as
coord_a and coord_b on the Coordinator calendar (`/coordinator/calendar`).
No faked responses. Screenshots at 1280px and 393px were kept locally. Run by
Claude for lexinphun2024-debug.

The test cases name data that is not in the seed. They were followed with the
nearest seeded equivalent and were not edited: "Grand Ballroom" was Orchid Hall,
coordinator_1@connectsphere.com (assigned) was coord_a, the unassigned
Coordinator was coord_b, "Annual Tech Summit" / "Spring Networking Night" was
EVT-2001 (Confirmed, 06/10/2026 09:00–12:00), the pending booking was EVT-3003
(25/10/2026 18:00–22:00), and November 2026 was October 2026. No seeded venue
has both a booking and a maintenance block, so the Blocked state was read on
Maple Room (12/10/2026, "Scheduled HVAC maintenance").

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S03_01 | Each calendar state shown and visually distinguishable | PASS | Orchid Hall, October 2026: 07/10 "Free" 08:00–22:00 "Available"; 25/10 "Tentative" 18:00–22:00 (the case's "Pending"); 06/10 "Confirmed" 09:00–12:00. Maple Room 12/10 "Blocked", All day. Each state has its own label, icon and colour, matching the legend. Blocked was on a second venue because no seeded venue has all four states |
| TC_E05S03_02 | Period the Coordinator may not view shown as Unavailable, no details | PASS | coord_b, Orchid Hall 06/10 09:00–12:00: "Unavailable", "Booked. Event details are not shown." Not clickable; "EVT-2001" appears nowhere on the calendar. 25/10 also Unavailable |
| TC_E05S03_03 | Maintenance block visually distinct from a booking | PASS | Blocked (red, wrench icon, striped, "Maintenance block · Scheduled HVAC maintenance", no event name) against Confirmed (blue, calendar icon, event name). Compared across Maple Room and Orchid Hall, not on one venue |
| TC_E05S03_04 | Navigate months and select a date range | PASS | "Next month" showed November 2026 (30 days), "Previous month" returned to October 2026 (31 days), custom range From 05/10/2026 To 10/10/2026 then "Show range" showed exactly those six days |
| TC_E05S03_05 | Permitted period shows event name, code, date and time | PASS | coord_a, clicked "EVT-2001 Confirmed Registration Event" on 06/10: Event EVT-2001 Confirmed Registration Event, Event code EVT-2001, Date Tue, 6 Oct 2026, Time 09:00–12:00 |

At 393px wide the calendar loaded without horizontal scrolling.
