# SCRUM-44: E05-S05 Venue Setup and Turnaround Time

## Goal

Implement configurable setup_time_minutes and turnaround_time_minutes for venues, applying these buffers to every availability and conflict check. Bookings that become conflicting due to buffer changes must be FLAGGED, not removed.

## Context

- **Story**: E05-S05 — Apply setup and turnaround time
- **Sprint**: Sprint 3
- **Points**: 5
- **BDR references**: C-65, T-66, T-73, T-74, O-20, O-21, O-22

Each venue needs two new columns:
- `setup_time_minutes` (int, ≥0, default 0)
- `turnaround_time_minutes` (int, ≥0, default 0)

Example: A booking from 10:00-12:00 with 30min setup and 45min turnaround occupies 09:30-12:45.

## Implementation Approach

1. Add migration to alter venues table
2. Update seed data to include buffer columns
3. Update availability/conflict checking logic to compute buffered occupancy windows
4. Implement conflict flagging instead of deletion when buffers change

## Acceptance Criteria Coverage

- [x] Scenario 1: Buffers recorded on the venue
- [ ] Scenario 2: Occupancy window computed from the buffers
- [ ] Scenario 3: Calendar shows the buffered window
- [ ] Scenario 4: Conflicts created by buffer change are identified, not removed
- [ ] Scenario 5: Buffers do not apply against maintenance blocks
- [ ] Scenario 6: Adjacent buffered windows do not conflict
- [ ] Scenario 7: Buffered occupancy excludes a venue from search

## Progress

### 2026-10-07 Session Start

- The current task branch is `feature/SCRUM-44-venue-setup-turnaround`.
- Read venue table schema from migration 0001
- Identified venues table structure
- Launched explore agent to find availability/conflict checking logic
- Created handoff file

### 2026-10-07 Continuation: shared occupancy SQL

- This pass is limited to the requested migration renumbering and extraction of
  the buffered booking range into the PostgreSQL `occupied_window()` function.
- `origin/main` currently ends its numbered migrations at 0010. This branch's
  venue buffer migration is being renamed from 0014 to 0011.
- The SQL callers to update are `search.ts`, `calendar.ts`, `blocks.ts`, and
  `catalogue.ts` under `backend/src/modules/venueBooking/`.
- The user requested a commit and push to this branch, with no pull request.

## Next Steps

- Finish the migration and four caller updates, run `python scripts/check.py`,
  then commit and push the scoped changes. Preserve the session-start edits to
  `.agents/STATE.md` and `.agents/JOURNAL.md`; do not stage them.
