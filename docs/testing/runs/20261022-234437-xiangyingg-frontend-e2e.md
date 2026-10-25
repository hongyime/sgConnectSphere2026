---
date: 2026-10-22T23:44:37+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 171026
database: real
commit: 4b37591
pr: 320
---

# E10-S04 final contextual retakes — TC01 evidence complete for review

SCRUM-73 / E10-S04; evidence PR #321, application #320. Xiang Ying supplied
four final hand-taken captures after the earlier 22 October submission. This
is a supplemental capture session for the same manual cancellation journey,
not a fresh cancellation, reset, or re-execution of the full case.

Application HEAD `4b37591` is derived from the application worktree; evidence
branch HEAD is separate. End time is reconstructed from the latest supplied
file modification timestamp, 22 October 2026 23:44:37 Singapore. The earlier
application cancellation occurred at 23:12 Singapore. Clean 01-4 captures the
retained pre-cancellation terminal output; its late capture timestamp does not
mean the cancelled event became Planning again. No data reset is evidenced.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S04_01 | Cancellation releases every Session arrangement and restores availability | PASS | Combined human evidence: clean 01-4 shows the same event Planning, both venue bookings Confirmed and both equipment reservations Reserved for Morning 09:00–11:00 and Afternoon 13:00–15:00 on 11 June 2027 Singapore. Previous session 01-5 shows cancellation success/reason/date; previous 01-11 shows all four arrangements Released with matching Session IDs/periods. New 01-6/01-7 show the correct equipment E10-MANUAL-44ae5f72 and explicit morning/afternoon periods, stock 10, reserved 0, free 10. New 01-9 includes the selected matching venue/date and Free 08:00–22:00. Previous 01-8/01-10 show technical/venue staff cancellation notices. PASS applies to these observed release, availability and staff-notice results, with database evidence distinct from browser UI. Ready for independent review, not story Done. |

## Evidence chain and scope

- Previous immutable manual session: [22 October initial retake](20261022-232415-xiangyingg-frontend-e2e.md). Its SKIP and wrong-fixture 01-7 remain unchanged as historical observations. The corrected same-filename captures live in this separate folder.
- Fresh fixture `E10-MANUAL-44ae5f72`: Morning Session
  `9943ecbd-b682-4052-b907-3f8479015583`, Afternoon Session
  `fdfbcd24-12e5-43ac-aea0-0b9476c415c4`. Both stored before/after captures
  identify the same Sessions and periods. Synthetic venue/equipment share the
  event-code name; stock 10 and two equipment units committed per Session before.
- The before and after arrangement tables are manually inspected read-only
  database output, not an arrangement-management browser screen. Original
  before-state equipment crops omit periods; the clean Session-level table
  supplies stored period context, while final after-state browser captures
  explicitly verify free quantities for each corresponding period.
- 01-4 is supplied without the identifying terminal prompt; the agent did not
  crop, redact or generate it. The withheld earlier source remains local and
  is not silently replaced in its immutable session.
- The agent assisted sign-in/navigation to the Venue Staff availability page;
  Xiang Ying inspected and took the screenshot. No agent-generated screenshot
  is included as T-93 evidence. Role attribution follows the human test sequence.
- The fixture was Planning before cancellation, substituting for the canonical
  example. No separate Confirmed-only journey, production deployment, external
  email delivery, back-out/replay/mobile retest, or new admin screen is claimed.
- TC03 remains PASS in the earlier 22 October record for registered/waitlisted
  inbox notices; it was not rerun in this supplemental session. Other case
  observations remain in their original records, not silently requalified.

## Screenshots

- [TC_E10S04_01-4.png](evidence/20261022-234437-xiangyingg-frontend-e2e/TC_E10S04_01-4.png): Clean human capture of retained pre-cancellation database output: Planning, two Confirmed venue bookings, two Reserved equipment reservations; same Session IDs and periods as the earlier after-state.
- [TC_E10S04_01-6.png](evidence/20261022-234437-xiangyingg-frontend-e2e/TC_E10S04_01-6.png): Morning after-state: explicit 11 June 2027 09:00–11:00 Singapore period, correct equipment row, reserved 0 / free 10.
- [TC_E10S04_01-7.png](evidence/20261022-234437-xiangyingg-frontend-e2e/TC_E10S04_01-7.png): Afternoon after-state: explicit 11 June 2027 13:00–15:00 Singapore period, correct equipment row, reserved 0 / free 10. Supersedes the wrong-fixture image only for current acceptance, without altering it.
- [TC_E10S04_01-9.png](evidence/20261022-234437-xiangyingg-frontend-e2e/TC_E10S04_01-9.png): Venue Staff after-calendar: selected E10-MANUAL-44ae5f72, 11 June 2027 controls and Free 08:00–22:00 result.

Supporting original captures from the earlier human session:

- [Cancellation success/reason/date](evidence/20261022-232415-xiangyingg-frontend-e2e/TC_E10S04_01-5.png).
- [Every Session booking/reservation Released](evidence/20261022-232415-xiangyingg-frontend-e2e/TC_E10S04_01-11.png).
- [Technical Support notice](evidence/20261022-232415-xiangyingg-frontend-e2e/TC_E10S04_01-8.png).
- [Venue Staff notice](evidence/20261022-232415-xiangyingg-frontend-e2e/TC_E10S04_01-10.png).

## Remaining gates

No further screenshot gap is identified for the requested TC01/TC03 follow-up.
Independent teammate review of the combined evidence, required CI, authorized
production migration 0022 verification, and implementation #320 before evidence
#321 merge remain separate. No Jira status, criteria, sprint or estimate change.
