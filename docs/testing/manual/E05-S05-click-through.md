# E05-S05 manual click-through: venue setup and turnaround buffers

Manual acceptance script for SCRUM-161 / E05-S05 (venue setup and turnaround
time buffers, under parent story SCRUM-44). Follows the format of
[E06-S02](E06-S02-click-through.md) and the [T-65 recording rules](../runs/README.md).
Source cases: [TC_E05S05_01–07](../cases/E05.md).

This script verifies that venue buffers are stored, displayed, enforced in
availability checks and calendar views, and that buffer changes that produce
overlaps flag bookings without releasing them while notifying affected Coordinators.

---

## Prerequisites and Environment Setup

You can execute this script either on a local dev stack with a seeded database,
or against the deployed preview/staging environment.

### Option A: Local Dev Stack (Recommended for reproducible test data)

1. **Terminal 1 (Backend API & Seeded DB)**:
   ```bash
   # Reset and seed the local database
   npx tsx backend/src/database/cli.ts reset
   # Start the local backend API
   npm run dev --workspace backend
   ```
2. **Terminal 2 (Frontend UI)**:
   ```bash
   npm run dev --workspace frontend
   ```
   Open `http://127.0.0.1:5173` in your browser.

### Option B: Deployed Environment
- Web Application: Use the live deployed URL or PR #261 Vercel preview:
  `https://sgconnectsphere-jpggnmxnm-theprawnvercel.vercel.app`
- Database: Ensure migrations `0011_venue_setup_turnaround_buffers.sql` and
  `0016_venue_buffer_write_guard.sql` have been applied per
  [`docs/ops/production-migrations.md`](../../ops/production-migrations.md).

### Seeded Test Accounts (`backend/src/database/cli.ts`):
- **Venue Staff A**: `venue_a@connectsphere.com` / `ValidPass123`
- **Coordinator A**: `coord_a@connectsphere.com` / `ValidPass123`
- **Coordinator B**: `coord_b@connectsphere.com` / `ValidPass123`
- **Organiser A**: `organiser_a@clienta.com` / `ValidPass123`

---

## Step-by-Step Test Procedure

### Test 1: Record Buffers on a Venue (TC_E05S05_01, Scenario 1)
1. Sign in as `venue_a@connectsphere.com`.
2. Navigate to the **Venues** list and open **Orchid Hall**.
3. Observe initial setup and turnaround values: defaults to `0` minutes and `0` minutes (TC_E05S05_06).
4. Edit the venue: set **Setup time** to `30` minutes and **Turnaround time** to `45` minutes.
5. Save the venue details.
6. **Expected Outcome**:
   - The venue detail shows Setup time `30 minutes` and Turnaround time `45 minutes`.
   - Other unedited venues (e.g., Lotus Room) continue to show `0` and `0`.

---

### Test 2: Calendar Shows Buffered Occupancy Window (TC_E05S05_02, Scenario 2 & 3)
1. Sign in as `coord_a@connectsphere.com`.
2. Ensure there is a Confirmed booking on Orchid Hall (e.g. from 10:00 to 12:00).
3. Open the **Venue Calendar** for Orchid Hall on that date.
4. **Expected Outcome**:
   - The occupancy window spans from `09:30` to `12:45` (30m setup + 2h event + 45m turnaround).
   - The `09:30–10:00` setup segment and `12:00–12:45` turnaround segment are visually distinguished from the core `10:00–12:00` event time.
   - Status indicators (Free, Tentative, Confirmed, Blocked) remain distinct and clearly labeled.

---

### Test 3: Buffer Edit Creating Overlap Flags Booking Without Releasing (TC_E05S05_03, Scenario 4)
1. Ensure Orchid Hall has two adjacent bookings:
   - Booking A: 10:00–12:00 (Coordinator A).
   - Booking B: 12:30–14:00 (Coordinator B).
2. Sign in as `venue_a@connectsphere.com`.
3. Increase Orchid Hall's Turnaround time from `0` to `45` minutes (so Booking A's buffered window now extends to `12:45`, overlapping Booking B's start at `12:30`).
4. Save the venue.
5. **Expected Outcome**:
   - The save succeeds. The save feedback lists Booking A and Booking B as conflicting.
   - Neither booking is cancelled or released from the venue.
   - Booking B is flagged with `buffer_conflict` on the calendar.
   - Coordinator B receives a notification indicating the venue buffer conflict.

---

### Test 4: Boundary & Adjacency Check (TC_E05S05_04, Scenario 6)
1. With Orchid Hall set to 30m setup and 30m turnaround:
   - Existing Booking: 10:00–12:00 (occupancy: 09:30–12:30).
2. Attempt to create a prospective booking starting at `12:30` (with 30m setup, occupancy starts at 12:00 -> overlaps turnaround).
3. Attempt to create a prospective booking whose buffered start is exactly at `12:30` (advertised start at `13:00` with 30m setup).
4. **Expected Outcome**:
   - Exact boundary touch (0-minute overlap) is accepted without conflict.
   - Any overlap (even 1 minute) is blocked and flagged as conflicting.

---

### Test 5: Maintenance Block Exemption (TC_E05S05_05, Scenario 5)
1. Create a maintenance block on Orchid Hall from `08:00` to `10:00`.
2. Request an event booking for `10:00` to `12:00` (setup time 30m starts at `09:30`, inside the block window).
3. **Expected Outcome**:
   - The booking is accepted; maintenance blocks compare against advertised event times rather than buffer windows.

---

### Test 6: Search Availability Exclusion (TC_E05S05_07, Scenario 7)
1. With Orchid Hall having a booking from 10:00 to 12:00 and turnaround 45m (occupied until 12:45):
2. As Coordinator, search for venues available between `12:00` and `14:00`.
3. **Expected Outcome**:
   - Orchid Hall does not appear as available, because the prospective start at 12:00 clashes with the 12:45 turnaround completion.

---

## Recording Evidence (T-65)

After completing the manual run:
1. Create an immutable session record under `docs/testing/runs/YYYYMMDD-HHmmss-<username>-frontend-e2e.md`.
2. Follow `docs/testing/runs/TEMPLATE.md`.
3. Record the observed outcomes, screenshots, and pass/fail status for each scenario.
