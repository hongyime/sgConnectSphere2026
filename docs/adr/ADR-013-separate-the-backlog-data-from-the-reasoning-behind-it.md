# ADR-013 — Separate the backlog data from the reasoning behind it

- **Status:** Accepted
- **Related BDR:** Entire BDR

### Context

Version 1 and 2 of the backlog carried scope notes, status models, customer quotations, team assumptions and change history inside the same Word tables as the stories. The tables became difficult to scan, and the same decision appeared in several story notes with slightly different wording, so no single place could be trusted as authoritative.

### Decision

Three documents with distinct jobs. CONNECTSPHERE BACKLOGS CAA 140926.xlsx holds story data only, with a BDR Ref column on every row. The Backlog Decision Review holds every customer clarification, team decision, open assumption and boundary ruling, each with a stable reference code. This Architecture Decision Record set holds decisions about how the system is built rather than what it does.

### Alternatives considered

- Keep everything in the backlog documents. Rejected: it produced the duplication described above, and the customer supplies clarifications as a spreadsheet, so a spreadsheet-native backlog matches how the team already receives information.
- One combined document. Rejected: architecture decisions and backlog decisions have different audiences and change at very different rates.

### What this buys us

- A story's reasoning has exactly one home, referenced rather than repeated.
- Customer clarifications keep the numbering of the customer's own file, so any entry can be checked against the source.
- A team assumption is visibly distinguishable from a customer requirement, which is the distinction the Week 13 Q&A probes.

### What it costs

- Three documents must be kept in step. A story merged or retired in the workbook leaves a dangling reference in the BDR unless both are updated together.
- A reader wanting the full picture of one story must open two files.
