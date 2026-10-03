# ADR-003 — Enforce booking and assignment conflicts in the database

- **Status:** Accepted
- **Related BDR:** C-01, C-16, C-37, C-46, C-65, C-67, C-68, T-66, T-68, T-69

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

### Amended 3 October 2026 for the Week 7 Customer Changes

The decision stands; the range the constraint guards changes shape (C-65, T-66). A venue is occupied from the booking's start minus the venue's setup time to its end plus the venue's turnaround time, so the constraint must operate on that buffered range, not on the advertised `booking_range`. The migration adds `venues.setup_minutes` and `venues.turnaround_minutes` (both `smallint NOT NULL DEFAULT 0`) and a column on `venue_bookings`, `occupancy_range tstzrange`, that the application fills at write time from `booking_range` widened by the venue's two values (not a Postgres generated column, because it depends on another table); the constraint (shipped in migration 0001 as `venue_bookings_no_active_overlap`, already covering `pending` as well as `confirmed`) becomes `EXCLUDE USING gist (venue_id WITH =, occupancy_range WITH &&) WHERE (status IN ('pending', 'tentative', 'confirmed'))`. Adding `tentative` is new: E06-S05 Scenario 5 says a hold occupies the buffered window, so a hold and a confirmed booking on the same venue must not overlap either. `expired` and `conflicting` rows are excluded from the predicate on purpose, which is what lets E05-S05 Scenario 4 and E05-S06 Scenario 2 keep a Conflicting booking in the table without the database rejecting it.

Because the venue's buffer values are copied into the booking row at write time, changing a venue's buffers later does not move existing `occupancy_range` values and so never trips the constraint retroactively; the application detects the newly overlapping pairs on save and marks them Conflicting (E05-S05 Scenario 4). That is the deliberate split: the constraint guarantees no two live bookings are *written* overlapping, the application reports overlaps that *arise* from a configuration change.

Several bookings per event (C-67, T-68) need no change here: the constraint keys on `venue_id`, never on `event_id`, so two venues for one event over the same period are two non-conflicting rows (E06-S06 Scenario 5, TC_E06S06_07).
