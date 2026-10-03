# ADR-012 — One role per account in release 1

- **Status:** Accepted
- **Related BDR:** C-33, T-10, C-69, C-70, T-72, O-44

### Context

Hsu (G2) confirmed that users act in distinct roles with strict access separation, but that a user may hold different roles depending on organisation structure. E01-S09 covers role switching and is deliberately out of release 1.

### Decision

USERS.role holds a single value. Multi-role support is deferred and the story is retained in the product backlog as future scope.

### Alternatives considered

- A USER_ROLES join table now. Rejected for release 1 scope, though it is the migration target.
- Duplicate accounts, one per role. Rejected: it breaks the single identity E01-S02 depends on and fragments the audit trail across two actors who are the same person.

### What this buys us

- Authorisation checks stay simple, with one role to evaluate per request.

### What it costs

- Migrating to multi-role later means introducing a join table and revisiting every authorisation check. This is accepted technical debt, recorded here because the customer has already signalled the requirement exists.
- In the interim, a staff member who genuinely holds two roles needs two accounts, which weakens the audit trail. This is the direct cost of the deferral and should be raised with the customer if it occurs in practice.

### Amended 3 October 2026 for the Week 7 Customer Changes

The `user_role` vocabulary gains `event_coordinator_lead` and `safety_officer` (T-72). The decision stands: an account holds exactly one of the now seven values (O-44 asks the customer to confirm that a Lead is not also a Coordinator). The cost paragraph above becomes more likely to bite, because a small team may well want one person to be both a Coordinator and the Lead; if that happens the `USER_ROLES` join table named as the migration target is the answer, not a second account.
