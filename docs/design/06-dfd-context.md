# Data flow context (Level 0)

One process represents the application and its server-side persistence boundary. This is a logical data-flow view, not deployment topology. Every external flow is balanced in Level 1; scheduler triggers are intentionally omitted because they are control flow, not business data.

User input data aggregates credentials, requests, decisions, registrations, view queries and read markers. Permitted views include statuses, public details and the inbox; errors include authentication and business-rule refusals. Level 1 decomposes these aggregate flows without adding external data.

## Read the diagram

Notation: Supplementary DFD: rectangles external entities; rounded process; noun-labelled data arrows.

[Editable Mermaid source](06-dfd-context.mmd). The submission pack supplies SVG, high-resolution PNG and PDF renders with the same basename.

## Evidence

No DFD levels or notation were taught in the supplied lecture PDFs. Added at user request; api/; backend/src/providers/. Lecture references use PDF page numbers, not necessarily printed slide numbers.

As-built snapshot: main `0773a721`, 5 November 2026. Read the [scope and discrepancy inventory](README.md) before interpreting delivery completeness.
