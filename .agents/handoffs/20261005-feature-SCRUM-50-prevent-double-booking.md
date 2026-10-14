# feature/SCRUM-50-prevent-double-booking

Goal: prepare the SCRUM-50 (E06-S06, 5-point) branch for its current Jira owner to implement venue-level double-booking protection.

## Current state

- The Jira issue remains To Do in Sprint 3 with its existing assignee and estimate.
- This branch was synced with the latest main snapshot 8f246ae.
- Added a type-only approval-conflict contract at backend/src/modules/venueBooking/approvalConflicts.ts; it contains no runtime behavior.
- The implementation depends on the venue-booking request foundation in PR #256 and the buffered occupancy work in PR #261. The contract is ready for those repositories to land.
- Sprint 3 behavior remains the C-65/T-66 buffered-window and C-67/T-68 per-venue scope. Apply the Week 9 Session and open-ended-block decisions only after Sprint 3 closes under T-73.

## Next steps

Implement the transactional conflict query and approval guard after #256 and #261 are available; then add unit/database coverage for existing confirmed bookings, competing pending requests, simultaneous approvals, buffered overlap, and multiple venues for one event. Keep the event-level case independent across venue IDs.

## Verification

- python scripts/check.py — PASS at base f542803; repository hygiene and 87 tooling tests. T-65 record: docs/testing/runs/20261014-080123-bryanseah234-tooling.md.
- No application lint, application tests, build or deployment checks were run.
