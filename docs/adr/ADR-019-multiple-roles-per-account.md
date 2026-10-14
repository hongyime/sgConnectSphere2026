# ADR-019 — Allow multiple roles per account

- **Status:** Accepted — team decision recorded 13 October 2026
- **Related BDR:** C-136, T-10, T-72, T-86, O-44
- **Supersedes:** ADR-012's one-role-per-account Release 1 constraint

### Context

ADR-012 represented a user with one `USERS.role` value. Week 9 C-136 confirms
that accounts are preloaded and users do not self-register; it does not define
role cardinality. The team selected T-86 to allow one account to hold multiple
roles while keeping the initial seed data simple.

### Decision

Role membership is many-to-many: an account may hold multiple system roles.
Seed data assigns exactly one role to each account. Authorization continues to
check the authenticated account's granted roles for every API request; one-role
seed data is not a product constraint. The precise UI treatment for an account
with multiple roles is an implementation/design detail and must not reduce its
authorized access.

### Alternatives considered

- Keep exactly one role in `USERS.role` for Release 1. Superseded by T-86.
- Create one account per role. Rejected in ADR-012 because it fragments one
  person's identity and audit trail.

### Consequences

- Replace the single role column with a `USER_ROLES` membership relation and
  migrate every existing role value into one membership row before removing the
  old column.
- Update authentication/session claims, backend authorization guards, frontend
  navigation, role setup and access-control tests to consume role memberships.
- Keep seed fixtures at one membership per user until a story needs to exercise
  multiple roles; add explicit multi-role coverage then.
- Do not infer that a user can switch roles through a dedicated screen. The
  interface must expose only actions allowed by the account's assigned roles;
  any role-context selector needs design review.

### Evidence and ownership

C-136 answers account provisioning only. The many-to-many model and one-role
seed rule are team design decisions in T-86, not additional customer wording.
The canonical target schema is `docs/db_schema.md`; authorization and UI
consequences are recorded in `docs/modular-monolith-architecture.md` and
`docs/design/figma-wireframe-refinement-plan.md`. No migration or application
code is included in this ADR.
