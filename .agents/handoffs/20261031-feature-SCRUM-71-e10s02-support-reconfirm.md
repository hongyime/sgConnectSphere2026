# SCRUM-244 E10-S02 follow-up — flag and reconfirm Technical Support staffing on a date change

Extend E10-S02 "Distinguish minor edits from arrangement-affecting changes"
(story SCRUM-71, owner Le Xin, In Progress) with T-103: a Session or Event
date/time change also flags staffed Technical Support requests for
reconfirmation, lists them in the change preview and notifies the assigned
Technical Support Staff. A flagged request is outstanding for readiness, so a
previously Confirmed event cannot re-enter Safety Review (E08-S04 Scenario 4)
until Technical Support Staff reconfirm it at the new time. Found in the E08-S04
manual run (record `20261031-173321`): EVT-1082 moved to 12 December but its
support request kept 5 December and counted as Ready. PO Bryan answered yes on
31 October (question on #392). Subtask SCRUM-244, Sprint 4.

The branch starts from #392's branch (`feature/SCRUM-242-e08s04-reconfirm-safety-review`)
because it reuses `enterSafetyReviewIfReady`; move it onto `main` once #392 merges.

## Plan

1. Branch, Jira subtask SCRUM-244, T-103 in `docs/bdr/`, E10-S02 Scenarios 5
   and 6 and checklist in both backlog views, re-estimate 5 to 8, backlog
   workbook, this handoff. Done (this commit).
2. Test cases for the new criteria; test-case workbook; tc-coverage.
3. Migration 0026: a reconfirmation flag on `tech_support_requests`.
4. Backend: a date change flags staffed support requests (Session change: those
   overlapping the Session's previous time; Event-wide change: all), shows them
   in the change preview, notifies Technical Support Staff; readiness counts a
   flagged request as outstanding.
5. Backend: Technical Support Staff reconfirm a flagged request: the request and
   its staff assignments move to the new time, refused if an assigned technician
   is busy then; flag cleared, audited, Coordinator told,
   `enterSafetyReviewIfReady` run.
6. Frontend: support in the "Check what this change affects" box; a "Support to
   reconfirm" section for Technical Support Staff.
7. Tests (unit, database, Playwright) with deliberate breaks; contracts and docs.
8. Click-through guide, preconditions SQL, automated real local run.
9. Le Xin's manual T-65/T-93 run.
10. PR(s) within the T-101 limits; Jira.

## Decisions

- Placement: E10-S02 is In Progress, so it is updated in place (T-74), not a new
  story. Re-estimated 5 to 8 points by the story owner (T-37, T-73); the
  `docs/backlog/sprint-1-delivery.md` planning baseline keeps its original 5.
- Support requests are Event-level with their own window (T-79), not tied to the
  event's time. A Session change therefore flags only staffed requests that
  overlap the Session's previous time; an Event-wide change flags them all.
- Open for Task 5 (decide before building): the "new time" a reconfirmed request
  moves to. Proposal: shift the window by the same amount the Event start moved,
  keeping its length.

## Next step

Task 2: test cases for the updated Scenarios 5 and 6.
