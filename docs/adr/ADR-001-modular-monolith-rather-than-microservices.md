# ADR-001 — Modular monolith rather than microservices

- **Status:** Accepted
- **Related BDR:** C-03, C-13, C-39, T-24

### Context

The hardest requirements in this system are transactional. E06-S06 must prevent a venue being committed to two events. E09-S02 must handle two Attendees claiming the final place simultaneously. E07-S04 must stop the same equipment being reserved for overlapping sessions. §8d requires that users never see contradictory information about dates, bookings, equipment or registration status.

Against that, §8e asks for three years of growth for a regional operator with roughly 500 staff, and §8g asks that new functionality and business rules can be added without rebuilding the system. The team is a group of students working across four sprints.

### Decision

A single deployable application server containing all domain components, backed by one PostgreSQL database, plus two background processes for notification delivery (see ADR-006). Component boundaries are maintained in the codebase but not across the network.

### Alternatives considered

- Microservices per bounded context (venue, equipment, registration). Rejected because conflict detection and capacity enforcement span those contexts. Registration must read the booked venue's capacity; confirmation must read the event's venue and equipment state. Splitting them means distributed transactions or sagas with compensating actions, and it makes ADR-003 impossible.
- Serverless functions. Rejected because connection pooling against a relational database and cold-start latency both work against §8a.

### What this buys us

- A single transaction boundary, which is what makes ADR-003 available.
- One deployment and one CI pipeline, appropriate to the team size and timeline.
- Component boundaries are preserved in code, so a component can be extracted into a service later if load ever justifies it.

### What it costs

- The application scales as one unit. A heavy reporting query would compete with booking traffic for the same resources.
- Module boundaries are enforced by convention and code review, not by the network. Without discipline they erode, and nothing fails loudly when they do.
- A fault in one component can bring down the whole process.

§8g is satisfied by module boundaries rather than deployment boundaries. This is the point most likely to be challenged, and the answer is that maintainability is a property of how the code is organised, not of how many processes it runs in.
