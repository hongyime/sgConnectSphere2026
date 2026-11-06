# Event lifecycle state machine

The diagram follows the implemented status vocabulary. Generic transition validation is supplemented by role and arrangement checks. Rejected, Cancelled and Completed are terminal. Cancellation routes exist from nonterminal states; they are grouped in a note to avoid duplicate crossing lines.

## Read the diagram

Notation: UML-style state diagram; transition labels describe triggers.

[Editable Mermaid source](05-event-state.mmd). The submission pack supplies SVG, high-resolution PNG and PDF renders with the same basename.

## Evidence

Supplementary lifecycle view; backend/src/modules/eventLifecycle/status.ts; eventReadiness/autoSafetyReview.ts; completion.ts. Lecture references use PDF page numbers, not necessarily printed slide numbers.

As-built snapshot: main `0773a721`, 5 November 2026. Read the [scope and discrepancy inventory](README.md) before interpreting delivery completeness.
