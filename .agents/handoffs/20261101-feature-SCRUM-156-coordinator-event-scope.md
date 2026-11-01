# SCRUM-156 / E01-S12 Coordinator event scope

This story is already implemented on `main`: the Coordinator list query is constrained to `coordinator_id = $1`, excludes drafts, the event detail query refuses colleague-owned or unknown identifiers without disclosure and records the refusal, and the frontend uses the assigned-events endpoint. This branch records that completion for the story-level workflow; no duplicate implementation is needed. Human acceptance remains with the team and will not be run by this agent.

## Verification

- Existing unit coverage in `backend/tests/coordinatorAssignment.test.ts` asserts own-assignment filtering, draft exclusion, invalid status refusal, and wrong-role refusal.
- Existing integration coverage in `backend/tests/coordinatorAssignment.integration.test.ts` exercises assignment isolation against PostgreSQL when a disposable database is configured.
- Existing frontend coverage in `frontend/src/features/coordinator/CoordinatorWorkspace.test.tsx` and related Coordinator tests covers the assigned queue and unassigned refusal states.
- No manual test execution is planned.
