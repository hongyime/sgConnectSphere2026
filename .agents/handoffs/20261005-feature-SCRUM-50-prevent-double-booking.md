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
- The user explicitly asked to skip human tester steps. No manual run record or tester screenshots were created; SCRUM-50 is not being reported as Done.
- The current worktree changes are uncommitted. The local branch reports 115 commits ahead and 4 behind its upstream; inspect that divergence before any push.

## Next steps

1. Human review can continue through the existing PR workflow. If these automated runs are cited as PR evidence, create the required T-65 test session record first.
2. Check the branch history divergence before preparing any commit or push.

## Verification

- Focused coverage run for `conflictDetection.ts` and `BookingRequests.tsx`: 49 tests passed; 100% statements, branches, functions, and lines.
- `npm test --workspace frontend`: 67 files and 700 tests passed.
- `npm run typecheck --workspace frontend`: passed.
- `npm run build --workspace frontend`: passed; Vite reported the existing `OrganiserRequestFlow` mixed static/dynamic import warning.
- `python scripts/check.py`: passed (186 tooling tests, 740 records); it reported two existing secondary worktrees.
- No manual browser acceptance run was performed, per user instruction.
