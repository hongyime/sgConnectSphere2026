# ADR-005 — Denormalise event_id, guarded by a composite foreign key — RETIRED

- **Status:** RETIRED — superseded in version 3 by C-62 and T-48
- **Related BDR:** T-21, C-62, T-48

### Context

Following ADR-004, bookings, reservations and registrations belong to a session. But the most frequent queries are event-scoped: listing everything for an event, and the authorisation check that runs on every Organiser request.

### Decision

Session-scoped tables carry both session_id and event_id. SESSIONS gains UNIQUE (id, event_id), and the dependent tables reference that pair as a composite foreign key.

### Alternatives considered

- Strict normalisation, session_id only. Rejected: every event-scoped query needs an extra join, including the authorisation check on the hot path.
- Denormalise without the composite key. Rejected: nothing would prevent a booking pointing at session X and event Y where X does not belong to Y. That is silent data corruption, and it would surface as a confusing authorisation bug long after the write.

### What this buys us

- Event-scoped authorisation and listing queries avoid a join.
- The database makes an inconsistent pair impossible to insert.

### What it costs

- Slightly wider rows and one extra unique index.
- Developers must populate both columns.

RETIRED in version 3, as a direct consequence of ADR-004 being retired. With no SESSIONS table there is nothing to denormalise: bookings, reservations, technical support requests and registrations attach to the event directly, and the UNIQUE (id, event_id) constraint on SESSIONS disappears with it. The composite-foreign-key technique remains a good answer to “why did you denormalise?” should the team denormalise anything else.
