# ADR-018 — Restore Sessions as first-class Event entities

- **Status:** Accepted — team decision recorded 13 October 2026
- **Related BDR:** C-62, C-107, T-48, T-79, T-85, T-98, T-99, O-10, O-50, O-51
- **Supersedes:** the Release 1 retirement of Sessions in ADR-004 and ADR-005

### Context

Week 4 C-62 led the team to represent each programme session as a separate
Event (T-48), so ADR-004 and ADR-005 were retired. Week 9 C-107 now describes
venue bookings across separate Session periods, including repeat bookings of
one Venue, and equipment reservations for the specific Session timing and
Venue. The team selected T-79 to restore Session as a child of Event while
retaining C-62 as the historical answer that informed the earlier decision.

### Decision

An Event contains one or more Sessions. Each Session owns its period, expected
attendance, venue/layout/accessibility requirements, and equipment requirements.
The Event's expected-attendance value remains the overall planning total; it is
not a booking-suitability fallback or registration cap. Venue bookings and
equipment requests/reservations reference a Session. Store both `session_id`
and `event_id` on dependent rows and enforce their ownership with a composite
foreign key.

Event status and lifecycle, registration windows, and technical-support
requests/assignments remain Event-level. An attendee has one active registration
per Event and selects one or more Sessions in that registration. Per-Session
and combined Event capacity are enforced as recorded in T-85. T-98 closes O-50:
the Event-level waitlist remains available for combined Event capacity, with no
per-Session waitlist. T-99 closes O-51: copying an Event copies its requirements
and Session structure, clears dates/times, and omits bookings, equipment
reservations and registrations.

### Alternatives considered

- Keep the Week 4 one-Event-per-Session model from C-62/T-48. Not selected for
  Release 1 after the team adopted the later C-107 answer in T-79.
- Move registration windows and event lifecycle to each Session. Not selected;
  T-79 and T-85 keep registration and lifecycle at Event level.
- Attach only equipment to Sessions while leaving venue bookings at Event level.
  Not selected; T-79 links both venue bookings and equipment requests/reservations
  to a Session.

### Consequences

- The schema and shared API contracts need Session ownership constraints. A
  booking period and suitability fallback use the linked Session; the Event's
  overall attendance remains separate planning context; technical support
  remains Event-wide.
- Event registration stores selected Sessions in a join table. Capacity checks
  must atomically enforce each selected Session and the combined capacity
  derived from confirmed Session layouts.
- Existing Event dates and requirements need a data-preserving backfill into
  one Session per Event. Existing registrations select that Session; existing
  venue and equipment rows link to it. Keep audit history and Event-level
  lifecycle/support data intact.
- Existing references to the retired model remain historical. Do not rewrite
  C-62 or claim that the Week 4 answer was erroneous.

### Evidence and ownership

The customer evidence is C-107 in `docs/bdr/A-customer-clarifications.md`.
The team resolution is T-79; capacity details are T-85. These are accepted
requirements and a team architecture choice, respectively. The target schema,
contract, flows and migration boundary are documented in `docs/db_schema.md`,
`docs/contracts/venue-bookings.md`, `docs/api-changes-week7.md`, and
`docs/dynamic-user-flows.md`. No migration or implementation is included in
this ADR.
