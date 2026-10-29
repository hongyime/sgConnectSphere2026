# SCRUM-71 E10-S02 — distinguish minor edits from arrangement-affecting changes

Backend increment (PR A, subtask SCRUM-236) of E10-S02 (Jira SCRUM-71, owner Le Xin):
when an Event or Session change affects confirmed arrangements, identify the
affected Session venue bookings and equipment reservations, preview them before
the change takes effect, flag them for reconfirmation, warn about
over-subscription without removing anyone, and notify the assigned Venue Staff
and Technical Support Staff. SCRUM-71 stays open: the frontend (SCRUM-237) and
the manual acceptance run (SCRUM-238) follow in PR B.

## Plan

PR A, backend (this branch):

1. Impact check, before/after snapshots (done).
2. Capacity rule: booking headcount, else Session attendance (done).
3. Preview without saving; over-subscription warning (done, now on E09-S02's
   `eventCapacity()`).
4. Flag and audit in the Coordinator's edit transaction (done).
5. Notify the flagged venues' Venue Staff and the assigned Technical Support
   Staff (done).
6. Real-database tests for TC_E10S02_01–09 (done, 15 tests).
7. Docs, push, draft PR, postplan, Jira (in progress).

PR B, frontend (new branch from main after PR A): confirmation screen before the
Coordinator's save, reconfirmation marker where missing, Vitest at 100%,
Playwright TC_02/03/04/06 live, `tc-coverage.md` regenerated, click-through guide
and preconditions SQL, real local run, Le Xin's manual T-93 run, records,
AC-to-evidence checklist for the Product Owner.

## Done so far

- Rebased onto main 901d69b on 29 October (a merge commit was blocked by the
  local `test-run-evidence` hook, which treated teammates' older records arriving
  from main as new). Conflicts in `api/events.ts` and `backend/package.json`
  kept both sides.
- `changeManagement/arrangementImpact.ts`: `assessArrangementImpact`,
  `loadArrangementSnapshot`, `governingHeadcount`.
- `changeManagement/eventChange.ts`: `previewEventChange(With)` (savepoint and
  rollback), `applyArrangementImpact` (flag plus one audit row per arrangement),
  `assessOverSubscription` / `loadOverSubscription` over E09-S02's
  `eventCapacity()` (5662a80).
- `eventNotifications/informationChange.ts`: the Coordinator's save flags,
  notifies and returns `impact` and `overSubscription`.
- `eventNotifications/service.ts`: `reconfirmation_required` notice kind.
- `api/events.ts`: `PATCH ?edit=1&id=…&preview=1`.
- `backend/tests/arrangementImpact.integration.test.ts`: 15 PostgreSQL tests,
  added to `test:db` and `application-checks.yml` (01057a7, 584ecb5).
- Docs: `docs/api-changes-week7.md` (route and response),
  `docs/contracts/change-requests.md` ("E10-S02 backend delivered").

## Decisions taken without team sign-off (reviewer please check)

- Only **Confirmed** venue bookings and **reserved/partial** equipment
  reservations count as arrangements. Pending requests are still undecided.
- Capacity is the venue's supported-layout capacity for the Session's layout,
  otherwise the venue maximum, matching E06 suitability and E09-S02.
- Capacity is breached only **strictly above** capacity (E05-S01 boundary).
- **Story-owner decision, 29 October:** when a Session's attendance changes,
  every booking in it whose governing headcount (its own, else the Session's)
  is above capacity is flagged, including a booking whose own headcount was
  already above it. This follows Scenario 1's wording (584ecb5).
- Any Event-wide start or end change flags every Session's arrangements.
- Over-subscription uses E09-S02's `eventCapacity()` (C-78, T-85, B-05): only
  Registered places count; exactly full is not over; a Session or Event with
  no Confirmed booking has capacity 0 and is not compared.
- Every affected arrangement is logged on every edit that affects it, even if
  already flagged.
- One change id for the edit, so staff get the reconfirmation notice and not the
  generic date notice as well; the Organiser and Attendees keep the generic one.

## Not covered by app actions yet (database proof only)

- Two-Session parts of TC_E10S02_01, _05 and _07: no route edits one Session
  (E04-S02, SCRUM-39, Bryan). Tests change the Session in SQL and run the same
  functions the save runs.
- TC_E10S02_04: no Coordinator edit lowers capacity. Approved E10-S01 change
  requests (which can carry a layout change) still stop at "waiting for the
  arrangement check"; wiring them to this check needs Ji Ning's agreement on
  notice ownership. The test sets the layout in SQL.
- TC_E10S02_08 and _09 can be run by hand once a second Session is created with
  preconditions SQL.

## Next step

Push, open the draft PR A, post the postplan, move SCRUM-71 to In Progress and
SCRUM-236 to In Review. Then start PR B from main once PR A merges.

## Commands run (29 October, Windows, native PostgreSQL 17 on 5432)

- Backend `npm run typecheck`: exit 0. Backend `npm test`: 605/605.
- `npx c8 … tsx --test tests/arrangementImpact.test.ts tests/eventChangePreview.test.ts tests/eventNotifications.test.ts`:
  100% statements, branches, functions and lines on `arrangementImpact.ts`,
  `eventChange.ts` and `informationChange.ts`.
- `npx tsx --test tests/arrangementImpact.integration.test.ts` on 584ecb5:
  15/15, record `docs/testing/runs/20261029-203439-lexinphun2024-debug-backend-db.md`.
- Nine deliberate code breaks (boundaries, status filters, end-only move,
  own-headcount rule) each failed both the unit and the database tests; code
  restored afterwards.
- Related database suites (decision, eventCancellation, eventNotifications,
  eventReadiness, eventReadinessRoutes, registrationPeriod, changeRequests,
  attendeeCapacity): 64/64.
- `tsc --noEmit --strict … api/events.ts`: exit 0. `python scripts/check.py`: pass.

## Learnings

- The local `test-run-evidence` pre-commit hook fails a merge commit that brings
  in teammates' older run records from main; rebasing an unpushed branch avoids it.
- Git Bash `date` on Windows prints UTC even with `TZ=Asia/Singapore`; take
  run-record times from Python's local time.
- Fixtures with only "normal" rows hid status-filter and boundary bugs from the
  database suite; deliberate code breaks found the gaps.
