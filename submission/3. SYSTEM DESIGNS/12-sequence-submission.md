# Sequence: atomic Draft submission and refusal

Event and Session locks prevent a queued Session writer from bypassing submission. The same Event lock is acquired by draft Session writes. A failed date check rolls back and returns a structured error; successful business, audit and notification changes commit together. No provider call occurs inside the transaction.

## Read the diagram

Notation: UML sequence; lifelines, messages, alt branch, transaction ordering.

[Editable Mermaid source](12-sequence-submission.mmd). The submission pack supplies SVG, high-resolution PNG and PDF renders with the same basename.

## Evidence

Week 5 PDF pp. 15, 22; api/events.ts; eventLifecycle/repository.ts; eventSessions/repository.ts. Lecture references use PDF page numbers, not necessarily printed slide numbers.

As-built snapshot: main `0773a721`, 5 November 2026. Read the [scope and discrepancy inventory](README.md) before interpreting delivery completeness.
