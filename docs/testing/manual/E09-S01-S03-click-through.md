# E09-S01 to E09-S03 manual click-through: register, capacity, registration period

Manual end-to-end check of three Release 1 stories in one sitting:
- E09-S01 "Register for an event" (story SCRUM-63; this run is subtask SCRUM-209);
- E09-S02 "Enforce registration capacity" (SCRUM-64; run SCRUM-212);
- E09-S03 "Control the registration period" (SCRUM-65; run SCRUM-215).

Run it by hand in a real browser, then record each story's results in its own
`docs/testing/runs/` record: `run_type: manual`, `scope: frontend/e2e`,
`database: real`. Give the actual result on every row (see "Results table" in
`docs/testing/runs/README.md`).

**Screenshots (T-93).** Take every screenshot yourself, at least one per
PASS/FAIL row. Name it by TC_ID (`TC_E09S01_06.png`, or `-1`/`-2` for
several), keep it under 1000 KB as PNG or JPG, and commit it with its record
under `docs/testing/runs/evidence/<record filename without .md>/`.

Every message below in **bold** or in quotes was checked against the code on
`main` at `f3df479` (with #326, #327, #353, #354 and #361), and the setup was
dry-run on a fresh seed before the run. Times are Singapore time.

Covered by the automated tests instead of this script:
- **TC_E09S02_03** (two registrations racing for the last place) needs two
  submissions at the same instant. It runs on real PostgreSQL in
  `backend/tests/attendeeCapacity.integration.test.ts`.
- **TC_E09S03_07 / _08** (the exact opening and closing instant) depend on the
  database clock. They're covered by the `registrationState` unit test in
  `backend/tests/attendeeRegistration.test.ts` and by
  `backend/tests/registrationPeriod.integration.test.ts`.

## Set up first (about 5 minutes)

Use a **local, disposable** database, never the shared one. Docker Desktop must
be running. The run changes the events, so every run starts from a fresh seed.

1. **Database (terminal 1).** Start the local container
   (`docker start connectsphere-test-pg`; see `E06-S05-click-through.md` for
   creating it), then reset, seed and add this run's events:

   ```bash
   export LOCAL_DB="postgres://postgres:<local password>@127.0.0.1:55433/connectsphere_dev_stack"
   cd backend && DATABASE_URL="$LOCAL_DB" npx tsx src/database/cli.ts reset && cd ..
   docker exec -i connectsphere-test-pg psql -U postgres -d connectsphere_dev_stack -q -v stage=setup -f - < docs/testing/manual/E09-S01-S03-preconditions.sql
   ```

   The last command prints each Session's places, for example **EVT-9201 Talks
   2 places, 1 registered** and **EVT-9203 Session 1 1 place, 3 registered**.
2. **API (terminal 2):**
   `cd backend && DATABASE_URL="$LOCAL_DB" ADDITIONAL_ALLOWED_ORIGINS="http://127.0.0.1:5173" npx tsx src/dev.ts`.
   Wait for `Local API ready`.
3. **Frontend (terminal 3):**
   `cd frontend && npx vite --host 127.0.0.1 --port 5173 --strictPort`.
4. Every account uses the seed password (`tests/seed/SEED_DATA.md`).

Use a **normal window for Attendees** and a **private window for the
Organiser** (`organiser_a@clienta.com`). Sign in at http://127.0.0.1:5173/login.

## A. E09-S01: register for an event

1. **Normal window:** sign in as `attendee_c@example.com` and open
   http://127.0.0.1:5173/attendee/discover. It lists **Spring Networking
   Night**, **Sold-out Seminar** and **Autumn Workshop**, each **Open for
   registration**. It does not list **Planning Showcase**.
2. **TC_E09S01_06.** Open **Spring Networking Night**.
   - The **Event** card shows **Venue: Grand Auditorium, Level 1**.
   - The **Sessions** table lists **Talks** at **Grand Auditorium, Level 1** and
     **Mixer** at **Seminar Room B, Level 2**.
   - There's one **Register** button for the whole event.
3. **TC_E09S01_01, _07.** Click **Register**.
   - Under **Choose your Sessions**, tick **Talks** and **Mixer**.
   - Your name, email and contact number are shown read-only.
   - Click **Confirm registration**. **You're registered** appears, and **Your
     Sessions** lists **Talks** and **Mixer**. Screenshot TC_E09S01_01.
   - Click **Discover more events**, then open Spring Networking Night again.
     The banner reads **You're registered for this event**, the pill
     **Registered**, and both Sessions show **Selected**. Screenshot
     TC_E09S01_07.
4. **TC_E09S01_03.** Open http://127.0.0.1:5173/attendee/register/EVT-9201.
   It shows **You're already registered for this event**: "You can only have
   one active registration for an event, so nothing was changed. Your
   Sessions: Talks, Mixer."
5. **TC_E09S01_05.** Open http://127.0.0.1:5173/attendee/register/EVT-9202.
   It shows **Couldn't load registration for this event** and "Registration
   is only open for confirmed events that take registrations."
6. **TC_E09S01_04.** Sign out, sign in as `attendee_k@example.com`, and open
   http://127.0.0.1:5173/attendee/register/EVT-9201.
   - **Contact number** reads **Missing**. A warning **Missing: Contact
     number** says "Add your contact number to your profile before
     registering.", with an **Update your profile** link.
   - Tick **Mixer** and click **Confirm registration**. The same message
     appears at the top and nothing is registered.

## B. E09-S02: enforce registration capacity

1. **TC_E09S02_12, _08. Private window:** sign in as `organiser_a@clienta.com`,
   open http://127.0.0.1:5173/organiser/requests/EVT-9201, and click
   **Registrations**.
   - **Places** shows **Event 2 of 5 taken**.
   - **Places by Session** shows **Talks 2 of 2 Full** and **Mixer 1 of 3**.
   - Five is Talks' 2 plus Mixer's 3, from their confirmed venues.
     Screenshot TC_E09S02_12.
   - Talks reached its limit with attendee_c's registration in A3 and didn't
     pass it. Screenshot TC_E09S02_08 (the same screen is fine).
2. **TC_E09S02_09. Normal window:** sign out, sign in as
   `attendee_a@example.com`, and open
   http://127.0.0.1:5173/attendee/register/EVT-9201.
   - **Talks** shows **Full**.
   - Tick **Talks**. The hint reads "A Session you chose is full, so your
     request goes to the organiser to review." The button reads **Send request
     for review**.
   - There's no waiting-list link, because the Event isn't full.
   - Click it. **Request sent for review** appears. Screenshot TC_E09S02_09.
3. **TC_E09S02_11, first part. Private window:** reload the Registrations page.
   - **Pending requests** lists attendee_a for **Talks**, with Capacity
     **"Talks" is full (2 of 2 places).** and **Approve** greyed out.
   - **Places** still shows **2 of 5 taken**: Pending takes no place.
     Screenshot TC_E09S02_11-1.
4. **TC_E09S02_07.** In **Add an attendee manually**, enter
   `attendee_i@example.com`, tick **Talks**, and click **Add attendee**. It
   shows **Can't add them. "Talks" is full (2 of 2 places).** and the places
   don't change. Screenshot TC_E09S02_07.
5. **TC_E09S02_06.** Enter `attendee_j@example.com`, tick **Mixer** and click
   **Add attendee**.
   - It shows **attendee_j@example.com is registered and marked as a manual
     addition.**
   - **Event 3 of 5 taken**, **Mixer 2 of 3**. Screenshot TC_E09S02_06.
6. **TC_E09S02_11, second part.** The arrangement changes: in terminal 1, run
   the `tc11` stage, which gives Talks a second Confirmed venue (Seminar Room D,
   3 places):

   ```bash
   docker exec -i connectsphere-test-pg psql -U postgres -d connectsphere_dev_stack -q -v stage=tc11 -f - < docs/testing/manual/E09-S01-S03-preconditions.sql
   ```

   - Reload the Registrations page. **Talks 2 of 5**, and attendee_a's request
     shows **Fits**.
   - Click **Approve**. It shows "… is now registered." The places read **Event
     4 of 8 taken** and **Talks 3 of 5**, and the request leaves the list.
     Screenshot TC_E09S02_11-2.
7. **TC_E09S02_10. Normal window**, still attendee_a: open
   http://127.0.0.1:5173/attendee/register/EVT-9203.
   - It shows **This event is full**: "You can still send a registration
     request. The organiser reviews requests over capacity."
   - **Session 1** shows **Full**; **Session 2** doesn't.
   - Tick **Session 2** and click **Send request for review**. **Request sent
     for review** appears. Screenshot TC_E09S02_10.

TC_E09S02_04 (a full Event with its waiting list on) comes in C8, after the
Organiser turns the list on.

## C. E09-S03: control the registration period

1. **TC_E09S03_01. Private window:** open
   http://127.0.0.1:5173/organiser/requests/EVT-9204 and click **Registration
   period**.
   - The page ends with **Currently: no registration window set.**
   - Set **Registration opens** to tomorrow at 09:00 and **Registration
     closes** to 20/11/2026 17:00. Click **Save registration period**.
   - **Registration period saved.** appears, and **Currently** shows those
     dates. Screenshot TC_E09S03_01.
2. **TC_E09S03_02.** Set **Withdrawal deadline (optional)** to 10/12/2026 17:00 (the case's test data)
   and save. **Currently** adds "withdrawals until 10 Dec 2026, 5:00 pm".
   Screenshot TC_E09S03_02.
3. **TC_E09S03_03. Normal window**, attendee_a: open
   http://127.0.0.1:5173/attendee/discover.
   - **Autumn Workshop** shows **Opening soon**.
   - Open it. It says **Registration opens on** tomorrow at 9:00 am, and
     there's no **Register** button. Screenshot TC_E09S03_03.
4. **TC_E09S03_09, first part.** Open
   http://127.0.0.1:5173/attendee/register/EVT-9204. It says **Registration
   opens on** tomorrow, with no Session to tick: neither **Morning** nor
   **Afternoon** can be chosen on its own. Screenshot TC_E09S03_09-1.
5. **TC_E09S03_09, second part. Private window:** set **Registration opens** to
   yesterday at 09:00 and save.
   - **Normal window:** reload the register page. Both **Morning** and
     **Afternoon** can be ticked.
   - Tick both and click **Confirm registration**. **You're registered** lists
     both. Screenshot TC_E09S03_09-2.
6. **TC_E09S03_05. Private window:** set **Registration closes** to 14/12/2026
   10:00 (after the event starts at 09:00) and click **Save registration
   period**.
   - **Confirm the closing date** appears: "Registration would close after the
     event starts on 14 Dec 2026, 9:00 am. Confirm to save it anyway.
     Attendees could still register while it's running."
   - **Save registration period** is greyed out. Screenshot TC_E09S03_05-1.
   - Click **Save anyway**. **Registration period saved.** appears, and
     **Currently** shows it closing on 14 Dec 2026, 10:00 am. Screenshot
     TC_E09S03_05-2.
7. **TC_E09S03_04.** Set **Registration opens** to two days ago at 09:00 and
   **Registration closes** to today, an hour ago. Save; no warning, because it
   closes before the event starts.
   - **Normal window:** sign out, sign in as `attendee_b@example.com`, and open
     http://127.0.0.1:5173/attendee/register/EVT-9204.
   - It says **Registration for this event has closed.** with no Session to
     tick. Screenshot TC_E09S03_04.
8. **TC_E09S03_06 and TC_E09S02_04. Private window:** open
   http://127.0.0.1:5173/organiser/requests/EVT-9203/registration-period, tick
   **Offer a waiting list**, and save.
   - **Normal window**, still attendee_b: open
     http://127.0.0.1:5173/attendee/register/EVT-9203.
   - It shows **This event is full**: "You can join the waiting list, or send a
     registration request for the organiser to review.", with a **Join the
     waiting list** button.
   - There's no waiting list for a single Session (T-98).
   - Screenshot TC_E09S03_06, and save the same screen as TC_E09S02_04.

## After the run

Write three records, one per story:
- E09-S01: TC_E09S01_01, _03 to _07;
- E09-S02: TC_E09S02_03 (SKIP: automated), _04, _06 to _12;
- E09-S03: TC_E09S03_01 to _06, _09, and _07/_08 (SKIP: automated).

Each record lists its screenshots under `## Screenshots`, and goes in one
commit with them.
