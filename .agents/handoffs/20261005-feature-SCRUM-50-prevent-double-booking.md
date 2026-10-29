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
- PR #378's first guardrail run also rejected a third simultaneously open PR. PR #379 was temporarily closed to clear that per-author limit; its pushed branch remains preserved. PR #378 is the active next-ranked task.

## Next steps

1. Commit the refreshed browser fakes and automated records, then push so PR #378 gets a clean CI run.
2. Transition SCRUM-231 to In Review once the fix is on the open PR; leave SCRUM-50 and SCRUM-232 open pending human acceptance.
3. Continue the Sprint 4 technical To Do queue; SCRUM-66 / E09-S04 is implemented on its preserved branch, waiting for an open-PR slot.

## Verification

- On `cf89c89`, focused coverage for `conflictDetection.ts` and `BookingRequests.tsx`: 49 tests passed; 100% statements, branches, functions, and lines. Recorded in the linked frontend Vitest session file.
- On `cf89c89`, `npm test --workspace frontend`: 67 files and 700 tests passed. Recorded in the linked frontend Vitest session file.
- `npm run build --workspace frontend`: passed; Vite reported the existing `OrganiserRequestFlow` mixed static/dynamic import warning.
- On `cf89c89`, `python scripts/check.py`: passed (186 tooling tests, 740 records); it reported two existing secondary worktrees. Recorded in the tooling session file.
- No manual browser acceptance run was performed, per user instruction.
