# ADR-011 — Controlled vocabularies for accessibility and facilities

- **Status:** Accepted
- **Related BDR:** C-32, T-13, T-45, B-06, B-07

### Context

E02-S03 records an event's accessibility requirements, E05-S01 records a venue's accessibility features and facilities, and E06-S02 must compare them and name every failing requirement. Free text on either side makes reliable comparison impossible.

### Decision

Lookup tables ACCESSIBILITY_FEATURES and FACILITIES, referenced many-to-many from both venues and events. A free-text note field on EVENTS captures anything outside the vocabulary; it is shown to the Coordinator and explicitly excluded from automated matching.

### Alternatives considered

- Boolean columns such as is_accessible, as in the original draft. Rejected: a boolean cannot express a list, and every new feature would be a schema migration.
- JSON arrays of strings. Rejected: no referential integrity, so a typo silently fails to match and no one notices.
- Free text with fuzzy matching. Rejected: E06-S02 must name each failing requirement precisely, which needs exact identity.

### What this buys us

- Matching is a join, and E06-S02 can list exactly which requirements a venue fails.
- New features are data rather than schema changes.

### What it costs

- The vocabulary must be seeded. Bryan (G1) confirmed no System Admin role is in scope, so it is seeded by migration rather than managed through a UI in release 1.
- The free-text escape hatch is deliberately not matched, and the interface must make clear to users that it is advisory only.
