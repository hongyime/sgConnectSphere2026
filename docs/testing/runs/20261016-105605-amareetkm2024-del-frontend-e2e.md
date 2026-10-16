---
date: 2026-10-16T10:56:05+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 141026
database: real
commit: 62916a9
---

Sprint 3 re-run of the E07-S06 manual check (story SCRUM-56) with screenshots,
as T-93 requires for Sprint 3 Done stories before the Sprint 3 Review. The
story stays Done (T-74); this is a new record, and the earlier record is
unchanged.

Amareet ran `docs/testing/manual/E07-S06-click-through.md` by hand in a real
browser, using a normal window (`coord_a`) and a private window (`tech_a`,
`tech_b`, then `coord_b`), signing in through the login page, and took every
screenshot below herself. The stack was:

- the frontend (Vite, 127.0.0.1:5173)
- the local API (`backend/src/dev.ts`, 3001), restarted on this commit
- a freshly reset and seeded local PostgreSQL 17 database in Docker
  (`connectsphere_dev_stack`, migrations 0001 to 0019, including 0017 from
  #282), never the shared database

The code under test is `main` at `62916a9`. Claude set up the stack, checked
each screenshot as it arrived and checked the database afterwards; the
database facts below come from that check. Every step matched the script.

Database check after the run (times Singapore):

- 10:56:05 — EVT-3001 marked as needing no technical support
  (`support_required = false`, no description); no notification was created.
- 11:00:58 — EVT-3003 request "1 AV technician for the full event",
  25 Oct 2026, 6:00 pm – 10:00 pm, `support_required = true`, `open`.
- 11:00 — one "Technical support requested" notice each for tech_a and tech_b:
  "EVT-3003 needs technical support: 1 AV technician for the full event". Both
  were marked read after steps 11 and 12, tech_a's first, which shows each
  account opened its own notice.
- The blank, too-long and reversed-time attempts (steps 7–9) created no rows;
  only the two rows above exist.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S06_03 | Marking an event as needing no technical support creates no request and doesn't block confirmation | PASS | Steps 1–4 on EVT-3001: the card read "No technical support has been requested for this event yet." with Request technical support and No technical support required. Clicking it showed "Marked as needing no technical support. Nobody has been notified." and "This event needs no technical support. Nothing is waiting to be staffed.", and the button disappeared. After F5 the green message was gone, the line stayed, No technical support required stayed hidden and Request technical support was still offered. Database: declaration row with `support_required = false`, no notification. The "doesn't block confirmation" part depends on E08-S03 (not built) and is not tested here. |
| TC_E07S06_02 | Submitting a support request before the venue is confirmed is accepted | PASS | Steps 5–6 and 10 on EVT-3003 (venue booking still pending): the card read "No technical support has been requested for this event yet." (the step 5 screenshot does not show the event name; step 6's shows EVT-3003). The form showed EVT-3003, "Request technical support", "For EVT-3003 Planning Phase Gala. Every active Technical Support Staff member is notified when you send this. You don't need a confirmed venue first." and 25/10/2026 06:00 pm – 10:00 pm. The request was accepted (step 10). |
| TC_E07S06_01 | Submitting a support request describing the support and times notifies Technical Support Staff and records it against the event | PASS | Steps 10–12: "Technical support requested" / "2 Technical Support Staff members have been notified."; the card listed "1 AV technician for the full event", "25 Oct 2026, 6:00 pm – 10:00 pm", Awaiting a technician. tech_a's bell showed 1 unread ("Your notifications (1 unread)"), and the notice read "EVT-3003 needs technical support: 1 AV technician for the full event"; tech_b saw the same. Database: request recorded against EVT-3003; one notice each for tech_a and tech_b. |
| MULTIPLE | Form rejects a blank, too-long or reversed request | PASS | Step 7: "Check the highlighted fields and try again." and "Describe the technical support the event needs." Step 8 (2001 characters): "The description must be 2000 characters or fewer." Step 9 (ends 25/10/2026 06:00 pm, same as start): "Support must end after it starts." Database: none of these created a request. |
| MULTIPLE | Another Coordinator is refused; a confirmed event is read-only | PASS | Step 13 as coord_b: /coordinator/events/EVT-3003 showed EVT-3003 "Event unavailable", Access refused, "Access denied. This event is not assigned to you." and Back to dashboard; /coordinator/events/EVT-3003/support showed "Request technical support" with the same refusal and no form. Steps 14–15 as coord_a on EVT-2001 (Confirmed): the card read "No technical support has been requested for this event yet." and "Technical support can only be arranged while an approved event is being planned." with no buttons; /support showed EVT-2001, the same sentence, Back to event, and no form. |

## Screenshots

Taken by hand by Amareet during this run (T-93), pasted into the agent chat
and saved unchanged by Claude under their TC_ID names.

- [TC_E07S06_03-1](evidence/20261016-105605-amareetkm2024-del-frontend-e2e/TC_E07S06_03-1.png): step 2, EVT-3001's empty Technical support card.
- [TC_E07S06_03-2](evidence/20261016-105605-amareetkm2024-del-frontend-e2e/TC_E07S06_03-2.png): step 3, "Marked as needing no technical support".
- [TC_E07S06_03-3](evidence/20261016-105605-amareetkm2024-del-frontend-e2e/TC_E07S06_03-3.png): step 4, after reload.
- [TC_E07S06_02-1](evidence/20261016-105605-amareetkm2024-del-frontend-e2e/TC_E07S06_02-1.png): step 5, EVT-3003's empty Technical support card.
- [TC_E07S06_02-2](evidence/20261016-105605-amareetkm2024-del-frontend-e2e/TC_E07S06_02-2.png): step 6, the request form for EVT-3003.
- [MULTIPLE-blank](evidence/20261016-105605-amareetkm2024-del-frontend-e2e/MULTIPLE-blank.png): step 7, a blank description refused.
- [MULTIPLE-too-long](evidence/20261016-105605-amareetkm2024-del-frontend-e2e/MULTIPLE-too-long.png): step 8, a 2001-character description refused.
- [MULTIPLE-reversed-times](evidence/20261016-105605-amareetkm2024-del-frontend-e2e/MULTIPLE-reversed-times.png): step 9, end not after start refused.
- [TC_E07S06_01-1](evidence/20261016-105605-amareetkm2024-del-frontend-e2e/TC_E07S06_01-1.png): step 10, "Technical support requested" and the listed request.
- [TC_E07S06_01-2](evidence/20261016-105605-amareetkm2024-del-frontend-e2e/TC_E07S06_01-2.png): step 11, tech_a's bell with 1 unread.
- [TC_E07S06_01-3](evidence/20261016-105605-amareetkm2024-del-frontend-e2e/TC_E07S06_01-3.png): step 11, tech_a's notice text.
- [TC_E07S06_01-4](evidence/20261016-105605-amareetkm2024-del-frontend-e2e/TC_E07S06_01-4.png): step 12, tech_b's notifications with 1 unread.
- [TC_E07S06_01-5](evidence/20261016-105605-amareetkm2024-del-frontend-e2e/TC_E07S06_01-5.png): step 12, tech_b's notice text.
- [MULTIPLE-other-coordinator-1](evidence/20261016-105605-amareetkm2024-del-frontend-e2e/MULTIPLE-other-coordinator-1.png): step 13, coord_b refused on the EVT-3003 page.
- [MULTIPLE-other-coordinator-2](evidence/20261016-105605-amareetkm2024-del-frontend-e2e/MULTIPLE-other-coordinator-2.png): step 13, coord_b refused on the EVT-3003 support form.
- [MULTIPLE-confirmed-1](evidence/20261016-105605-amareetkm2024-del-frontend-e2e/MULTIPLE-confirmed-1.png): step 14, EVT-2001's read-only Technical support card.
- [MULTIPLE-confirmed-2](evidence/20261016-105605-amareetkm2024-del-frontend-e2e/MULTIPLE-confirmed-2.png): step 15, EVT-2001's support page with no form.
