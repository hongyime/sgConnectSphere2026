# SCRUM-30 — Reuse previous event details

Implement E02-S05 from the canonical Release 1 backlog on this story branch using TDD. The smallest complete scope is a protected organiser-only copy of a completed or past event into a new draft, copying event requirements and Session structure while leaving dates pending and excluding operational records such as bookings, reservations and registrations. Automated tests, repository checks, and generated coverage/evidence will be completed; manual acceptance remains with the team.

## Current state

- Branch: `feature/SCRUM-30-reuse-event-details`
- Base: `origin/feature/SCRUM-158-safety-officer-check`
- First action: add failing backend service tests before implementation.

## Next steps

1. Inspect event/session repositories and existing API/frontend conventions.
2. Add focused failing tests for authorization, source eligibility, copied fields, pending dates, and exclusion of operational records.
3. Implement the smallest backend and organiser UI path required by E02-S05.
4. Regenerate coverage, record automated evidence, run repository/application checks, commit, and push this branch without opening a PR.

## Constraints

- Do not edit `.agents/STATE.md` or `.agents/JOURNAL.md`.
- Do not perform or record manual acceptance tests.
- Do not write secrets or personal data into committed files.
