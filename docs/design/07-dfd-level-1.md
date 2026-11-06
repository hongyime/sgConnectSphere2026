# Data flow decomposition (Level 1)

P1 checks credentials and sessions, P2 applies domain rules, P3 reads public/in-app results, and P4 handles email delivery. D1-D3 are logical groups in the same PostgreSQL database, not three databases. There are no direct external-entity-to-store arrows.

## Read the diagram

Notation: Supplementary DFD: numbered processes; cylinder data stores; labelled data flows.

[Editable Mermaid source](07-dfd-level-1.mmd). The submission pack supplies SVG, high-resolution PNG and PDF renders with the same basename.

## Evidence

User-requested supplementary notation; backend/src/modules/accessControl/; eventLifecycle/; notificationDispatcher/. Lecture references use PDF page numbers, not necessarily printed slide numbers.

As-built snapshot: main `0773a721`, 5 November 2026. Read the [scope and discrepancy inventory](README.md) before interpreting delivery completeness.
