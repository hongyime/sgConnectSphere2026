# ADR-003 — Enforce booking and assignment conflicts in the database

- **Status:** Accepted
- **Related BDR:** C-01, C-16, C-37, C-46

### Context

E06-S06 Scenario 3 states that when another Venue Staff member approves a conflicting request moments earlier, the second approval must fail and the approver must be told the venue has just been taken. E07-S07 states a colleague cannot hold two overlapping assignments. A check-then-insert in application code has a race window: two concurrent approvals can both read the venue as free before either writes.

### Decision

Exclusion constraints in the database:

ALTER TABLE venue_bookings ADD CONSTRAINT no_double_booking EXCLUDE USING gist (venue_id WITH =, booking_range WITH &&) WHERE (status = 'confirmed');

ALTER TABLE tech_staff_assignments ADD CONSTRAINT no_staff_overlap EXCLUDE USING gist (staff_id WITH =, assignment_range WITH &&) WHERE (status = 'active');

### Alternatives considered

- Application-level check before insert. Rejected: this is precisely the race E06-S06 Scenario 3 describes, and no amount of care in application code closes it.
- Pessimistic locking with SELECT FOR UPDATE. Correct, but requires every code path touching bookings to take the lock in the right order. One missed path reopens the hole.
- SERIALIZABLE isolation. Correct, but raises abort rates across all transactions and pushes retry logic into every caller.

### What this buys us

- Correctness under concurrency is guaranteed by construction rather than by developer discipline.
- The race scenario needs far less test scaffolding, because the database cannot permit the bad state.

### What it costs

- Violations surface as database errors, so the application layer must catch the constraint violation and translate it into E06-S06's user-facing message. That translation must be tested.
- Partial-index exclusion constraints are unfamiliar syntax and need documenting for the team.
