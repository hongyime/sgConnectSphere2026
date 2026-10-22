# SCRUM-71 E10-S02 — distinguish minor edits from arrangement-affecting changes

Implement E10-S02 (Jira SCRUM-71, owner Le Xin): when an Event or Session edit
affects confirmed arrangements, identify the affected Session venue bookings
and equipment reservations, show them before the change takes effect, flag
them for reconfirmation, warn about over-subscription without removing anyone,
and notify the assigned Venue Staff and Technical Support Staff. Ji Ning's
E10-S01 (SCRUM-70) applies approved change requests through the same check, so
the backend lands first.

## Plan

Backend PR (this branch):

1. Impact check — compare before/after snapshots (done, see below).
2. Capacity rule — booking headcount, else Session attendance (done, in 1).
3. Preview — the same check without saving; over-subscription warning.
4. Apply on save — set `requires_reconfirmation` and write audit rows in the
   Coordinator's edit transaction (`updateEventInformationWithNotifications`).
5. Notify the assigned Venue Staff and Technical Support Staff.
6. Real-database tests for TC_E10S02_01–09; unit coverage 100%.

Frontend PR (later): confirmation screen on Save, Playwright scaffolds made
live, manual run with hand-taken screenshots (T-93) and T-65 records.

## Done so far

- `backend/src/modules/changeManagement/arrangementImpact.ts`:
  `assessArrangementImpact(before, after)` and `loadArrangementSnapshot(query, eventId)`.
- `backend/tests/arrangementImpact.test.ts`: 15 unit cases following
  TC_E10S02_01/02/05/07/08/09 data plus boundaries; added to `npm test`.

## Decisions taken without team sign-off (reviewer please check)

- Only **Confirmed** venue bookings and **reserved/partial** equipment
  reservations count as arrangements. Pending requests are still undecided.
- Capacity is the venue's supported-layout capacity for the Session's layout,
  otherwise the venue maximum, matching E06 suitability (`assessment.ts`).
- Capacity is breached only **strictly above** capacity, matching E05-S01's
  exact-capacity boundary.
- An attendance change flags a booking only when the Session attendance
  governs it (no booking headcount override, T-78/T-79). A booking whose
  attendance falls but stays above capacity is still listed.
- Any Event-wide start or end change flags every Session's arrangements
  (Scenario 5). Adding or removing a Session is E04-S02, not this check.

## Open questions for the team

1. Two-Session cases (TC_01, _05, _07, _08, _09) cannot be set up in the app
   until E04-S02 (SCRUM-39) and E07-S08 (SCRUM-181) exist. Proposal: prove
   them with real-database tests now; hand-test them once those land.
2. TC_04 "venue change reduces capacity": with several bookings, is the
   Event's capacity the sum of Confirmed bookings or the primary venue's?

## Next step

Task 3: preview. Run the edit inside a savepoint, load the after-snapshot,
assess, roll back to the savepoint, and return the impact plus the
registration count against capacity.

## Commands run

- `npx c8 --include src/modules/changeManagement/arrangementImpact.ts tsx --test tests/arrangementImpact.test.ts`
  (from `backend/`): 15/15 passed, 100% statements/branches/functions/lines.
- `npm run typecheck` (backend): passed.
- No database suite has been run yet.
