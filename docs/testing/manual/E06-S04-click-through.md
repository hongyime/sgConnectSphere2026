# E06-S04 manual click-through: decide on a venue booking request

Manual end-to-end check of E06-S04 "Decide on a venue booking request"
(story SCRUM-48). Run it by hand in a real browser before the Sprint 3
Review, taking every screenshot yourself (T-93). Then record the run in
`docs/testing/runs/` as `run_type: manual`, `scope: frontend/e2e`,
`database: real`, with the **actual result on every row** (see "Results
table" in `docs/testing/runs/README.md`), and keep the screenshots under
`docs/testing/runs/evidence/<record filename without .md>/`, named by TC_ID.

The sequence below was dry-run against the backend services on a freshly
seeded database at branch commit `8c7d649`; every quoted message is the text
those services returned. Screen layout around the messages was not dry-run.

## Seeded data used, and the test-case names it replaces

The test cases still use placeholder names; PR #230 renames them. Note these
substitutions in the run record's Remarks.

| Test case says | This run uses |
| --- | --- |
| `venue_staff_1@connectsphere.com` | `venue_a@connectsphere.com` (Venue Staff A; looks after Orchid Hall, Lotus Room, Maple Room) |
| a second Venue Staff member | `venue_b@connectsphere.com` (Venue Staff B; looks after Jasmine Hall, Cedar Auditorium) |
| `coordinator_1@connectsphere.com`, "the assigned Coordinator" | `coord_a@connectsphere.com` (Coordinator A, assigned to EVT-3003) |
| "Riverside Hall" / "Charity Run" pending request (TC_01, TC_03) | the seeded pending **Orchid Hall** request for **EVT-3003 Planning Phase Gala**, 25 Oct 2026 6:00–10:00 pm |
| "Small Room" / "Product Expo 2026" (TC_02) | a **Lotus Room** request (capacity 50) that `coord_a` submits for EVT-3003 (200 expected) |
| suggested alternative "Riverside Hall" (TC_02) | **Jasmine Hall** (capacity 300) |
| "Riverside Hall" buffers, "Charity Run" / "Alumni Dinner" (TC_04) | two **Cedar Auditorium** requests for EVT-3003: 6:00–7:30 pm and 8:00–10:00 pm |
| "Venue Z" (TC_05, TC_06) | Orchid Hall (approval) and Cedar Auditorium (rejection) |

Every seeded account uses the seed password, `seedCredential` in
`backend/src/database/cli.ts`.

## Set up first (about 5 minutes)

**Prerequisites:** Node.js 22 or newer, dependencies installed once with
`npm install` at the repo root, and a **local** PostgreSQL 17 server listening
only on your own machine (a native install, or an existing local container such
as `connectsphere-db`). Never use the shared database: the run resets the
database.

You need three Git Bash terminals at the repo root. Each keeps its own
variables, so set `LOCAL_DB` in terminals 1 and 2, to the same value.

1. **Database (terminal 1).** Point `LOCAL_DB` at a local database you can
   throw away, then reset and seed it:

   ```bash
   export LOCAL_DB="postgres://<user>:<local password>@127.0.0.1:<port>/connectsphere_dev_stack"
   cd backend && DATABASE_URL="$LOCAL_DB" npx tsx src/database/cli.ts reset
   ```

   The last lines read `seeded … notifications`.

2. **API (terminal 2).** Start it with **only** the local database. If
   `DATABASE_POOLER_URL` is set, part of the API uses that database instead,
   which may be the shared one, so clear it:

   ```bash
   export LOCAL_DB="postgres://<user>:<local password>@127.0.0.1:<port>/connectsphere_dev_stack"
   unset DATABASE_POOLER_URL
   cd backend && DATABASE_URL="$LOCAL_DB" ADDITIONAL_ALLOWED_ORIGINS="http://127.0.0.1:5173" npx tsx src/dev.ts
   ```

   Wait for `Local API ready`.

3. **Frontend (terminal 3):**

   ```bash
   cd frontend && npx vite --host 127.0.0.1 --port 5173 --strictPort
   ```

Use a normal browser window for Venue Staff and a private window for
`coord_a`, so both can be signed in at once. For each step note pass or
fail. On a fail, copy the exact words you saw.

## A. A rejection needs a reason (TC_E06S04_03)

1. Normal window: open http://127.0.0.1:5173/login and sign in as
   `venue_a@connectsphere.com`. Open http://127.0.0.1:5173/venue/bookings.
   **Booking requests** lists the pending requests, soonest first: Lotus
   Room / EVT-2003 (8 Oct) and **Orchid Hall / EVT-3003 Planning Phase Gala**
   (25 Oct 2026, 6:00 pm – 10:00 pm).
2. Open the Orchid Hall request, then **Decide on request**. Click
   **Reject…**, leave **Reason (required)** empty and click **Reject
   request**. Expect **"Add a reason for rejecting this request."** The
   request stays **Pending**. Click **Cancel**.

## B. Approve a request (TC_E06S04_01, TC_E06S04_05)

3. On the same request click **Approve…**, then **Approve request**. Expect
   a green message **"Approved. The booking is confirmed. Coordinator A has
   been notified."** and the pill **Confirmed**.
4. Check the calendar: open http://127.0.0.1:5173/venue/availability, choose
   **Orchid Hall** and go to **25 Oct 2026**. 6:00–10:00 pm shows as
   **Confirmed** for EVT-3003 Planning Phase Gala.
5. Private window: sign in as `coord_a@connectsphere.com`. The bell shows an
   unread notice **"Venue booking approved"**: "Venue Staff A approved your
   request for Orchid Hall for "EVT-3003 Planning Phase Gala" (25 Oct 2026,
   6:00 pm – 10:00 pm). The booking is now Confirmed."
6. Open http://127.0.0.1:5173/coordinator/events/EVT-3003. In the
   **Activity log**, an entry reads **Booking approved**, **Orchid Hall:
   Pending → Confirmed**, by **Venue Staff A**, with today's time. Keep this
   for the database check in section F.
7. Open http://127.0.0.1:5173/coordinator/events/EVT-3003/venue-bookings.
   Orchid Hall is **Confirmed** and marked **Primary venue** (the first
   Confirmed booking becomes the event's primary venue).

## C. Reject with a reason and a suggestion, then switch (TC_E06S04_02)

8. Private window (`coord_a`): request Lotus Room for EVT-3003. Open
   http://127.0.0.1:5173/coordinator/events/EVT-3003/venues/9bdb27f9-7602-5492-865e-003d21d40ae0/suitability
   (Lotus Room's seeded id). It flags the capacity as advisory. Under
   **Request this venue**, leave **Booking start** 25/10/2026 06:00 pm and
   **Booking end** 25/10/2026 10:00 pm, then click **Request venue
   booking**. Expect **"Booking request submitted"**.
9. Normal window (`venue_a`): reload http://127.0.0.1:5173/venue/bookings,
   open the **Lotus Room / EVT-3003** request, **Decide on request**, then
   **Reject…**. Enter the reason `Capacity too small for expected
   attendance`, choose **Jasmine Hall** in **Suggest another venue
   (optional)** and click **Reject request**. Expect **"Rejected. Coordinator
   A has been notified, with your reason."**
10. Private window (`coord_a`): the bell has **"Venue booking rejected"**:
    "Venue Staff A rejected your request for Lotus Room for "EVT-3003
    Planning Phase Gala" (25 Oct 2026, 6:00 pm – 10:00 pm).", then
    "Reason: Capacity too small for expected attendance" and "Suggested
    alternative: Jasmine Hall".
11. Open http://127.0.0.1:5173/coordinator/events/EVT-3003/venue-bookings.
    Lotus Room is **Rejected**, with **Decision reason** and **Suggested
    venue: Jasmine Hall**, and a **Request suggested venue** button. Click
    it: the form **Request suggested venue** opens with the same times
    already filled in, without a new venue search. Click **Request venue
    booking**. Expect **"Booking request submitted"**. After a reload,
    Lotus Room stays **Rejected** with "A replacement request has already
    been submitted.", and Jasmine Hall is **Pending**.

## D. Approval checks setup and turnaround time (TC_E06S04_04)

12. Private window (`coord_a`): request Cedar Auditorium twice for EVT-3003.
    Open
    http://127.0.0.1:5173/coordinator/events/EVT-3003/venues/e0cc38d1-01fc-56a7-840a-307b5748c500/suitability.
    Set **Booking end** to 25/10/2026 07:30 pm and click **Request venue
    booking** ("Booking request submitted"). Reload the page, set **Booking
    start** to 25/10/2026 08:00 pm and **Booking end** to 10:00 pm, and
    submit again. Both are accepted: with no setup or turnaround time the
    30-minute gap keeps them apart.
13. Normal window: sign out, sign in as `venue_b@connectsphere.com`, open
    http://127.0.0.1:5173/venue/bookings and approve the **Cedar Auditorium
    6:00 pm – 7:30 pm** request (**Approve…**, **Approve request**).
14. **Precondition, not a browser step.** The venue form does not yet have
    setup or turnaround fields (E05-S05), so set Cedar Auditorium's to 30
    and 45 minutes in terminal 1:

    ```bash
    psql "$LOCAL_DB" -c "UPDATE venues SET setup_time_minutes = 30, turnaround_time_minutes = 45 WHERE name = 'Cedar Auditorium'"
    ```

    It prints `UPDATE 1`. (If `psql` isn't on your PATH, use the full path to
    `psql` in your PostgreSQL install's `bin` folder.) The buffered windows
    are now 5:30–8:15 pm and 7:30–10:45 pm, so they overlap even though the
    advertised times don't.
15. Open the **Cedar Auditorium 8:00 pm – 10:00 pm** request and approve it.
    Expect the approval to be refused with **"This can't be approved: with
    setup and turnaround time it overlaps the confirmed booking for "EVT-3003
    Planning Phase Gala" (25 Oct 2026, 6:00 pm – 7:30 pm) at Cedar
    Auditorium."** The request stays **Pending**.

## E. A rejection is recorded (TC_E06S04_06)

16. On the same Cedar 8:00 pm request, **Reject…** with the reason `Venue
    unavailable for maintenance` and no suggestion, then **Reject request**.
    Expect **"Rejected. Coordinator A has been notified, with your reason."**
17. Private window (`coord_a`): open
    http://127.0.0.1:5173/coordinator/events/EVT-3003. The **Activity log**
    has **Booking rejected**, **Cedar Auditorium: Pending → Rejected**, by
    **Venue Staff B**, with today's time.

## F. Compare the Activity log with the database (TC_E06S04_05, TC_E06S04_06)

18. Terminal 1, read-only:

    ```bash
    psql "$LOCAL_DB" -c "SELECT to_char(a.occurred_at AT TIME ZONE 'Asia/Singapore', 'HH24:MI:SS') AS sgt, u.full_name, a.action, v.name AS venue, e.event_code, a.old_value, a.new_value FROM audit_logs a JOIN users u ON u.id = a.actor_id JOIN venue_bookings b ON b.id = a.entity_id JOIN venues v ON v.id = b.venue_id JOIN events e ON e.id = a.event_id WHERE a.entity_type = 'venue_booking' ORDER BY a.occurred_at"
    ```

    Expect one row per decision you made: Orchid Hall **Booking Approved**
    (Venue Staff A), Lotus Room **Booking Rejected** (Venue Staff A), Cedar
    6:00 pm **Booking Approved** and Cedar 8:00 pm **Booking Rejected**
    (Venue Staff B), each for EVT-3003, with times matching the Activity log
    in steps 6 and 17. Take a screenshot of the output.

## G. A release is recorded (TC_E06S04_07)

A Confirmed booking is released only when its event is cancelled (E10-S04,
#320). Run this last, because cancelling makes EVT-3003 read-only. It needs
Orchid Hall Confirmed (step 3); to run it on its own, reset the database and
do step 3 first.

19. Private window (`coord_a`): open
    http://127.0.0.1:5173/coordinator/events/EVT-3003, click **Cancel
    event**, enter a reason and confirm. Expect the pill **Cancelled** and
    **"Event cancelled. Session arrangements have been released and
    notifications queued."**
20. Open http://127.0.0.1:5173/coordinator/events/EVT-3003 again. The
    **Activity log** has **Booking released**, **Orchid Hall: Released**, by
    **Coordinator A**, with today's time; every other booking still Pending or
    Confirmed at that moment gets its own **Booking released** row too.
21. Terminal 1, read-only: run step 18's query again. Each **Booking
    Released** row names Coordinator A, the venue, EVT-3003 and a time
    matching step 20.

## Results table

Copy this into the run record under its frontmatter. Set **Outcome** to
`PASS`, `FAIL`, `SKIP` or `N/A`, and replace the text after the step
numbers in **Remarks** with what you actually saw, even when it passes.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S04_03 | Rejecting a request without a reason is blocked | | Steps 1–2: <what you saw> |
| TC_E06S04_01 | Approving a pending request for a free venue confirms it, updates the calendar and notifies the Coordinator | | Steps 3–5, 7: <what you saw> |
| TC_E06S04_02 | Rejecting with a reason and a suggested venue notifies the Coordinator with both, who can switch without a new search | | Steps 8–11: <what you saw> |
| TC_E06S04_04 | Approval is blocked when the buffered windows overlap a confirmed booking, which is named | | Steps 12–15: <what you saw; note the step 14 SQL precondition> |
| TC_E06S04_05 | An approval is recorded with the actor, action, affected records and time | | Steps 6, 18: <what you saw> |
| TC_E06S04_06 | A rejection is recorded with the actor, action, affected records and time | | Steps 16–18: <what you saw> |
| TC_E06S04_07 | A released booking is recorded with the actor, action, affected records and time | | Steps 19–21: <what you saw> |
