# ADR-004 — Sessions as a first-class entity — RETIRED

- **Status:** RETIRED — superseded in version 3 by C-62 and T-48
- **Related BDR:** C-19, C-62, T-19, T-21, T-48

### Context

Week 1 §4 describes Multi-Session Events, where sessions may fall on the same day or across several days with different timings and operational requirements. Bryan (G1) confirmed per-session operational requirements exist, while noting that automatic session-by-session venue splitting rules have not been discussed.

### Decision

An event comprises one or more sessions. Venue bookings, equipment requests and reservations, technical support requests and attendee registrations all attach to a session. A single-session event is the common case and requires no additional structure from the user.

### Alternatives considered

- Event-level scheduling with one start and end time. Rejected: it cannot express a three-day conference whose second day needs a different room, different equipment and a different expected attendance.
- A separate sub-event entity with a parent link. Rejected: it duplicates the entire event lifecycle, and confirmation and status would then have to be reconciled between parent and children.

### What this buys us

- Per-session venue and equipment planning follows naturally, and E06-S02 can assess suitability against the event's own attendance.
- Confirmation becomes a clean rule: the event must be fully arranged (E08-S03).

### What it costs

- Every downstream query gains a join through SESSIONS, partly mitigated by ADR-005.
- Single-session events carry one row of overhead.

RETIRED in version 3. Bryan (G1), Week 4 (BDR C-62): a multi-session event must be set up as separate events, and the Organiser creates one event per session. The SESSIONS table, its composite keys and every per-session column are removed, and 29 release stories reverted to event level. Multi-session was never among the twenty core features, so the release is now better aligned with them. The reasoning above is retained because the decision was correct on the evidence available when it was taken — C-19 said per-session requirements existed and that splitting rules were undiscussed. It was superseded, not wrong.
