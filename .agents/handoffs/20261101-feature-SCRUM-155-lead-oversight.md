# SCRUM-155 / E03-S10 Lead oversight

This branch implements the Event Coordinator Lead oversight view: every active event, its current Coordinator or Unassigned state, filters, and per-Coordinator workload counts. It will enforce Lead-only access and record refusals. Human acceptance remains with the team and will not be run by this agent.

## Current state

- Branch: `feature/SCRUM-155-lead-oversight`
- Base: pushed SCRUM-154 Lead reassignment branch
- Lead queue and immediate Lead reassignment APIs are available from the base branch.
- No manual test execution is planned.

## Next steps

- Add red tests for oversight filtering, workload counts, and role refusal.
- Implement the API, route, navigation entry, and read-only oversight tables.
- Run automated checks, record evidence, commit, and push without opening a pull request.
