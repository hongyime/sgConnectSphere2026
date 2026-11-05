# ERD: venue, equipment and technical support

Venue bookings are linked to Sessions. Equipment requests/reservations carry Session links on new multi-Session paths; legacy Event-level rows remain possible. Technical-support assignment remains Event-level. Venue staff routing is setup data; no staff-roster UI is claimed.

## Read the diagram

Notation: Mermaid crow-foot ER; selected physical tables and nullable Session links.

[Editable Mermaid source](09-erd-arrangements.mmd). The submission pack supplies SVG, high-resolution PNG and PDF renders with the same basename.

## Evidence

Week 4 PDF p. 63; migrations 0001, 0014, 0018, 0019, 0025, 0026; equipmentSupport/sessions.ts. Lecture references use PDF page numbers, not necessarily printed slide numbers.

As-built snapshot: main `0773a721`, 5 November 2026. Read the [scope and discrepancy inventory](README.md) before interpreting delivery completeness.
