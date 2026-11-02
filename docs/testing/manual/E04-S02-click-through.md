# E04-S02 manual click-through: multi-Session events

Manual end-to-end check of E04-S02 "Create a multi-session event" (story
SCRUM-39; this run is subtask SCRUM-241), TC_E04S02_01 to _05. Run it by hand
in a real browser and record the results in one `docs/testing/runs/` record:
`run_type: manual`, `scope: frontend/e2e`, `database: real`.

**Screenshots (T-93).** Take every screenshot yourself, at least one per
PASS/FAIL row, named by TC_ID (`TC_E04S02_03-1.png` for several), under 1000 KB,
committed with the record under `docs/testing/runs/evidence/<record filename without .md>/`.

## Set up first

Use a native PostgreSQL installation on this machine with a disposable database,
never the shared one. The reset guard (`isSafeResetTarget()`) refuses anything
that is not a safe target, so do not bypass it. Point `LOCAL_DB` at the loopback
address, for example
`export LOCAL_DB="postgres://postgres:<local password>@127.0.0.1:5432/connectsphere_dev_stack"`.
Leave `DATABASE_POOLER_URL` empty in every command below: the API prefers it over
`DATABASE_URL`, so a value set in your shell would send the test events to that
database instead, and the reset guard does not check it.

1. **Database.** Create the empty database once (`createdb -h 127.0.0.1 -U postgres connectsphere_dev_stack`),
   reset and seed it (`cd backend && DATABASE_URL="$LOCAL_DB" DATABASE_POOLER_URL= npx tsx src/database/cli.ts reset && cd ..`), then
   `psql "$LOCAL_DB" -q -v stage=setup -f docs/testing/manual/E04-S02-preconditions.sql`.
   It prints EVT-9401's two Sessions (no bookings) and EVT-9402's two Sessions,
   each with a Confirmed Lotus Room booking.
2. **API:** `cd backend && DATABASE_URL="$LOCAL_DB" DATABASE_POOLER_URL= ADDITIONAL_ALLOWED_ORIGINS="http://127.0.0.1:5173" npx tsx src/dev.ts`.
3. **Website:** `cd frontend && npx vite --host 127.0.0.1 --port 5173 --strictPort`.
4. Every account uses the seed password (`tests/seed/SEED_DATA.md`). Use a normal
   window for organiser_a and a private window for coord_a and venue_a.

## Steps

**TC_E04S02_01 (organiser_a).** New request: name "E04 Opening Event", purpose,
12/03/2027 09:00-10:00, 40 attendees, venue and equipment requirements. Save
draft, open it from Drafts. Event Sessions shows one Session, "It uses the
event's own requirements", Remove greyed out. Title it "Opening", Save session:
"Session saved."

**TC_E04S02_02 (organiser_a, same draft).** Add session. First Session:
09:00-11:00, 40, "Hall A", "Projector", facility Projector; save. Second:
"Session B", 13/03/2027 13:00-16:00, 120, "Hall B", "Microphones", Theatre,
facility PA system; save. Reload: each keeps its own values.

**TC_E04S02_03 (coord_a).** `/coordinator/events/EVT-9401/venues`. Choose
Session A - Talks (40, Wheelchair access), search: Lotus Room Suitable. Choose
Session B - Panel (120, Theatre), search: Lotus Room Near match (layout not
supported), Orchid Hall Suitable.

**TC_E04S02_04 (coord_a).** With Session B chosen, Orchid Hall, Check this
Session's requirements, Submit booking request. Back, choose Session A, search,
Orchid Hall, submit. View venue booking requests: two Pending Orchid Hall
requests, each naming its Session and period.

**TC_E04S02_05.** organiser_a: `/organiser/requests/EVT-9402`, Event Sessions,
Remove session on Session A - Morning. Screenshot the confirmation, then
confirm: "Session removed. 1 venue booking released. The venue's staff have
been notified." coord_a: `/coordinator/events/EVT-9402/venue-bookings` (A
Released, B Confirmed), `/coordinator/events/EVT-9402` activity log (Session
deleted, Booking released), Lotus Room calendar for 20 Mar 2027 (only
13:00-15:00). venue_a: `/notifications`, "Venue booking released".

Deleting uses up EVT-9402. To repeat the case without a fresh reset, copy it by
hand under a new code, title and date. The 2 November run did this: EVT-9403,
"Two-Session Design Workshop (repeat)", 27 Mar 2027, same Session times and the
same Confirmed Lotus Room bookings. Its copy script is not committed.
