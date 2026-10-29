# SCRUM-237 E10-S02 — Coordinator preview screen and manual acceptance

Frontend increment (PR B, subtasks SCRUM-237 and SCRUM-238) of E10-S02 (story
SCRUM-71, owner Le Xin): before the Coordinator's Event edit is saved, show the
Session venue bookings and equipment reservations it affects and any
over-subscription, using the backend merged in #376 (`PATCH
/api/events?edit=1&id=…&preview=1`). Then run TC_E10S02 by hand and gather the
evidence for the Product Owner's acceptance of SCRUM-71.

## Plan

1. Record the agreed Scenario 1 behaviour from #376's review in
   `docs/contracts/change-requests.md` (done, this branch's first commit).
2. Coordinator preview and confirmation step in `EventEditForm` (Coordinator
   only), success message naming flagged arrangements, "Needs reconfirmation"
   marker for Venue Staff where missing; Vitest at 100% of changed lines.
3. Playwright TC_E10S02_02/03/04/06 live; regenerate `tc-coverage.md`.
4. Click-through guide and preconditions SQL, automated real local run, Le
   Xin's manual T-93 run with screenshots, T-65 records.
5. PR, postplan, Jira; AC-to-evidence checklist for the Product Owner.

## Done so far

- #376 merged on 29 October (eab9f89), approved by Bl0oper; SCRUM-236 moved to
  Done by hand on 30 October (no `Closes` clause, as the reviewer noted).
- Scenario 1 agreed by the team (Bl0oper, Ji Ning): a booking whose own
  headcount is already above capacity is flagged when its Session's attendance
  changes. Recorded in the contract.

## Open items

- Flagged venue bookings have no "reconfirmed" action: nothing clears
  `venue_bookings.requires_reconfirmation`, and readiness treats a flagged
  booking as needing review, so the Event cannot reach Safety Review. E05-S01's
  capacity flag has the same gap. Not in E10-S02's ACs; story owner to decide
  how to raise it.
- Multi-Session Event: an Event-level attendance edit does not reach Sessions
  (0014 syncs a sole Session only), so Scenario 1 fires there only through a
  Session edit (E04-S02). Reviewer note on #376.
- Database-only evidence until other stories land: two-Session parts of
  TC_E10S02_01/_05/_07 (E04-S02) and TC_E10S02_04 (E10-S01 apply path).

## Next step

Task 5: the Coordinator preview screen in `frontend/src/features/events/EventEditForm.tsx`
and `CoordinatorWorkspace.tsx`.
