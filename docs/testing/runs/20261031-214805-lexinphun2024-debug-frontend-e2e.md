---
date: 2026-10-31T21:48:05+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "311026"
database: real
commit: 427117d
---

Story owner's manual acceptance run of the E10-S02 Technical Support follow-up
(T-103) to "Distinguish minor edits from arrangement-affecting changes" (story
SCRUM-71, subtask SCRUM-244). Le Xin followed sections H to J of
`docs/testing/manual/E10-S02-click-through.md` by hand in a real browser. Every
screenshot below was taken by Le Xin by hand (T-93); Claude saved each pasted
screenshot under its TC_ID.

The stack: Vite on 127.0.0.1:5173; the local API (`backend/src/dev.ts`) with
only `DATABASE_URL`; native PostgreSQL 17 `connectsphere_dev_stack` on
127.0.0.1:5432, reset (every migration, including 0026), seeded and loaded with
`E10-S02-preconditions.sql` stage `setup` before the run. Sections H to J and the
first TC_E10S02_13 refusal ran on afccd96 (application code as e2b82a8). The
first refusal named the busy technician and the clashing event but not the
overlapping time that TC_E10S02_13 expects; Le Xin chose to show it, the fix was
made in 427117d, the API restarted, and TC_E10S02_13-2 retaken on the same data
(the request was still flagged). No other code changed between the two.

The read-only `check` stage afterwards matched the screens: EVT-1026 Sound desk
unflagged at 12 Dec 06:00 with tech_a's assignment there, one "Reconfirmation
required" and one "Support Reconfirmed" row, EVT-1026 in safety_review; EVT-1027
Lighting still flagged at 6 Dec 09:00 (moving to 13 Dec 09:00), tech_a's
assignment unmoved and no "Support Reconfirmed" row after both refusals; EVT-1027
and EVT-1028 in planning.

Fixture substitutions, as the guide lists: the seed accounts `coord_a`,
`venue_a`, `tech_a` (shown as "Technical Support A") and `safety_officer` stand in
for the cases' `coordinator_1`, `venue_staff_1` and `tech_support_1`; EVT-1026
Charity Run, EVT-1027 Board Briefing and EVT-1028 Year-end Gala replace the
cases' events, and EVT-1026's earlier Confirmed status and reversion are setup
rows. The Safety Officer has no frontend menu yet (E08-S06), so their
notifications were opened at `/notifications` directly. The single-Session parts
of TC_E10S02_05 and the whole of TC_E10S02_10 are proved against PostgreSQL only
(no screen edits one Session) and are not in this run. TC_E10S02_08 is run for
its Technical Support part (one Session, one staffed request).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_03 | Verify that saving a change that affects confirmed arrangements should show which arrangements are affected before the change takes effect | PASS | Moved Charity Run to 12 Dec. Before saving, the check box listed Garden Hall, the Projector and Sound desk with its new time (5 Dec 6am–12pm → 12 Dec 6am–12pm). Event still showed 5 Dec, so nothing saved yet. |
| TC_E10S02_08 | An Event-wide date change should flag arrangements for every Session | PASS | Saved the date change. Message said 3 arrangements were flagged and both Venue Staff and Technical Support Staff were told; the support request counted too. Event now shows 12 Dec, still Planning. |
| TC_E10S02_06 | Verify that when a date or time change flags arrangements for reconfirmation, the assigned Technical Support Staff should also be notified, not just Venue Staff | PASS | tech_a got one Charity Run notice saying venue bookings, equipment or Technical Support requests need reconfirmation, so the support request is covered. |
| TC_E10S02_11 | A flagged Technical Support request should keep a reverted Event out of Safety Review | PASS | venue_a reconfirmed Garden Hall (no Safety Review line) and tech_a re-saved the Projector. Readiness still Planning with 1 outstanding item: Sound desk needs reconfirmation at the new time, still at 5 Dec. No "Back in Safety Review" notice. |
| TC_E10S02_12 | Reconfirming a flagged Technical Support request should move it and its technicians to the new time | PASS | tech_a saw Sound desk to reconfirm (5 Dec → 12 Dec 6am–12pm) and reconfirmed it. Event went into Safety Review, My schedule shows 12 Dec, Coordinator got "Technical support reconfirmed" and "Back in Safety Review", the Activity log shows "Support reconfirmed" with both times, and the Safety Officer got "Safety check needed". |
| TC_E10S02_13 | Reconfirming a Technical Support request should be refused when an assigned technician is busy at the new time | PASS | Moved Board Briefing to 13 Dec; only Lighting listed (6 Dec → 13 Dec 9am–12pm). Reconfirm refused: "Technical Support A is already assigned to EVT-1028 Year-end Gala at an overlapping time (13 Dec 2026, 10:00 am – 2:00 pm)." After Cancel it was still listed at 6 Dec. First try had no time in the message; fixed and retook. |

Timing: `date` and the filename are when the last screenshot (the retaken
`TC_E10S02_13-2`) reached the session, 21:48:05 Singapore time.

## Finding (fixed in this run)

- The busy-technician refusal did not name the overlapping time that
  TC_E10S02_13 expects. Fixed in 427117d: it now ends with the clashing
  assignment's time in Singapore time; E07-S07's assign sentence is unchanged.

## Observations (no case failed on these)

- Event-change notices end with a raw UTC time ("Changed at 2026-10-31T13:30:59.682Z"), as earlier runs record.
- My schedule shows a lone "·" after the time for the EVT-1021 to EVT-1025 requests, which have no description (E07-S07 screen).
- The Activity log shows the automatic move to Safety Review "By Technical Support A" (whose save triggered it), the projector re-save as "Equipment reservation changed: None recorded", and booking flags as "True" and "True → False".
- EVT-1021 to EVT-1025's support requests show "Needs a technician" with Technical Support A listed: the earlier E10-S02 fixture assigns tech_a but leaves them open.

## Screenshots

- [TC_E10S02_03-3](evidence/20261031-214805-lexinphun2024-debug-frontend-e2e/TC_E10S02_03-3.png): Charity Run review lists Garden Hall, Projector and Sound desk 5 Dec → 12 Dec; event still 5 Dec
- [TC_E10S02_08-3](evidence/20261031-214805-lexinphun2024-debug-frontend-e2e/TC_E10S02_08-3.png): saved, 3 arrangements flagged, Venue Staff and Technical Support Staff notified; event 12 Dec
- [TC_E10S02_06-4](evidence/20261031-214805-lexinphun2024-debug-frontend-e2e/TC_E10S02_06-4.png): tech_a's Charity Run notice naming Technical Support requests
- [TC_E10S02_11-1](evidence/20261031-214805-lexinphun2024-debug-frontend-e2e/TC_E10S02_11-1.png): venue_a reconfirmed E10 Garden Hall, no Safety Review sentence
- [TC_E10S02_11-2](evidence/20261031-214805-lexinphun2024-debug-frontend-e2e/TC_E10S02_11-2.png): tech_a re-saved E10 Projector × 2 for 12 Dec, Reserved, event Planning
- [TC_E10S02_11-3](evidence/20261031-214805-lexinphun2024-debug-frontend-e2e/TC_E10S02_11-3.png): readiness Planning, only Sound desk outstanding, venue and projector Ready
- [TC_E10S02_12-1](evidence/20261031-214805-lexinphun2024-debug-frontend-e2e/TC_E10S02_12-1.png): Support to reconfirm, staffed for 5 Dec, reconfirm for 12 Dec, Technical Support A
- [TC_E10S02_12-2](evidence/20261031-214805-lexinphun2024-debug-frontend-e2e/TC_E10S02_12-2.png): confirm panel, Sound desk moves and the assignment moves with it
- [TC_E10S02_12-3](evidence/20261031-214805-lexinphun2024-debug-frontend-e2e/TC_E10S02_12-3.png): reconfirmed, Coordinator notified, event now in Safety Review
- [TC_E10S02_12-4](evidence/20261031-214805-lexinphun2024-debug-frontend-e2e/TC_E10S02_12-4.png): My schedule, Charity Run 12 Dec 6:00 am – 12:00 pm, Safety Review
- [TC_E10S02_12-5](evidence/20261031-214805-lexinphun2024-debug-frontend-e2e/TC_E10S02_12-5.png): coord_a's "Technical support reconfirmed" and "Back in Safety Review" at 21:38
- [TC_E10S02_12-6](evidence/20261031-214805-lexinphun2024-debug-frontend-e2e/TC_E10S02_12-6.png): Activity log "Support reconfirmed" with both times; Planning → Safety Review
- [TC_E10S02_12-7](evidence/20261031-214805-lexinphun2024-debug-frontend-e2e/TC_E10S02_12-7.png): safety_officer's "Safety check needed" for Charity Run
- [TC_E10S02_13-1](evidence/20261031-214805-lexinphun2024-debug-frontend-e2e/TC_E10S02_13-1.png): Board Briefing review lists only Lighting 6 Dec → 13 Dec
- [TC_E10S02_13-2](evidence/20261031-214805-lexinphun2024-debug-frontend-e2e/TC_E10S02_13-2.png): refusal naming Technical Support A, EVT-1028 Year-end Gala and 13 Dec 10:00 am – 2:00 pm
- [TC_E10S02_13-3](evidence/20261031-214805-lexinphun2024-debug-frontend-e2e/TC_E10S02_13-3.png): after Cancel, Board Briefing still listed, staffed for 6 Dec
