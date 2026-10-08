# E07-S06 manual click-through: request technical support

Manual end-to-end check of E07-S06 "Request technical support for an event"
(story SCRUM-56; this script and its run are subtask SCRUM-147). Run it by
hand in a real browser before the Sprint 3 Review. Then record the run in
`docs/testing/runs/` as `run_type: manual`, `scope: frontend/e2e`,
`database: real`, with the **actual result on every row** (see "Results
table" in `docs/testing/runs/README.md`).

Every message below in **bold** or in quotes was checked against the built
screens on `bfebe7f` (PR #225), on a freshly seeded database. The steps use
the seeded accounts directly (`coord_a`, `coord_b`, `tech_a`, `tech_b`).
Older copies of the test cases name them `coordinator_1`, `coordinator_2`,
`tech_support_1` and `tech_support_2`; PR #230 renames the cases to the
seeded names.

## Set up first (about 5 minutes)

**Prerequisites:** Node.js 22 or newer (the version CI uses), Docker Desktop
running, and the dependencies installed once with `npm install` at the repo
root, which covers both `frontend/` and `backend/`. You need three Git Bash
terminals at the repo root. Use a **local, disposable** database, never the
shared one. The run changes EVT-3001 and EVT-3003, so every run starts from a
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

## A. No technical support needed (TC_E07S06_03)

1. Normal window: open http://127.0.0.1:5173/login and sign in as
   `coord_a@connectsphere.com`. You land on the Coordinator dashboard.
2. Click **EVT-3001 Approved Annual Conference** (pill **Approved**). Scroll
   to the bottom: a card **Technical support** reads "No technical support
   has been requested for this event yet.", with a **Request technical
   support** button at the top right and **No technical support required**
   at the bottom.
3. Click **No technical support required**. Expect a green message
   **"Marked as needing no technical support. Nobody has been notified."**
   and the line **"This event needs no technical support. Nothing is waiting
   to be staffed."** The **No technical support required** button is gone.
4. Press F5 to reload. The green message from step 3 is gone (it shows once)
   and the **No technical support required** button stays hidden, because the
   event is already marked. The card still reads "This event needs no
   technical support. Nothing is waiting to be staffed." **Request technical
   support** is still offered, because a later request would replace the
   declaration.

## B. Request support before the venue is confirmed (TC_E07S06_02, TC_E07S06_01)

EVT-3003's venue booking is still pending, so its venue is not confirmed.

5. Header → **Dashboard**. Click **EVT-3003 Planning Phase Gala** (pill
   **Planning**). The Technical support card reads "No technical support has
   been requested for this event yet."
6. Click **Request technical support**. The page shows the eyebrow
   **EVT-3003**, the heading **Request technical support** and the line "For
   EVT-3003 Planning Phase Gala. Every active Technical Support Staff member
   is notified when you send this. You don't need a confirmed venue first."
   **Support starts** shows 25/10/2026 06:00 pm and **Support ends**
   25/10/2026 10:00 pm, the event's own times.
7. **Blank:** click **Send request** with the description empty. Expect a red
   alert **"Check the highlighted fields and try again."** and, under the
   box, **"Describe the technical support the event needs."**
8. **Too long:** press F12 → Console, type `copy('a'.repeat(2001))` and press
   Enter. Paste into **What support is needed** and click **Send request**.
   Expect **"The description must be 2000 characters or fewer."** under the
   box.
9. **Reversed times:** replace the description with this text, typed exactly
   (no quotes): `1 AV technician for the full event`. Set **Support ends** to the same time as **Support starts**
   (25/10/2026 06:00 pm) and click **Send request**. Expect **"Support must
   end after it starts."** under Support ends.
10. Set **Support ends** back to 25/10/2026 10:00 pm and click **Send
    request**. The button briefly reads **Sending…**. You're back on the
    EVT-3003 page with a green message **"Technical support requested"** /
    **"2 Technical Support Staff members have been notified."** The card lists
    "1 AV technician for the full event", "25 Oct 2026, 6:00 pm – 10:00 pm"
    and the pill **Awaiting a technician**.

## C. Technical Support Staff are notified (TC_E07S06_01)

11. Private window: sign in as `tech_a@connectsphere.com`. The bell in the
    header shows **1** unread. Click it, then click **Technical support
    requested**. It reads **"EVT-3003 needs technical support: 1 AV
    technician for the full event"**.
12. Sign out, then sign in as `tech_b@connectsphere.com` and repeat step 11.
    Same notice.

## D. Refusals

13. Private window: sign out, then sign in as `coord_b@connectsphere.com`. Open
    http://127.0.0.1:5173/coordinator/events/EVT-3003. Expect **Event
    unavailable**, **Access refused** and **"Access denied. This event is not
    assigned to you."** with **Back to dashboard**. Open
    http://127.0.0.1:5173/coordinator/events/EVT-3003/support: the same
    refusal, and no form.
14. Normal window (coord_a): open
    http://127.0.0.1:5173/coordinator/events/EVT-2001 (pill **Confirmed**).
    The Technical support card reads "No technical support has been requested
    for this event yet." and **"Technical support can only be arranged while
    an approved event is being planned."**, with no buttons.
15. Open http://127.0.0.1:5173/coordinator/events/EVT-2001/support. The same
    sentence, a **Back to event** button, and no form.

## Results table

Copy this into the run record under its frontmatter. It uses the four columns
every run record must have (`TC_ID | Test Name | Outcome | Remarks`, checked
by `scripts/check_test_run_records.py`). For each row, set **Outcome** to
`PASS`, `FAIL`, `SKIP` or `N/A`. Then replace the text after the step
numbers in **Remarks** with what you actually saw, even when it passes.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S06_03 | Marking an event as needing no technical support creates no request and doesn't block confirmation | | Steps 1–4: <what you saw> |
| TC_E07S06_02 | Submitting a support request before the venue is confirmed is accepted | | Steps 5–6, 10: <what you saw> |
| TC_E07S06_01 | Submitting a support request describing the support and times notifies Technical Support Staff and records it against the event | | Steps 10–12: <what you saw> |
| MULTIPLE | Form rejects a blank, too-long or reversed request | | Steps 7–9: <what you saw> |
| MULTIPLE | Another Coordinator is refused; a confirmed event is read-only | | Steps 13–15: <what you saw> |

The "doesn't block confirmation" part of TC_E07S06_03 depends on E08-S03,
which isn't built yet. This run checks the part E07-S06 owns: nothing is left
waiting to be staffed.
