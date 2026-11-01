# SCRUM-154 / E03-S09 Lead reassignment

This branch implements immediate reassignment by an Event Coordinator Lead. The outgoing and incoming Coordinators and Organiser will be notified, the Lead action will be audited, and the existing named Coordinator-to-Coordinator acceptance workflow will remain intact. Human acceptance remains with the team and will not be run by this agent.

## Current state

- Branch: `feature/SCRUM-154-lead-reassignment`
- Base: pushed SCRUM-153 Lead queue assignment branch
- Existing Coordinator request/accept/decline behavior is covered and retained.
- The explicit E03-S09 escalation path is also implemented: an assigned Coordinator can ask the Lead with a reason; the Lead sees the pending request, can decline with a note, and direct Lead reassignment closes the request.
- No manual test execution is planned.

## Verification

- `npx tsx --test backend/tests/leadReassignment.test.ts`: 3 passed.
- Targeted frontend Vitest for `RoleQueues.test.tsx`: 2 passed.
- Backend and frontend typechecks passed.
- Frontend build passed; Vite reported the existing ineffective dynamic import warning for `OrganiserRequestFlow`.
- `python scripts/tc_coverage_audit.py` regenerated `docs/testing/tc-coverage.md`.
- Red run: `npx tsx --test tests/leadEscalation.test.ts` failed before the new exports existed.
- `npx tsx --test tests/leadEscalation.test.ts`: 3 passed.
- `npm test --workspace frontend -- src/features/roleQueues/RoleQueues.test.tsx src/features/coordinator/CoordinatorWorkspace.test.tsx`: 16 passed.
- Backend and frontend typechecks passed after the escalation changes.

## Next steps

- Run the full backend suite, regenerate test coverage, record verification, commit, and push without opening a pull request.
- Human review and manual acceptance remain with the team and are intentionally not run by this agent.
