---
date: 2026-10-06T18:42:30+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 031026
database: real
commit: 415e8eb
pr: 226
---

SCRUM-147, the manual E2E for E07-S06 (SCRUM-56). Amareet ran the 15-step
script in `docs/testing/manual/E07-S06-click-through.md` by hand in a real
browser, using a normal window and a private window, signing in through the
login page as `coord_a`, `tech_a`, `tech_b` and `coord_b`. The stack was:

- the frontend (Vite, 127.0.0.1:5173)
- the local API (`backend/src/dev.ts`, 3001)
- a freshly reset and seeded local PostgreSQL 17 database in Docker
  (`connectsphere_dev_stack`), never the shared database

Code under test is `bfebe7f` (PR #225); `415e8eb` adds only the script.

Every step matched the script's expected screen text. The quoted messages
below are the script's expected text, which Amareet confirmed on screen.
Claude set up the stack and checked the database afterwards; the database
facts in Remarks come from that check. Run by Amareet.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S06_03 | Marking an event as needing no technical support creates no request and doesn't block confirmation | PASS | Steps 1–4 on EVT-3001 (Approved). Clicking "No technical support required" showed "Marked as needing no technical support. Nobody has been notified." and "This event needs no technical support. Nothing is waiting to be staffed." After F5 the button stayed hidden and "Request technical support" was still offered. Database: one support_required = false row, no notification. "Doesn't block confirmation" needs E08-S03 (not built); this run checks that nothing is waiting to be staffed |
| TC_E07S06_02 | Submitting a support request before the venue is confirmed is accepted | PASS | Steps 5–6 and 10 on EVT-3003 (Planning; its venue booking is still pending). The form said "You don't need a confirmed venue first." and started at 25/10/2026 6:00 pm – 10:00 pm. The request was accepted |
| TC_E07S06_01 | Submitting a support request describing the support and times notifies Technical Support Staff and records it against the event | PASS | Step 10: "Technical support requested" / "2 Technical Support Staff members have been notified."; the card listed the request, 25 Oct 2026, 6:00 pm – 10:00 pm, "Awaiting a technician". Steps 11–12: tech_a and tech_b each had 1 unread "Technical support requested" notice naming EVT-3003. Database: one open support_required = true row requested by coord_a, 18:00–22:00 SGT, and one notification each for tech_a and tech_b, both now read. The description was saved with the surrounding quotes, a line break and a full stop, because it was copied from a line that wraps in the script. The app stored exactly what was typed; the script now puts this data on one line |
| MULTIPLE | Form rejects a blank, too-long or reversed request | PASS | Steps 7–9: "Check the highlighted fields and try again." with "Describe the technical support the event needs."; 2001 characters gave "The description must be 2000 characters or fewer."; an end equal to the start gave "Support must end after it starts." Nothing was saved |
| MULTIPLE | Another Coordinator is refused; a confirmed event is read-only | PASS | Step 13: coord_b got "Access refused" / "Access denied. This event is not assigned to you." on the event page and the support page, with no form; three Access Denied rows for coord_b in audit_logs. Steps 14–15 on EVT-2001 (Confirmed): "Technical support can only be arranged while an approved event is being planned.", no buttons, and "Back to event" on the form page |

Tester feedback, not a failure: there is no "are you sure?" step before "No
technical support required". `design.md` keeps that step for actions that
can't be undone, and this one can be (a later request replaces it), so it is
left as is. A hint saying how to switch back is a possible later
improvement.
