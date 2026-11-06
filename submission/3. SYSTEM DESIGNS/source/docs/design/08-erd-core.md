# ERD: identity, Events and Sessions

This selected physical view deliberately shows users.role as built, not the unimplemented USER_ROLES target in ADR-019. An Event has one or more Sessions by application invariant. The physical FK alone permits zero children temporarily; join-table details are in the full schema inventory.

## Read the diagram

Notation: Mermaid crow-foot ER; PK/FK and optionality; selected physical tables.

[Editable Mermaid source](08-erd-core.mmd). The submission pack supplies SVG, high-resolution PNG and PDF renders with the same basename.

## Evidence

Week 4 PDF p. 63 mentions ER at code level; migrations 0001, 0003, 0006, 0014, 0024. Lecture references use PDF page numbers, not necessarily printed slide numbers.

As-built snapshot: main `0773a721`, 5 November 2026. Read the [scope and discrepancy inventory](README.md) before interpreting delivery completeness.
