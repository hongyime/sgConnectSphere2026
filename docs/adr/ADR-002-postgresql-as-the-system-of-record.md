# ADR-002 — PostgreSQL as the system of record

- **Status:** Accepted
- **Related BDR:** C-27

### Context

Almost every scarce resource in this system is booked over a time interval: venues, equipment quantities, and technical staff. §8d requires consistency across related arrangements and §8f requires an audit trail of what changed, who changed it and when.

### Decision

PostgreSQL 16, using tstzrange for every time interval, with the btree_gist extension enabled.

### Alternatives considered

- MySQL. Rejected because it has no native range type and no exclusion constraints, so all overlap detection falls back to application logic.
- A document store. Rejected because overlap queries are awkward and the multi-entity consistency §8d requires would have to be built by hand.
- Separate start_time and end_time columns. Rejected because overlap predicates then need four comparisons and are easy to get wrong at the boundaries, particularly around inclusive versus exclusive endpoints.

### What this buys us

- Overlap is expressed as a single && predicate rather than a hand-written comparison.
- ADR-003 becomes available.
- jsonb is available for CHANGE_REQUESTS.requested_changes, which has no fixed shape.

### What it costs

- The team must learn range types and GiST indexing, which are unfamiliar.
- The design is tied to PostgreSQL. Porting to another engine would mean rewriting the constraints as application logic.
