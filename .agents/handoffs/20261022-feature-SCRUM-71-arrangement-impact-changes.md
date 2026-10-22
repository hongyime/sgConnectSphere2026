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
- Task 3: `backend/src/modules/changeManagement/eventChange.ts`.
  `previewEventChange` locks the Event, runs the real `updateEventInformation`
  inside `SAVEPOINT event_change_preview`, reads the after-snapshot and the
  registration counts, then rolls back to the savepoint, so validation,
  permissions and the 0014 Session sync trigger all apply and nothing is
  saved. `assessOverSubscription` + `loadRegistrationCounts` give the
  Scenario 4 warning. Route: `PATCH /api/events?edit=1&id=<id>&preview=1`
  (same errors as the save, including the change-request offer).
- `backend/tests/eventChangePreview.test.ts`: 9 unit cases with a scripted
  client double (TC_02/_03/_04 data, savepoint order, refusals).
- Task 4: `applyArrangementImpact` sets `requires_reconfirmation = true` on the
  affected bookings and reservations and writes one `audit_logs` row each
  (`entity_type` venue_booking / equipment_reservation, action
  `Reconfirmation required: <reason(s)>`, `field_changed`
  `requires_reconfirmation`, `new_value` `true`).
  `updateEventInformationWithNotifications` now loads the arrangements before
  and after the edit under its existing row lock, applies the impact, and
  returns `{ ...result, impact, overSubscription }`. The existing date-change
  notice is unchanged. 5 more unit cases (now 14 in the file).

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
- Over-subscription (T-85, C-78): a Session's capacity is the sum of its
  Confirmed bookings' capacities; the Event's combined capacity is the sum of
  all Confirmed bookings. Only `registered` places count (Pending holds no
  seat). Equal to capacity is not over. With no Confirmed booking there is no
  capacity, so nothing is compared. E09-S02 (SCRUM-64, unbuilt) should reuse
  this rule rather than define its own.
- Every affected arrangement is logged on every edit that affects it, even if
  it was already flagged: each edit is a separate reason staff should see.
- Activity log display: main's Event Activity log reads only
  `entity_type = 'event'`, so these booking/reservation entries show once
  #298 widens that query (as for #299's entries).
- An Event edit alone rarely changes capacity (capacity comes from bookings),
  so the warning matters most when E10-S01 applies a venue change; the same
  function serves both.

## Open questions for the team

1. Two-Session cases (TC_01, _05, _07, _08, _09) cannot be set up in the app
   until E04-S02 (SCRUM-39) and E07-S08 (SCRUM-181) exist. Proposal: prove
   them with real-database tests now; hand-test them once those land.
2. ~~TC_04 combined capacity~~ answered by C-78 ("total attendee capacity is
   determined by the total layout capacity") and T-85; see decisions above.

## Next step

Task 5: notify staff. A date/time edit already sends the generic
`arrangements` notice to everyone, including Venue Staff and Technical
Support Staff (`eventNotifications/service.ts` `groupsFor`). Still missing:
a capacity-only flag notifies nobody, and the notice does not say
reconfirmation is required. Add a `reconfirmation_required` change kind
scoped to the affected venues (venueStaff) and, when reservations are
affected, technicalStaff.

## Commands run

- `npx c8 --include src/modules/changeManagement/arrangementImpact.ts tsx --test tests/arrangementImpact.test.ts`
  (from `backend/`): 15/15 passed, 100% statements/branches/functions/lines.
- `npm run typecheck` (backend): passed.
- Task 3: `npx c8 ... tsx --test tests/eventChangePreview.test.ts tests/arrangementImpact.test.ts`
  (from `backend/`): 24/24 passed, 100% on both files.
  `tsx --test tests/eventVisibility.test.ts tests/eventNotifications.test.ts tests/decision.test.ts`: 31/31.
  `npm run test:runtime`: 17/17. `tsc --noEmit --strict ... api/events.ts`: exit 0.
- Task 4: the same c8 run over `eventChangePreview` + `arrangementImpact`
  tests: 29/29, 100% on `arrangementImpact.ts`, `eventChange.ts`,
  `informationChange.ts`. Full `npm test` (backend): 447/447.
  `api/events.ts` strict tsc: exit 0.
- No database suite has been run yet.
