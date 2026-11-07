# UML code view: lifecycle repository boundary

The implementation uses exported functions and repository classes, not invented service classes. The service module is represented with a module stereotype, EventLifecycleRepository as an interface, and EventRecord as a data type. Dependencies are deliberately focused on the draft submission slice.

## Read the diagram

Notation: UML class/interface realization and dependency; TypeScript structural types.

[Editable Mermaid source](11-uml-lifecycle.mmd). The submission pack supplies SVG, high-resolution PNG and PDF renders with the same basename.

## Evidence

Week 5 PDF pp. 7-13; backend/src/modules/eventLifecycle/service.ts, repository.ts, types.ts. Lecture references use PDF page numbers, not necessarily printed slide numbers.

As-built snapshot: main `0773a721`, 5 November 2026. Read the [scope and discrepancy inventory](README.md) before interpreting delivery completeness.
