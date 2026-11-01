# SCRUM-30 — Reuse previous event details

Implement E02-S05 from the canonical Release 1 backlog on this story branch using TDD. The smallest complete scope is a protected organiser-only copy of a completed or past event into a new draft, copying event requirements and Session structure while leaving dates pending and excluding operational records such as bookings, reservations and registrations. Automated tests, repository checks, and generated coverage/evidence will be completed; manual acceptance remains with the team.

## Current state

- Branch: `feature/SCRUM-30-reuse-event-details`
- Base: `origin/feature/SCRUM-158-safety-officer-check`
- Implementation commit: `5d1e9ab` (`feat(backend): implement SCRUM-30 event detail reuse`).
- Branch is ready to push without opening a PR.

## Next steps

1. Push the branch after the automated evidence records are committed.
2. Keep manual acceptance with the team; do not add screenshots or manual run records here.

## Constraints

- Do not edit `.agents/STATE.md` or `.agents/JOURNAL.md`.
- Do not perform or record manual acceptance tests.
- Do not write secrets or personal data into committed files.

## Verification

- Backend unit suite: 696 passed, 1 skipped, 697 total; the skipped PostgreSQL repository contract requires `TEST_DATABASE_URL`.
- Focused frontend suite (`OrganiserDrafts.test.tsx` and `SessionEditor.test.tsx`): 5 passed.
- Frontend typecheck and build passed; Vite emitted the existing ineffective dynamic-import warning for `OrganiserRequestFlow`.
- Full frontend regression: 770 passed, 11 failed across 10 unrelated existing files under parallel execution; not used as SCRUM-30 evidence.
- `python scripts/tc_coverage_audit.py`, `python scripts/doc_guard.py`, and `python scripts/check.py` passed; doc guard reported existing missing-front-matter warnings and repository check reported intentional secondary-worktree warnings.

## Scope note

The current schema stores venue/equipment requirements as text and protects layout/accessibility/facility references with foreign keys. The copy path flags inactive venue/equipment references found in existing arrangements, while future item-ID requirements can extend the warning query without changing the copy contract.
