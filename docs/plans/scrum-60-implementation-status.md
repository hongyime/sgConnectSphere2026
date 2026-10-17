# SCRUM-60 / E08-S03 implementation status

Confirm an event. This file records what was built, which test proves each
acceptance criterion, and **every run of those tests**, so each result can be
traced back to the exact code it ran against.

## Scope

From `docs/backlog/release-1/E08-readiness-confirmation.md`, as amended in
place for the Week 7 changes (C-70, T-71; the story was To Do, T-74):

- Scenario 1: when every venue booking is Confirmed or withdrawn (at least one
  Confirmed), the full requested equipment is reserved and any requested
  technical support is assigned, the Coordinator **submits the event for its
  Operational Safety Check**. It moves to **Safety Review**, the Safety
  Officer is notified, and the Organiser is told it is awaiting its safety
  check. Only the Safety Officer's approval (E08-S06) sets Confirmed.
- Scenarios 2, 3 and 5: an outstanding venue booking, a partial equipment
  reservation or unassigned support blocks the submission, with each item
  listed.
- Scenario 4: equipment recorded as "none required" doesn't block.
- Scenario 6: the Organiser sees every confirmed venue with its purpose and
  period, the date, time and arrangements of a Confirmed event.
- Scenario 7: nobody but a Safety Officer can set Confirmed; a refused attempt
  is recorded in the activity log.

**Sprint boundary (T-73):** the Week 9 answers differ. C-132 / T-82 make
Safety Review start automatically, and C-131 has the Coordinator mark
Confirmed after the Safety Officer approves. Those are follow-up work after
Sprint 3. The readiness check is built as its own piece
(`eventReadiness/readiness.ts`) so the follow-up can reuse it unchanged.

**Built on:** E03-S03's status-change path (`applyEventStatusChange`, which
locks, validates, audits and notifies), E06-S03/S05 bookings and holds,
E05-S05 buffer conflicts, E07-S02/S04 equipment requests and reservations,
E07-S06/S07 support requests and staffing, and #232's Safety Officer role
(migration 0012).

**Migration:** `safety_review` is added by migration 0017 in its own PR
(SCRUM-184, branch `feature/SCRUM-184-safety-review-status`), merged into this
branch so the code runs locally.

**Merge order:**
1. the 0017 PR merges first;
2. 0017 is applied in production (by us, at the deploy owner's request);
3. 0012 (#232, merged 2026-10-16) is applied in production by the deploy
   owner;
4. **only then this story's PR.**

The code names `'safety_review'` in read filters, and PostgreSQL rejects an
unknown enum value even there, so merging this code first would break
existing pages. The 0017 run record (`docs/testing/runs/20261016-020537-Bl0oper-backend-db.md`)
shows the error.

## Rules this story applies

Settled by the story owner before building (D55 to D70 in the story's task
list). Each has a test below. Messages are the code's wording, word for word.

| Rule | What the user sees | Test case |
|---|---|---|
| Only the event's assigned Coordinator reads its readiness or submits it (D62). Anyone else is refused and the refusal is audited (hidden from the Activity log) | 403 "Access denied. This event is not assigned to you." (readiness) / "Only the assigned Coordinator can submit this event for its safety check." (submit) | Database tests |
| Only an event in Planning can be submitted (D58). Approved events, which have no booking request yet, are read-only here | 409 "Only an event in Planning can be submitted for its safety check." / "This event is already in Safety Review."; the page says "This event is approved. Only an event in Planning can be submitted for its safety check." | Database tests |
| Venue (Scenario 2, D61, D69): at least one booking Confirmed; Pending, Conflicting, a buffer conflict and a live tentative hold block; rejected, released, expired bookings and lapsed holds are withdrawn. A Confirmed booking flagged after a capacity cut blocks too (same reasoning as D61, see Known limits) | "No venue booking is Confirmed yet." / "Orchid Hall — Pending" / "— Conflicting" / "— Conflicting (setup or turnaround overlap)" / "— tentative hold; request it or let it go" / "— needs review: its capacity is now below the expected attendance" | TC_E08S03_09 |
| Equipment (Scenario 3, D61): every request line needs a full, unflagged reservation | "Projector-HD — 2 of 3 reserved; 1 outstanding" / "Lectern — not reserved; 1 outstanding" / "Screen — reservation released; 2 outstanding" / "Speaker — needs review: stock changed (5 of 5 reserved)" | TC_E08S03_03, TC_E07S04_07 |
| Equipment recorded as none required, or free text with no request lines, passes (Scenario 4, D61) | "None required. Nothing to reserve." / "No equipment requests. Nothing to reserve." | TC_E08S03_10 |
| Support (Scenario 5): an open required support request blocks; staffed, cancelled and "no support needed" don't | "Technical support — no staff assigned yet: Sound desk operator" (long descriptions cut at 80 characters) | TC_E08S03_04 |
| A blocked submission changes nothing and lists every outstanding item | 409 "This event can't be submitted for its safety check until every outstanding item is resolved." plus the list | TC_E08S03_09, _03, _04 |
| The check re-runs inside the submission's transaction, after the event row is locked (the lock every E07 writer takes first), and covers the whole event whatever Session a booking belongs to (D70) | — | Database tests |
| Submission moves Planning → Safety Review through the shared status-change path, with its audit entry (Scenario 1) | "Submitted. The event is now in Safety Review; the Organiser and the Safety Officer have been notified."; pill "Safety Review" | TC_E08S03_08 |
| Notices (D63): the Organiser gets one targeted notice (it replaces the generic one); every active Safety Officer gets one; the Coordinator, as actor, none | Organiser: "Awaiting safety check" — "<Coordinator> submitted <event> for its safety check. The event is now in Safety Review, and is confirmed only once the Safety Officer approves it." Safety Officer: "Safety check needed" — "<Coordinator> submitted <event> for its Operational Safety Check. The event is now in Safety Review." | TC_E08S03_08 |
| Planning can't go straight to Confirmed; Safety Review exits to Confirmed, Planning or Cancelled (D59) | — | TC_E08S03_09 |
| Only an active Safety Officer can move Safety Review → Confirmed, checked in the shared status-change path so no route can bypass it (D60) | — | TC_E08S03_09 |
| A "confirm" action refuses anyone but a Safety Officer (D60: refusal only; the approval is E08-S06's). Staff refusals are written to the Activity log; an Organiser's or Attendee's is an ordinary access denial, never shown (#161) | 403 "Only a Safety Officer can confirm an event in Safety Review."; Activity log row "Confirmation refused", change "Confirmation: Refused (Safety Officer only)". A Safety Officer gets 409 "A Safety Officer confirms an event by approving its safety review." | TC_E08S03_09 |
| Safety Review is a real status (D64): labelled "Safety Review" (design.md section 7), counts as active (T-52: workload, reassignment, deactivation), stays in every read list; write lists are unchanged, so arrangements are frozen until it returns to Planning | Pill "Safety Review"; equipment and staffing changes refused as for a Confirmed event; an Organiser's restricted edits refused | Database tests |
| The Organiser sees a Confirmed (or Completed) event's confirmed venues with purpose and period, the equipment reserved and the support staffed (Scenario 6, D66); technician names are not shown | Card "Confirmed arrangements" on `/organiser/requests/:eventCode` | TC_E08S03_05 |
| Fix (a): the Organiser's request summary shows "None required", not `none_required` | "None required" | Vitest |
| Fix (b): the Coordinator's event page never shows a raw id as its eyebrow | "Request" | Vitest |

## Test plan

Backend tests are in `backend/tests/eventReadiness.integration.test.ts` and
`eventReadinessRoutes.integration.test.ts` (real database) and
`eventReadiness.test.ts` (unit); screen tests in
`frontend/src/features/coordinator/EventReadiness.test.tsx`,
`frontend/src/features/organiser/ConfirmedArrangements.test.tsx` (Vitest) and
`tests/e2e/eventReadiness.spec.ts` (Playwright, replacing the `test.fixme`
cases for _03 to _05 in `e08.spec.ts`). Each title contains its TC ID.

| TC ID | Scenario | Backend tests | Screen tests |
|---|---|---|---|
| TC_E08S03_03 | 3 | Database and unit | Vitest and Playwright |
| TC_E08S03_04 | 5 | Database and unit | Vitest and Playwright |
| TC_E08S03_05 | 6 | Database, route and unit | Vitest and Playwright |
| TC_E08S03_08 | 1 | Database, route and unit | Vitest and Playwright |
| TC_E08S03_09 | 2 and 7 | Database, route and unit | Vitest and Playwright (step 1); steps 2 and 3 are API calls, in the database and route tests |
| TC_E08S03_10 | 4 | Database and unit | Vitest and Playwright |
| TC_E07S04_07 (last step) | 3 | Database and unit | — |

**Catalogue changes (D65):** _03, _04 and _05 reworded in place for the Week
7 flow; _08 step 3 trimmed to the inbox (the safety review queue is
E08-S06's); _10 added. **_01, _02, _06 and _07 are left as they were**: they
describe the pre-Week 7 flow ("Confirm Event" sets Confirmed), and _08 and _09
cover their scenarios. They are not tested this sprint, to be reworded after
#230.

**Test data:** the cases name accounts and events the seed doesn't have
(`coordinator_1@`, `safety_1@`, `lead_1@`, "Charity Run"); #230 is renaming
them. The automated tests create their own data. The click-throughs use
EVT-3003 "Planning Phase Gala" (Planning, `coord_a`, `organiser_a`, 25 Oct
2026, 6:00 pm – 10:00 pm, with a seeded Pending Orchid Hall booking) and the
seeded `safety_officer@`, `coord_lead@`, `coord_b@`, `tech_a@` accounts.

## Test gates

Every gate must pass, and be recorded in the Run log, before the PR is opened.
Runs cited as evidence also get a session file in `docs/testing/runs/` (T-65).

1. **Backend unit tests**: `npm test --workspace backend`, the whole suite.
2. **SCRUM-60 database tests**: `eventReadiness.integration.test.ts` and
   `eventReadinessRoutes.integration.test.ts` against a disposable PostgreSQL
   17 database named `connectsphere_notification_test`.
3. **Neighbouring database tests**: the full `test:db` batch.
4. **Coverage**: 100% of new and changed lines and branches (Definition of
   Done, #215), measured with c8 (backend) and Vitest (frontend).
5. **Typecheck and build**: `npm run typecheck` and `npm run build` from the
   repository root.
6. **F1, component tests**: `npx vitest run --no-file-parallelism` in
   `frontend/`.
7. **F2, browser tests**: the full Playwright suite.
8. **F3, real-stack click-through**: the script below, driven in Chromium
   against the real frontend, API and a freshly seeded disposable database,
   with the database checked and screenshots at 1280 px and 393 px.
9. **F4, Aaron's own click-through** of the same script, logged with "Run by:
   Aaron", before the PR opens.
10. **Repository checks**: `python scripts/check.py`, then `tc-coverage.md`
    regenerated as the last commit; CI green on the PR's head.

A **deliberate-bug check** shows the tests depend on the code: bugs put in on
purpose must make tests fail, then the code is restored.

**Before the demo:** a **read-only check of production** (Supabase), inside
`BEGIN READ ONLY` … `ROLLBACK`, returning only counts and names: `event_status`
has `safety_review` (0017 applied), `user_role` has `safety_officer` (0012
applied), and how many active `safety_officer` users exist (none means
Scenario 1 notifies nobody). Queries shown to Aaron first.

## Click-through script

For Aaron (F4), by hand, on the real frontend, the real API and a freshly
reset and seeded local database. **Run it on or before 25 October 2026**
(EVT-3003's date). Note pass or fail for each step; on a fail, copy the exact
words on screen.

**Before you start** (Claude sets this up):
- the database is reset and seeded;
- the API runs on port 3001 and the frontend on http://localhost:5173.

Every seeded account's password is `ValidPass123`. Use several browser
windows: a normal one for `coord_a`, a private one for the second person in
each step, and sign out between people in the same window.

**Part A: the Coordinator sees what is outstanding (Scenario 2)**

1. Sign in as `coord_a@connectsphere.com`. Open **Review queue** and then
   **EVT-3003 Planning Phase Gala**. The pill reads **Planning** and there is
   a teal **Check readiness** button. Click it.
2. The page is titled **Readiness: EVT-3003 Planning Phase Gala**. The yellow
   box **Resolve these before submitting** lists exactly:
   - "No venue booking is Confirmed yet."
   - "Orchid Hall — Pending"

   **Venue bookings** shows Orchid Hall, None recorded, 25 Oct 2026, 6:00 pm –
   10:00 pm, Pending, **Outstanding**. **Equipment** says "No equipment
   requests. Nothing to reserve." **Technical support** says "No technical
   support requested."
3. Click **Submit for safety check…**, then **Submit for safety check** in the
   panel. A red line reads "This event can't be submitted for its safety check
   until every outstanding item is resolved." The pill still reads
   **Planning**. Click **Cancel**.

**Part B: equipment and support block it too (Scenarios 3 and 5)**

4. Still as `coord_a`: click **Back to event**, then **Equipment requests**,
   then **Add equipment request**. Choose **Projector-HD**, quantity **3**,
   **Save equipment request**.
5. Saving returns you to the event's equipment page. Go back to the event
   page (**Review queue** → **EVT-3003 Planning Phase Gala**) and click
   **Request technical support**. What support is needed: **Sound desk
   operator**. Support starts and ends are already filled with the event's
   times (25 Oct 2026, 6:00 pm and 10:00 pm); leave them. **Send request**.
6. In the private window, sign in as `tech_a@connectsphere.com`. Open
   **Equipment requests**, then **EVT-3003 Planning Phase Gala**, then
   **Reserve Projector-HD**. Quantity to reserve **2**, **Reserve equipment**.
   It confirms 2 of 3 reserved, 1 still outstanding.
7. Back as `coord_a`, open the readiness page again (**Check readiness**). The
   yellow box now also lists:
   - "Projector-HD — 2 of 3 reserved; 1 outstanding"
   - "Technical support — no staff assigned yet: Sound desk operator"

   **Submit for safety check…** → **Submit for safety check** is refused with
   the same red sentence; still **Planning**.
8. DevTools device toolbar at **393 px** wide: the readiness page fits with no
   sideways scroll, and each table row becomes a card. Back to full width.

**Part C: everything ready, submitted (Scenario 1)**

9. **Setup step (no Venue Staff decision screen on `main` yet, D68).** In a
   terminal, confirm the Orchid Hall booking and give it a purpose:

   ```powershell
   docker exec cs-scrum34-test psql -U postgres -d connectsphere_dev_stack -c "UPDATE venue_bookings SET status = 'confirmed', purpose = 'Gala dinner' WHERE event_id = (SELECT id FROM events WHERE event_code = 'EVT-3003');"
   ```

   It prints `UPDATE 1`.
10. As `tech_a`: back on EVT-3003's equipment page, **Change Projector-HD
    reservation**, quantity **3**, **Save reservation**. Then **Technician
    staffing**, open **EVT-3003 Planning Phase Gala**, and next to **Technical
    Support B** click **Assign…**, then **Assign technician**.
11. As `coord_a`, reload the readiness page. There is no yellow box; every
    row reads **Ready**; **Your submission** says "Every arrangement is ready.
    Submit the event for its Operational Safety Check."
12. Click **Submit for safety check…**. The panel says the event moves to
    Safety Review, the Organiser and the Safety Officer are notified, and it
    is confirmed only once the Safety Officer approves it. Click **Submit for
    safety check**. A green box reads "Submitted. The event is now in Safety
    Review; the Organiser and the Safety Officer have been notified." The pill
    reads **Safety Review** (blue). The submit button is gone.
13. Click **View event**. The pill reads **Safety Review**. The **Activity
    log** has a row "Status changed", **Planning → Safety Review**, by
    Coordinator A. `coord_a`'s bell shows no notice about the submission.

**Part D: the Organiser and the Safety Officer are told**

14. In the private window, sign out, sign in as `organiser_a@clienta.com`.
    Open the bell (or **Notifications**) and click **Awaiting safety check**:
    "Coordinator A submitted EVT-3003 EVT-3003 Planning Phase Gala for its
    safety check. The event is now in Safety Review, and is confirmed only
    once the Safety Officer approves it." (The code appears twice with the
    seed's title; see Known limits.)
15. Open **My requests**, then **EVT-3003 Planning Phase Gala**. The pill
    reads **Safety Review**, and a blue box says "Your event is awaiting its
    safety check. It is confirmed once the Safety Officer approves it."
16. Sign out, sign in as `safety_officer@connectsphere.com`. The Safety
    Officer has no home page yet (E01-S13, Known limits), so go to
    http://localhost:5173/notifications. Click **Safety check needed**:
    "Coordinator A submitted EVT-3003 EVT-3003 Planning Phase Gala for its
    Operational Safety Check. The event is now in Safety Review."

**Part E: nobody else can confirm (Scenario 7)**

17. As `coord_a`, on any ConnectSphere page, open DevTools → Console and run:

    ```js
    fetch('/api/events?confirm=1&id=EVT-3003', { method: 'POST' }).then(r => r.json().then(b => console.log(r.status, b.error)))
    ```

    It prints `403 Only a Safety Officer can confirm an event in Safety
    Review.`
18. In the private window, sign out, sign in as `coord_lead@connectsphere.com`,
    go to http://localhost:5173/notifications and run the same command. Same
    `403` and sentence.
19. As `coord_a`, reload EVT-3003's event page. The pill still reads **Safety
    Review**. The **Activity log** has two **Confirmation refused** rows,
    "Confirmation: Refused (Safety Officer only)", by Coordinator A and by
    Coordinator Lead.
20. Go to http://localhost:5173/coordinator/events/EVT-3003/confirm (the old
    mock link). It opens the readiness page, which says "This event is in
    Safety Review. It is confirmed only once the Safety Officer approves it."
    and offers no button.
21. In the private window, sign out, sign in as `coord_b@connectsphere.com`,
    and go to http://localhost:5173/coordinator/events/EVT-3003/readiness. It
    says "Access denied. This event is not assigned to you."

**Part F: the Organiser sees the confirmed arrangements (Scenario 6)**

22. **Setup step (stand-in for the Safety Officer's approval, E08-S06, not
    built).** In the terminal:

    ```powershell
    docker exec cs-scrum34-test psql -U postgres -d connectsphere_dev_stack -c "UPDATE events SET status = 'confirmed' WHERE event_code = 'EVT-3003';"
    ```
23. Sign in as `organiser_a@clienta.com` and open **My requests** →
    **EVT-3003 Planning Phase Gala**. The pill reads **Confirmed**. The
    **Confirmed arrangements** card lists **Orchid Hall**, **Gala dinner**,
    **25 Oct 2026, 6:00 pm – 10:00 pm**; **Equipment reserved: Projector-HD
    × 3**; **Technical support staffed: Sound desk operator (25 Oct 2026,
    6:00 pm – 10:00 pm)**. The Timeline stops at Planning → Safety Review,
    since step 22's SQL writes no audit entry.
24. DevTools device toolbar at **393 px**: the page fits with no sideways
    scroll.

## Known limits

What the tests above do **not** prove. If a customer reports a problem in one
of these areas, it is outside what was tested:

- **Week 9 behaviour is not built (T-73).** Safety Review doesn't start by
  itself when the last arrangement is confirmed (C-132, T-82), the Coordinator
  doesn't mark Confirmed after approval (C-131), and readiness is checked for
  the whole event, not per Session (D70, T-82).
- **The Safety Officer's approval, safety review queue and checklist are
  E08-S06's**, not built. So nothing in the app sets Confirmed yet; the tests
  and click-throughs reach Confirmed with a direct database update.
- **The Safety Officer has no home page or menu** (E01-S13, SCRUM-157, lands
  them on E08-S06's queue). They reach their notices at `/notifications`.
- **No assignment model for Safety Officers**: every active Safety Officer is
  notified (D63). Production needs at least one active Safety Officer
  account, or Scenario 1 notifies nobody.
- **A Confirmed booking flagged for reconfirmation** (capacity cut below the
  expected attendance, E05-S01) blocks submission. This wasn't one of D55 to
  D70; it follows D61's reasoning for flagged reservations and is raised with
  Aaron.
- **Concurrent changes:** equipment writers wait for the submission's event
  lock. A venue booking decision or a technician removal made in the same
  instant as a submission isn't serialised with it (those writers don't lock
  the event row).
- **TC_E08S03_01, _02, _06 and _07 are pre-Week 7 cases**, left for #230 to
  reword, and not tested this sprint (D65). Their scenarios are covered by
  _08 and _09.
- **The cases' account and event names** (`coordinator_1@`, "Charity Run")
  aren't in the seed; the tests map them as above.
- **The submission notices name the event as its code followed by its
  title.** The seed's titles already start with the code ("EVT-3003 Planning
  Phase Gala"), so on seeded data the code appears twice ("EVT-3003 EVT-3003
  Planning Phase Gala"). An event whose title doesn't repeat its code shows it
  once. Seen in the 17 Oct manual run; F4's record called these notices "as
  scripted", but the script's wording was wrong.
- **Emails are not actually sent.** Tests check the in-app notice and the
  email-outbox row, not delivery.
- **Not tested on the deployed site.** All runs are local.
- **The Playwright cases use a fake API** shaped like the real one; the real
  stack is covered by F3, F4 and the database tests.
- **F3 drove the other stories' setup steps through their APIs**, not their
  screens; F4 does them through the screens.
- **Coverage:** c8 reports the first import line of `submission.ts`,
  `readiness.ts` and `arrangements.ts` as unrun, a source-map quirk of c8 with
  tsx (imports always run). Every other new or changed line and branch is
  covered (Run log).

**So that these tests keep running after this story merges:** the backend
test files are in `backend/package.json`'s scripts, and the database test
files have their own step in `.github/workflows/application-checks.yml`.

## Run log

One row per run, newest at the bottom. Add a row every time the tests are run
for this story, whether they pass or fail. A failed run stays in the log; the
fix gets its own row.

- **When**: Singapore time, with the date. "≈" marks a time read from the
  surrounding commits, not captured at the run.
- **Commit**: the short commit ID the run used. An uncommitted working tree is
  recorded as `<commit>+local`.
- **Gate**: which test gate above the run belongs to.
- **Where**: `local` (and which database), or a CI run link.
- **Result**: passed/total, and the IDs of any failures.
- **What was seen**: for failures and refusals, the actual message, word for
  word, so it can be searched for later.

| When (SGT) | Commit | Gate | TC IDs | Command | Where | Result | What was seen | Run by |
|---|---|---|---|---|---|---|---|---|
| 2026-10-16 02:05 | `8a44c76` (SCRUM-184 branch) | migration | — | 0017 check: full reset; `migrate --only 0017` on a database at production's state; rerun; a read filter before 0017 | local, Docker `postgres:17`, throwaway databases | 5/5 passed. Session record `20261016-020537-Bl0oper-backend-db.md` | Before 0017: "invalid input value for enum event_status: safety_review" | Claude (for Aaron) |
| 2026-10-16 ≈02:15 | `c341257+local` | 2 | _03, _04, _05, _08, _09, _10, E07S04_07 | `npx tsx --test tests/eventReadiness.integration.test.ts` (backend) | local, Docker `postgres:17`, `connectsphere_notification_test` | **9/12, failed _08, _04, _05** | All three faults in the tests: bookings with the same period list by venue name, not insertion order; the 80-character cut was miscounted; the confirmed fixture defaulted to `none_required` while the test expected `false` | Claude (for Aaron) |
| 2026-10-16 ≈02:16 | `c341257+local` | 2 | the same | The same | the same | **11/12, failed _04** | Support requests with the same period are ordered by their random ids; the test now compares by description. Fault in the test | Claude (for Aaron) |
| 2026-10-16 ≈02:17 | `c341257+local` | 2 | the same | The same, twice | the same | 12/12 passed, both times | — | Claude (for Aaron) |
| 2026-10-16 ≈02:19 | `c341257+local` | 2 | _05, _08, _09 | `npx tsx --test tests/eventReadinessRoutes.integration.test.ts` | the same | 1/1 passed | — | Claude (for Aaron) |
| 2026-10-16 ≈02:21 | `c341257+local` | 1 | _03, _04, _05, _08, _09, _10, E07S04_07 | `npx tsx --test tests/eventReadiness.test.ts` | local | 13/13 passed | — | Claude (for Aaron) |
| 2026-10-16 ≈02:22 | `c341257+local` (committed as `bfcea4d`) | 1 | — | `npm test` (backend) | local | 412/412 passed | — | Claude (for Aaron) |
| 2026-10-16 ≈02:25 | `bfcea4d+local` | F1 | _03, _04, _08, _09, _10 | `npx vitest run --no-file-parallelism src/features/coordinator/EventReadiness.test.tsx` | local | **9/10, failed "TC_E08S03_03 and TC_E08S03_04 …"** | "Unable to find an element with the text: Every arrangement is ready. Submit the event for its Operational Safety Check.": the test's stub said not ready while it meant a stale tab showing ready. Fault in the test | Claude (for Aaron) |
| 2026-10-16 ≈02:26 | `bfcea4d+local` | F1 | the same, _05 | The same; then `ConfirmedArrangements.test.tsx` | local | 10/10 and 4/4 passed | — | Claude (for Aaron) |
| 2026-10-16 ≈02:28 | `bfcea4d+local` (committed as `c60b5b2`) | F1, 5 | — | `npx vitest run --no-file-parallelism` (whole frontend); `npm run typecheck` (root) | local | 423/423 passed; typecheck clean | — | Claude (for Aaron) |
| 2026-10-16 ≈02:30 | `c60b5b2+local` | F2 | _03, _04, _05, _08, _09, _10 | `npx playwright test tests/e2e/eventReadiness.spec.ts tests/e2e/coordinator.spec.ts tests/e2e/e08.spec.ts` | local, fake API | **18 passed, 2 failed (TC_05 desktop and mobile)** | "strict mode violation: getByRole('region', { name: 'Summary' }) resolved to 2 elements": the test's locator also matched "Request summary". Fault in the test | Claude (for Aaron) |
| 2026-10-16 ≈02:31 | `c60b5b2+local` (committed as `a4e529b`) | F2 | the same | The same | local, fake API | 20 passed | — | Claude (for Aaron) |
| 2026-10-16 ≈02:33 | `a4e529b+local` | 4 | — | c8 over the three backend files (unit, database, route); Vitest coverage over the changed screens | local, same container | All new and changed lines covered except `api/events.ts` 245–246 and 348 (route branches), `submission.ts` 74 (an unreachable name fallback) and `Organiser.tsx` 283 (no equipment and not none-required) | Two route calls and one screen case added; the fallback removed (`full_name` is `NOT NULL`) | Claude (for Aaron) |
| 2026-10-16 ≈02:35 | `a4e529b+local` (committed as `152690e`) | 4 | — | The same | the same | **100% of new and changed lines and branches**, apart from the c8 import-line quirk (Known limits) | — | Claude (for Aaron) |
| 2026-10-16 02:35 | `fbda0f8`, with bugs put in on purpose | deliberate bug | _03, _08, _09 | Five bugs, one at a time, restored from git after each: a partial reservation counted as ready; Planning allowed straight to Confirmed; inactive Safety Officers notified; the shared path's Safety Officer check removed; the readiness page hiding the outstanding items | local, same container | **Each bug was caught**: 2, 2, 1, 1 and 2 failing tests respectively | Shows the tests check these rules | Claude (for Aaron) |
| 2026-10-16 02:36 | `fbda0f8` | 2, 3 | all | `npm run test:db --workspace backend` | local, same container | 130/131; **failed E01-S02** | "column e.venue_requirements does not exist": on `main` since #161, not from this story | Claude (for Aaron) |
| 2026-10-16 02:36 | `fbda0f8` | F2 | all | `npx playwright test` (full) | local, fake API | 328 passed, 0 failed, 290 skipped | — | Claude (for Aaron) |
| 2026-10-16 02:40 | `fbda0f8` | F3 | all | Click-through driven in Chromium (`f3_60.mjs`, outside the repo) | local real stack: Vite 5173, API 3001, freshly reset and seeded `connectsphere_dev_stack` | **14/17, then the script stopped** | All the driving script's faults: it read the refusal before it arrived (steps 4 and 8; the database showed Planning); counted coord_a's two reservation notices as submission notices; called the API from coord_lead's blank page | Claude (for Aaron) |
| 2026-10-16 02:41 | `fbda0f8` | F3 | all | The same, fixed, after a fresh reset | the same | 23/23 passed | The 1280 px screenshots showed the narrow page clipping the five-column tables ("Outstandin", "Readine"); fixed in `b68a0a5` | Claude (for Aaron) |
| 2026-10-16 02:42 | `b68a0a5` | F3 | all | The same, after a fresh reset | the same | 23/23 passed. Session record `20261016-024232-Bl0oper-frontend-e2e.md` | Messages word for word in the session record | Claude (for Aaron) |
| 2026-10-16 02:43 | `b68a0a5` | 1 | all | `npm test` (backend) | local | 412/412 passed. Session record `20261016-024304-Bl0oper-backend-unit.md` | — | Claude (for Aaron) |
| 2026-10-16 02:43 | `b68a0a5` | F1 | all | `npx vitest run --no-file-parallelism` (whole frontend) | local | 423/423 passed. Session record `20261016-024312-Bl0oper-frontend-vitest.md` | — | Claude (for Aaron) |
| 2026-10-16 02:44 | `b68a0a5` | 5 | — | `npm run typecheck`; `npm run build` (root) | local | both passed | — | Claude (for Aaron) |
| 2026-10-16 02:45 | `b68a0a5` | 2, 3 | all | `npm run test:db --workspace backend` | local, same container | 130/131; failed E01-S02 only (as above). Session record `20261016-024503-Bl0oper-backend-db.md` | — | Claude (for Aaron) |
| 2026-10-16 02:45 | `b68a0a5` | F2 | all | `npx playwright test` (full) | local, fake API | 328 passed, 0 failed, 290 skipped. Session record `20261016-024520-Bl0oper-frontend-e2e.md` | — | Claude (for Aaron) |
| 2026-10-16 ≈03:17 | `d8df1f1` (application code as `b68a0a5`) | F4 | all | Aaron's own click-through, the 24-step script, by hand | local real stack, freshly reset and seeded `connectsphere_dev_stack` | 24/24 steps passed. Session record `20261016-031733-Bl0oper-frontend-e2e.md` | Every message as scripted | Aaron |
| 2026-10-16 13:33 | `364a7d4` (`main` at `62916a9` merged in as `5cebc1a`, with #217's duplicate TC_E08S03_08 and _09 scaffolds removed; this story's application files unchanged since `b68a0a5`) | 5, 1 | all | `npm run typecheck`; `npm run build`; `npm test --workspace backend` | local | typecheck and build passed; backend 412/412 | — | Claude (for Aaron) |
| 2026-10-16 13:33 | `364a7d4` | 2, 3 | all | `npm run test:db --workspace backend` (test database migrated first) | local, container `cs-scrum34-test`, `connectsphere_notification_test` | 130/131; failed E01-S02 only ("column e.venue_requirements does not exist", on `main` since #161) | — | Claude (for Aaron) |
| 2026-10-16 13:34 | `364a7d4` | F1 | all | `npx vitest run --no-file-parallelism` (whole frontend) | local | 423/423 passed (46 files) | — | Claude (for Aaron) |
| 2026-10-16 13:37 | `364a7d4` | F2 | all | `npx playwright test` (full) | local, fake API | 328 passed, 0 failed, 342 skipped (52 more skipped than on `b68a0a5`: #217's new Week 7 `fixme` scaffolds) | — | Claude (for Aaron) |
| 2026-10-16 13:40 | `364a7d4` | 10 | — | `python scripts/check.py` | local (Windows) | 348 run records valid; failed only `test_worktree_hygiene` (3 failures, 11 errors: symlink tests that fail on Windows since #248; CI on Linux runs them) | — | Claude (for Aaron) |
| 2026-10-16 14:17 | `c315f86` (`main` at `8599ad2` merged in: #272's backend change, #280's cases; the conflicting generated workbooks and `tc-coverage.md` regenerated, 360 cases; no frontend change from `main`) | 5, 1, 2, 3 | all | `npm run typecheck`; `npm test --workspace backend`; `npm run test:db --workspace backend` | local, container `cs-scrum34-test` | typecheck passed; backend 412/412; `test:db` 131/132, failed E01-S02 only (as above) | — | Claude (for Aaron) |
| 2026-10-17 18:30–19:13 | `1e33320` | F4 (re-run with screenshots, T-93) | _03, _04, _05, _08, _09 | Aaron's own click-through, the 24-step script, by hand in Chrome, with 19 screenshots | local real stack, `connectsphere_dev_stack` reset and seeded at ≈18:10 | 24/24 steps as scripted, apart from the notices' wording (recorded PASS). Session record `20261017-191316-Bl0oper-frontend-e2e.md`, screenshots in `docs/testing/runs/evidence/20261017-191316-Bl0oper-frontend-e2e/` | Both submission notices read "Coordinator A submitted EVT-3003 EVT-3003 Planning Phase Gala …": the seed's title already starts with the code (Known limits). The script's steps 14 and 16 corrected | Aaron |
