---
date: 2026-11-04T01:48:00+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "021126"
database: real
commit: 607536e
---

Continuation of the human E10-S01 / SCRUM-204 run on unchanged application
commit 607536e, local API/frontend and preserved disposable native loopback
PostgreSQL. Timestamp follows the Session-name request shown at 01:48; later
reconfirmation finished at 02:02. Tester jininggg supplied and saved screenshots.
No production writes, mailbox delivery, automatic screenshots or new application
test execution are claimed. Earlier immutable records remain unchanged.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S01_02 | Pending Session request survives a browser refresh | PASS | Tester submitted Morning refresh test, refreshed, and showed Pending with current Morning renamed and requested Morning refresh test retained separately. No decision was made on that request. |
| TC_E10S01_04 | Session-title-only preview and application | PASS | Coordinator preview showed zero affected venue, equipment and support arrangements. Approval became Applied with Morning renamed. Tester confirmed Event remained Confirmed with unchanged Event period 09:00-13:00. No independent check of every Session time was supplied for this particular title-only step. |
| TC_E10S01_04 | Two bookings and support reconfirmation after explicit reversion preserves earlier approval | PASS | Event-wide date preview listed two venue bookings and one staffed support request; application updated Event to 10:00-14:00 while retaining Confirmed. Tester explicitly reverted to Planning with a reason. Readiness showed three outstanding arrangements. Hall 1 reconfirmation left Hall 2 and support outstanding. Tester confirmed Hall 2 reconfirmation left only support and still Planning. Support reconfirmation moved it to 11:00-12:00 and reported automatic Safety Review re-entry. Activity log preserved the earlier 01:38 Safety check approved, explicit 01:57 reversion, both booking reconfirmations and 02:02 Planning to Safety Review. No second approval was submitted after this re-entry. |
| TC_E10S01_07 | Cancellation history records Obsolete separately from cancellation reason | PASS | Cancellation details showed Event cancelled at 3 Nov 17:17 with the supplied reason separately above Change request history: Pending to Obsolete, 3 Nov 17:17, by Manual coordinator. |

## Lifecycle distinction and limitations

The guide initially expected an affected apply on a Confirmed Event to return
to Planning automatically. Inspection corrected that expectation: the approved
T-103 condition in requests.ts applies to an Event currently in Safety Review.
The observed Confirmed result is not recorded as a bug or automatic reversion.
The explicit reversion here exercises the related E08-S04 path. It does not
replace the two-booking automatic Safety Review interruption variant, which has
earlier real-database regression evidence. The earlier human Session flow
already exercised automatic Safety Review interruption with one venue and crew.
The tester additionally supplied screenshot 04-32 of that earlier flow's
preserved Activity log: 3 November 16:52 Safety Review to Planning, venue and
support reconfirmations, 17:07 re-entry, then the 4 November 01:38 safety approval.
This is today's inspection of preserved history, not another execution of the
3 November transitions.

The prior safety approval is preserved in the Activity log; the later Event is
Safety Review rather than Confirmed, so that approval is not reused. This step
does not claim a second human safety approval, every structured field variant,
failure-injection checks, or a fresh provider/mailbox run. Detailed Completed
request audit is not displayed in the Event Activity log; database/browser
automated evidence records its Obsolete history. No whole-story Done claim.

## Screenshots

- [TC_E10S01_02-2](evidence/20261104-014800-jininggg-frontend-e2e/TC_E10S01_02-2.png): Pending comparison after refresh.
- [TC_E10S01_04-24](evidence/20261104-014800-jininggg-frontend-e2e/TC_E10S01_04-24.png): Session-title-only zero-impact preview.
- [TC_E10S01_04-25](evidence/20261104-014800-jininggg-frontend-e2e/TC_E10S01_04-25.png): Session name Applied.
- [TC_E10S01_04-26](evidence/20261104-014800-jininggg-frontend-e2e/TC_E10S01_04-26.png): Event-wide date preview flags two venues and support.
- [TC_E10S01_04-27](evidence/20261104-014800-jininggg-frontend-e2e/TC_E10S01_04-27.png): Confirmed retained immediately after date application.
- [TC_E10S01_04-28](evidence/20261104-014800-jininggg-frontend-e2e/TC_E10S01_04-28.png): explicit Planning with three outstanding arrangements.
- [TC_E10S01_04-29](evidence/20261104-014800-jininggg-frontend-e2e/TC_E10S01_04-29.png): only Hall 1 ready after first reconfirmation.
- [TC_E10S01_04-30](evidence/20261104-014800-jininggg-frontend-e2e/TC_E10S01_04-30.png): final support reconfirmation reports Safety Review.
- [TC_E10S01_04-31](evidence/20261104-014800-jininggg-frontend-e2e/TC_E10S01_04-31.png): preserved approval and later reconfirmation/re-entry history.
- [TC_E10S01_04-32](evidence/20261104-014800-jininggg-frontend-e2e/TC_E10S01_04-32.png): preserved earlier automatic Safety Review interruption, reconfirmation and fresh approval.
- [TC_E10S01_07-3](evidence/20261104-014800-jininggg-frontend-e2e/TC_E10S01_07-3.png): cancellation and separate request history.
