# E06-S05 manual click-through: hold a venue tentatively

Manual end-to-end check of E06-S05 "Hold a venue tentatively" (story SCRUM-49;
this script and its run are subtask SCRUM-144). Run it by hand in a real
browser before the Sprint 3 Review. Then record the run in
`docs/testing/runs/` as `run_type: manual`, `scope: frontend/e2e`,
`database: real`, with the **actual result on every row** (see "Results
table" in `docs/testing/runs/README.md`).

Every message below in **bold** or in quotes was checked against the screens
of #245 and #252 on a freshly seeded database. The steps use the seeded
accounts directly: `coord_a` (Coordinator A) and `venue_a` (Venue Staff A).
Older copies of the test cases name them `coordinator_1` and `venue_staff_1`;
#230 is renaming them to the seeded names. Times that depend on when you run
the script are written as "48 hours from now" and so on: check the date and
time are about right, then copy what you saw into the results table.

This sprint keeps the Sprint 3 hold rules (T-92): a 48-hour default expiry,
a chosen expiry from 1 hour to 14 days, and unlimited logged extensions. The
Week 9 rules in T-84 are Sprint 4 work and are not tested here.

Covered by the automated tests instead of this script:
- **A different Coordinator** refused the same slot (TC_E06S05_01's exact
  setup). The seed gives Coordinator B no approved or planning event, so step 7
  refuses a second hold by the same Coordinator; the other-Coordinator case
  runs in `tests/auth-e2e/venueHolds.spec.ts`.
- **The calendar** showing a live hold as Tentative and an expired one as Free,
  the **expiry job** and its notice (TC_E06S05_05/_06), and the deadline races:
  `backend/tests/venueHolds.integration.test.ts`.

## Set up first (about 5 minutes)

**Prerequisites:** Node.js 22 or newer (the version CI uses), Docker Desktop
running, and the dependencies installed once with `npm install` at the repo
root. You need three Git Bash terminals at the repo root, with the branch of
#252 checked out (it includes #245). Use a **local, disposable** database,
never the shared one. The run adds holds to EVT-3003, so every run starts
from a fresh seed.

Each terminal keeps its own environment variables, so `LOCAL_DB` is set in
**both** terminals 1 and 2 below. Set it to the same value in each.

1. **Database (terminal 1).** Start a local PostgreSQL container once, with
   any password you like; it only listens on your own machine:

   ```bash
   docker run -d --name connectsphere-test-pg -e POSTGRES_PASSWORD=<local password> \
     -p 127.0.0.1:55433:5432 postgres:17
   docker exec connectsphere-test-pg psql -U postgres -c "CREATE DATABASE connectsphere_dev_stack"
   ```

   If the container already exists, `docker start connectsphere-test-pg` is
   enough. Then reset and seed it:

   ```bash
   export LOCAL_DB="postgres://postgres:<local password>@127.0.0.1:55433/connectsphere_dev_stack"
   cd backend && DATABASE_URL="$LOCAL_DB" npx tsx src/database/cli.ts reset
   ```

   The output includes `applied migration 0013_tentative_venue_holds.sql`, and
   the last lines read `seeded … notifications`.

2. **API (terminal 2).** Set `LOCAL_DB` again here:

   ```bash
   export LOCAL_DB="postgres://postgres:<local password>@127.0.0.1:55433/connectsphere_dev_stack"
   cd backend && DATABASE_URL="$LOCAL_DB" ADDITIONAL_ALLOWED_ORIGINS="http://127.0.0.1:5173" npx tsx src/dev.ts
   ```

   Wait for `Local API ready`. If sign-in later fails and this terminal shows
   `DATABASE_URL is not configured`, `LOCAL_DB` wasn't set here.

3. **Frontend (terminal 3):**

   ```bash
   cd frontend && npx vite --host 127.0.0.1 --port 5173 --strictPort
   ```

4. Every seeded account uses the seed password, `seedCredential` in
   `backend/src/database/cli.ts`.

Use a normal browser window for the Coordinator and a private window for Venue
Staff. For each step note pass or fail. On a fail, copy the exact words you saw.

## A. Hold a free venue (TC_E06S05_03)

1. Normal window: open http://127.0.0.1:5173/login and sign in as
   `coord_a@connectsphere.com`.
2. Open http://127.0.0.1:5173/coordinator/events/EVT-3003. The **Venue holds**
   card reads "No venue is held for this event. A hold keeps a venue for 48
   hours while you finalise the arrangements."
3. In that card, click **Find a venue to hold**, then **Search venues**.
   **Orchid Hall** shows **Unavailable** (it already has a booking request for
   this event) and has no **Hold this venue** link. **Cedar Auditorium** shows
   **Suitable** with **Hold this venue**.
4. On Cedar Auditorium, click **Hold this venue**. The page **Hold a venue
   tentatively** opens with **Hold starts** 25/10/2026 06:00 pm, **Hold ends**
   25/10/2026 10:00 pm (the event's own times) and **Hold expires after** set
   to **48 hours from now (default)**.

## B. The form's checks and a second hold (TC_E06S05_01, O-31)

5. Set **Hold expires after** to **Choose a date and time**. In **Hold
   expires**, enter a time 30 minutes from now and click **Hold venue**.
   Expect **"Check the highlighted fields and try again."** and, under the
   field, **"A hold must last at least 1 hour from now."** Nothing is saved.
6. Set **Hold expires after** back to **48 hours from now (default)** and click
   **Hold venue**. You're back on the event page with **Venue held**: "Cedar
   Auditorium is held tentatively until <48 hours from now>. Submit a booking
   request before then to keep it." The card lists **Cedar Auditorium**,
   "25 Oct 2026, 6:00 pm – 10:00 pm", the pill **Tentative · expires <48 hours
   from now>**, and the buttons **Submit booking request** and **Release**.
7. **Second hold refused:** press the browser's **Back** button once, to the
   hold form, and click **Hold venue** again. Expect **"This venue can't be
   held"** and **"This venue is unavailable from 25 Oct 2026, 6:00 pm to
   25 Oct 2026, 10:00 pm, including setup and turnaround."** The other event's
   name is not shown (T-102).
   No second hold appears on the event page.

## C. Venue Staff move the expiry later (TC_E06S05_07)

8. Private window: sign in as `venue_a@connectsphere.com`. In the header,
   click **Tentative holds** (scroll the header sideways on a narrow screen).
   The page **Tentative holds** lists **Cedar Auditorium** with **Expires <48
   hours from now>**, **Event** "EVT-3003 Planning Phase Gala" and **Held for**
   "25 Oct 2026, 6:00 pm – 10:00 pm".
9. Click **Change expiry**. In **New expiry** enter a time 2 hours from now
   and click **Save new expiry**. Expect **"Choose a later expiry than the
   current one."** under the field.
10. Change **New expiry** to 3 days from now and click **Save new expiry**.
    Expect **Expiry changed**: "The hold on Cedar Auditorium now expires <3
    days from now>. The change is recorded in the event's activity log."

## D. Submit the booking request (TC_E06S05_04)

11. Normal window: reload the event page. The pill now reads **Tentative ·
    expires <3 days from now>**. In the **Activity log** at the bottom, two
    rows:
    - **Tentative hold placed on Cedar Auditorium** · "Hold expires <the
      first expiry>" · Coordinator A
    - **Tentative hold on Cedar Auditorium extended** · "Hold expiry: <first
      expiry> → <new expiry>" · Venue Staff A
12. Click **Submit booking request**. Expect **"Booking request submitted for
    Cedar Auditorium. The hold no longer expires."** After the list reloads (a
    moment), Cedar Auditorium has left the list: it's a booking request now,
    not a hold, and the card reads "No venue is held for this event…" again.

## E. Release a hold (Scenario 4)

13. Click **Find a venue to hold**, **Search venues**, then **Hold this venue**
    on **Lotus Room**, and **Hold venue**. Lotus Room is listed as
    **Tentative**.
14. Click **Release**. The row asks **"Release this hold?"**. Click **Keep**:
    nothing changes. Click **Release** again, then **Release hold**. Expect
    **"Hold on Lotus Room released. The period is free again."** and Lotus
    Room leaves the list.

## F. A passed expiry (TC_E06S05_05, display only)

15. Hold **Jasmine Hall** the same way as step 13. Then, in terminal 1, move
    every live hold's expiry into the past (the expiry job doesn't run in this
    local setup; the database decides, so this is the same as waiting):

    ```bash
    docker exec connectsphere-test-pg psql -U postgres -d connectsphere_dev_stack \
      -c "UPDATE venue_bookings SET expires_at = now() - interval '1 minute' WHERE status = 'tentative'"
    ```

    It prints `UPDATE 1`.
16. Reload the event page. Jasmine Hall shows the pill **Expired <a minute
    ago>** and "This hold no longer holds the venue. Place a new hold if it's
    still needed.", with no buttons.

## Results table

Copy this into the run record under its frontmatter. It uses the four columns
every run record must have (`TC_ID | Test Name | Outcome | Remarks`, checked
by `scripts/check_test_run_records.py`). For each row, set **Outcome** to
`PASS`, `FAIL`, `SKIP` or `N/A`. Then replace the text after the step numbers
in **Remarks** with what you actually saw, even when it passes.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S05_03 | A new hold carries a 48-hour expiry that Venue Staff can change | | Steps 2–6 and 8–10: <what you saw> |
| TC_E06S05_01 | A second hold on the same venue and period is refused, naming the hold | | Step 7: <what you saw> |
| TC_E06S05_04 | Submitting a booking request completes the hold so it no longer expires | | Steps 11–12: <what you saw> |
| TC_E06S05_07 | Venue Staff can extend an unexpired hold, and the extension is logged | | Steps 9–11: <what you saw> |
| TC_E06S05_05 | A hold whose expiry has passed no longer holds the venue | | Steps 15–16 (display only): <what you saw> |
| MULTIPLE | An expiry under 1 hour is refused; a hold can be released | | Steps 5, 13–14: <what you saw> |
