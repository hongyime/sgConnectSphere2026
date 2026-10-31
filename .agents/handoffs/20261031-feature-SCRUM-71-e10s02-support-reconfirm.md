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

The branch started from #392's branch (`feature/SCRUM-242-e08s04-reconfirm-safety-review`)
because it reuses `enterSafetyReviewIfReady`. #392 merged (squash, 44d08267) and
`main` was merged in on 31 October with #390 (6ae0c4b2): `main`'s
`autoSafetyReview.ts` (Ji Ning's legacy-Confirmed fix) taken whole; the support
lines in `ArrangementReview.tsx` and `ChangeRequests.tsx` now use #390's shared
`arrangementReasons` labels.

## Plan

1. Branch, Jira subtask SCRUM-244, T-103 in `docs/bdr/`, E10-S02 Scenarios 5
   and 6 and checklist in both backlog views, re-estimate 5 to 8, backlog
   workbook, this handoff. Done (this commit).
2. Test cases for the new criteria; test-case workbook; tc-coverage. Done:
   TC_E10S02_05/_06/_08 extended with support, TC_E10S02_10 to _13 added.
3. Migration 0026: a reconfirmation flag on `tech_support_requests`. Done on
   its own branch `chore/e10-s02-support-reconfirmation-schema` (merged in here).
4. Backend: a date change flags staffed support requests (Session change: those
   overlapping the Session's previous time; Event-wide change: all), shows them
   in the change preview, notifies Technical Support Staff; readiness counts a
   flagged request as outstanding. Done: `impact.supports`, audit entity
   `tech_support_request`, readiness blocker `support-needs-review`.
5. Backend: Technical Support Staff reconfirm a flagged request: the request and
   its staff assignments move to the new time, refused if an assigned technician
   is busy then; flag cleared, audited, Coordinator told,
   `enterSafetyReviewIfReady` run. Done: `supportReconfirmation.ts`,
   `GET ?task=staffing&reconfirm=list`, `POST ?task=staffing {action:'reconfirm'}`.
6. Frontend: support in the "Check what this change affects" box; a "Support to
   reconfirm" section for Technical Support Staff. Done: `ArrangementReview.tsx`
   ("Technical Support to reconfirm", current time → new time),
   `SupportReconfirmation.tsx` above the queue on `/support/technicians`
   (reloads the queue after a reconfirmation), Activity log shows
   `support_range` in Singapore time as "Support reconfirmed".
7. Tests (unit, database, Playwright) with deliberate breaks; contracts and docs.
   Done: Playwright TC_03/_06 support, _10 to _13 (e10.spec.ts, faked replies);
   TC_05/_06 headers; TC_10 reworded; workbook 311026 + undated copy;
   api-changes-week7 and change-requests contract. Two gaps fixed: the
   Coordinator's saved message and the E10-S01 change-request preview
   (Ji Ning's `ChangeRequests.tsx`) now count support.
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
- A reconfirmed support request moves by the same amount the Event start moved,
  keeping its length (Le Xin chose option A on 31 October: custom windows such
  as early setup survive; Technical Support Staff can still edit assignments).
  Refined in Task 5 (Le Xin, 31 October): a Session change moves it as far as
  the overlapping Session's start moved (the earliest, if several), since the
  Event start may not move at all.
- The new time is worked out when the date changes and kept in
  `reconfirm_range`, added to migration 0026 before its PR (Le Xin chose a
  column over the audit log). Moved again while flagged, it moves on from the
  kept time.
- Reconfirming: any Technical Support Staff member, as for assigning. Audit row
  `Support Reconfirmed`, field `support_range`, values "start to end" in UTC
  ISO (Task 6 shows them in Singapore time). Other moved colleagues get
  "Technical support assignment moved"; the actor gets no notice (T-64).
- TC_E10S02_05 carried a leftover second block from the 17 September migration
  (an Event-wide date change, typed Negative) that filled its exported row; it
  is removed, so the row now shows the Session case.

- Notice audience (Task 4): with equipment flagged, every assigned technician
  on the Event is told, as before; with only support flagged, only the
  technicians assigned to a flagged request. The reconfirmation notice now names
  Technical Support requests, so three existing test checks and the E10-S02
  click-through guide quote the new wording.

## Found on the way

- `tests/e2e/e10.spec.ts` headers for TC_E10S02_05 and _06 quoted the old
  leftover wording; updated in Task 7.
- tc-coverage marks TC_E10S02_05, _06 and _08 active; their support checks are
  in `arrangementImpact.test.ts`, `eventChangePreview.test.ts` and
  `supportReconfirmation.integration.test.ts` (Tasks 4 and 5).
- The staffing Playwright fakes (`technicalSupport.spec.ts`, `support.spec.ts`)
  answered every `?task=staffing` GET with the queue, which the new list would
  have read; they now answer `reconfirm=list` with none, and the client treats
  a list without `reconfirmFor` as a failed load.
- TC_E10S02_10 says the unflagged request's technician "is not notified". They
  get no reconfirmation notice, but an Event date change still sends every
  Event participant, technicians included, the existing generic date notice.
  Le Xin agreed: reword to "is not asked to reconfirm" in Task 7.

## Next step

Task 8: click-through guide (extend `docs/testing/manual/E10-S02-click-through.md`),
preconditions SQL and an automated real local run (migration 0026 applied).
