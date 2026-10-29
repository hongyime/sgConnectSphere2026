# feature/SCRUM-50-prevent-double-booking

Goal: deliver the frontend and automated component coverage for E06-S06 / SCRUM-50, specifically SCRUM-231 and SCRUM-232, by warning Venue Staff about overlapping active venue claims and disabling approval while a conflict is present.

## Current scope

- The canonical scope is `docs/backlog/release-1/E06-venue-search-booking.md`, cases TC_E06S06_01 to _07 in `docs/testing/cases/E06.md`, and the T-100 interpretation in `docs/plans/venue-claim-rule-b-20261022.md` and `docs/contracts/venue-bookings.md`.
- T-100 supersedes this handoff's earlier first-approval proposal: Pending, Confirmed, and unexpired Tentative bookings claim the venue's buffered slot; the server rechecks approval and retains/flags later buffer conflicts until an explicit rejection or withdrawal/replan.
- Backend claim enforcement is already on `main` (PR #339); this increment only changes the Venue Staff frontend and its Vitest coverage.
- The user's instruction for this increment is to skip human tester steps. Do not create manual run records or screenshots. Automated runs used as PR evidence still follow T-65.

## Progress

- The branch is `feature/SCRUM-50-prevent-double-booking`.
- The live route is `/venue/bookings/:bookingId/decide` in `frontend/src/app/routes.tsx`, currently backed by `frontend/src/features/venue/BookingRequests.tsx`.
- `BookingDecision` now reads venue setup/turnaround buffers and the Singapore-day venue calendar before offering approval. It detects buffered overlap with Confirmed bookings, active Tentative claims, and already Conflicting claims; it ignores the candidate booking's own calendar segments.
- The decision screen shows a conflict badge and warning and disables approval while checking or when a conflict exists; rejection remains available. Calendar-load errors are explained while the server remains authoritative. A server 409 conflict stays visible and prevents retrying approval.
- Added helper and component tests under `frontend/src/features/venues/` and extended the active booking-decision test; the helper is kept beside the live Venue Staff screen in `frontend/src/features/venue/`.
- Removed the obsolete type-only backend scaffold; backend claim enforcement remains on main through PR #339.
- Implementation is committed and pushed in `7994ec6`; branch history reconciliation is `45be219`; the cleanup is `cf89c89`.
- The user explicitly asked to skip human tester steps. Automated evidence is recorded in `docs/testing/runs/20261030-002633-bryanseah234-frontend-vitest.md` and `docs/testing/runs/20261030-002633-bryanseah234-tooling.md`. No manual run record or screenshots were created; SCRUM-50 remains open for review and acceptance.
- Jira currently lists SCRUM-50 as To Do and SCRUM-231/232 as To Do. Move SCRUM-231 to In Review after opening the PR; leave the parent and human-test subtask unchanged.
- PR #378's first CI run failed in eight desktop/mobile E06-S04 browser executions because the old API fakes omitted the newly required venue and availability-calendar reads, and one assertion expected approval to remain enabled after a server-side conflict. Updated those fakes and assertions; the focused scaffold E2E now passes 10/10 on `0b287ce`, recorded in `docs/testing/runs/20261030-011249-bryanseah234-frontend-e2e.md`.
- On `0b287ce`, `python scripts/check.py` passed 186 tooling tests and validated 745 records; the two pre-existing secondary worktrees remain a warning. Recorded in `docs/testing/runs/20261030-011355-bryanseah234-tooling.md`.
- PR #378's guardrail run rejects the third simultaneously open PR: #374, #377, and #378 are open by the same author. PR #379 was closed earlier and its pushed branch remains preserved. Do not close unrelated reviewed PRs to clear this policy check.
- The full Application Checks workflow passed on `68b55ee` (run 40919387941, 11m51s), including typecheck, backend/frontend tests, PostgreSQL and Redis acceptance suites, build, Playwright, and T-72. Recorded in `docs/testing/runs/20261030-012617-bryanseah234-full-regression.md`. Repository checks and security scans also passed; only the open-PR guardrail fails. PR review is still required.
- A current Sprint 4 Jira query confirms SCRUM-50 is the only Story in To Do. SCRUM-231 is In Review; leave SCRUM-50 and SCRUM-232 open pending human review/acceptance, per the instruction not to perform tester steps.

## Next steps

1. Keep PR #378 ready for human review; the application workflow is green at `68b55ee`, but the repository guardrail remains blocked until the author has at most two open PRs.
2. Keep SCRUM-50 open until its Definition of Done is met. Human acceptance under SCRUM-232 remains outside this agent's work.
3. No further unowned Sprint 4 Story remains in To Do. SCRUM-66 / E09-S04 is implemented on its preserved branch but is In Progress and assigned to Aaron Koh, so it is not part of this To Do queue.

## Verification

- On `cf89c89`, focused coverage for `conflictDetection.ts` and `BookingRequests.tsx`: 49 tests passed; 100% statements, branches, functions, and lines. Recorded in the linked frontend Vitest session file.
- On `cf89c89`, `npm test --workspace frontend`: 67 files and 700 tests passed. Recorded in the linked frontend Vitest session file.
- `npm run build --workspace frontend`: passed; Vite reported the existing `OrganiserRequestFlow` mixed static/dynamic import warning.
- On `cf89c89`, `python scripts/check.py`: passed (186 tooling tests, 740 records); it reported two existing secondary worktrees. Recorded in the tooling session file.
- No manual browser acceptance run was performed, per user instruction.
