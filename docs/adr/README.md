# Architecture Decision Records

ConnectSphere Event Planning and Venue Booking System  ·  IS212 (AY 2026/27 T1)

Version 4  ·  14 September 2026

Thirteen decisions: eleven Accepted and two Retired. Each records the forces that applied, what was chosen, what was rejected and why, and the consequences including the ones that hurt.

Version 3 retired ADR-004 and ADR-005 following the Week 4 clarification recorded as BDR C-62, which established that a multi-session event must be set up as separate events. Both records are kept rather than deleted: a retired decision with its reasoning intact shows the choice was sound on the evidence available and was superseded, which is a stronger position in the Week 13 Q&A than a document that silently never held the view. Version 4 rewrites ADR-006 to describe the transactional outbox actually shown in the C4 model, and corrects ADR-001's process count from one background process to two.

References to requirements use the Week 1 Customer Briefing (§), the Week 4 core feature list, and story IDs from CONNECTSPHERE BACKLOGS CAA 140926.xlsx. The Related BDR field on each record points into the Backlog Decision Review, where C- entries are customer clarifications, T- entries are team decisions, O- entries are open assumptions and B- entries are story boundary rulings.

## Index

- [ADR-001 — Modular monolith rather than microservices](./ADR-001-modular-monolith-rather-than-microservices.md)
- [ADR-002 — PostgreSQL as the system of record](./ADR-002-postgresql-as-the-system-of-record.md)
- [ADR-003 — Enforce booking and assignment conflicts in the database](./ADR-003-enforce-booking-and-assignment-conflicts-in-the-database.md)
- [ADR-004 — Sessions as a first-class entity — RETIRED](./ADR-004-sessions-as-a-first-class-entity-retired.md)
- [ADR-005 — Denormalise event_id, guarded by a composite foreign key — RETIRED](./ADR-005-denormalise-event-id-guarded-by-a-composite-foreign-key-retired.md)
- [ADR-006 — Transactional outbox for notification delivery](./ADR-006-transactional-outbox-for-notification-delivery.md)
- [ADR-007 — One single-page application for all five roles](./ADR-007-one-single-page-application-for-all-five-roles.md)
- [ADR-008 — Client organisation as the tenancy boundary](./ADR-008-client-organisation-as-the-tenancy-boundary.md)
- [ADR-009 — A single audit log with a polymorphic target](./ADR-009-a-single-audit-log-with-a-polymorphic-target.md)
- [ADR-010 — Separate equipment request from equipment reservation](./ADR-010-separate-equipment-request-from-equipment-reservation.md)
- [ADR-011 — Controlled vocabularies for accessibility and facilities](./ADR-011-controlled-vocabularies-for-accessibility-and-facilities.md)
- [ADR-012 — One role per account in release 1](./ADR-012-one-role-per-account-in-release-1.md)
- [ADR-013 — Separate the backlog data from the reasoning behind it](./ADR-013-separate-the-backlog-data-from-the-reasoning-behind-it.md)
