---
date: 2026-10-19T23:16:30+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 171026
database: real
commit: e36a289
pr: 320
---

# E10-S04 supplied human screenshot session — partial acceptance

SCRUM-73 / E10-S04; application PR #320, prerequisite migration PR #319.
Xiang Ying drove the browser and supplied these 18 hand-taken images. The agent
reviewed/copied them; it did not drive or substitute images for this manual run.
The tested application worktree remained at `e36a289`; this evidence-only branch
is based on main, not the tested application. Isolated local PostgreSQL had
migration 0022 applied. No production deployment is evidenced here.

Session end is reconstructed from the latest original screenshot file timestamp
(2026-10-19T23:16:30+08:00); the screenshots themselves show request 22:57 and cancellation
23:02 Singapore time on 19 October 2026. It is not a new re-run on the evidence
branch. Original names, bytes and crops are preserved, including numbering gaps.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S04_01 | Cancellation releases every Session arrangement and restores availability | SKIP | Partial manual observations: 01-4 shows Cancelled with reason/date and release confirmation; 01-1/01-2 show 2 reserved and 8 free before, 01-6 shows 0 reserved and 10 free after; 01-3 has two Confirmed calendar blocks and 01-9 is Free; 01-8/01-10 show staff notices. Complete per-Session stored booking/reservation release inspection was not supplied; periods and selected venue are cropped out. Full-case acceptance is not claimed. |
| TC_E10S04_03 | Registered and waitlisted attendees notified | SKIP | Registered attendee A notification supplied as 03-1, showing Manual cancellation event changed to cancelled. Waitlisted attendee B image 03-2 was not supplied; full two-recipient manual check remains incomplete. |
| TC_E10S04_04 | Cancelled event read-only with reason and date | PASS | Coordinator A, Organiser A and registered attendee A views (04-1/04-2/04-3) show Cancelled on 19 Oct 2026, 11:02 pm, reason Insufficient sponsor funding, and read-only banners; Coordinator reassignment is disabled. PASS covers visible UI read-only state; no manual direct-API write attempt was supplied. |
| TC_E10S04_05 | Organiser cancellation becomes a Coordinator request | PASS | Organiser A sees Cancellation requested and event remains Planning (05-1); Coordinator A inbox has Cancellation requested (05-2); 05-3 shows the same event code, Planning and pending reason Insufficient sponsor funding. |
| TC_E10S04_06 | Pending change requests become Obsolete with history | PASS | 06-1 and 01-4 show Timing change, Attendance change and cancellation request Pending → Obsolete at 19 Oct 2026, 11:02 pm by Coordinator A; transitions are not labelled Rejected. No claim is made that this image inspects the separate Approved row. |
| MULTIPLE | Required cancellation reason and unassigned Coordinator refusal | PASS | Empty reason shows Cancellation reason is required; the separate Coordinator B screenshot shows Access refused / This event is not available to you. Account identities are supplied by the tester's login sequence, not visible in these crops. |

## Fixture and case substitutions

- Event code `E10-MANUAL-2e0089d2`; internal title **Cancellation acceptance**;
  public snapshot title **Manual cancellation event**. These are one fixture,
  not different events. The notification uses the title, not the event code;
  05-3 and 01-4 provide the event-code/title connection.
- Two Sessions: 10 June 2027, 09:00–11:00 and 13:00–15:00 Singapore time.
  One synthetic venue and equipment item share the event-code name; stock 10,
  two units reserved per Session before cancellation. Fixture preparation was
  agent-assisted and is separate from the human click-through observations.
- Owning Organiser A, assigned Coordinator A, unassigned Coordinator B, Venue
  Staff A and Technical Support A followed the login sequence in this session.
  Attendee A was registered; attendee B was waitlisted in this synthetic fixture.
  Canonical example event names, dates and coordinator/attendee identities were
  substituted; canonical Markdown is unchanged. The request flow used Planning
  rather than the Confirmed example, so it does not evidence a Confirmed-only run.
- Cropped notification images do not independently prove the signed-in account;
  role attribution follows Xiang Ying's manual sequence. No passwords are stored.
- Login retries caused local synthetic-account lockout/recovery during the
  session; that setup intervention is not evidence of the cancellation feature.

## Remaining acceptance evidence

1. Waitlisted attendee B notification, `TC_E10S04_03-2.png`.
2. After-cancellation equipment results with headings and selected period for
   both Sessions; 01-5 was not supplied and 01-6 lacks period context.
3. Venue calendar context naming the selected venue, plus per-Session released
   booking/reservation inspection (UI where supported, otherwise a separately
   labelled database verification record). 01-7 was not supplied.
4. Back-out, repeated cancellation and mobile checks are not evidenced here.
   Existing automated records stay separate; do not relabel them as human runs.

This is a partial evidence submission, not a story Done declaration. Independent
human review, migration deployment verification and normal merge gates remain.
No Jira status, estimate, sprint, or acceptance criteria are changed.

## Screenshots

- [TC_E10S04_01-1.png](evidence/20261019-231630-xiangyingg-frontend-e2e/TC_E10S04_01-1.png): Before cancellation: named equipment has stock 10, reserved 2, free 8; selected period cropped out.
- [TC_E10S04_01-2.png](evidence/20261019-231630-xiangyingg-frontend-e2e/TC_E10S04_01-2.png): Second before-cancellation equipment crop: stock 10, reserved 2, free 8; headings and selected period cropped out.
- [TC_E10S04_01-3.png](evidence/20261019-231630-xiangyingg-frontend-e2e/TC_E10S04_01-3.png): Before cancellation: 10 June calendar has Confirmed 09:00–11:00 and 13:00–15:00 blocks; selected venue name cropped out.
- [TC_E10S04_01-4.png](evidence/20261019-231630-xiangyingg-frontend-e2e/TC_E10S04_01-4.png): Cancellation success, event code, Cancelled, reason/date and Pending-to-Obsolete history.
- [TC_E10S04_01-6.png](evidence/20261019-231630-xiangyingg-frontend-e2e/TC_E10S04_01-6.png): After cancellation: named equipment row 10 / 0 / 0 / 10; period and headings cropped out.
- [TC_E10S04_01-8.png](evidence/20261019-231630-xiangyingg-frontend-e2e/TC_E10S04_01-8.png): Technical Support inbox per tester login sequence; cancellation notification for internal title Cancellation acceptance.
- [TC_E10S04_01-9.png](evidence/20261019-231630-xiangyingg-frontend-e2e/TC_E10S04_01-9.png): After cancellation: 10 June calendar Free 08:00–22:00; selected venue name cropped out.
- [TC_E10S04_01-10.png](evidence/20261019-231630-xiangyingg-frontend-e2e/TC_E10S04_01-10.png): Venue Staff notice per tester login sequence; title Cancellation acceptance and cancellation timestamp.
- [TC_E10S04_03-1.png](evidence/20261019-231630-xiangyingg-frontend-e2e/TC_E10S04_03-1.png): Registered attendee A notice per tester login sequence; safe public title Manual cancellation event. Does not show the waitlisted inbox.
- [TC_E10S04_04-1.png](evidence/20261019-231630-xiangyingg-frontend-e2e/TC_E10S04_04-1.png): Coordinator A view: cancellation date/reason/read-only banner; reassignment disabled.
- [TC_E10S04_04-2.png](evidence/20261019-231630-xiangyingg-frontend-e2e/TC_E10S04_04-2.png): Organiser A view: event code, Cancelled, reason/date/read-only banner.
- [TC_E10S04_04-3.png](evidence/20261019-231630-xiangyingg-frontend-e2e/TC_E10S04_04-3.png): Registered attendee A terminal view: public title, event code, cancellation reason/date and read-only banner.
- [TC_E10S04_05-1.png](evidence/20261019-231630-xiangyingg-frontend-e2e/TC_E10S04_05-1.png): Organiser request confirmation: event stays Planning and request reason is listed.
- [TC_E10S04_05-2.png](evidence/20261019-231630-xiangyingg-frontend-e2e/TC_E10S04_05-2.png): Coordinator A inbox per tester login sequence: Cancellation requested for internal title Cancellation acceptance.
- [TC_E10S04_05-3.png](evidence/20261019-231630-xiangyingg-frontend-e2e/TC_E10S04_05-3.png): Coordinator page connects event code to Planning status and pending Organiser reason.
- [TC_E10S04_06-1.png](evidence/20261019-231630-xiangyingg-frontend-e2e/TC_E10S04_06-1.png): Timing change, Attendance change and cancellation request all Pending → Obsolete, with Coordinator A and timestamp.
- [MULTIPLE-cancellation-reason-required.png](evidence/20261019-231630-xiangyingg-frontend-e2e/MULTIPLE-cancellation-reason-required.png): Supplemental empty-reason validation.
- [MULTIPLE-unassigned-coordinator-denied.png](evidence/20261019-231630-xiangyingg-frontend-e2e/MULTIPLE-unassigned-coordinator-denied.png): Supplemental unassigned Coordinator access refusal.
