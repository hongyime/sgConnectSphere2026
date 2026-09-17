# ADR-007 — One single-page application for all five roles

- **Status:** Accepted
- **Related BDR:** —

### Context

Five roles use the system (§3), split between external and internal users. §7 requires the system to be both desktop- and mobile-friendly. §8c requires all groups to complete their common activities without extensive training.

### Decision

A single React application with role-based navigation and views, rather than separate external and internal portals.

### Alternatives considered

- Separate external and internal applications. Rejected: it duplicates authentication, the event record display and the notification interface. An Organiser and a Coordinator look at largely the same event, differing in which fields are editable and which internal details are visible.
- Server-rendered multi-page application. Rejected: the venue availability calendar and the search-and-filter screens are interaction-heavy enough that a full page load per interaction would work against §8c.

### What this buys us

- One codebase, one component library, one build and one responsive layout to maintain.
- Shared event views reduce the risk of the Organiser's and Coordinator's views drifting apart.

### What it costs

- Role-based hiding in the interface must never be the only access control. The API authorises every request independently, which is why Access Control sits between the router and every domain component.
- Without route-level code splitting, users download code for roles they cannot use.

Open item: this record fixes the application topology, not the framework. An earlier draft of the container diagram read “Vue / React”, which reads as an undecided team. The team should record its reason for choosing React — ecosystem familiarity, component library availability, or prior experience — and the diagram must name one framework only.
