# E08-S04 manual click-through: revert a confirmed event to planning

Manual end-to-end check of E08-S04 "Revert a confirmed event to planning"
(story SCRUM-61; this run is subtask SCRUM-235, code in #377 and SCRUM-242/243).
Run it by hand in a real browser, then record it in `docs/testing/runs/`
(`run_type: manual`, `scope: frontend/e2e`, `database: real`), with the actual
result on every row and hand-taken screenshots (T-93) named by TC_ID for each
PASS or FAIL row.

## Set up first

Use the native local PostgreSQL database `connectsphere_dev_stack` on
127.0.0.1:5432 (never Docker, never the shared Supabase project). Reset and
seed it, then load this story's setup (setup only, never a test step):

```bash
# from backend/, with DATABASE_URL set to the local connectsphere_dev_stack URL
DATABASE_URL="<local URL>" DATABASE_POOLER_URL= npx tsx src/database/cli.ts reset
psql "<local URL>" -q -v stage=setup -f ../docs/testing/manual/E08-S04-preconditions.sql
```

It prints four Confirmed events: **EVT-1081 Leadership Summit**, **EVT-1082
Charity Run**, **EVT-1083 Leadership Briefing** and **EVT-1084 Leadership
Seminar**. Each was submitted by coord_a and approved by the Safety Officer, so
its Activity log already holds that approval. Start the API with only
`DATABASE_URL` (leave `DATABASE_POOLER_URL` empty, add
`ADDITIONAL_ALLOWED_ORIGINS=http://localhost:5173`) and Vite on
http://localhost:5173. Every account uses the seed password
(`tests/seed/SEED_DATA.md`).

| Account | Role |
| --- | --- |
| `coord_a@connectsphere.com` | Event Coordinator assigned to every E08 event |
| `organiser_a@clienta.com` | Event Organiser of every E08 event |
| `attendee_a@example.com` | Attendee Registered for EVT-1081 |
| `venue_a@connectsphere.com` | Venue Staff for every E08 venue |
| `tech_a@connectsphere.com` | Technical Support Staff (EVT-1082's support, the equipment) |
| `safety_officer@connectsphere.com` | Safety Officer |

Fixture substitutions: the cases name `coordinator_1`, `venue_staff_1` and
`tech_support_1`, which the seed does not have; use the seed accounts above,
which have the same roles. Separate events replace the cases' single "Leadership
Summit" so they do not affect each other: EVT-1083 Leadership Briefing for
TC_E08S04_03 and EVT-1084 Leadership Seminar for TC_E08S04_06. TC_E08S04_04
signs in as a System Administrator, a role the app does not have: read the
reversion in the assigned Coordinator's Activity log instead. Say so in the run
record.

Do the sections in order. Times are Singapore time.

## A. TC_E08S04_01, _02, _04 — revert Leadership Summit with a reason (EVT-1081)

1. Sign in as `coord_a@connectsphere.com`. Open
   http://localhost:5173/coordinator/events/EVT-1081. The status is **Confirmed**.
2. Click **Revert to Planning**. Enter the reason `Venue reported a plumbing
   issue`. Click **Revert to Planning** in the box.
3. **Expected (TC_E08S04_01):** the status is **Planning**. Screenshot
   `TC_E08S04_01-1` (the event page).
4. **Expected (TC_E08S04_04):** the Activity log on the same page has a
   **Reverted to Planning** entry by Coordinator A with the date and time.
   Screenshot `TC_E08S04_04-1`.
5. Sign in as `organiser_a@clienta.com`, open **Notifications**.
   **Expected (TC_E08S04_01):** "Event reverted to planning: Coordinator A
   reverted EVT-1081 Leadership Summit to Planning. Reason: Venue reported a
   plumbing issue". Screenshot `TC_E08S04_01-2`.
6. Sign in as `attendee_a@example.com`, open **Notifications**.
   **Expected (TC_E08S04_02):** "Leadership Summit: Previously confirmed
   arrangements are being revised", without the reason. Screenshot `TC_E08S04_02-1`.

## B. TC_E08S04_03 — a Technical Support failure is flagged, the event stays Confirmed (EVT-1083)

1. Sign in as `tech_a@connectsphere.com`. Open **Catalogue**
   (http://localhost:5173/support/catalogue), open **E08 AV Projector**, click
   **Mark unavailable**.
2. From `8 Dec 2026`, To `8 Dec 2026`, Units to take out `1`, Reason `Lamp
   failed`. Click **Mark unavailable**. You see "E08 AV Projector × 1 out of
   service for 8 Dec 2026". Screenshot `TC_E08S04_03-1`.
3. Sign in as `coord_a@connectsphere.com`. Open
   http://localhost:5173/coordinator/events/EVT-1083/readiness.
4. **Expected:** the status is still **Confirmed**; Outstanding items lists
   "E08 AV Projector — needs review: stock changed"; E08 Briefing Room is
   **Ready**. Nothing reverted it. Screenshot `TC_E08S04_03-2`.

## C. TC_E08S04_05 — Charity Run comes back to Safety Review by itself (EVT-1082)

1. Sign in as `coord_a@connectsphere.com`. Open
   http://localhost:5173/coordinator/events/EVT-1082. Click **Revert to
   Planning**, reason `The run has to move a week`, confirm. The status is
   **Planning**.
2. Click **Edit details**. Change **Starts** to 12 Dec 2026 07:00 and **Ends**
   to 12 Dec 2026 12:00. Click **Save changes**. The "Check what this change
   affects" box lists **E08 Charity Hall** and **E08 Projector**. Click **Save
   and ask staff to reconfirm**: "2 arrangements were flagged for
   reconfirmation". Screenshot `TC_E08S04_05-1`.
3. Sign in as `venue_a@connectsphere.com`. Open **Booking requests**
   (http://localhost:5173/venue/bookings). Under **Bookings to reconfirm**,
   Charity Run shows E08 Charity Hall booked for 5 Dec and to reconfirm for
   12 Dec. Screenshot `TC_E08S04_05-2`.
4. Click **Reconfirm…**, then **Reconfirm booking**. **Expected:**
   "Reconfirmed E08 Charity Hall for "Charity Run" (12 Dec 2026, 7:00 am –
   12:00 pm). The Coordinator was notified." with no Safety Review sentence,
   because the projector is still outstanding. Screenshot `TC_E08S04_05-3`.
5. Sign in as `coord_a@connectsphere.com`. Open
   http://localhost:5173/coordinator/events/EVT-1082/readiness. **Expected:**
   still **Planning**, Outstanding items "E08 Projector — needs review".
   Screenshot `TC_E08S04_05-4`.
6. Sign in as `tech_a@connectsphere.com`. Open
   http://localhost:5173/support/events/EVT-1082/equipment, click **Change E08
   Projector reservation**, keep 2, click **Save reservation**. Screenshot
   `TC_E08S04_05-5`.
7. Sign in as `coord_a@connectsphere.com`. Open the readiness page again.
   **Expected:** the status is **Safety Review**, "This event is in Safety
   Review. It is confirmed only once the Safety Officer approves it.", and no
   **Submit for safety check** button: nobody submitted it. Screenshot
   `TC_E08S04_05-6`.
8. Sign in as `safety_officer@connectsphere.com`, open **Notifications**.
   **Expected:** "Safety check needed: EVT-1082 Charity Run's arrangements are
   confirmed again, so it is back in Safety Review. It needs a new Operational
   Safety Check: the earlier approval does not carry over." Screenshot
   `TC_E08S04_05-7`.

## D. TC_E08S04_06 — a venue block returns Leadership Seminar to Planning (EVT-1084)

1. Sign in as `venue_a@connectsphere.com`. Open **Maintenance blocks**
   (http://localhost:5173/venue/blockout), choose **E08 Seminar Hall**.
2. Start date `10 Dec 2026`, Start time `00:00`, End date `10 Dec 2026`, End
   time `23:59`, Reason category **Maintenance**, Note `Burst pipe`. Click
   **Save unavailability**. **Expected:** Affected events lists Leadership
   Seminar, **Returned to Planning**, Coordinator notified. Screenshot
   `TC_E08S04_06-1`.
3. Sign in as `coord_a@connectsphere.com`. Open
   http://localhost:5173/coordinator/events/EVT-1084. **Expected:** the status
   is **Planning**, not Cancelled. Screenshot `TC_E08S04_06-2`.
4. Open **Notifications**. **Expected:** "Venue unavailable: E08 Seminar Hall
   is unavailable 10 Dec 2026 … The event has returned to Planning."
   Screenshot `TC_E08S04_06-3`.

## E. After the venue loss, a replacement puts it back in Safety Review (EVT-1084)

Not a numbered case: it proves Scenarios 5 and 4 together (record as MULTIPLE).

1. Still as `coord_a`, open
   http://localhost:5173/coordinator/events/EVT-1084/venue-recovery. Click
   **Search for a replacement venue**, then **Search venues**. On **E08 Garden
   Hall**, click **Check recorded event requirements**, then **Submit booking
   request**: "Your request is Pending." Screenshot `MULTIPLE-1`.
2. Sign in as `venue_a@connectsphere.com`. Open **Booking requests**, open
   Leadership Seminar, click **Decide on request**, **Approve…**, **Approve
   request**: "Approved. The booking is confirmed. Coordinator A has been
   notified." Screenshot `MULTIPLE-2`.
3. Sign in as `coord_a@connectsphere.com`. Open
   http://localhost:5173/coordinator/events/EVT-1084/readiness. **Expected:**
   still **Planning**, Outstanding items "E08 Seminar Hall — Conflicting".
   Screenshot `MULTIPLE-3`.
4. Open the venue-recovery page, click **Cancel original booking**, then
   **Confirm cancellation**. Open the readiness page. **Expected:** **Safety
   Review**, with no submission. Screenshot `MULTIPLE-4`.
5. Sign in as `safety_officer@connectsphere.com`, open **Notifications**:
   "Safety check needed: EVT-1084 Leadership Seminar's arrangements are
   confirmed again …". Screenshot `MULTIPLE-5`.

## Check the database afterwards

```bash
psql "<local URL>" -q -v stage=check -f docs/testing/manual/E08-S04-preconditions.sql
```

Expected: EVT-1081 `planning`; EVT-1082 and EVT-1084 `safety_review`; EVT-1083
`confirmed` with its E08 AV Projector still flagged; the Charity Hall booking on
12 Dec and not flagged; E08 Seminar Hall `released` and E08 Garden Hall
`confirmed`. The status history keeps each earlier approval, and EVT-1082 and
EVT-1084 end with one **Entered Safety Review after reconfirmation**.
