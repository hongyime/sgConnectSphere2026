# E07-S07 manual click-through: assign and manage technical staff

Manual end-to-end check of E07-S07 "Assign and manage technical staff for an
event" (story SCRUM-57; this script and its run are subtask SCRUM-151). Run it
by hand in a real browser before the Sprint 3 Review. Then record the run in
`docs/testing/runs/` as `run_type: manual`, `scope: frontend/e2e`,
`database: real`, with the **actual result on every row** (see "Results
table" in `docs/testing/runs/README.md`).

Every message below in **bold** or in quotes was checked against the screens
on `main` at `e244681` (#227 and #228), on a freshly seeded database. The steps
use the seeded accounts directly: `coord_a` (Coordinator), and `tech_a` and
`tech_b` (Technical Support A and B). The seed has no support requests, so
part A creates them through the E07-S06 screens. The seed has only two
technicians, so TC_E07S07_05's "replacement also blocked" variant (a third
technician with a clash) is covered by the automated tests
(`tests/auth-e2e/technicalSupport.spec.ts`), not here.

## Set up first (about 5 minutes)

**Prerequisites:** Node.js 22 or newer (the version CI uses), Docker Desktop
running, and the dependencies installed once with `npm install` at the repo
root, which covers both `frontend/` and `backend/`. You need three Git Bash
terminals at the repo root. Use a **local, disposable** database, never the
shared one. The run adds support requests and assignments to EVT-3001 and EVT-3003, so every run starts from a
fresh seed.

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

   The last lines read `seeded … notifications`.

2. **API (terminal 2).** Set `LOCAL_DB` again here, because terminal 1's
   variable isn't visible in this terminal:

   ```bash
   export LOCAL_DB="postgres://postgres:<local password>@127.0.0.1:55433/connectsphere_dev_stack"
   cd backend && DATABASE_URL="$LOCAL_DB" ADDITIONAL_ALLOWED_ORIGINS="http://127.0.0.1:5173" npx tsx src/dev.ts
   ```

   If sign-in later fails and this terminal shows `DATABASE_URL is not
   configured`, `LOCAL_DB` wasn't set here: stop the API, set it, and start
   the API again.

   Wait for `Local API ready`. Without `ADDITIONAL_ALLOWED_ORIGINS`, sign-in
   is refused by the origin check.

3. **Frontend (terminal 3):**

   ```bash
   cd frontend && npx vite --host 127.0.0.1 --port 5173 --strictPort
   ```

4. Every seeded account uses the seed password, `seedCredential` in
   `backend/src/database/cli.ts`.

Use a normal browser window for the Coordinator and a private window for the
other accounts, so two people can be signed in at once. For each step note
pass or fail. On a fail, copy the exact words you saw.


## A. Set up two overlapping support requests (as the Coordinator)

1. Normal window: open http://127.0.0.1:5173/login and sign in as
   `coord_a@connectsphere.com`.
2. Open http://127.0.0.1:5173/coordinator/events/EVT-3003/support. Type
   `1 AV technician for the full event` in **What support is needed**. Keep
   the times (25/10/2026 06:00 pm to 10:00 pm) and click **Send request**.
   Expect **"Technical support requested"** and **"2 Technical Support Staff
   members have been notified."**
3. Open http://127.0.0.1:5173/coordinator/events/EVT-3001/support. Type
   `1 AV technician for the evening reception`. Set **Support starts** to
   25/10/2026 07:00 pm and **Support ends** to 25/10/2026 11:00 pm, which
   overlaps step 2. Click **Send request**. The card lists the request at
   "25 Oct 2026, 7:00 pm – 11:00 pm" with **Awaiting a technician**.
4. **Refusal:** open http://127.0.0.1:5173/support/technicians. Expect
   **Access refused** and **"Access denied. Only Technical Support Staff can
   assign technicians."**

## B. Assign a free colleague (TC_E07S07_01)

5. Private window: sign in as `tech_a@connectsphere.com`. In the header,
   click **Technician staffing**. If the header is too narrow to show it, open
   http://127.0.0.1:5173/support/technicians. Under **Needs a technician**
   (2), the table lists **EVT-3003 Planning Phase Gala** and **EVT-3001
   Approved Annual Conference**, each with "None yet".
6. Click **EVT-3001 Approved Annual Conference**. **Assigned technicians**
   reads "Nobody is assigned yet." Under **Colleagues**, Technical Support A
   and Technical Support B both read "Free for these times" with
   **Available**.
7. On Technical Support B's row, click **Assign…**. A panel asks **"Assign
   Technical Support B?"** with "Technical Support B will be notified and the
   event added to their schedule for 25 Oct 2026, 7:00 pm – 11:00 pm." Click
   **Assign technician**. Expect **"Technical Support B is assigned and has
   been notified. It's on their schedule."**, the pill **Staffed**, and
   Technical Support B under **Assigned technicians**.

## C. The colleague's schedule and notice (TC_E07S07_02, TC_E07S07_06)

8. Sign out, then sign in as `tech_b@connectsphere.com` in the private
   window. Open **Technician staffing**, then **My schedule**. Under
   **Upcoming**: **EVT-3001 Approved Annual Conference**, "25 Oct 2026,
   7:00 pm – 11:00 pm · 1 AV technician for the evening reception".
9. Open the bell (notifications). Click **Technical support assignment**. It
   reads **"You're assigned to EVT-3001 Approved Annual Conference: 1 AV
   technician for the evening reception"**.

## D. An overlapping colleague is refused (TC_E07S07_03)

10. Sign out, then sign in as `tech_a@connectsphere.com`. Open **Technician
    staffing** and click **EVT-3003 Planning Phase Gala**. Under
    **Colleagues**, Technical Support B reads **"Busy: EVT-3001 Approved
    Annual Conference, 25 Oct 2026, 7:00 pm – 11:00 pm"** with **Overlapping
    assignment**.
11. On Technical Support B's row click **Assign…**, then **Assign technician**.
    Expect, inside the panel: **"Technical Support B is already assigned to
    EVT-3001 Approved Annual Conference at an overlapping time."** Nobody is
    added. Click **Cancel**.

## E. Remove an assignment (TC_E07S07_04)

12. Back to **Technician staffing**, click the **All** filter, then **EVT-3001
    Approved Annual Conference**. Under **Assigned technicians**, click
    **Remove…** on Technical Support B. The panel reads **"Remove Technical
    Support B?"** and "Technical Support B will be notified, and their time is
    freed for other events." Click **Remove assignment**.
13. Expect **"Technical Support B is no longer assigned and has been notified.
    Their time is free again."**, "Nobody is assigned yet." and the pill
    **Needs a technician**.

## F. The replacement goes through the same check (TC_E07S07_05)

14. Open **EVT-3003 Planning Phase Gala** again. Technical Support B now reads
    **"Free for these times"**: the same check that refused them in step 11
    now finds no clash.
15. Assign Technical Support B (**Assign…** → **Assign technician**). Expect
    **"Technical Support B is assigned and has been notified. It's on their
    schedule."**

## G. The removal notice (TC_E07S07_06)

16. Sign in as `tech_b@connectsphere.com` again and open the notifications.
    There is a second **Technical support assignment**, for EVT-3003, and a
    separate **Technical support assignment removed**. Clicking the removal
    reads "You're no longer assigned to EVT-3001 Approved Annual Conference.
    That time is free again." **My schedule** now lists only **EVT-3003
    Planning Phase Gala**.

## Results table

Copy this into the run record under its frontmatter. It uses the four columns
every run record must have (`TC_ID | Test Name | Outcome | Remarks`, checked
by `scripts/check_test_run_records.py`). For each row, set **Outcome** to
`PASS`, `FAIL`, `SKIP` or `N/A`. Then replace the text after the step numbers
in **Remarks** with what you actually saw, even when it passes.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S07_01 | A colleague with no conflicting assignment is assigned | | Steps 5–7: <what you saw> |
| TC_E07S07_02 | The assignment shows on the assigned staff member's schedule | | Step 8 (and 16): <what you saw> |
| TC_E07S07_03 | Assigning a colleague with an overlapping assignment is blocked, conflicting event identified | | Steps 10–11: <what you saw> |
| TC_E07S07_04 | Removing an assignment frees the slot | | Steps 12–13: <what you saw> |
| TC_E07S07_05 | A replacement goes through the same conflict check | | Steps 14–15: <what you saw> |
| TC_E07S07_06 | The staff member is notified when assigned and when removed | | Steps 9 and 16: <what you saw> |
| MULTIPLE | A Coordinator cannot open technician staffing | | Step 4: <what you saw> |
