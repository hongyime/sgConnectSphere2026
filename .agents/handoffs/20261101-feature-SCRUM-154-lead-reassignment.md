# SCRUM-154 / E03-S09 Lead reassignment

This branch implements immediate reassignment by an Event Coordinator Lead. The outgoing and incoming Coordinators and Organiser will be notified, the Lead action will be audited, and the existing named Coordinator-to-Coordinator acceptance workflow will remain intact. Human acceptance remains with the team and will not be run by this agent.

## Current state

- Branch: `feature/SCRUM-154-lead-reassignment`
- Base: pushed SCRUM-153 Lead queue assignment branch
- Existing Coordinator request/accept/decline behavior is covered and retained.
- No manual test execution is planned.

## Verification

- `npx tsx --test backend/tests/leadReassignment.test.ts`: 3 passed.
- Targeted frontend Vitest for `RoleQueues.test.tsx`: 2 passed.
- Backend and frontend typechecks passed.
- Frontend build passed; Vite reported the existing ineffective dynamic import warning for `OrganiserRequestFlow`.
- `python scripts/tc_coverage_audit.py` regenerated `docs/testing/tc-coverage.md`.

## Next steps

- Add red tests for Lead-only immediate reassignment and refusal paths.
- Implement the transactional reassignment endpoint and Lead UI action.
- Run automated checks, record evidence, commit, and push without opening a pull request.
