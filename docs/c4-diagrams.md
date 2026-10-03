# ConnectSphere — Event Planning and Venue Booking System

**C4 model for the ConnectSphere release 1 modular monolith**

---

## Overview

ConnectSphere coordinates event requests, venue bookings, equipment, technical support and attendee registration on a single platform. It is built as a **modular monolith**: one Application Server container holding multiple domain and cross-cutting components, backed by a single PostgreSQL database, a Redis job queue, and two background processes for scheduling and notification delivery.

---

## People (Actors)

| Actor | Type | Description |
|---|---|---|
| **Event Organiser** | External User | External client representative who submits event requirements and tracks their organisation's events. |
| **Attendee** | External User | External participant who registers for and attends events. |
| **Event Coordinator** | Internal User | Internal staff member who owns planning for an event and acts as the main point of contact. |
| **Venue Staff** | Internal User | Internal staff responsible for the venue catalogue, availability and booking decisions. |
| **Technical Support Staff** | Internal User | Internal staff responsible for equipment availability, reservations and support-staff assignment. |
| **Event Coordinator Lead** | Internal User | Internal staff member who works the unassigned queue, assigns and reassigns Event Coordinators, and oversees every assignment and active event. Added by the Week 7 Customer Changes (C-69, T-72). |
| **Safety Officer** | Internal User | Internal staff member who conducts the Operational Safety Check between completed arrangements and confirmation, approving, rejecting or requesting changes. Added by the Week 7 Customer Changes (C-70, T-72). |

---

## External Systems

| System | Description |
|---|---|
| **Email Provider** | Third-party SMTP service used to deliver notification email to all seven roles. SMS is **not** in release 1 (see BDR T-35). |

---

## Level 1 — System Context

ConnectSphere sits between the seven user roles and the external Email Provider.

- Each of the seven actors interacts with ConnectSphere exclusively through the **Web Application**:
  - **Event Organiser** — creates, submits and tracks event requests, and raises change requests.
  - **Event Coordinator** — reviews, approves, plans, confirms and manages changes.
  - **Venue Staff** — maintains the venue catalogue and decides booking requests.
  - **Technical Support Staff** — maintains equipment, reserves items and assigns support staff.
  - **Attendee** — registers for events, joins the waiting list and withdraws.
- The **Email Provider** delivers notification email out to all seven roles.

*(Diagram: "SystemContext" — Level 1, auto-layout top-to-bottom, includes all elements.)*

---

## Level 2 — Containers

| Container | Technology | Description |
|---|---|---|
| **Web Application** | React, Tailwind CSS | Responsive single-page application serving all seven roles on desktop and mobile. |
| **Application Server** | Python (framework TBC) | Modular monolith exposing a REST API: authentication/authorisation, event lifecycle, venue booking, equipment, registration and change management. |
| **Database** | PostgreSQL 16 with `btree_gist` | Stores events, venues, bookings, equipment, reservations, registrations, notification outbox and audit log. |
| **Job Queue** | Redis | Holds notification jobs, published only after the originating transaction has committed. |
| **Scheduler and Outbox Relay** | Background process | Polls committed notification deliveries and publishes them; also runs periodic domain evaluations: auto-completing an event once its end time has passed and, from Week 7, expiring tentative holds and sending expiry reminders (ADR-006 amendment, T-69). |
| **Notification Worker** | Background process | Consumes queued jobs, calls the Email Provider, and records the delivery outcome. |

### Container relationships

| From | To | Description | Protocol |
|---|---|---|---|
| Web Application | Application Server | Calls | JSON/HTTPS |
| Application Server | Database | Writes the business change and its notification deliveries in one transaction | SQL/TCP |
| Scheduler and Outbox Relay | Database | Polls committed deliveries and evaluates due domain transitions | SQL/TCP |
| Scheduler and Outbox Relay | Job Queue | Publishes notification jobs to | — |
| Job Queue | Notification Worker | Dispatches jobs to | — |
| Notification Worker | Database | Records delivery outcome in | SQL/TCP |
| Notification Worker | Email Provider | Sends notification email via | SMTP |

> **ADR-006:** Notification jobs are published only *after* the originating transaction has committed — this is why the Scheduler/Outbox Relay, rather than the Application Server, is responsible for polling and publishing.

*(Diagram: "Containers" — Level 2, auto-layout top-to-bottom, includes all elements.)*

---

## Level 3 — Components (inside the Application Server)

> **ADR-001:** Component boundaries are enforced in code, not across the network — this is a modular monolith, not a set of microservices.

| Component | Type | Responsibility |
|---|---|---|
| **API Router** | REST controllers | Routes requests and validates payloads. |
| **Access Control** | Application service | Authentication, lockout, password reset, role and client-organisation scoping. |
| **Event Lifecycle** | Application service | Request, review, clarification, approval, status transitions, the unassigned queue and Lead assignment (E03-S08 to E03-S10), submission for and recording of the Operational Safety Check (E08-S03, E08-S06), confirmation, reversion and completion. |
| **Venue Management** | Application service | Catalogue including per-venue setup and turnaround buffers, layouts, availability on the buffered occupancy window, unavailability with reason categories over existing bookings, search, suitability per booking headcount, several bookings per event, tentative holds with expiry, and booking decisions. |
| **Equipment and Support** | Application service | Catalogue, availability, requests, reservations and technical staff assignment. |
| **Registration** | Application service | Registration window, venue-capacity enforcement, manual VIP addition, waiting list, withdrawal and attendance. |
| **Change Management** | Application service | Change requests, arrangement impact detection and cancellation. |
| **Notification Dispatcher** | Application service | Resolves recipients and writes notification delivery rows inside the business transaction. |
| **Audit Logger** | Application service | Append-only record of status changes, access denials, booking decisions and deactivations. |
| **Data Access Layer** | ORM and repositories | Repositories, transactions, `tstzrange` columns and `EXCLUDE` constraint enforcement. |

### Component relationships

**Routing and authorisation**
- API Router → Access Control — authorises every request through
- Access Control → Event Lifecycle — delegates to
- Access Control → Registration — delegates to
- Access Control → Change Management — delegates to

**Domain collaboration**
- Event Lifecycle → Venue Management — requests venue booking from
- Event Lifecycle → Equipment and Support — requests equipment reservation from
- Registration → Event Lifecycle — blocks until the event is Confirmed
- Registration → Venue Management — reads booked venue capacity from
- Change Management → Venue Management — flags affected bookings in
- Change Management → Equipment and Support — flags affected reservations in
- Change Management → Event Lifecycle — applies approved changes through

**Notifications**
- Event Lifecycle → Notification Dispatcher — raises notifications through
- Venue Management → Notification Dispatcher — raises notifications through
- Equipment and Support → Notification Dispatcher — raises notifications through
- Registration → Notification Dispatcher — raises notifications through
- Change Management → Notification Dispatcher — raises notifications through

**Auditing**
- Event Lifecycle → Audit Logger — records actions through
- Access Control → Audit Logger — records denied access through
- Venue Management → Audit Logger — records booking decisions through

**Persistence**
- Notification Dispatcher → Data Access Layer — writes delivery rows through
- Audit Logger → Data Access Layer — writes entries through
- Event Lifecycle → Data Access Layer — persists through
- Venue Management → Data Access Layer — persists through
- Equipment and Support → Data Access Layer — persists through
- Registration → Data Access Layer — persists through
- Change Management → Data Access Layer — persists through
- Data Access Layer → Database — reads from and writes to (SQL/TCP)

*(Diagram: "Components" — Level 3, auto-layout top-to-bottom, includes all elements.)*

---

## Diagram Views Summary

| View | Level | Scope |
|---|---|---|
| **SystemContext** | 1 | ConnectSphere, its seven user roles, and the one external system it depends on. |
| **Containers** | 2 | One deployable application server, one database, and two background processes. Notification jobs are published only after commit (ADR-006). |
| **Components** | 3 | Domain and cross-cutting components inside the modular monolith. Boundaries are in code, not across the network (ADR-001). |

---

## Styling Reference

| Element Tag | Shape | Background | Text Color |
|---|---|---|---|
| Person | Person | `#08427b` | `#ffffff` |
| External User | (default) | `#686868` | `#ffffff` |
| Internal User | (default) | `#08427b` | `#ffffff` |
| Software System | (default) | `#1168bd` | `#ffffff` |
| External System | (default) | `#999999` | `#ffffff` |
| Container | (default) | `#438dd5` | `#ffffff` |
| Database | Cylinder | `#438dd5` | `#ffffff` |
| Component | (default) | `#85bbf0` | `#000000` |

---

## Referenced Decisions

- **ADR-001** — Component boundaries are enforced in code, not across the network (modular monolith design).
- **ADR-006** — Notification jobs are published to the queue only after the originating transaction has committed.
- **BDR T-35** — SMS notifications are out of scope for release 1; email only.
