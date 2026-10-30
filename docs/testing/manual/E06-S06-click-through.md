# E06-S06 manual click-through: prevent double-booking of a venue

Step-by-step script for the human T-93 run of SCRUM-50 / E06-S06 (manual
acceptance subtask SCRUM-232), [TC_E06S06_01–07](../cases/E06.md). This
document is not evidence that the cases were executed; only the tester's own
run record and screenshots are.

An automated pass of the same steps against the real local stack is recorded
with this branch's pull request. It is not a manual run and does not replace
this one.

Covered by the automated tests instead of this script:
- **TC_E06S06_03**, two claims at the same instant: a person cannot click two
  submissions at once. `backend/tests/venueClaimPolicy.integration.test.ts`
  runs them in parallel against PostgreSQL.
- **TC_E06S06_06's alternative path** (the Coordinator withdraws and replans
  one request) and the expired-hold check: the same backend file.

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
"/c/Program Files/PostgreSQL/17/bin/psql.exe" "$LOCAL_DB" -v ON_ERROR_STOP=1 -f docs/testing/manual/E06-S06-preconditions.sql
cd backend
DATABASE_URL="$LOCAL_DB" DATABASE_POOLER_URL='' APP_URL=http://127.0.0.1:5173 npx tsx src/dev.ts
```

```bash
# Terminal 2, repository root.
cd frontend
npx vite --host 127.0.0.1 --port 5173 --strictPort
```

Open <http://127.0.0.1:5173>. The preconditions file prints the ten February
2027 bookings it created. Run the cases **in the order below, in one
session**. To start again, repeat Terminal 1 from the reset.

## Accounts

All seeded accounts share the demo password defined by `seedCredential` (see
`docs/contributing/seed-data-convention.md`). Use a private window per account,
or **Sign out** between them.

| Account | Role | Used for |
| --- | --- | --- |
| `coord_b@connectsphere.com` (Coordinator B) | Coordinator of EVT-2003 and EVT-3002 | TC_02, TC_05 |
| `venue_a@connectsphere.com` (Venue Staff A) | Venue Staff | TC_04, TC_01, TC_06, TC_07 |

## Fixture substitutions

The seed has no events named as in the cases. These stand in:

| Case wording | Used here |
| --- | --- |
| Charity Run (the first claim) | **EVT-3001** "EVT-3001 Approved Annual Conference", Coordinator A |
| Product Expo (TC_01, TC_04) and Alumni Dinner (TC_06) | **EVT-3005** "EVT-3005 Rejected Budget Review", Coordinator B |
| Product Expo submitted in TC_02 | **EVT-2003** "EVT-2003 Client B Isolation Event", 1 Feb 2027 10:00–12:00 |
| Product Expo submitted in TC_05 | **EVT-3002** "EVT-3002 Awaiting Clarification Workshop", 2 Feb 2027 10:59–13:00 |
| Tech Summit (TC_07) | **EVT-3003** "EVT-3003 Planning Phase Gala" |
| Orchid Hall (TC_02) | **Lotus Room**, setup 30 and turnaround 45 minutes |
| Orchid Hall (TC_01), (TC_06) | **Maple Room**, **Jasmine Hall**, both buffers 0 |
| Seminar Rooms A and B (TC_07) | **Orchid Hall** and **Cedar Auditorium** |

Each case has its own venue or day, so no case changes another's data.

## Screenshots

Take your own screenshots (T-93; agent screenshots never count). Name each by
TC_ID with a running number, for example `TC_E06S06_02-1.png`, keep each under
1 MB, and show synthetic seed data only. Put them in one folder and say where;
they are filed under `docs/testing/runs/evidence/<record name>/` with your run
record. 📸 marks the suggested shots.

## Steps

Sign in as **Coordinator B**.

### TC_E06S06_02 — a later overlapping request is refused, without naming the other event

EVT-3001 already holds Lotus Room on 1 Feb 2027 09:00–11:00 (Pending). With
30 minutes' setup and 45 minutes' turnaround it occupies 08:30–11:45.

1. Go to `/coordinator/events/EVT-2003/venues` and click **Search venues**.
2. On the **Lotus Room** card click **Check recorded event requirements**.
3. In **Request this venue**, leave the start and end as filled in (1 Feb 2027 10:00 to 12:00) and click **Submit booking request**.
4. Expect the red message **"This venue is unavailable from 1 Feb 2027, 8:30 am to 1 Feb 2027, 11:45 am, including setup and turnaround."** It does **not** say EVT-3001 or "Approved Annual Conference", and there is no "Booking request submitted". 📸 `TC_E06S06_02-1`
5. Open `/coordinator/events/EVT-2003/venue-bookings`: **"No venue bookings recorded"**. 📸 `TC_E06S06_02-2`

### TC_E06S06_05 — a one-minute overlap is refused

EVT-3001 is Confirmed at Orchid Hall on 2 Feb 2027 09:00–11:00; Orchid Hall's
buffers are 0.

1. Go to `/coordinator/events/EVT-3002/venues`, **Search venues**, and on the **Orchid Hall** card click **Check recorded event requirements**.
2. Leave the period as filled in (2 Feb 2027 10:59 to 13:00) and click **Submit booking request**.
3. Expect **"This venue is unavailable from 2 Feb 2027, 9:00 am to 2 Feb 2027, 11:00 am, including setup and turnaround."**, with no other event's name and no "Booking request submitted". 📸 `TC_E06S06_05-1`
4. Open `/coordinator/events/EVT-3002/venue-bookings`: **"No venue bookings recorded"**. 📸 `TC_E06S06_05-2`

**Sign out** and sign in as **Venue Staff A**.

### TC_E06S06_04 — exactly adjacent bookings both confirm

EVT-3001 is Confirmed at Orchid Hall on 3 Feb 2027 09:00–11:00, and EVT-3005
is Pending 11:00–13:00. Both buffers are 0, so they touch at 11:00 but do not
overlap.

1. Open **Booking requests**. In the row for **EVT-3005**, Orchid Hall, 3 Feb 2027, click the event name, then **Decide on request**.
2. Expect **no** "Booking Conflict" warning and **Approve…** enabled. 📸 `TC_E06S06_04-1`
3. Click **Approve…**, then **Approve request**. Expect **"Approved. The booking is confirmed."** 📸 `TC_E06S06_04-2`
4. Open **Availability**, choose **Orchid Hall**, set From and To to 03/02/2027, **Show range**: two **Confirmed** entries, "09:00–11:00 Confirmed EVT-3001 Approved Annual Conference" and "11:00–13:00 Confirmed EVT-3005 Rejected Budget Review". 📸 `TC_E06S06_04-3`

### TC_E06S06_01 — after a buffer change, the Pending request is flagged and cannot be approved

EVT-3001 is Confirmed at Maple Room on 4 Feb 2027 09:00–11:00, and EVT-3005 is
Pending 11:00–13:00. Both buffers are 0.

1. Open **Inventory**, and on the **Maple Room** card click **Edit**. Set **Setup time** to `30`, leave Turnaround time at 0, and click **Save changes**.
2. Expect the yellow box **"Changes saved, and some bookings now conflict"** with the line "EVT-3005 Rejected Budget Review (EVT-3005), 4 Feb 2027, 11:00 am – 1:00 pm: conflicts with EVT-3001 Approved Annual Conference". 📸 `TC_E06S06_01-1`
3. **Booking requests** → the **EVT-3005**, Maple Room, 4 Feb 2027 row → event name → **Decide on request**.
4. Expect the **Booking Conflict** box: "Booking Conflict: overlaps with confirmed booking [EVT-3001]" and "Approval is blocked until this venue conflict is resolved." **Approve…** is greyed out; **Reject…** still works. 📸 `TC_E06S06_01-2`
5. **Availability**, Maple Room, From and To 04/02/2027, **Show range**: both bookings are still there. EVT-3001 is **Confirmed** 09:00–11:00 (now with a 08:30–09:00 "Setup time" entry). EVT-3005 is still Pending, which the calendar shows as **Tentative**, 11:00–13:00 with "· Buffer conflict — needs review"; EVT-3001 has no such label. 📸 `TC_E06S06_01-3`

### TC_E06S06_06 — both conflicting requests are blocked until one is rejected

EVT-3001 (10:00–12:00) and EVT-3005 (12:00–14:00) are both Pending at Jasmine
Hall on 5 Feb 2027, with both buffers 0.

1. **Inventory** → **Jasmine Hall** → **Edit**. Set **Setup time** `30` and **Turnaround time** `45`, **Save changes**.
2. Expect **"Changes saved, and some bookings now conflict"** with the line "EVT-3005 Rejected Budget Review (EVT-3005), 5 Feb 2027, 12:00 pm – 2:00 pm: conflicts with EVT-3001 Approved Annual Conference". Only the later request is listed; both are kept. 📸 `TC_E06S06_06-1`
3. **Booking requests** → **EVT-3001**, Jasmine Hall, 5 Feb 2027 → **Decide on request**: the Booking Conflict box names [EVT-3005] and **Approve…** is greyed out. 📸 `TC_E06S06_06-2`
4. Do the same for **EVT-3005**, Jasmine Hall, 5 Feb 2027: the box names [EVT-3001] and **Approve…** is greyed out. 📸 `TC_E06S06_06-3`
5. Back on **EVT-3001**'s decision page, click **Reject…**, type the reason `Overlaps another request after the buffer change`, and click **Reject request**. Expect "Rejected." 📸 `TC_E06S06_06-4`
6. Click **View request**: the status is **Rejected** and there is no **Decide on request** button. 📸 `TC_E06S06_06-5`
7. **Booking requests** → **EVT-3005**, Jasmine Hall, 5 Feb 2027 → **Decide on request**: no Booking Conflict box, **Approve…** enabled. **Approve…** → **Approve request**: "Approved. The booking is confirmed." 📸 `TC_E06S06_06-6`

Known follow-up, not a failure: the venue calendar may still show "Buffer
conflict — needs review" on EVT-3005's Confirmed booking until Jasmine Hall's
buffers are next saved. The flag no longer blocks anything.

### TC_E06S06_07 — one event confirms bookings at two venues at once

EVT-3003 has Pending requests at Orchid Hall and Cedar Auditorium for the same
period, 8 Feb 2027 14:00–16:00.

1. **Booking requests** → **EVT-3003**, Orchid Hall, 8 Feb 2027 → **Decide on request** → **Approve…** → **Approve request**: "Approved. The booking is confirmed." 📸 `TC_E06S06_07-1`
2. The same for **EVT-3003**, Cedar Auditorium, 8 Feb 2027. 📸 `TC_E06S06_07-2`
3. **Availability**, Orchid Hall, From and To 08/02/2027, **Show range**: "14:00–16:00 Confirmed EVT-3003 Planning Phase Gala". Then Cedar Auditorium, 08/02/2027: the same. 📸 `TC_E06S06_07-3`

## After the run

Record the run in `docs/testing/runs/` as `run_type: manual`,
`scope: frontend/e2e`, `database: real`, with the actual result in Remarks on
every row and TC_E06S06_03 as `N/A` ("automated only: two claims at the same
instant cannot be clicked").
