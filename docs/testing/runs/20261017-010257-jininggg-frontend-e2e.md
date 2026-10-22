---
date: 2026-10-17T01:07:53+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 161026
database: real
commit: a4b2cf9
pr: 298
---

E06-S02 / SCRUM-46 TC_E06S02_04 integration follow-up with E06-S03 submission
and E06-S04 staff presentation. Ji Ning drove the browser and saved the four
original screenshots. The agent transcribed observations and visually checked
all four saved PNGs; largest 113,636 bytes, each under 1000 KB. No automated
screenshots substitute for the human evidence. Runner uses the authenticated
GitHub identity established for Ji Ning in this session. Filename timestamp is
evidence-folder creation; frontmatter records verification completion.

Exact code tested: clean isolated checkout of PR #298 at
a4b2cf99e26e8833c130a5097267533ee6ae7890, confirmed with git rev-parse --short
HEAD and empty git status --short in that checkout. API and Vite ran on
separate local ports 3002 and 5174. This execution record is stored on the
E06-S02 documentation branch; that branch's HEAD is not the runtime tested.
No PR merge was performed to obtain this evidence.

Used the existing guarded disposable native loopback PostgreSQL manual
database and separate synthetic EVT-S02-MANUAL / Manual Suitability Room
fixture from the earlier combined-failure run. Event required Theatre,
Wheelchair access and 150 places, 15 January 2027 09:00-11:00 Singapore time;
venue Theatre capacity was 120 with no Wheelchair access. The agent added a
synthetic venue assignment to seeded Venue Staff A so the actual staff flow
could authorise this fixture. No shared Supabase, production data, migration
application or Docker operation was involved. Setup SQL is not human testing
of venue/assignment administration.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S02_04 | Unsuitable request accepted and failures shown to Venue Staff | PASS | Coordinator assessment showed Unsuitable with Capacity 120 is below the required 150 places and Missing accessibility feature: Wheelchair access (image 1). After the requested submission, success showed Pending and retained both advisory failures (image 2). Human opened the same event/venue request as Venue Staff A in a separate window: detail showed Pending, attendance 150, the same period and both saved failures (image 3). Decide on request showed both failures, advisory guidance and Approve/Reject controls (image 4). |

The human was instructed to keep the default period, enter purpose Advisory
integration test and leave headcount blank. Input values not visible in these
screenshots are not independently asserted by this record. Staff view shows
expected event attendance 150. No approval/rejection was submitted, and no
email delivery, decision result, race, historical-snapshot-after-edit or API
security test is claimed. This passes the observed acceptance flow of
unsuitable submission and staff visibility; full story Done still requires
reviewed integration of the dependency and evidence.

## Screenshots

- [TC_E06S02_04-1](evidence/20261017-010257-jininggg-frontend-e2e/TC_E06S02_04-1.png): Coordinator assessment with both failures before submission.
- [TC_E06S02_04-2](evidence/20261017-010257-jininggg-frontend-e2e/TC_E06S02_04-2.png): accepted Pending request retaining both failures.
- [TC_E06S02_04-3](evidence/20261017-010257-jininggg-frontend-e2e/TC_E06S02_04-3.png): Venue Staff request detail displays both saved advisory failures.
- [TC_E06S02_04-4](evidence/20261017-010257-jininggg-frontend-e2e/TC_E06S02_04-4.png): decision screen displays both failures and decision controls.
