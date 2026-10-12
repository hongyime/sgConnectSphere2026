---
date: 2026-10-08T21:25:39+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 081026
database: real
commit: 1086940
---

Ji Ning manually followed [the E06-S02 script](../manual/E06-S02-click-through.md)
in a browser, supplying screenshots and confirming the refresh, fixture
restoration and mobile observations. The agent transcribed those observations;
it did not perform the human browser run. Timestamp records session completion.

Code under test: `feature/SCRUM-46-venue-suitability`, HEAD `1086940` plus
uncommitted E06-S02 implementation and documentation. The SHA alone does not
include this implementation. This is partial SCRUM-46 acceptance evidence,
not a declaration that the whole story is Done.

The tester set up the local API on port 3001, Vite on 5173, and a freshly
seeded PostgreSQL 17 Docker database `connectsphere_e06s02_manual` on local
port 55434. Used coord_a, EVT-3001, Cedar Auditorium and Orchid Hall.
Period changes were local SQL fixture setup, not tests of an event-edit flow.
No shared database reset was used. Screenshots were supplied in the testing
conversation; attach the selected images to the PR for durable review evidence.
No direct post-run database inspection was performed by the agent.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S02_01 | Recorded requirements, refresh and search overrides | PASS | EVT-3001 loaded 15 Oct 2026, 09:00–17:00, attendance 150 and Theatre. Tester confirmed Cedar refresh preserved its result. Searching for 500 showed Cedar as Near match with "Capacity 450 is below the required 500 places." Opening the assessment still showed Suitable and 150 required. Back to venue search automatically restored 150 without needing refresh. |
| TC_E06S02_03 | All recorded requirements met | PASS | Cedar showed Suitable and "This venue meets all recorded requirements." Capacity was 150 required / 450 provided; Theatre was supported; accessibility and facilities requirements were None recorded; hours were 08:00:00–22:00:00 and availability was Available. No Unmet requirements section appeared. |
| TC_E06S02_02 | Capacity failure named (partial fixture coverage) | PASS | Orchid assessment showed Unsuitable and "Capacity 120 is below the required 150 places." Search showed maximum capacity 200 and Theatre capacity 120. Advisory guidance remained visible. This verifies the layout-capacity failure only; the canonical missing-wheelchair-plus-capacity combination was not exercised. |
| TC_E06S02_05 | Fully within hours | PASS | After setting the local period to 09:00–11:00 on 15 Oct, Cedar showed Suitable and no hours failure; comparison displayed 08:00:00–22:00:00. |
| TC_E06S02_05 | Exact opening and closing boundaries | PASS | The 08:00–22:00 event showed Suitable and "This venue meets all recorded requirements." No hours failure appeared. |
| TC_E06S02_05 | Starts before opening | PASS | With the instructed 07:59:59–11:00 fixture, the screen displayed 7:59 am–11:00 am, Unsuitable and "Event is outside operating hours." Advisory text remained visible. The display omits seconds. |
| TC_E06S02_05 | Ends after closing | PASS | With the instructed 09:00–22:00:01 fixture, the screen displayed 9:00 am–10:00 pm, Unsuitable and "Event is outside operating hours." Advisory text remained visible; seconds are not displayed. |
| TC_E06S02_05 | Crosses midnight | PASS | The assessment displayed 15 Oct 2026, 9:00 pm–16 Oct 2026, 9:00 am, Unsuitable and "Event is outside operating hours." |
| TC_E06S02_05 | E06-S01 search regression | PASS | During the early-start fixture, search showed 07:59–11:00, attendance 150, Theatre and Cedar Suitable, with 1 suitable venue / 5 results. E06-S02 showed the hours failure. Search did not add an hours failure. |
| MULTIPLE | Mobile presentation and fixture restoration | PASS | Mobile screenshots showed readable assessment cards, hours failure and Back to venue search. Tester confirmed only the top navigation scrolled sideways, not the assessment page. After restoring 15 Oct 09:00–17:00, tester confirmed Cedar returned to Suitable. |
| MULTIPLE | Signed-out assessment access | PASS | A private signed-out window showed "Sign in to continue" and "Your session has ended. Sign in again to see venue suitability." No event or venue assessment details were displayed. Other forbidden roles were not exercised in this manual run. |
| TC_E06S02_04 | Unsuitable booking accepted and failures shown to Venue Staff | SKIP | E06-S03/S04 booking submission and staff decision integration remain pending. The advisory paragraph was visible, but no real booking was submitted and no staff decision screen was tested. |

Human peer review and the remaining booking integration are still required.
The missing-wheelchair combination in TC_E06S02_02 needs its own manual fixture
before claiming full manual coverage of that canonical case. This run does not
replace automated tests after code changes or establish full-story completion.
