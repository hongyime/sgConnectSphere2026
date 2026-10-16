# E03-S12 manual click-through: Organiser save success status

Manual end-to-end check of E03-S12 "Show consistent Organiser save success
status" (definition and TC_E03S12_01 to _05 in PR #296). Run it by hand in a
real browser, taking every screenshot yourself (T-93). Then record the run in
`docs/testing/runs/` as `run_type: manual`, `scope: frontend/e2e`,
`database: real`, with the **actual result on every row**, and keep the
screenshots under `docs/testing/runs/evidence/<record filename without .md>/`,
named by TC_ID.

## Seeded data used

| Test case says | This run uses |
| --- | --- |
| "the event's Organiser", a Submitted event "Planning event" | `organiser_a@clienta.com` and **EVT-101 Client A Planning Event** (Submitted) |
| an Approved event the Organiser owns | **EVT-3001 Approved Annual Conference** |
| the Coordinator's existing save confirmation | `coord_a@connectsphere.com` editing EVT-3001 |

Every seeded account uses the seed password, `seedCredential` in
`backend/src/database/cli.ts`.

## Set up first (about 5 minutes)

Use the same three-terminal set-up as `E06-S04-click-through.md` ("Set up
first"): a **local** PostgreSQL database reset and seeded with
`npx tsx src/database/cli.ts reset`, the API started with only
`DATABASE_URL` (and `DATABASE_POOLER_URL` unset), and the frontend on
http://127.0.0.1:5173. Run it from this branch, so the frontend includes the
change. Keep terminal 1's `LOCAL_DB` for the read-only checks below.

The read-only check used in several steps (it counts and lists EVT-101's
recorded title edits):

```bash
psql "$LOCAL_DB" -c "SELECT to_char(a.occurred_at AT TIME ZONE 'Asia/Singapore', 'HH24:MI:SS') AS sgt, a.new_value FROM audit_logs a JOIN events e ON e.id = a.entity_id WHERE e.event_code = 'EVT-101' AND a.field_changed = 'title' ORDER BY a.occurred_at"
```

Run it once now: it shows **0 rows**.

## A. The saved message is a green success Alert (TC_E03S12_01)

1. Open http://127.0.0.1:5173/login and sign in as `organiser_a@clienta.com`.
   Open http://127.0.0.1:5173/events/EVT-101 and click **Edit event**.
2. Change **Event name** to `EVT-101 Updated planning event` and click
   **Save changes**. The page reloads the event, then shows a **green**
   message with a tick: **"Saved your changes to the event name. The
   activity log has been updated."**
3. Press F12, right-click the green message → **Inspect**. Its box has the
   classes `ui-alert ui-alert-success` and `role="status"`. Screenshot the
   message and the Elements panel.
4. For comparison, in a private window sign in as `coord_a@connectsphere.com`,
   open http://127.0.0.1:5173/coordinator/events/EVT-3001, edit the
   description and save. Its green confirmation looks the same.

## B. The save is kept and recorded once (TC_E03S12_02)

5. Organiser window: press F5. The heading still reads **EVT-101 Updated
   planning event**, and the Activity log has one title edit.
6. Run the read-only check: **1 row**, `EVT-101 Updated planning event`.
   Showing or reloading the green message added nothing.

## C. Invalid input never claims success (TC_E03S12_03)

7. Click **Edit event**. The green message from step 2 disappears. Clear
   **Event name** and click **Save changes**. Expect **"Event name can't be
   left empty."** under the field, and no green message.
8. Click **Cancel**, press F5, and run the read-only check: still **1 row**.

## D. A failed save after a success shows only the error (TC_E03S12_04)

9. Click **Edit event**, change **Event name** to `First change` and save:
   the green message returns. Click **Edit event** again: it disappears.
10. Change **Event name** to `Failed second change`. **Before saving**, stop
    the API: press Ctrl+C in terminal 2. Now click **Save changes**. Expect
    a red message beginning **"Unable to save your changes."** and no green
    message.
11. Start the API again (the same command in terminal 2) and wait for
    `Local API ready`. Click **Cancel** and press F5: the heading reads
    **First change**. The read-only check shows **2 rows** (`EVT-101 Updated
    planning event`, `First change`) and nothing for `Failed second change`.

## E. Cancel and restricted fields are unchanged (TC_E03S12_05)

12. Open http://127.0.0.1:5173/events/EVT-3001 (Approved) and click **Edit
    event**. Change **Event name**, then click **Cancel**. No green message
    appears. Press F5: the name is unchanged.
13. Click **Edit event** again. **Starts** and **Ends** are locked, each with
    "This field is restricted after approval. Request a change." Click
    **Request a change**: it opens the change request form for EVT-3001.

## Results table

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E03S12_01 | Organiser sees the shared success Alert after an allowed edit | | Steps 1–4: <what you saw> |
| TC_E03S12_02 | Saved edit persists and its audit entry is not duplicated by feedback | | Steps 5–6: <what you saw> |
| TC_E03S12_03 | Invalid input retains validation feedback without success | | Steps 7–8: <what you saw> |
| TC_E03S12_04 | Failed request after a prior success cannot leave a false confirmation | | Steps 9–11: <what you saw; the failure was made by stopping the API, not an HTTP 500> |
| TC_E03S12_05 | Cancellation and post-approval restrictions remain unchanged | | Steps 12–13: <what you saw> |
