# SCRUM-33 / E03-S02 implementation status

Request clarification from the Event Organiser. This file records what was
built, which test proves each acceptance criterion, and **every run of those
tests**, so each result can be traced back to the exact code it ran against.

## Scope

From `docs/backlog/release-1/E03-review-coordination-status.md`:

- Scenario 1: the assigned Coordinator records one or more questions on an
  Under Review request. The status becomes Awaiting Clarification, and the
  Organiser is notified with the questions.
- Scenario 2: the Organiser responds and resubmits. The status returns to
  Under Review, and the Coordinator is notified.
- Scenario 3: outstanding questions are shown with the date they were raised.
- Checklist: the Coordinator can filter their events by clarification status.
- Decisions: C-10 (Coordinators may return requests) and B-02 (a
  clarification changes status and blocks; a comment doesn't).

## Rules this story applies

These rules were settled by the story owner before building. Each has a test
case below.

| Rule | Test case |
|---|---|
| Only the Coordinator assigned to the request can ask for clarification | TC_E03S02_05 |
| Clarification can only be requested while the request is Under Review | TC_E03S02_06 |
| At least one non-blank question is required | TC_E03S02_07 |
| Each question is limited to 2000 characters, the same as event comments | TC_E03S02_08 |
| The Organiser must answer **every** outstanding question before resubmitting; a partial response is rejected | TC_E03S02_09 |
| Only the Organiser who owns the request can answer, not others in the same organisation | TC_E03S02_10 |
| Answers are only accepted while the request is Awaiting Clarification | TC_E03S02_11 |
| Answers are text only. Changes to request fields go through the existing pre-approval edit (`PATCH /api/events?id=<id>&edit=1`) | Not a separate case: the response call accepts no field changes |
| Notices go through the shared E11-S01 writer (BDR T-64): one in-app notice and one email-outbox row per recipient per change, never a duplicate generic "status changed" notice, and no notice to the person who acted. The Organiser's notice includes the question text | TC_E03S02_01, _02, _12 |
| Added while building: at most 20 questions per request; each answer is limited to 2000 characters; each question can be answered once; an answer must name an outstanding question | Unit tests in `backend/tests/clarification.test.ts`, and TC_E03S02_12 for the unknown question |
| The questions, the status change, its audit entry and the notices commit together. If the email-outbox write fails, nothing is stored | TC_E03S02_01 (rollback test) |

## Test plan

The test cases are in `docs/testing/cases/E03.md` (TC_E03S02_01 to _12).

- **Backend tests** check the rules against a real, disposable PostgreSQL 17
  database. The browser can't be trusted to enforce a rule, so these are what
  prove it holds.
- **Frontend tests** check that the screens show the right things: Vitest
  component tests for each refusal's exact message, and Playwright browser
  tests for the flows across both roles. These came in the frontend PR.

Every automated test must carry its TC ID in its title, so that
`scripts/tc_coverage_audit.py` counts it in `docs/testing/tc-coverage.md`.

| TC ID | Type | What the user sees | Backend test (backend PR) | Frontend test (frontend PR) |
|---|---|---|---|---|
| TC_E03S02_01 | Happy path | Status becomes Awaiting Clarification. The Organiser gets one notice containing the question text. On screen: "Questions sent. The request is now awaiting clarification." and the pill "Awaiting clarification" | `clarification.integration.test.ts`: "TC_E03S02_01: questions move an Under Review request…" and "TC_E03S02_01: a failed email-outbox write stores no questions…" | `tests/e2e/e03.spec.ts`: "TC_E03S02_01 - Verify that recording and sending clarification questions…"; `RequestClarification.test.tsx`: "TC_E03S02_01 - sending a question moves the request to Awaiting clarification…" |
| TC_E03S02_02 | Happy path | Status returns to Under Review. The Coordinator gets one notice. On screen: "Answers sent. The request is back under review." and the pill "Under review" | `clarification.integration.test.ts`: "TC_E03S02_02: a complete answer resolves the question…" | `tests/e2e/e03.spec.ts`: "TC_E03S02_02 - Verify that when the Organiser responds and resubmits…"; `AnswerQuestions.test.tsx`: "TC_E03S02_02 - answering every question sends them…" |
| TC_E03S02_03 | Happy path | Each outstanding question is listed with who asked and the date raised, as the app writes dates: "Asked by Coordinator B on 8 Sept 2026" (D19; 08/09/2026 in the catalogue's test data) | `clarification.integration.test.ts`: "TC_E03S02_03: both event detail reads list the outstanding questions…" | `tests/e2e/e03.spec.ts`: "TC_E03S02_03 - Verify that a request Awaiting Clarification should show…"; `RequestClarification.test.tsx` and `AnswerQuestions.test.tsx`: "TC_E03S02_03 - the event page / request page lists each outstanding question…" |
| TC_E03S02_04 | Cross-cutting (UI filtering) | Only Awaiting Clarification events are listed (the review queue's "Awaiting organiser" chip, D20) | `clarification.integration.test.ts`: "TC_E03S02_04: a Coordinator can filter their events to Awaiting Clarification" | `tests/e2e/e03.spec.ts`: "TC_E03S02_04 - Verify that an Event Coordinator should be able to filter…" |
| TC_E03S02_05 | Negative | 403 "Only the assigned Coordinator can request clarification on this request." In a real browser the read refuses first: "Access refused" / "Access denied. This event is not assigned to you." | `clarification.integration.test.ts`: "TC_E03S02_05: a Coordinator not assigned to the request is refused…" | `RequestClarification.test.tsx`: "TC_E03S02_05 - a Coordinator not assigned to the request sees the server refusal when sending" and "…who cannot open the event gets no question form" |
| TC_E03S02_06 | Negative (business rule) | 409 "Clarification can only be requested while the request is Under Review." The question page shows the same sentence, with no form, when the request isn't Under Review (D22) | `clarification.integration.test.ts`: "TC_E03S02_06: clarification cannot be requested on a request that is not Under Review" | `RequestClarification.test.tsx`: "TC_E03S02_06 - a request that is not Under Review shows why instead of the form" and "…a page left open after the status changed shows the server refusal" |
| TC_E03S02_07 | Negative | 400 "Add at least one question." Caught before sending; a blank box beside a real question reads "Enter the question, or remove this box." | `clarification.integration.test.ts` and `clarification.test.ts`: "TC_E03S02_07: …" | `RequestClarification.test.tsx`: "TC_E03S02_07 - an empty question is caught before sending" and "…a blank box beside a real question asks to fill it in or remove it" |
| TC_E03S02_08 | Boundary | 400 "Each question must be 2000 characters or fewer." (2001); accepted (2000). Caught before sending | `clarification.integration.test.ts` and `clarification.test.ts`: "TC_E03S02_08: …" | `RequestClarification.test.tsx`: "TC_E03S02_08 - a 2001-character question is caught before sending and 2000 characters are sent" and "…the server refusal for an over-long question is shown word for word" |
| TC_E03S02_09 | Negative (business rule) | 400 "Answer every outstanding question before resubmitting." Caught before sending, with "Answer this question." under each empty box | `clarification.integration.test.ts` and `clarification.test.ts`: "TC_E03S02_09: …" | `AnswerQuestions.test.tsx`: "TC_E03S02_09 - a missing answer is caught before sending" and "…the server refusal for a partial answer is shown word for word" |
| TC_E03S02_10 | Cross-cutting (security) | 403 "Only the Organiser who submitted this request can answer its questions." The answer page shows the same sentence, with no form, to a colleague (D21); their request page reads "Request not found" | `clarification.integration.test.ts`: "TC_E03S02_10: another Organiser in the same organisation cannot answer…" | `AnswerQuestions.test.tsx`: "TC_E03S02_10 - another Organiser in the same organisation sees why they cannot answer…" and "…the server refusal for a non-owner is shown word for word" |
| TC_E03S02_11 | Negative (business rule) | 409 "This request is not awaiting clarification." The answer page shows the same sentence, with no form, when nothing is outstanding (D22) | `clarification.integration.test.ts`: "TC_E03S02_11: answers are refused while the request is not Awaiting Clarification" | `AnswerQuestions.test.tsx`: "TC_E03S02_11 - a request that is not awaiting clarification shows why…" and "…a page left open after the questions were answered shows the server refusal" |
| TC_E03S02_12 | Happy path | Both questions in one notice, both listed, both resolved after one response | `clarification.integration.test.ts`: "TC_E03S02_12: two questions are sent in one notice…" | `tests/e2e/e03.spec.ts`: "TC_E03S02_12 - Verify that several questions can be sent together…"; `RequestClarification.test.tsx`: "TC_E03S02_12 - two questions are sent together after a third empty box is removed" |

Backend test files are in `backend/tests/`; frontend component tests are in
`frontend/src/features/coordinator/RequestClarification.test.tsx` and
`frontend/src/features/organiser/AnswerQuestions.test.tsx`. The messages above
are the final wording in `backend/src/modules/eventLifecycle/clarification.ts`
and `frontend/src/features/events/clarificationApi.ts` (checked word for word
by the tests and the real-stack runs on `b59c5db` and `d0472d4`), so a message
a customer reports can be searched for and traced to its test case.

The notices' final wording (title, then message):

- To the Organiser: **"Clarification requested"**, "&lt;Coordinator&gt; needs
  more information about &lt;code&gt; &lt;title&gt; before the review can continue.
  The request is now Awaiting Clarification." followed by the numbered
  questions.
- To the Coordinator: **"Clarification answered"**, "&lt;Organiser&gt; answered
  your questions about &lt;code&gt; &lt;title&gt;. The request is back Under
  Review." followed by each question and its answer.

The notices' message continues with "Questions:" and the numbered questions
(to the Organiser), or each numbered question followed by "Answer: …" (to
the Coordinator).

Other refusals the code can give (all 400): "Send at most 20 questions at a
time.", "Each answer must be 2000 characters or fewer.", "Each question can
only be answered once.", "One of the answers does not match an outstanding
question." A wrong role gets the existing 403 messages: "Access denied. This
action is for Event Coordinators." or "Access denied. Contact your
administrator about your organisation access."

### What the screens say (frontend PR)

The screens check the same rules before sending, using the server's own
sentences where one exists, so each rule shows one message whichever side
catches it. Everything else on screen:

| Where | When | What the user sees |
|---|---|---|
| Coordinator event page | Under Review | A "Request clarification" button (no ellipsis: it opens a page, not a confirmation, D23) |
| Coordinator question page | After sending | Back on the event page: "Questions sent. The request is now awaiting clarification." |
| Coordinator question page | A blank box beside a real question | "Enter the question, or remove this box." under that box, and "Fix the highlighted questions, then send again." |
| Coordinator question page | 20 boxes | "You can send up to 20 questions at a time." instead of "Add another question" |
| Organiser request page | Awaiting Clarification, questions outstanding | "Your coordinator has requested clarification. Answer their questions to send the request back for review." and a "Respond now" button |
| Organiser request page | Awaiting Clarification, none outstanding | "Your coordinator has requested clarification. Check your notifications and the event's comments for their questions." (the earlier wording) |
| Organiser answer page | After sending | Back on the request: "Answers sent. The request is back under review." |
| Organiser answer page | An answer over 2000 characters | "Each answer must be 2000 characters or fewer." under that box, and "Fix the highlighted answers, then send again." |
| Both pages | Network failure | "Unable to send your questions." / "Unable to send your answers." followed by "Check your connection and try again." |

## Test gates

Every gate below must pass, and be recorded in the Run log, before the PR is
opened. The PR is re-run in full if the code changes after that.

**Backend PR:**

1. **Backend unit tests**: `npm test --workspace backend`. The whole suite,
   not only the new tests, so that a break elsewhere is caught.
2. **SCRUM-33 database tests**: all twelve TC_E03S02 cases against a
   disposable PostgreSQL 17 database named `connectsphere_notification_test`.
3. **Neighbouring database tests**, because this story changes event status
   and sends notices through shared code. The SCRUM-32 coordinator pair, the
   event notification hooks, `eventLifecycle.integration.test.ts`, and the
   full `test:db` batch, which includes suites CI never runs.
4. **Typecheck and build**: `npm run typecheck` and `npm run build` from the
   repository root.
5. **Real-stack run through the API.** The local API is signed in as
   coord_a, coord_b, organiser_a, organiser_b and organiser_c against a freshly
   seeded disposable database. Each TC's steps are made as real HTTP calls,
   and the database is checked after each step (status, questions, answers,
   audit entries, notices, email-outbox rows).
6. **Repository checks**: `python scripts/check.py`, then `tc-coverage.md`
   regenerated as the last commit.
7. **CI green** on the PR's head commit, checked per commit so held runs
   aren't missed.

**Frontend PR:**

1. **Component tests**: `npm test --workspace frontend`, the whole suite.
2. **Browser tests**: the full Playwright suite (`npx playwright test`),
   desktop and Pixel 7, including TC_E03S02_01 to _04 and _12.
3. **Full click-through** of the real frontend, real API and a freshly seeded
   disposable database: the "Click-through script" below, driven in a real
   browser as each role, refusals included, with every message on screen
   checked against "What the user sees", the database checked after each
   step, and screenshots kept at 1280px and 393px.
4. **Aaron's own click-through** of the same script on the same local stack,
   logged with "Run by: Aaron". His feedback is fixed before the PR opens.
5. Gates 4, 6 and 7 above.

**Before the demo:** a **read-only check of production** (Supabase) that
everything this story relies on is there: the `awaiting_clarification`
status, the clarification thread types, and all repository migrations applied.
It runs inside `BEGIN READ ONLY` … `ROLLBACK` and writes nothing. Run on
8 October 2026; the result is the last row of the Run log.

## Click-through script

Frontend gate 3, and Aaron's own customer-view check. Labels and messages
below were checked against the built screens on `d0472d4`.

**Set up first:** start Docker Desktop, reset and seed a disposable
`connectsphere_dev_stack` database (`npx tsx src/database/cli.ts reset` in
`backend/` with `DATABASE_URL` pointing at the container, never Supabase),
start the API (`DATABASE_URL=… npx tsx src/dev.ts` in `backend/`, port 3001)
and the frontend (`npm run dev`, port 5173). The run changes EVT-2003, so
every run starts from a fresh seed. Every seeded account uses the seed
password (`seedCredential` in `backend/src/database/cli.ts`).

Use a normal window and a private window, so two people can be signed in at
once. For each step note pass or fail; on a fail, copy the exact words seen.

**A. The Coordinator asks (TC_E03S02_07, _08, _12, _01, _03)**

1. Normal window: open http://localhost:5173/login and sign in as
   `coord_b@connectsphere.com`.
2. Header → **Review queue**. Click **EVT-2003 Client B Isolation Event**
   (pill **Under review**).
3. Event page: eyebrow **EVT-2003**, pill **Under review**, no "Outstanding
   questions" card. Click **Request clarification** (top right).
4. Question page: eyebrow **EVT-2003**, heading **Request clarification**, a
   card **Your questions** with one box, **Question 1**, hint "Up to 2000
   characters."
5. **Blank (TC_07):** click **Send questions** with the box empty. Expect a
   red alert and the words under the box: **"Add at least one question."**
6. **Too long (TC_08):** press F12 → Console, type
   `copy('a'.repeat(2001))` and press Enter. Paste into the box and click
   **Send questions**. Expect **"Each question must be 2000 characters or
   fewer."** under the box. Clear the box.
7. **Two questions (TC_12):** type "How many VIP guests will attend?". Click
   **Add another question** (the cursor moves into the new box) and type "Do
   you need microphones for the speakers?". Click **Add another question**
   again, then **Remove question 3**: the third box goes away. Click **Send
   questions**; the button briefly reads **Sending…**.
8. **Result (TC_01, _03):** back on the event page with a green alert
   **"Questions sent. The request is now awaiting clarification."**, the
   amber pill **Awaiting clarification**, and an **Outstanding questions**
   card: **Question 1** and **Question 2**, each with **"Asked by Coordinator
   B on <today>"** (for example "2 Oct 2026"). **Request clarification** is
   gone.

**B. The Organiser answers (TC_E03S02_01, _03, _09, _02, _11)**

9. Private window: sign in as `organiser_c@clientb.com`. The bell shows a
   number.
10. Click the bell (**Notifications**). Click the newest **Clarification
    requested** (the top one; an older seeded one is lower down). It opens:
    "Coordinator B needs more information about EVT-2003 EVT-2003 Client B
    Isolation Event before the review can continue. The request is now
    Awaiting Clarification." then "Questions:" with both questions numbered.
    (The code appears twice: a known seed limit.)
11. Header → **My requests** → **EVT-2003 Client B Isolation Event**. Expect
    the pill **Awaiting clarification**; a blue alert "Your coordinator has
    requested clarification. Answer their questions to send the request back
    for review." with a **Respond now** button; and the **Outstanding
    questions** card with both questions, "Asked by Coordinator B on
    <today>" (TC_03).
12. Click **Respond now**. Heading **Answer questions**, card **Your
    answers**, one box per question, labelled "1. How many VIP guests will
    attend?" and "2. Do you need microphones for the speakers?".
13. **Prepare a stale tab (TC_11):** copy the address bar into a new tab in
    this private window and leave it open.
14. **Partial (TC_09):** back in the first tab, answer only question 1 and
    click **Send answers**. Expect the red alert **"Answer every outstanding
    question before resubmitting."** and **"Answer this question."** under
    the empty box.
15. Answer question 2 and click **Send answers**. Expect: back on the
    request, a green alert **"Answers sent. The request is back under
    review."**, the pill **Under review**, no questions card, no **Respond
    now** (TC_02).
16. **Too late (TC_11):** in the second tab, fill both boxes and click
    **Send answers**. Expect the red alert **"This request is not awaiting
    clarification."**

**C. The Coordinator sees the answers (TC_E03S02_02)**

17. Normal window (coord_b): **Notifications** → click **Clarification
    answered**: "Organiser C answered your questions about EVT-2003 EVT-2003
    Client B Isolation Event. The request is back Under Review." then each
    question with "Answer: …".
18. Open EVT-2003: pill **Under review**, no questions card, **Request
    clarification** is back.

**D. Asking twice (TC_E03S02_06)**

19. Still coord_b: open EVT-2003's **Request clarification** page in two
    tabs. In tab 1 send "Stale tab check.": the request becomes **Awaiting
    clarification**.
20. In tab 2 type any question and click **Send questions**. Expect the red
    alert **"Clarification can only be requested while the request is Under
    Review."**
21. Go to `localhost:5173/coordinator/events/EVT-3002/clarify` (Awaiting
    clarification). Expect a blue box with that same sentence, a **Back to
    event** button, and no form (D22).

**E. The filter and a seeded question (TC_E03S02_04, _03)**

22. coord_b → **Review queue** → chip **Awaiting organiser** (D20). It shows
    **2**, and the table lists only **EVT-2003** (from step 19) and
    **EVT-3002**, both **Awaiting clarification**. **All** shows the rest.
23. Open **EVT-3002**: its seeded question ("The workshop description
    mentions…") with "Asked by Coordinator B on <the day the database was
    seeded>".

**F. People who may not act (TC_E03S02_05, _10)**

24. Sign out. Sign in as `coord_a@connectsphere.com` (not EVT-2003's
    Coordinator) and go to `localhost:5173/coordinator/events/EVT-2003/clarify`.
    Expect **Access refused** / "Access denied. This event is not assigned to
    you." and no form. (The send refusal itself, "Only the assigned
    Coordinator can request clarification on this request.", can't be
    reached from a browser; component and database tests prove it.)
25. Private window: sign out, sign in as `organiser_a@clienta.com` (same
    organisation as EVT-3002's Organiser, but not its owner). Go to
    `localhost:5173/organiser/requests/EVT-3002`: **Request not found** (the
    request page shows only your own requests). Then go to
    `…/organiser/requests/EVT-3002/clarify`: a blue box **"Only the Organiser
    who submitted this request can answer its questions."** and no form
    (D21). Optional: sign in as `organiser_b@clienta.com` and check EVT-3002
    shows **Respond now**.

**G. Phone width and keyboard (design.md sections 9 and 10)**

26. F12 → device toolbar (Ctrl+Shift+M) → Responsive, width **393**. Look at
    the question page, the event page, the request page and the answer page:
    no sideways scrolling, no clipped text, buttons full width.
27. On the question page, use only the keyboard: Tab moves through each box,
    **Remove question N**, **Add another question**, **Cancel** and **Send
    questions** in that order, with the teal focus ring always visible;
    Enter on **Send questions** sends.

## Known limits

What the tests above do **not** prove. If a customer reports a problem in one
of these areas, it is outside what was tested:

- **Emails are not actually sent.** Tests check that an email-outbox row is
  written, not that the email provider delivers it.
- **Not tested on the deployed site.** All runs are local. Vercel-only
  behaviour, such as the sign-in origin check, isn't covered.
- **Production data differs from the seed.** Tests use seeded accounts and
  events. Production has its own data, and migrations there are applied by
  hand.
- **Browser tests use fixed sample data.** The Playwright tests run against
  an in-memory stand-in (`tests/e2e/helpers/clarificationBackend.ts`) that
  copies the API's shapes, rules and sentences. The full click-through
  (frontend gate 3) is what joins real screens to the real API.
- **The not-assigned refusal (TC_05) can't be reached from a real browser.**
  A Coordinator who isn't assigned can't open the request at all, so they see
  the read's refusal ("Access denied. This event is not assigned to you.")
  instead of the question form. The server's own sentence is proven by the
  component and database tests only.
- **Dates read "Sept" for September.** The shared `formatDate` uses the
  en-SG locale, which writes "8 Sept 2026"; `design.md` 8.1's examples use
  other months ("12 Nov 2026"). Every screen shows the same thing, so the
  tests expect "Sept". Raised with the skeleton owner rather than changed here.
- **Seeded titles repeat the event code in notices.** Seeded titles already
  start with the code (for example "EVT-2003 Client B Isolation Event"), so a
  notice reads "EVT-2003 EVT-2003 Client B Isolation Event". This comes from
  SCRUM-32's shared event label and only affects seeded data.
- **The 2000-character question is accepted only in the database tests.** The
  real-stack run checks the 2001-character refusal, but doesn't send a
  2000-character question, because that would change the seeded EVT-2003
  that the later steps use.
- **One neighbouring database suite fails on `main`.** Since #161,
  `eventVisibility.integration.test.ts` (E01-S02) fails with "column
  e.venue_requirements does not exist", with or without this PR. Its
  organisation-isolation checks therefore aren't re-proven by the 2026-10-01
  runs. CI doesn't run that suite.

**So that these tests keep running after this story merges:** the backend
test files are added to `backend/package.json`'s `test` script, and the
database test file is added to `.github/workflows/application-checks.yml`.
CI doesn't discover either kind on its own.

## Run log

One row per run, newest at the bottom. Add a row every time the tests are run
for this story, whether they pass or fail. A failed run stays in the log; the
fix gets its own row.

- **When**: Singapore time.
- **Commit**: the short commit ID the run used (`git rev-parse --short HEAD`).
  An uncommitted working tree is recorded as `<commit>+local`.
- **Gate**: which test gate above the run belongs to (F1 to F5 are the
  frontend PR's gates).
- **Where**: `local` (and which database), or a CI run link.
- **Result**: passed/total, and the IDs of any failures.
- **What was seen**: for failures and refusals, the actual status code and
  message, word for word, so it can be searched for later.

| When (SGT) | Commit | Gate | TC IDs | Command | Where | Result | What was seen | Run by |
|---|---|---|---|---|---|---|---|---|
| ≈17:52 | `f45c3f2+local` | 1 | _07, _08, _09 + rules | `npx tsx --test tests/clarification.test.ts` (backend) | local | 7/7 passed | — | Claude (for Aaron) |
| ≈17:52 | `f45c3f2+local` | 1 | all backend | `npm test` (backend) | local | 236/236 passed | — | Claude (for Aaron) |
| 17:54 | `f45c3f2+local` | 2 | _01–_12 | `npx tsx --test tests/clarification.integration.test.ts` | local, Docker `postgres:17` (17.11), `connectsphere_notification_test` | **12/13, failed _12** | `AssertionError`: outstanding questions listed as [Q2, Q1], expected [Q1, Q2]. Questions sent together shared one `now()` timestamp and were ordered by random id. Fixed by stamping each with `clock_timestamp()` | Claude (for Aaron) |
| ≈17:55 | `f45c3f2+local` | 2 | _01–_12 | same, run 3 times after the fix | local, same container | 13/13 passed, 3 times | — | Claude (for Aaron) |
| ≈17:55 | `f45c3f2+local` | 6 | — | `python scripts/check.py` | local | passed (63 tooling tests) | — | Claude (for Aaron) |
| ≈17:56 | `b59c5db` | 1 | all backend | `npm test` (backend) | local | 236/236 passed | — | Claude (for Aaron) |
| ≈17:56 | `b59c5db` | 4 | — | `npm run typecheck` and `npm run build` (root) | local | both passed | — | Claude (for Aaron) |
| ≈17:57 | `b59c5db` | 2 | _01–_12 | `npx tsx --test tests/clarification.integration.test.ts` | local, same container | 13/13 passed | — | Claude (for Aaron) |
| ≈17:57 | `b59c5db` | 3 | neighbours | `npm run test:db` (backend; includes the SCRUM-32 pair, `eventLifecycle`, `eventVisibility`, `registration.db` and this story's file; `public` pre-migrated) | local, same container | 29/29 passed | — | Claude (for Aaron) |
| ≈17:57 | `b59c5db` | 3 | neighbours | `npm run test:event-notifications:db` (backend) | local, same container | 12/12 passed | — | Claude (for Aaron) |
| 17:58 | `b59c5db` | 5 | _01–_12 | Real HTTP calls to the local API (`tsx src/dev.ts`, port 3033), signed in as coord_a, coord_b, organiser_a, organiser_b and organiser_c, with the database checked after each step | local, freshly reset and seeded `connectsphere_dev_stack` in the same container | 18/18 checks passed | Refusals seen word for word: 403 "Only the assigned Coordinator can request clarification on this request." · 409 "Clarification can only be requested while the request is Under Review." · 400 "Add at least one question." (none, and blank) · 400 "Each question must be 2000 characters or fewer." · 409 "This request is not awaiting clarification." · 400 "Answer every outstanding question before resubmitting." · 403 "Only the Organiser who submitted this request can answer its questions." Notices seen: organiser_c got one "Clarification requested" with both questions numbered; coord_b got one "Clarification answered" with both answers; neither actor got one; both had email-outbox rows | Claude (for Aaron) |
| 2026-10-01 22:24 | `42b635d` (after merging `main` `ceba772`) | 1 | all backend | `npm test` (backend) | local | 255/255 passed. Session record `20261001-222419-Bl0oper-backend-unit.md` | — | Claude (for Aaron) |
| 2026-10-01 22:24 | `42b635d` | 2 | _01–_12 | `npx tsx --test tests/clarification.integration.test.ts` | local, Docker `postgres:17` (17.11), `connectsphere_notification_test` | 13/13 passed. Session record `20261001-222457-Bl0oper-backend-db.md` | — | Claude (for Aaron) |
| 2026-10-01 22:24 | `42b635d` | 3 | neighbours | `npm run test:db` (backend; `public` pre-migrated) | local, same container | **28/29, failed E01-S02 (`eventVisibility`)**. Same session record | `error: column e.venue_requirements does not exist` (42703) in `getEvent`. Not from this PR: the same test fails on `main` `ceba772` (next row). All 13 SCRUM-33 tests passed again in this batch | Claude (for Aaron) |
| 2026-10-01 ≈22:25 | `ceba772` (`main`, without this PR) | 3 | — | `npx tsx --test tests/eventVisibility.integration.test.ts`, in a temporary worktree | local, same container | **0/1, failed E01-S02** | Same error, `column e.venue_requirements does not exist`. #161 added the column to `getEvent`; the test applies only migrations 0001–0004 | Claude (for Aaron) |
| 2026-10-01 22:24 | `42b635d` | 3 | neighbours | `npm run test:event-notifications:db` (backend) | local, same container | 12/12 passed. Same session record | — | Claude (for Aaron) |
| 2026-10-01 22:25 | `42b635d` | 4 | — | `npm run typecheck` and `npm run build` (root) | local | both passed | — | Claude (for Aaron) |
| 2026-10-01 22:26 | `42b635d` | 5 | _01–_12 | Real HTTP calls to the local API (`tsx src/dev.ts`, port 3033, `APP_URL=http://localhost:5173` for #155's origin check), signed in as coord_a, coord_b, organiser_a, organiser_b and organiser_c, with the database checked after each step. New since #168: each Organiser's activity log is checked for the refused attempts | local, freshly reset and seeded `connectsphere_dev_stack` in the same container | 20/20 checks passed. Session record `20261001-222619-Bl0oper-backend-api.md` | Same refusals, word for word, as the 17:58 run. Activity logs: organiser_c's on EVT-2003 showed 2 rows (status changes by Coordinator B and Organiser C), with no sign of coord_a's refusal; organiser_b's on EVT-3002 showed 1 row, with no sign of organiser_a's refusal. Both refusals are in `audit_logs` | Claude (for Aaron) |
| 2026-10-01 22:28 | `42b635d+local` (these records) | 6 | — | `python scripts/check.py` | local | passed | — | Claude (for Aaron) |
| 2026-10-02 ≈16:42 | `f0c4264+local` | F1 | existing | `npm test --workspace frontend`, before the new tests | local | 201/201 passed | Baseline with the new screens in place: no existing test broke | Claude (for Aaron) |
| 2026-10-02 ≈16:44 | `f0c4264+local` | F1 | _01, _03, _05–_08, _12 | `npx vitest run src/features/coordinator/RequestClarification.test.tsx` | local | **11/14, failed _03, _05, _06** | Test mistakes, not app faults: _03 expected "8 Sep 2026" but the app shows "8 Sept 2026" (en-SG); _05 matched two elements for "Couldn't load this event"; _06 found the loading message first. Tests fixed | Claude (for Aaron) |
| 2026-10-02 ≈16:45 | `f0c4264+local` | F1 | _01–_03, _05–_12 | both new test files | local | 14/14 and 12/12 passed | — | Claude (for Aaron) |
| 2026-10-02 ≈16:49 | `f0c4264+local` | F2 | _01–_04, _12 + neighbours | `npx playwright test` e03, organiser, coordinator, layout-and-focus | local, Playwright fake backend | **70 passed, 6 failed: _01, _02, _12** (desktop and mobile) | Real bug: after a successful send the button stayed on "Sending…". The "still mounted?" guard copied from `FormTemplate` stays false after React StrictMode's development remount and drops every reply. Fixed in both forms; a StrictMode test added to each | Claude (for Aaron) |
| 2026-10-02 ≈16:51 | `f0c4264+local` | F2 | _01–_04, _12 | same, E03-S02 only | local, Playwright fake backend | 10/10 passed | — | Claude (for Aaron) |
| 2026-10-02 ≈16:52 | `f0c4264+local` | deliberate bug | StrictMode | old guard put back in `RequestClarification.tsx`, then restored | local | 1/15 failed as intended, then 15/15 | "the reply is handled under StrictMode, as in development" failed on the old guard | Claude (for Aaron) |
| 2026-10-02 ≈16:55 | `f0c4264+local` | F3 | — | click-through script | local | **aborted at sign-in** | Not an app fault: the frontend had been started with a wrong argument and served a folder named "5173" (every page 404). Restarted with `npm run dev` | Claude (for Aaron) |
| 2026-10-02 ≈16:56 and ≈16:57 | `f0c4264+local` | F3 | all | click-through script | local, freshly seeded `connectsphere_dev_stack` | **29/31 twice, failed steps 4 and 12** | Script timing, not app faults: both checks ran before the page had finished loading (the values printed a moment later were right). Waits added | Claude (for Aaron) |
| 2026-10-02 16:58 | `f0c4264+local` | F3 | all | click-through script | local, freshly seeded | 31/31 passed | — | Claude (for Aaron) |
| 2026-10-02 ≈16:59 | `f0c4264+local` | F1–F3 | all | after moving the questions card onto `FactList` (design.md: spacing and muted secondary line) | local | 93/93 component, Playwright 76 passed, click-through 31/31 | — | Claude (for Aaron) |
| 2026-10-02 ≈17:00 | `f0c4264+local` | deliberate bug | _09 | blank answers let through in `AnswerQuestions.tsx`, then restored | local | 1/13 failed as intended, then 13/13 | "TC_E03S02_09 - a missing answer is caught before sending" failed | Claude (for Aaron) |
| 2026-10-02 17:03 | `d0472d4` | F1 | all | `npm test --workspace frontend` | local | 229/229 passed. Session record `20261002-170300-Bl0oper-frontend-vitest.md` | — | Claude (for Aaron) |
| 2026-10-02 17:03 | `d0472d4` | F2 | _01–_04, _12 + all others | `npx playwright test` (full suite) | local, desktop and Pixel 7 | 206 passed, 0 failed, 368 skipped (other stories' fixmes). Session record `20261002-170330-Bl0oper-frontend-e2e.md` | — | Claude (for Aaron) |
| 2026-10-02 17:04 | `d0472d4` | 4 | — | `npm run typecheck` and `npm run build` (root) | local | both passed | — | Claude (for Aaron) |
| 2026-10-02 17:04 | `d0472d4` | F3 | _01–_12 | click-through script in Chromium: login page, coord_b, organiser_c, coord_a, organiser_a, organiser_b; database checked after each step | local, freshly reset and seeded `connectsphere_dev_stack`, Docker `postgres:17` (17.11), API on 3001, `npm run dev` | 31/31 passed. Session record `20261002-170420-Bl0oper-frontend-e2e.md` | As in "What the user sees", word for word. Notice: "Coordinator B needs more information about EVT-2003 EVT-2003 Client B Isolation Event before the review can continue. The request is now Awaiting Clarification. Questions: 1. … 2. …". coord_a: "Access refused" / "Access denied. This event is not assigned to you." 393px: no sideways scrolling on five screens. Keyboard: Tab order and a 3px focus ring | Claude (for Aaron) |
| 2026-10-02 ≈17:50 | `d0472d4` | F4 | _01–_12 | The click-through script (27 steps), clicked by hand in a browser: normal and private windows, as coord_b, organiser_c, coord_a and organiser_a | local, freshly seeded `connectsphere_dev_stack`, Docker `postgres:17`, API on 3001, `npm run dev` | All 27 steps passed. Session record `20261002-175000-Bl0oper-frontend-e2e.md` | Aaron: "I have done the whole click through and everything passes, it works". The database afterwards matched a full run: EVT-2003 Awaiting Clarification with 4 questions (1 seeded, 2 from step 7, 1 from step 19) and 3 answers (1 seeded, 2 from step 15) | Aaron |
| 2026-10-08 02:15 | `1ad3820` | Before the demo | — | Read-only production check, three queries approved by Aaron before they ran: the status and thread-type values; the `event_threads.parent_id`, `event_threads.resolved_at` and `events.coordinator_assigned_at` columns; the recorded migrations (`_connectsphere_migrations`). Run with `node --env-file=.env` inside `BEGIN READ ONLY` … `ROLLBACK` | production (Supabase, transaction pooler); `transaction_read_only` reported `on`; rolled back, nothing written | **What this story needs: all present.** **"All repository migrations applied": not met**, 0009 and 0010 unrecorded (see What was seen) | `under_review`, `awaiting_clarification`, `clarification_request` and `clarification_response` exist, and so do the three columns. Recorded migrations: 0001 to 0008. 0009 is not recorded; its table was created by hand, as already known. 0010 (activity log entries can't be changed, #190) is not recorded either, so production may not have that protection; this story doesn't depend on it. Each value was listed twice, most likely because the same database also holds a separate `test` schema (not checked further). Only object and file names were returned | Claude (for Aaron) |

## Completion boundary

- **Backend PR** (this branch): clarification request and response,
  outstanding questions in the event detail reads, the status filter, and the
  backend tests above.
- **Frontend PR** (branch `feature/SCRUM-33-request-clarification-frontend`):
  the Coordinator's "Request clarification" page and the proof of the status
  filter, the Organiser's outstanding questions and answer screen, component
  tests for every refusal, and the browser tests for TC_E03S02_01 to _04 and
  _12.

The story is done only when both PRs have merged and every TC_E03S02 case has
a passing run recorded above.

## Traceability

- Jira: `SCRUM-33`, with subtasks:
  - Backend PR: `SCRUM-121` (request clarification), `SCRUM-122` (answer
    questions), `SCRUM-123` (outstanding questions in event details, and
    status filter), `SCRUM-124` (tests, CI wiring and this run record)
  - Frontend PR: `SCRUM-125` (Coordinator form and filter), `SCRUM-126`
    (Organiser questions and answer screen)
- Story: `E03-S02`
- Test cases: `docs/testing/cases/E03.md`, TC_E03S02_01 to _12
- Pull requests: backend #163; frontend to follow (opens after Aaron's own click-through)
- Session records (T-65): `docs/testing/runs/20261001-222419-Bl0oper-backend-unit.md`,
  `20261001-222457-Bl0oper-backend-db.md`, `20261001-222619-Bl0oper-backend-api.md`;
  frontend: `20261002-170300-Bl0oper-frontend-vitest.md`,
  `20261002-170330-Bl0oper-frontend-e2e.md` (Playwright suite),
  `20261002-170420-Bl0oper-frontend-e2e.md` (real-stack click-through)
