# C4 API components

These are code boundaries, not microservices. Handlers authenticate and route to domain modules. Modules use raw SQL, shared transactions, audit helpers and transactional notification hooks; there is no ORM. Session authoring, readiness and attendance are separate implemented modules.

## Read the diagram

Notation: C4 C3; selected modules within API container.

[Editable Mermaid source](03-c4-components.mmd). The submission pack supplies SVG, high-resolution PNG and PDF renders with the same basename.

## Evidence

Week 4 PDF p. 62; api/events.ts; api/venues/index.ts; backend/src/modules/. Lecture references use PDF page numbers, not necessarily printed slide numbers.

As-built snapshot: main `0773a721`, 5 November 2026. Read the [scope and discrepancy inventory](README.md) before interpreting delivery completeness.
