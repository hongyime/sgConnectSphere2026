---
date: 2026-10-22T23:24:15+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 171026
database: real
commit: 4b37591
pr: 320
---

# E10-S04 human retake — TC01 partial, TC03 complete

SCRUM-73 / E10-S04; evidence PR #321, implementation PR #320. Xiang Ying
performed the browser steps and supplied 13 hand-taken images. Twelve original
images are copied unchanged into this new session folder, each below 1000 KB.
The agent reviewed and filed supplied captures; it did not create replacement
manual screenshots. The earlier 19 October session remains unchanged.

The tested application HEAD was derived from the running application worktree:
`4b37591`. This evidence branch is separate. Session end is reconstructed from
the latest supplied screenshot file modification time (22 October 2026,
23:24:15 Singapore); it is not the filing time. Visible cancellation timestamp
is 2026-10-22T15:12:03.623Z / 23:12 Singapore. The supplied before-state terminal
capture shows 23:00:20 Singapore. Local isolated PostgreSQL had migration 0022;
this is not production application/verification evidence.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S04_01 | Cancellation releases every Session arrangement and restores availability | SKIP | Substantial partial evidence: 01-5 shows cancellation reason/date and release confirmation; 01-11 directly shows both Morning and Afternoon venue bookings and equipment reservations Released with Session IDs and periods; 01-8/01-10 show staff notices. Fresh equipment 01-1/01-2 shows reserved 2/free 8 before and 01-6 shows reserved 0/free 10 after. However 01-7 shows the old fixture, all equipment periods are cropped and the venue selection is cropped in 01-3/01-9. Full contextual availability acceptance remains pending; stored per-Session release gap is now evidenced. |
| TC_E10S04_03 | Registered and waitlisted attendees notified | PASS | Human login sequence identifies registered attendee A (03-1, Read) and waitlisted attendee B (03-2, Unread). Both supplied inbox images show public title Manual cancellation E10-MANUAL-44ae5f72, status changed to cancelled, timestamp 2026-10-22T15:12:03.623Z / 22 October 23:12. No private planning reason is shown. Signed-in account headers are cropped; role attribution follows the tester's sequence. |

## Fixture, inspection method and limits

- Fresh event, venue and equipment code: `E10-MANUAL-44ae5f72`.
  Internal title: Cancellation acceptance E10-MANUAL-44ae5f72.
  Public snapshot title: Manual cancellation E10-MANUAL-44ae5f72.
- Two Sessions on 11 June 2027, 09:00–11:00 and 13:00–15:00 Singapore.
  Synthetic equipment stock 10, two units reserved per Session before cancellation.
  Planning is substituted for the canonical Confirmed example; no Confirmed-only
  manual run is claimed. Fixture preparation was agent-assisted before human testing.
- 01-11 is a human screenshot of read-only database inspection, not a browser
  arrangement-management screen. It establishes stored release states separately
  from the browser availability observations. Do not describe it as UI proof.
- Supplied 01-4 before-state database image is withheld from Git because its
  terminal prompt includes personal/machine-identifying information. The local
  original is unchanged; no crop, redaction or generated substitute was committed.
  A clean human retake without the prompt is required for repository inclusion.
- 01-7 is preserved unchanged and explicitly excluded from fresh-fixture proof.
  Do not silently rename its event or treat it as the afternoon after-state.
- Local synthetic attendee B lockout was cleared during setup; it remained
  waitlisted and the cancellation notice existed before successful login. This
  login assistance is not evidence of cancellation correctness by itself.
- Other case IDs were not rerun/recorded in this session. The earlier immutable
  observations and automated regression records remain separate.

## Remaining acceptance evidence

1. Retake fresh equipment availability with equipment code and selected start/end
   visible for each Session. Replace the wrong-fixture afternoon after-state in
   a later session; do not overwrite this session's original 01-7.
2. Retake the after-cancellation venue calendar including selected venue name,
   date and free periods; include before context where available.
3. Supply a clean version of the before-state database capture without terminal
   prompt/identity information if it is to be included. Do not reconstruct or
   reset cancelled test data to manufacture a new before-state.
4. Independent review, authorized production migration 0022 verification and
   #320 merge remain separate gates. TC03 evidence is ready for teammate review;
   full TC01 is not declared PASS. No Jira status/criteria/sprint/estimate changes.

## Screenshots

- [TC_E10S04_01-1.png](evidence/20261022-232415-xiangyingg-frontend-e2e/TC_E10S04_01-1.png): Named fresh equipment before cancellation: stock 10, reserved 2, free 8; selected period cropped out.
- [TC_E10S04_01-2.png](evidence/20261022-232415-xiangyingg-frontend-e2e/TC_E10S04_01-2.png): Second before-cancellation crop of the fresh equipment: reserved 2, free 8; selected period cropped out.
- [TC_E10S04_01-3.png](evidence/20261022-232415-xiangyingg-frontend-e2e/TC_E10S04_01-3.png): 11 June 2027 venue calendar: Confirmed 09:00–11:00 and 13:00–15:00 blocks name the fresh event; selected venue control cropped out.
- [TC_E10S04_01-5.png](evidence/20261022-232415-xiangyingg-frontend-e2e/TC_E10S04_01-5.png): Fresh event Cancelled, reason Insufficient sponsor funding, date/time and release/notification success message.
- [TC_E10S04_01-6.png](evidence/20261022-232415-xiangyingg-frontend-e2e/TC_E10S04_01-6.png): Fresh equipment after cancellation: reserved 0, free 10; selected period cropped out.
- [TC_E10S04_01-7.png](evidence/20261022-232415-xiangyingg-frontend-e2e/TC_E10S04_01-7.png): Excluded from fresh-fixture proof: this supplied image names the older E10-MANUAL-2e0089d2 equipment, not E10-MANUAL-44ae5f72; period also cropped.
- [TC_E10S04_01-8.png](evidence/20261022-232415-xiangyingg-frontend-e2e/TC_E10S04_01-8.png): Technical Support cancellation notice per human login sequence; fresh internal title/code and timestamp.
- [TC_E10S04_01-9.png](evidence/20261022-232415-xiangyingg-frontend-e2e/TC_E10S04_01-9.png): 11 June 2027 venue calendar Free 08:00–22:00; selected venue control cropped out.
- [TC_E10S04_01-10.png](evidence/20261022-232415-xiangyingg-frontend-e2e/TC_E10S04_01-10.png): Venue Staff cancellation notice per human login sequence; fresh internal title/code and timestamp.
- [TC_E10S04_01-11.png](evidence/20261022-232415-xiangyingg-frontend-e2e/TC_E10S04_01-11.png): Human-captured read-only database inspection: fresh event Cancelled; both named Sessions and periods have Released venue bookings and equipment reservations.
- [TC_E10S04_03-1.png](evidence/20261022-232415-xiangyingg-frontend-e2e/TC_E10S04_03-1.png): Registered attendee A cancellation notification per human login sequence.
- [TC_E10S04_03-2.png](evidence/20261022-232415-xiangyingg-frontend-e2e/TC_E10S04_03-2.png): Waitlisted attendee B cancellation notification per human login sequence.
