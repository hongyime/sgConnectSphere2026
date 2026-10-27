# E05-S06 manual click-through: venue unavailable over existing bookings

Step-by-step script for the human T-93 run of SCRUM-152 / E05-S06,
[TC_E05S06_01–08](../cases/E05.md). This document is not evidence that the cases
were executed; only the tester's own run record and screenshots are.

An automated pass of the same steps against the real local stack is recorded in
`docs/testing/runs/20261025-151652-lexinphun2024-debug-frontend-e2e.md`. It is
not a manual run and does not replace this one.

## Safe local environment

Use only the native PostgreSQL on this machine (loopback) and the disposable
`connectsphere_dev_stack` database. No Docker Desktop, no shared Supabase, no
production URL or Vercel preview. Before any reset, check the connection URL's
host is `127.0.0.1`/`localhost` and the database is `connectsphere_dev_stack`;
never set `ALLOW_DATABASE_RESET`. Start the API with only `DATABASE_URL`
(`DATABASE_POOLER_URL` empty) so it cannot reach Supabase.

```bash
# Terminal 1 (Git Bash), repository root. LOCAL_DB = your local connectsphere_dev_stack URL.
cd backend
DATABASE_URL="$LOCAL_DB" npx tsx src/database/cli.ts reset
cd ..
"/c/Program Files/PostgreSQL/17/bin/psql.exe" "$LOCAL_DB" -v ON_ERROR_STOP=1 -f docs/testing/manual/E05-S06-preconditions.sql
cd backend
DATABASE_URL="$LOCAL_DB" DATABASE_POOLER_URL='' APP_URL=http://127.0.0.1:5173 npx tsx src/dev.ts
```

```bash
# Terminal 2, repository root.
cd frontend
npx vite --host 127.0.0.1 --port 5173 --strictPort
```

Open <http://127.0.0.1:5173>. The preconditions file prints the four January
bookings it created; the hold expires 13 days after it runs, so reload the data
if you start later than that. Run the cases **in order, in one session**: later
cases build on earlier ones. To start again, repeat Terminal 1 from the reset.

## Accounts

All seeded accounts share the demo password defined by `seedCredential` (see
`docs/contributing/seed-data-convention.md`). Use a private window per account,
or **Sign out** between them.

| Account | Role | Used for |
| --- | --- | --- |
| `venue_a@connectsphere.com` (Venue Staff A) | Venue Staff | All unavailability steps |
| `coord_a@connectsphere.com` (Coordinator A) | Coordinator of EVT-2001, EVT-3001, EVT-3003 | TC_03, TC_07 checks |
| `coord_b@connectsphere.com` (Coordinator B) | Coordinator of EVT-2003 | TC_03, TC_07 checks |
| `organiser_a@clienta.com` | Organiser of EVT-2001 | TC_03 (must **not** be told) |
| `attendee_a@example.com` | Registered for EVT-2001 | TC_03 (must **not** be told) |

## Fixture substitutions

The seed has no events named as in the cases. These stand in, all at **Orchid Hall**:

| Case wording | Used here |
| --- | --- |
| Riverside Hall | Orchid Hall |
| Confirmed "Charity Run" (coordinator_1) | EVT-2001, Confirmed, primary booking 15 Jan 2027 14:00–16:00, Coordinator A |
| Pending "Alumni Dinner" (coordinator_2) | EVT-2003, Pending request 15 Jan 2027 10:00–12:00, Coordinator B |
| Booking newly inside an extended period | EVT-3001, Pending request 17 Jan 2027 12:30–14:00, Coordinator A |
| Unexpired tentative hold | EVT-3003, Tentative hold 22 Jan 2027 10:00–12:00, Coordinator A |
| venue_staff_1 | Venue Staff A |

## Screenshots

Take your own screenshots (T-93; agent screenshots never count). Name each by
TC_ID with a running number, for example `TC_E05S06_02-1.png`, keep each under
1 MB, and show synthetic seed data only. Put them in one folder and say where;
they are filed under `docs/testing/runs/evidence/<record name>/` with your run
record. 📸 marks the suggested shots.

## Steps

Sign in as **Venue Staff A** and open **Maintenance blocks**. In **Venue**, choose **Orchid Hall**.

### TC_E05S06_01 — free period, with a category and note, shows as Blocked

1. In **Mark this venue unavailable**: Start date 20/01/2027, Start time 08:00, End date 20/01/2027, End time 18:00, Reason category **Equipment failure**, Note `Projector rig fault`. Click **Save unavailability**.
2. Expect "Unavailability saved." and a row: 20 Jan 2027, 8:00 am · 20 Jan 2027, 6:00 pm · Equipment failure · Projector rig fault. 📸 `TC_E05S06_01-1`
3. Open **Availability**, choose Orchid Hall, set the custom range From/To 20/01/2027, **Show range**.
4. Expect 08:00–18:00 **Blocked** "Maintenance block · Equipment failure · Projector rig fault". 📸 `TC_E05S06_01-2`

### TC_E05S06_02 — over a Pending request and a Confirmed booking

1. Back on **Maintenance blocks** (Orchid Hall): 15/01/2027 08:00 to 15/01/2027 18:00, **Safety concern**, `Ceiling inspection`. **Save unavailability**.
2. Expect "Unavailability saved. These 2 events have bookings in this period, now marked Conflicting. Nothing was cancelled." and both events listed: EVT-2003 with "Coordinator notified"; EVT-2001 with **Returned to Planning** and "Coordinator notified". 📸 `TC_E05S06_02-1`
3. **Availability**, range 15/01/2027: the Blocked period and **two Conflicting** bookings, each "Venue unavailable — needs an alternative · Safety concern". 📸 `TC_E05S06_02-2`
4. Sign in as **Coordinator A**, open EVT-2001 from your event list (or go to `/coordinator/events/EVT-2001`). Expect the yellow **Venue unavailable** box "Orchid Hall — Safety concern … Alternative arrangements are required", status **Planning** (not Cancelled). 📸 `TC_E05S06_02-3`
5. Click **View venue bookings**: the Orchid Hall booking shows **Conflicting** and "Safety concern · Ceiling inspection, 15 Jan 2027, 8:00 am – 6:00 pm. Alternative arrangements are required. Before this it was Confirmed." 📸 `TC_E05S06_02-4`

### TC_E05S06_03 — only the affected Coordinators are told

1. Still as **Coordinator A**, open **Notifications**: a "Venue unavailable" notice naming Orchid Hall, the period, "Safety concern: Ceiling inspection", EVT-2001 and "Alternative arrangements are required". 📸 `TC_E05S06_03-1`
2. As **Coordinator B**, **Notifications**: the same kind of notice for EVT-2003. 📸 `TC_E05S06_03-2`
3. As **organiser_a** and as **attendee_a**, **Notifications**: no "Venue unavailable" notice. 📸 `TC_E05S06_03-3` (one of them)
4. The email cannot be seen locally (no mail provider is configured); its queued delivery is checked in the database after the run, read-only.

### TC_E05S06_04 — no end: open-ended until lifted

1. As **Venue Staff A**, Orchid Hall: Start 01/03/2027 08:00, leave **both end fields empty**, **Renovation**, `Roof works`. **Save unavailability**.
2. Expect "Unavailability saved." and the row's End shows **Until lifted**. 📸 `TC_E05S06_04-1`
3. **Availability**, range 01/03/2027 to 03/03/2027: Blocked on all three days. 📸 `TC_E05S06_04-2`

### TC_E05S06_05 — extending flags, shortening restores

1. Orchid Hall: 17/01/2027 08:00 to 17/01/2027 12:00, **Maintenance**, `Rewiring`. Save: "Unavailability saved." (EVT-3001's request at 12:30 is outside).
2. On the `Rewiring` row click **Edit…**, set End time 14:00, **Save changes**. Expect "Unavailability changed. 1 event is newly marked Conflicting." with EVT-3001 listed. 📸 `TC_E05S06_05-1`
3. **Edit…** again, End time back to 12:00, **Save changes**. Expect "Unavailability changed. 1 booking has its earlier status back." with EVT-3001 "Booking restored". 📸 `TC_E05S06_05-2`

### TC_E05S06_06 — E05-S04 behaviour on a free period still works

1. Orchid Hall: 25/01/2027 00:00 to 26/01/2027 00:00, **Maintenance**, `Annual fire safety inspection`. Save.
2. **Edit…**: End date 25/01/2027, End time 12:00, **Save changes**: the row now ends 25 Jan 2027, 12:00 pm. 📸 `TC_E05S06_06-1`
3. **Lift…** → **Lift unavailability**: "Unavailability lifted. It stays in the history." and the row is gone from the list. 📸 `TC_E05S06_06-2`

### TC_E05S06_07 — edit and lift keep history; Coordinators told on lift

1. On the `Ceiling inspection` row **Edit…**: End time 20:00, Note `Ceiling inspection, second check`, **Save changes**: "Unavailability changed."
2. **Lift…** on that row → **Lift unavailability**. Expect "… 2 bookings have their earlier status back." with EVT-2003 and EVT-2001 "Booking restored · Coordinator notified". 📸 `TC_E05S06_07-1`
3. Tick **Show lifted**: the row shows **Lifted** "by Venue Staff A, <time>" and no Edit/Lift. Click **History…**: three rows Created, Edited (before 6:00 pm · Ceiling inspection, after 8:00 pm · …second check) and Lifted, each by Venue Staff A with a time. 📸 `TC_E05S06_07-2`
4. As **Coordinator B**, **Notifications**: a "Venue available again" notice for EVT-2003. 📸 `TC_E05S06_07-3`
5. As **Coordinator A**, EVT-2001 **Venue bookings**: the Orchid Hall booking is **Confirmed** again; the event stays **Planning** (E08-S04 Scenario 4).

### TC_E05S06_08 — an unexpired hold is flagged, not released, restored

1. As **Venue Staff A** (untick Show lifted), Orchid Hall: 22/01/2027 00:00 to 23/01/2027 00:00, **Maintenance**, `Lighting rig repair`. Save.
2. Expect "This event has a booking in this period, now marked Conflicting. Nothing was cancelled." with EVT-3003 "Coordinator notified". 📸 `TC_E05S06_08-1`
3. **Lift…** → **Lift unavailability**: EVT-3003 "Booking restored". 📸 `TC_E05S06_08-2`
4. As **Coordinator A**, **Notifications**: "Venue unavailable" then "Venue available again" for EVT-3003.

## After the run

Say which cases you ran, what you saw where it differed, and where the
screenshots are. A new run record is written from what you report (actual result
in every Remarks cell, T-65), the screenshots are filed with it, and read-only
database checks may be added as clearly labelled corroboration.
