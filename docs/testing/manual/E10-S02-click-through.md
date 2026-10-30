# E10-S02 manual click-through: minor edits versus arrangement-affecting changes

Manual end-to-end check of E10-S02 "Distinguish minor edits from
arrangement-affecting changes" (story SCRUM-71; this run is subtask SCRUM-238).
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
psql "<local URL>" -q -v stage=setup -f ../docs/testing/manual/E10-S02-preconditions.sql
```

It prints five events: **EVT-1021 Tech Conference 2026**, **EVT-1022 Riverside
Summit**, **EVT-1023 Studio Workshop**, **EVT-1024 Product Launch** (100
registered) and **EVT-1025 Two-Day Forum** (2 Sessions). Start the API with only
`DATABASE_URL` (leave `DATABASE_POOLER_URL` empty) and Vite on
http://localhost:5173. Every account uses the seed password
(`tests/seed/SEED_DATA.md`).

| Account | Role |
| --- | --- |
| `coord_a@connectsphere.com` | Event Coordinator assigned to every E10 event |
| `organiser_a@clienta.com` | Event Organiser of every E10 event |
| `venue_a@connectsphere.com` | Venue Staff for every E10 venue |
| `tech_a@connectsphere.com` | Technical Support Staff for every E10 event |

Do the sections in order: B continues from A on the same event. Date and time
fields use your browser's local time; the steps assume Singapore time.

## What this run cannot cover yet, and why

No screen edits a single Session (E04-S02, SCRUM-39), and editing the event
changes either its sole Session or, on a two-Session event, none of them. So the
"change one Session out of two" parts of TC_E10S02_01, _05 and _07 are proved
only against PostgreSQL (`backend/tests/arrangementImpact.integration.test.ts`).
No Coordinator screen lowers capacity (approved E10-S01 change requests will),
so in TC_E10S02_04 the capacity drop is made by Venue Staff on the venue form
(E05-S01) and the Coordinator's next save shows the warning. Record these limits
in the row remarks.

## A. TC_E10S02_02 — description-only edit flags nothing (EVT-1021)

1. Sign in as `organiser_a@clienta.com`. Open http://localhost:5173/events/EVT-1021.
2. Click **Edit event**. Change only **Description** to `Annual technology
   conference, updated agenda.` Click **Save changes**.
3. Expected: a saved message for the description; no review step.
4. Sign out. Sign in as `coord_a@connectsphere.com`. Open
   http://localhost:5173/coordinator/events/EVT-1021/venue-bookings.
5. Expected: **E10 Grand Hall** is Confirmed with **no** "Needs
   reconfirmation" note.

Screenshots: `TC_E10S02_02-1.png` (saved message), `TC_E10S02_02-2.png`
(bookings page without the note).

## B. TC_E10S02_03 and TC_E10S02_05 — date change shown first, then flagged (EVT-1021)

1. Still as `coord_a`, open http://localhost:5173/coordinator/events/EVT-1021
   and click **Edit details**.
2. Set **Starts** to 20 Nov 2026 09:00 and **Ends** to 20 Nov 2026 17:00.
   Click **Save changes**.
3. Expected (TC_03): a **Check what this change affects** step lists
   **E10 Grand Hall: date or time changed** under *Venue bookings to
   reconfirm* and **E10 Projector: date or time changed** under *Equipment to
   reconfirm*, and says saving notifies the Venue Staff and Technical Support
   Staff. Nothing is saved yet.
4. Click **Cancel**. Expected: back on the form with your new dates still
   filled in.
5. Click **Save changes** again, then **Save and ask staff to reconfirm**.
6. Expected (TC_05): "Saved your changes to the start and end … 2
   arrangements were flagged for reconfirmation and the Venue Staff and
   Technical Support Staff were notified." The event shows 20 Nov.
7. Open http://localhost:5173/coordinator/events/EVT-1021/venue-bookings.
   Expected: **E10 Grand Hall** shows **Needs reconfirmation**.

Screenshots: `TC_E10S02_03-1.png` (review step), `TC_E10S02_03-2.png` (form
after Cancel), `TC_E10S02_05-1.png` (saved message), `TC_E10S02_05-2.png`
(Needs reconfirmation).

## C. TC_E10S02_06 — both kinds of staff are told (EVT-1021)

1. Sign in as `venue_a@connectsphere.com`. Open the notification bell.
   Expected: a **Tech Conference 2026** notice that an event change (date or
   time) means venue bookings or equipment reservations need reconfirmation.
2. Sign in as `tech_a@connectsphere.com`. Open the notification bell.
   Expected: the same reconfirmation notice.
3. Still as `tech_a`, open
   http://localhost:5173/support/events/EVT-1021/equipment. Expected: the E10
   Projector reservation shows **Needs review**.

Screenshots: `TC_E10S02_06-1.png` (venue_a notice), `TC_E10S02_06-2.png`
(tech_a notice), `TC_E10S02_06-3.png` (Needs review).

## D. TC_E10S02_01 — attendance above capacity (EVT-1022, one Session)

1. Sign in as `coord_a`. Open http://localhost:5173/coordinator/events/EVT-1022
   and click **Edit details**.
2. Change **Expected attendance** from 200 to `250`. Click **Save changes**.
3. Expected: the review step lists **E10 Riverside Hall: 250 people for 200
   places** and says saving notifies the Venue Staff. No equipment is listed.
4. Click **Save and ask staff to reconfirm**. Expected: "1 arrangement was
   flagged for reconfirmation and the Venue Staff were notified."
5. Sign in as `venue_a`. Expected: a **Riverside Summit** notice naming
   attendance above capacity.

Screenshots: `TC_E10S02_01-1.png` (review step), `TC_E10S02_01-2.png` (saved
message), `TC_E10S02_01-3.png` (venue_a notice).

## E. TC_E10S02_07 — the booking's own headcount governs (EVT-1023, one Session)

The E10 Studio holds 80 and the booking has its own headcount of 60.

1. Sign in as `coord_a`. Open http://localhost:5173/coordinator/events/EVT-1023
   and click **Edit details**.
2. Change **Expected attendance** from 50 to `100`. Click **Save changes**.
3. Expected: **no** review step; the saved message says nothing was flagged.
4. Open http://localhost:5173/coordinator/events/EVT-1023/venue-bookings.
   Expected: **E10 Studio** shows booking headcount 60 and **no** "Needs
   reconfirmation" note. (The Session-governed half is TC_01, section D.)

Screenshots: `TC_E10S02_07-1.png` (saved message), `TC_E10S02_07-2.png`
(Studio, headcount 60, no note).

## F. TC_E10S02_04 — over-subscription warns and removes nobody (EVT-1024)

1. Sign in as `venue_a`. Open http://localhost:5173/venue/inventory, edit
   **E10 Auditorium** and change **Max capacity** from 120 to `80`. Save.
2. Sign in as `coord_a`. Open http://localhost:5173/coordinator/events/EVT-1024
   and click **Edit details**. Change **Description** to `Launch event, capacity
   reviewed.` Click **Save changes**.
3. Expected: the review step shows **More people are registered than there are
   places**: "A Session: 100 registered for 80 places. The whole event: 100
   registered for 80 places. No one will be removed or moved to the waiting
   list." Click **Save changes**.
4. Expected: the saved message adds "no one was removed or moved to the
   waiting list".
5. Sign in as `organiser_a`. Open
   http://localhost:5173/organiser/requests/EVT-1024/registrations. Expected:
   100 Attendees still Registered.

Screenshots: `TC_E10S02_04-1.png` (capacity 80 saved), `TC_E10S02_04-2.png`
(warning), `TC_E10S02_04-3.png` (saved message), `TC_E10S02_04-4.png` (100
registered).

## G. TC_E10S02_09 and TC_E10S02_08 — a two-Session event (EVT-1025)

1. Sign in as `coord_a`. Open http://localhost:5173/coordinator/events/EVT-1025
   and click **Edit details**. Change only **Description** to `Forum over two
   mornings, speakers confirmed.` Click **Save changes**.
2. Expected (TC_09): no review step; on
   http://localhost:5173/coordinator/events/EVT-1025/venue-bookings neither
   **E10 Seminar Room A** nor **B** shows "Needs reconfirmation".
3. Back on the event, click **Edit details**. Change **Starts** to 24 Nov 2026
   09:00 and leave **Ends** at 26 Nov 2026 12:00. Click **Save changes**.
4. Expected (TC_08): the review step lists **both** Seminar Rooms and **both**
   Projectors as "date or time changed". Click **Save and ask staff to
   reconfirm**; the saved message says 4 arrangements were flagged.
5. Open the venue bookings page again. Expected: both Seminar Rooms show
   **Needs reconfirmation**.

Screenshots: `TC_E10S02_09-1.png` (saved message), `TC_E10S02_09-2.png` (no
notes), `TC_E10S02_08-1.png` (review with four items), `TC_E10S02_08-2.png`
(both rooms flagged).

## Check the database afterwards (optional, read-only)

```bash
psql "<local URL>" -q -v stage=check -f docs/testing/manual/E10-S02-preconditions.sql
```

Expected: Grand Hall, Riverside Hall and both Seminar Rooms flagged, Studio and
Auditorium's E10-S02 flags as above (the Auditorium is also flagged by the
E05-S01 capacity cut), one audit row per flagged arrangement, the notices above,
and 100 Registered for EVT-1024.
