# SCRUM-153 / E03-S08 Lead queue assignment

This branch implements the Lead assignment action for submitted, unassigned event requests. It will preserve the existing Lead-only queue, move one request to Under Review atomically, record the assigning Lead, notify the Coordinator and Organiser, and cover the behavior with automated tests. Human acceptance remains with the team and will not be run by this agent.

## Current state

- Branch: `feature/SCRUM-153-lead-queue-assignment`
- Base: pushed `feature/SCRUM-157-role-sign-in`
- The Lead queue read endpoint and role landing page already exist from SCRUM-157.
- No manual test execution is planned.

## Verification

- `npx tsx --test backend/tests/leadAssignment.test.ts`: 4 passed.
- Targeted frontend Vitest for `RoleQueues.test.tsx`: 2 passed.
- Backend and frontend typechecks passed.
- Frontend and backend builds passed; Vite reported the existing ineffective dynamic import warning for `OrganiserRequestFlow`.
- `python scripts/tc_coverage_audit.py` regenerated `docs/testing/tc-coverage.md`.

## Next steps

- Add red tests for Lead assignment and non-Lead refusal.
- Implement the smallest transactional assignment path and frontend action.
- Run automated checks, record evidence, commit, and push without opening a pull request.
