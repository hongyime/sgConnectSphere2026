# ADR-008 — Client organisation as the tenancy boundary

- **Status:** Accepted
- **Related BDR:** C-40

### Context

E01-S02 requires an Event Organiser to see only events belonging to their own client organisation, and §8b states an Organiser should not normally be able to view events belonging to unrelated clients. Week 1 §4 Client Management notes that several Organisers may belong to one organisation. Ewen (G1) confirmed Event Coordinators can see all events, so the restriction applies to Organisers rather than internal staff.

### Decision

CLIENT_ORGANISATIONS is a first-class table. USERS and EVENTS both reference it. The Access Control component scopes every Organiser-facing query by client_org_id.

### Alternatives considered

- A free-text organisation name on the user record, as in the original draft. Rejected: two Organisers spelling the name differently land in two tenancies, and a name collision grants access across clients. This is a security property, not a data-tidiness one.
- Schema- or database-per-tenant multi-tenancy. Rejected as far beyond the requirement. ConnectSphere owns all the data, and internal staff need visibility across clients.

### What this buys us

- Isolation is enforced by a foreign key and a scoped query, both of which are directly testable.
- E01-S02's “a colleague from my organisation created an event” scenario works without special handling.

### What it costs

- Every Organiser-facing query must apply the scope, and a single missed one is a data leak. This is why the scoping lives in Access Control rather than being re-implemented per feature.
