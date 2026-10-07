# ADR-009 — A single audit log with a polymorphic target

- **Status:** Accepted
- **Related BDR:** T-04, C-70, T-71, T-75, T-76

### Context

E14-S02 records event status changes, denied access attempts and account deactivations. E06-S04 owns venue booking approval, rejection and release logging after T-76 (2 October 2026). §8f requires ConnectSphere to determine what was changed, who changed it and when. Only the first of those four is always tied to an event.

### Decision

One append-only AUDIT_LOGS table with entity_type, entity_id, and a nullable event_id carried denormalised for convenience.

T-75 allows Event Coordinators to read the Activity log on events they are
already permitted to view, through the existing event page. It adds no global
audit permission or Administrator role. Denial and account-deactivation entries
are inspected in a controlled test database for acceptance verification.
Administrator viewing is deferred to Release 2. T-76 changes story ownership,
not the shared append-only storage or the immutability requirement.

### Alternatives considered

- One table per log type. Rejected: §8f's single question would become a four-way UNION, and the immutability rule in E14-S02 would need enforcing in four places.
- Logging only event-related actions. Rejected: denied access attempts and account deactivations are exactly the events an audit trail exists to capture.

### What this buys us

- One query answers §8f, and one place to revoke UPDATE and DELETE.
- event_id is denormalised so E03-S05's status history needs no polymorphic join.

### What it costs

- No foreign key on entity_id, so referential integrity there is by convention. An orphaned entry is possible if a row is ever hard-deleted, which is one reason ADR-012's deactivate-don't-delete approach matters.
- Mixed payloads mean field_changed, old_value and new_value are null for action types that do not change a field.

### Amended 3 October 2026 for the Week 7 Customer Changes

The Operational Safety Check (C-70, T-71, E08-S06) adds decisions that must be auditable with their reasoning: `safety_check_submitted`, `safety_check_approved`, `safety_check_changes_requested` and `safety_check_rejected`. They are ordinary `AUDIT_LOGS` rows with `entity_type = 'event'`; the seven-factor checklist is not forced into the mixed `field_changed` / `old_value` / `new_value` columns but lives in a new `SAFETY_CHECKS` table that the audit row references by `entity_id` of the decision, keeping this table narrow and the checklist queryable. The same pattern covers the other Week 7 additions without new columns: `hold_expired`, `hold_extended`, `venue_unavailability_recorded`, `booking_marked_conflicting`, `lead_assigned`, `lead_reassigned`. Decision 0011-era immutability (migration 0010) applies to all of them unchanged.
