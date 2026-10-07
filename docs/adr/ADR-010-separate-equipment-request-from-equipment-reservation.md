# ADR-010 — Separate equipment request from equipment reservation

- **Status:** Accepted
- **Related BDR:** C-21, C-13, C-39, T-24, T-25

### Context

E07-S02 has the Event Coordinator record what equipment an event needs. E07-S04 has Technical Support Staff reserve it, possibly only partially, notifying the Coordinator of any shortfall. Bryan (G1) confirmed technical requirements must be completed and reserved before an event can be confirmed.

### Decision

EQUIPMENT_REQUESTS and EQUIPMENT_RESERVATIONS as separate tables, with each reservation referencing the request it partially or fully fulfils.

### Alternatives considered

- One table with quantity_requested and quantity_reserved. Rejected: it conflates two acts performed by two different roles at two different times, so the row's meaning depends on who last wrote it. It also cannot represent a request fulfilled across several reservation events as stock becomes available.

### What this buys us

- E08-S03's confirmation gate reduces to comparing reserved against requested for the event.
- Partial fulfilment across multiple reservations is representable, which matches E07-S04 Scenario 2.
- The original request survives even if a reservation is later released, preserving the planning history.

### What it costs

- Two tables to keep in step. Releasing a reservation must not delete the underlying request.
