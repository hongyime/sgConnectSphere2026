# E09-S07 manual click-through: view registrations for my event

Manual end-to-end check of E09-S07 "View registrations for my event" (story
SCRUM-69; this run is subtask SCRUM-218). Run it by hand in a real browser, then
record it in `docs/testing/runs/` (`run_type: manual`, `scope: frontend/e2e`,
`database: real`), with the actual result on every row and a hand-taken
screenshot (T-93) named by TC_ID for each PASS/FAIL row.

## Set up first

Use the same local stack as `E09-S01-S03-click-through.md`: the local Docker
`connectsphere_dev_stack` database, the API (`backend/src/dev.ts`) and Vite on
5173. Reset and seed it, then run this story's setup (setup only, never a test
step):

```bash
docker exec -i connectsphere-test-pg psql -U postgres -d connectsphere_dev_stack -q -v stage=setup -f - < docs/testing/manual/E09-S07-preconditions.sql
```

It prints **EVT-9301 Tech Conference 2026: 100 registered, 150 places** and
**EVT-9302 Community Meetup: 5 registered, 2 waitlisted**. Every account uses
the seed password (`tests/seed/SEED_DATA.md`).

**Account note.** TC_E09S07_03 names `organiser_b@clienta.com` as a Client B
Organiser, but the seed makes organiser_b a **Client A** colleague (E01-S02
Scenario 3) and `organiser_c@clientb.com` the Client B Organiser. The refusal
step uses organiser_c; organiser_b shows the colleague view instead.

## Steps

1. **TC_E09S07_01.** Sign in as `organiser_a@clienta.com`, open
   http://127.0.0.1:5173/organiser/requests/EVT-9301, and click
   **Registrations**. **Registered attendees (100)** lists each Attendee's name,
   email and contact number, including **Attendee A**
   (attendee_a@example.com, +65 9500 0001) and **Attendee B**
   (attendee_b@example.com, +65 9500 0002). No other personal data is shown.
2. **TC_E09S07_02.** On the same page, **Places** shows **100 registered** and
   **50 remaining** (150 places).
3. **TC_E09S07_04.** Open
   http://127.0.0.1:5173/organiser/requests/EVT-9302/registrations.
   **Registered attendees (5)** lists Attendees A to E, and a separate **Waiting
   list (2)** lists Attendee I (position 1), then Attendee J (position 2).
   Neither list contains the other's people.
4. **TC_E09S07_03.** Sign out, sign in as `organiser_c@clientb.com` (Client B),
   and open http://127.0.0.1:5173/organiser/requests/EVT-9301/registrations.
   It shows **Access refused** with "Access denied. This event is not available
   to your organisation." and no list. The attempt is recorded in the activity
   log as `Access Denied` for `registrations` (E01-S02 Scenario 2).
5. **Colleague view (supporting, E01-S02 Scenario 3).** Sign out, sign in as
   `organiser_b@clienta.com` (Client A), and open the same URL. The lists show,
   with "This is a colleague's event. You can see its registrations; only its
   Organiser can approve requests or add attendees." There's no **Decision**
   column and no **Add an attendee manually** card.
