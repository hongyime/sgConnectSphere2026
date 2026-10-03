# ADR-007 — One single-page application for all roles (five, now seven)

- **Status:** Accepted
- **Related BDR:** C-69, C-70, T-72

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

### Amended 3 October 2026 for the Week 7 Customer Changes

The Week 7 Customer Changes add two internal roles, the Event Coordinator Lead (C-69) and the Safety Officer (C-70), bringing the count to seven (T-72). The decision stands and is, if anything, stronger: both new roles look at the same event record as the Coordinator with a different set of actions enabled, which is the case this record was written for. Each gains a route group and a landing page on the shared skeleton (ADR-017, E01-S13), and the role-based navigation grows from five groups to seven. "All five roles" in the title and body is therefore read as "all roles"; the number was never the point. The code-splitting cost noted above grows with the role count and is still accepted.
