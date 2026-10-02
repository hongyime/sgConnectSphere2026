# SCRUM-34 / E03-S03 implementation status

Decide on an event request. This file records what was built, which test
proves each acceptance criterion, and **every run of those tests**, so each
result can be traced back to the exact code it ran against.

## Scope

From `docs/backlog/release-1/E03-review-coordination-status.md`:

- Scenario 1: the assigned Coordinator approves an Under Review request whose
  required information is complete. The status becomes Approved, and the
  Organiser is notified.
- Scenario 2: approval is blocked while required information is incomplete,
  and the missing items are listed.
- Scenario 3: the Coordinator rejects an Under Review request with a reason.
  The status becomes Rejected, the reason is stored, and the Organiser is
  notified.
- Scenario 4: a rejection without a reason is blocked.
- Scenario 5: the Organiser sees a rejected request's reason and decision
  date, and the request is read-only.
- Decisions: C-09, T-39 and O-06 (a rejection reason is mandatory), T-41
  (Rejected is terminal), T-43 (approve and reject are one story) and T-64
  (every status change notifies the Organiser and Coordinator).

## Rules this story applies

These rules were settled by the story owner before building (D10–D14 in the
story's task list; D11 was narrowed on 2026-10-01 so that this story only
changes its own code). Each has a test case below. The messages are the
code's final wording, word for word as the runs below saw them.

| Rule | What the user sees | Test case |
|---|---|---|
| Only the Coordinator assigned to the request can approve or reject it | 403 "Only the assigned Coordinator can decide on this request." | TC_E03S03_06, _08 |
| A decision can only be made while the request is Under Review. Rejected is final (T-41) | 409 "A decision can only be made while the request is Under Review." | TC_E03S03_07, _09 |
| Approval needs the same required information as submission, checked against the stored request (D10). No past-date block | 409 "This request can't be approved until its required information is complete." with the missing items listed in `missingFields`, in the request form's order and with the form's labels, e.g. "Venue requirements" | TC_E03S03_02 |
| Accessibility needs are met by a free-text note **or** predefined features, the same as at submission (E02-S03) | Approval goes ahead | TC_E03S03_12 |
| A rejection needs a reason | 400 "Add a reason for rejecting this request." | TC_E03S03_04 |
| The reason is limited to 2000 characters, the same as event comments and clarification questions | 400 "The reason must be 2000 characters or fewer." | TC_E03S03_10 |
| A rejected request is read-only for its Organiser (D11). Coordinators already can't edit rejected requests. The refusal offers no change request. The check runs inside the edit transaction, after its row lock, so a rejection can't slip in between the check and the edit | 409 "This request is rejected, so it can no longer be changed." | TC_E03S03_05, _11 |
| The Organiser's view of a decided request shows the reason and decision date, and a rejected one has no edit actions (`canEdit: false`, `editableFields: []`). The date is the decision's own audit entry, so it stays right after later status changes; seeded rows without one use `status_changed_at`. Only a rejection's reason is shown | The read carries `decision: { outcome, reason, decidedAt }`; the request page shows it as "Rejected on 10 Sept 2026 — <reason>" (the date as `formatDate` writes it, D19), or "Rejected on <date>. No reason was recorded." when there is none (D30) | TC_E03S03_05 |
| A decision must say approve or reject | 400 "Choose whether to approve or reject this request." | SCRUM-34 unit test |
| The decision, its audit entry and the notice commit together, through the shared status-change path (`applyEventStatusChange`, D12) | — | TC_E03S03_01, _03 |
| Notices go through the shared E11-S01 writer (BDR T-64): the Organiser gets one in-app notice and one email-outbox row, never a duplicate generic "status changed" notice. A rejection notice includes the reason. The deciding Coordinator gets none | "Request approved" / "Request rejected" with the reason | TC_E03S03_01, _03 |
| Refusals change nothing and are audited (E14-S02), and don't show in the Organiser's activity log (#168) | — | TC_E03S03_06 |

## Test plan

The test cases are in `docs/testing/cases/E03.md` (TC_E03S03_01 to _12).
TC_E03S03_06 to _12 were added for this story (D14).

- **Backend tests** check the rules against a real, disposable PostgreSQL 17
  database. The browser can't be trusted to enforce a rule, so these are what
  prove it holds.
- **Screen tests** check that the screens show the right things, in the
  frontend PR: browser tests (Playwright) for TC_E03S03_01 to _05, and
  component tests (Vitest) for every TC, refusals included, each checking the
  exact message.

Every automated test must carry its TC ID in its title, so that
`scripts/tc_coverage_audit.py` counts it in `docs/testing/tc-coverage.md`.

| TC ID | Type | What the user sees | Backend test (backend PR) | Screen tests (frontend PR) |
|---|---|---|---|---|
| TC_E03S03_01 | Happy path | Status becomes Approved. The Organiser gets one "Request approved" notice | `decision.integration.test.ts`: "TC_E03S03_01: approving a complete Under Review request…" and "…a failed email-outbox write leaves the request Under Review…" | `e03.spec.ts` "TC_E03S03_01 - …"; Vitest: approval outcome, Approving…, StrictMode |
| TC_E03S03_02 | Negative | Approval blocked, missing items listed, e.g. "Venue requirements" | `decision.integration.test.ts`: "TC_E03S03_02: approval is blocked while Venue requirements is missing…" and "…every missing item is listed…" | `e03.spec.ts` "TC_E03S03_02 - …"; `DecisionPanel.test.tsx` "TC_E03S03_02 - …" |
| TC_E03S03_03 | Happy path | Status becomes Rejected. The Organiser gets one "Request rejected" notice with the reason | `decision.integration.test.ts`: "TC_E03S03_03: rejecting with a reason…" | `e03.spec.ts` "TC_E03S03_03 - …" |
| TC_E03S03_04 | Negative | 400 "Add a reason for rejecting this request." | `decision.test.ts` and `decision.integration.test.ts`: "TC_E03S03_04: …" | `e03.spec.ts` "TC_E03S03_04 - …"; `DecisionPanel.test.tsx` "TC_E03S03_04 - …" |
| TC_E03S03_05 | Happy path | "Rejected on 10 Sept 2026 — <reason>"; no edit actions | `decision.integration.test.ts`: "TC_E03S03_05: the Organiser sees the reason and decision date of a rejected request…" and "…an approved request shows its decision date…" | `e03.spec.ts` "TC_E03S03_05 - …"; `RejectedRequest.test.tsx` "TC_E03S03_05 - …" and the D30 case |
| TC_E03S03_06 | Negative | 403 "Only the assigned Coordinator can decide on this request." | `decision.integration.test.ts`: "TC_E03S03_06: …" | `DecisionPanel.test.tsx` "TC_E03S03_06 - …" (both) |
| TC_E03S03_07 | Negative (business rule) | 409 "A decision can only be made while the request is Under Review." | `decision.integration.test.ts`: "TC_E03S03_07: …" | `DecisionPanel.test.tsx` "TC_E03S03_07 - …" (both) |
| TC_E03S03_08 | Negative | 403 "Only the assigned Coordinator can decide on this request." | `decision.test.ts` and `decision.integration.test.ts`: "TC_E03S03_08: …" | `DecisionPanel.test.tsx` "TC_E03S03_08 - …" |
| TC_E03S03_09 | Negative (business rule) | 409 "A decision can only be made while the request is Under Review." | `decision.integration.test.ts`: "TC_E03S03_09: …" | `DecisionPanel.test.tsx` "TC_E03S03_09 - …" (both) |
| TC_E03S03_10 | Boundary | 400 "The reason must be 2000 characters or fewer." at 2001; 2000 accepted | `decision.test.ts` and `decision.integration.test.ts`: "TC_E03S03_10: …" | `DecisionPanel.test.tsx` "TC_E03S03_10 - …" |
| TC_E03S03_11 | Negative (business rule) | 409 "This request is rejected, so it can no longer be changed.", with no change-request link | `decision.integration.test.ts`: "TC_E03S03_11: the Organiser of a rejected request is refused an edit…" and "…an edit waiting on the row lock is refused when a rejection commits first" | `RejectedRequest.test.tsx` "TC_E03S03_11 - …" (both) |
| TC_E03S03_12 | Boundary | Approval goes ahead with features-only accessibility | `decision.integration.test.ts`: "TC_E03S03_12: …" | `DecisionPanel.test.tsx` "TC_E03S03_12 - …" |

### What the screens say (frontend PR)

The screens show the server's sentences above word for word. The reason box
checks for a blank reason before sending, with the server's own sentence
(D29), so the rule has one message whichever side catches it. Everything
else on screen:

| Where | When | What the user sees |
|---|---|---|
| Coordinator event page | Under Review | "Request clarification" and **"Decide on request"** (D26; no ellipsis: it opens a page) |
| Decide page | Under Review | Eyebrow (the event code, or "Request" if it has none), "Decide: <title>", the status pill; a "What you're deciding" card (Organiser, Event date, Expected attendance); a "Your decision" card with **Request clarification**, **Reject…** and **Approve…**, the primary last (D33) |
| Decide page | Approve… | A panel "Approve this request?" with "<Organiser> is notified that their request is approved, and it moves to planning.", **Cancel** and **Approve request** (reads "Approving…" while sending, D31). Focus moves to Cancel |
| Decide page | Reject… | A panel "Reject this request?" with "<Organiser> is notified, with your reason. A rejected request can no longer be changed.", a **Reason** box, **Cancel** and a red **Reject request** ("Rejecting…"). Focus moves to the Reason box; Cancel returns it to the button that opened the panel |
| Decide page | Approval blocked | Red, in the panel: "This request can't be approved until its required information is complete. Missing: Venue requirements, Accessibility needs, …." |
| Decide page | After approving | Green: "Approved. <Organiser> has been notified." with **View request** (D27); then the pill Approved and "This request is approved, so there's nothing to decide." |
| Decide page | After rejecting | Green: "Rejected. <Organiser> has been notified, with your reason." with **View request**; then the pill Rejected and "This request is rejected, so there's nothing to decide." |
| Decide page | Not Under Review | "This request is <status, lower case>, so there's nothing to decide." and no buttons (D28, D32) |
| Decide page | Not the assigned Coordinator, or not a Coordinator | "Access refused" with the read's refusal: "Access denied. This event is not assigned to you." / "Access denied. This action is for Event Coordinators." and no buttons |
| Organiser request page | Rejected | Red pill Rejected and the info alert "Rejected on <date> — <reason>" (D34), or "Rejected on <date>. No reason was recorded." (D30); no Respond now, no edit |
| Organisation event page (`/events/:id`) | Rejected | No **Edit event** button (`canEdit` false). A tab opened before the rejection that saves an edit: "This request is rejected, so it can no longer be changed." with no "Request a change" link |

## Test gates

Every gate below must pass, and be recorded in the Run log, before the PR is
opened. The PR is re-run in full if the code changes after that. Runs cited
as evidence also get a session file in `docs/testing/runs/` (T-65).

**Backend PR:**

1. **Backend unit tests**: `npm test --workspace backend`. The whole suite,
   not only the new tests, so that a break elsewhere is caught.
2. **SCRUM-34 database tests**: every TC_E03S03 case with a backend test,
   against a disposable PostgreSQL 17 database named
   `connectsphere_notification_test`.
3. **Neighbouring database tests**, because this story changes event status,
   sends notices and adds a check to the shared edit route: the SCRUM-32
   coordinator pair, SCRUM-33's clarification tests, the event notification
   hooks, `eventLifecycle.integration.test.ts`, and the full `test:db` batch,
   which includes suites CI never runs. (`eventVisibility.integration.test.ts`
   fails on `main` since #161, without this story; see Known limits.)
4. **Typecheck and build**: `npm run typecheck` and `npm run build` from the
   repository root.
5. **Real-stack run through the API.** The local API (`APP_URL` set for
   #155's origin check) is signed in as coord_a, coord_b, organiser_a,
   organiser_b and organiser_c against a freshly seeded disposable database.
   The seeded events lack most required fields, so:
   - EVT-2003 is the real "approval blocked, items listed" check (TC_02),
     and the refusals (TC_06 to _11) run on seeded events first;
   - organiser_a then submits complete requests through the API, which are
     assigned automatically, to approve (TC_01, and TC_12 with
     features-only accessibility) and reject (TC_03, TC_05).

   The database is checked after each step: status, decision reason, audit
   entries, notices and email-outbox rows, and that refusals don't show in
   the Organiser's activity log.
6. **Repository checks**: `python scripts/check.py`, then `tc-coverage.md`
   regenerated as the last commit.
7. **CI green** on the PR's head commit, checked per commit so held runs
   aren't missed.

**Frontend PR** (gate names F1 to F5 in the Run log):

1. **F1, component tests**: `npm test --workspace frontend`, the whole suite.
2. **F2, browser tests**: the full Playwright suite (`npx playwright test`),
   desktop and Pixel 7, including TC_E03S03_01 to _05.
3. **F3, full click-through** of the real frontend, real API and a freshly
   seeded disposable database: the "Click-through script" below, driven in a
   real browser as each role, refusals included, with every message on
   screen checked against "What the user sees", the database checked after
   each step, and screenshots kept at 1280px and 393px.
4. **F4, Aaron's own click-through** of the same script on the same local
   stack, logged with "Run by: Aaron". His feedback is fixed before the PR
   opens.
5. **F5**: gates 4, 6 and 7 above.

A **deliberate-bug check** shows the screen tests depend on the code: bugs are
put in on purpose, the tests must fail, and the code is restored.

**Before the demo:** a **read-only check of production** (Supabase), inside
`BEGIN READ ONLY` … `ROLLBACK`, writing nothing and returning only counts and
object names:

- the `rejected` status and the `events.decision_reason` column exist, and
  all repository migrations are applied;
- how many Under Review requests are missing required information, since
  those can't be approved until the Organiser completes them.

## Click-through script

Frontend gate F3, and Aaron's own customer-view check (F4). Labels and
messages below were checked against the built screens on `036c4bc`.

**Set up first:** Docker Desktop running; `connectsphere_dev_stack` reset and
freshly seeded (so it has migration 0010); API on 3001; `npm run dev` on
5173. Password for every seeded account: `ValidPass123`. Use a normal window
(Coordinators) and a private window (Organisers). Note pass or fail for each
step; on a fail, copy the exact words seen.

**Who's who (seed):** `organiser_a@clienta.com` submits the new requests;
`coord_b@connectsphere.com` is EVT-2003's Coordinator and gets organiser_a's
new requests (they go to the least-busy Coordinator); `coord_a` isn't
assigned to EVT-2003; `organiser_c@clientb.com` owns EVT-2003;
`organiser_b@clienta.com` owns the seeded rejected EVT-3005.

**A. Two complete requests (setup for TC_E03S03_01, _03, _05, _11, _12)**

1. Private window: sign in as `organiser_a@clienta.com`. Header → **New
   request**.
2. The form opens with sample values: **replace every field**. Event name
   **Winter Gala**; Description "An evening of talks and networking";
   Purpose "Bring the community together"; Preferred start 1 Dec 2026 9:00
   am, end 12:00 pm; Expected attendance 120; Venue requirements "Auditorium
   with a stage"; Accessibility needs "Step-free access to the stage";
   Equipment requirements: tick **None required**; Layout preference
   "Theatre"; Registration setup "Free registration". **Submit request**:
   "Persisted through API and submitted to coordinator queue".
3. **New request** again, the same details except: Event name **Accessible
   Design Workshop**; under Accessibility requirements tick **Wheelchair
   access**; **clear** the Accessibility needs box (TC_12).
4. Header → **My requests**: both listed with **Under review**. Open **Winter
   Gala**, then **Read and post comments on the event page**. On that page
   click **Edit event** and leave the tab open (used in step 19). New
   requests have no event code yet, so their addresses use a long id.

**B. Approval blocked (TC_E03S03_02)**

5. Normal window: sign in as `coord_b@connectsphere.com`. Header → **Review
   queue** → **EVT-2003 Client B Isolation Event** (Under review).
6. Event page: **Request clarification** and **Decide on request**. Click
   **Decide on request**.
7. Decide page: eyebrow **EVT-2003**, heading **Decide: EVT-2003 Client B
   Isolation Event**, pill **Under review**, a card **What you're deciding**
   and a card **Your decision** with **Request clarification**, **Reject…**
   and **Approve…**.
8. **Approve…**: a panel **Approve this request?** with **Cancel** and
   **Approve request**. Click **Approve request**: in red, "This request
   can't be approved until its required information is complete. Missing:
   Venue requirements, Accessibility needs, Equipment requirements, Layout
   preference, Registration setup." The pill stays **Under review**. Click
   **Cancel**.

**C. Reason rules on EVT-2003 (TC_E03S03_04, _10; D17)**

9. **Reject…**: a panel **Reject this request?** with a **Reason** box (the
   cursor is in it) and a red **Reject request**. Click **Reject request**
   with the box empty: "Add a reason for rejecting this request." under the
   box. Type only spaces and try again: the same.
10. F12 → Console, type `copy('a'.repeat(2001))` and press Enter (Chrome may
    ask you to type "allow pasting" first). Paste into the box, **Reject
    request**: in red, "The reason must be 2000 characters or fewer."
    **Cancel**, then refresh: still **Under review**.
11. **Request clarification**: SCRUM-33's question page for EVT-2003 opens. Go
    back.

**D. Approve (TC_E03S03_01, _12)**

12. **Review queue** → **Accessible Design Workshop** → **Decide on request**
    → **Approve…** → **Approve request** (briefly "Approving…"). In green:
    "Approved. Organiser A has been notified." with **View request**; the
    pill **Approved**; "This request is approved, so there's nothing to
    decide." and no buttons. Not blocked by the empty Accessibility needs
    (TC_12).
13. **View request**: the event page shows **Approved** and no **Decide on
    request**.
14. Private window: bell → **Notifications** → click **Request approved**:
    "Coordinator B approved Accessible Design Workshop. The request is now
    Approved and moves to planning." **My requests**: the workshop shows
    **Approved**.

**E. Reject (TC_E03S03_03, _05, _09, _11)**

15. Normal window: open Winter Gala's **Decide on request** page in **two
    tabs**. Tab 1: **Reject…**, reason "Requested date unavailable across all
    venues", **Reject request**. In green: "Rejected. Organiser A has been
    notified, with your reason."; red pill **Rejected**; "This request is
    rejected, so there's nothing to decide."
16. **Stale tab (TC_09):** tab 2 → **Approve…** → **Approve request**: in red,
    "A decision can only be made while the request is Under Review."
17. Private window: **Notifications** → **Request rejected**: "Coordinator B
    rejected Winter Gala. The request is now Rejected and can no longer be
    changed." then "Reason: Requested date unavailable across all venues".
18. **My requests** → **Winter Gala**: red pill **Rejected** and "Rejected on
    <today> — Requested date unavailable across all venues" (e.g. "2 Oct
    2026"); no edit or respond actions (TC_05). Then **Read and post comments
    on the event page**: no **Edit event**. (A real database records the real
    date; TC_05's "10 Sept 2026" is checked by the browser tests.)
19. **Stale edit (TC_11):** the edit tab from step 4: change Event name to
    "Winter Gala (revised)", **Save changes**: in red, "This request is
    rejected, so it can no longer be changed." and no "Request a change"
    link. Refresh: the name is unchanged.

**F. Not Under Review, and people who may not decide (TC_E03S03_07, _09, _06, _08)**

20. Normal window (coord_b): `localhost:5173/coordinator/events/EVT-3002/decide`:
    "This request is awaiting clarification, so there's nothing to decide."
    and no buttons (TC_07). `…/EVT-3005/decide`: "This request is rejected,
    so there's nothing to decide." (TC_09).
21. Sign out; sign in as `coord_a@connectsphere.com`;
    `…/coordinator/events/EVT-2003/decide`: **Access refused**, "Access denied.
    This event is not assigned to you." and no buttons (TC_06).
22. Private window: sign out; sign in as `organiser_c@clientb.com`;
    `…/coordinator/events/EVT-2003/decide`: **Access refused**, "Access denied.
    This action is for Event Coordinators." and no buttons (TC_08).
23. Sign out; sign in as `organiser_b@clienta.com` → **My requests** →
    **EVT-3005 Rejected Budget Review**: pill **Rejected** and "Rejected on
    <the day the database was seeded>. No reason was recorded." (D30); no
    edit actions.

**G. Phone width and keyboard (`design.md` sections 9 and 10)**

24. F12 → device toolbar (Ctrl+Shift+M) → Responsive, width **393**. Look at
    the decide page with each panel open, the event page and the Organiser's
    rejected request: no sideways scrolling, no clipped text, buttons full
    width.
25. EVT-2003's decide page, keyboard only: Tab reaches **Request
    clarification**, **Reject…** and **Approve…** in that order, with the teal
    focus ring visible. Enter on **Reject…** opens the panel with the cursor
    in the Reason box; Tab to **Cancel** and press Enter: the panel closes and
    focus is back on **Reject…**.

## API (for the frontend PR)

All in `api/events.ts`, no new `api/` file. The rules are in
`backend/src/modules/eventLifecycle/decision.ts`.

- `POST /api/events?decide=1&id=<event id or code>` with
  `{ "decision": "approve" }` or `{ "decision": "reject", "reason": "…" }`
  (assigned Coordinator only).
  - 200 `{ decision: { eventId, eventCode, status, statusChangedAt, decisionReason } }`
  - 409 `{ error, missingFields: string[] }` when approval is blocked
  - 400 / 403 / 409 `{ error }` for the refusals in the rules table above
- `GET /api/events?id=<event id or code>` (the Organiser's read) also returns
  `decision: { outcome: 'approved' | 'rejected', reason, decidedAt } | null`.
  For a rejected request, `canEdit` is `false` and `editableFields` is `[]`.
- `PATCH /api/events?edit=1&id=…` on a rejected request, by its Organiser:
  409 `{ error: "This request is rejected, so it can no longer be changed." }`,
  with no `changeRequestUrl`.

## Known limits

What the tests above do **not** prove. If a customer reports a problem in one
of these areas, it is outside what was tested:

- **Emails are not actually sent.** Tests check that an email-outbox row is
  written, not that the email provider delivers it.
- **Not tested on the deployed site.** All runs are local.
- **Production data differs from the seed.** Production has its own data,
  and migrations there are applied by hand.
- **Seeded events can't be approved as seeded.** The seed leaves most
  required fields empty, and the edit form can't set the registration setup.
  The real-stack run approves and rejects requests submitted through the
  API instead.
- **Older requests may be missing required information.** Requests created
  before every field was mandatory can't be approved until the Organiser
  completes them; the read-only production check counts them.
- **Only rejected requests are locked by this story.** Cancelled and
  completed requests can still be edited the way they could before (the
  edit rules are SCRUM-37's code); a lock for those was suggested to its
  owner instead.
- **The rejected-edit check lives in the edit transaction,
  `updateEventInformationWithNotifications`** (#142's code; one call added by
  this story), not inside `updateEventInformation` (SCRUM-37's code, not
  changed). Every edit of event details goes through that transaction today.
  A future path that called `updateEventInformation` directly would not get
  the check.
- **The seed's rejected request has no reason.** EVT-3005 is seeded as
  Rejected with no `decision_reason` and no status audit entry, so its
  decision shows no reason, dated from `status_changed_at`. Requests rejected
  through this story always carry both.
- **The missing-item labels are the request form's**, e.g. "Venue
  requirements". TC_E03S03_02's catalogue text writes "Venue Requirements";
  only the capitalisation differs.
- **Requests submitted through New request have no event code.** Their pages
  and the decide page use the request's id in the address, and the decide
  page's eyebrow reads "Request". Notices name them by title only. The
  Coordinator's event page (SCRUM-32's) still shows the id as its eyebrow.
- **The pill updates a moment after the decision's green alert.** The page
  re-reads the request after deciding; until that answer arrives (well under
  a second locally), the pill still shows the old status and no buttons are
  offered.
- **Raw values on the Organiser's request page, outside this story:** an
  equipment or layout of "None required" shows as `none_required` in its
  Summary (`SubmittedDetail`, from #177). Raised with its owner.
- **The screens only mirror the reason checks.** Approval completeness, the
  2000-character limit and who may decide are the server's; the screen shows
  its sentence. Tested in the browser against a fake backend shaped like the
  API, and on the real stack in F3 and F4.
- **One neighbouring database suite fails on `main`.** Since #161,
  `eventVisibility.integration.test.ts` (E01-S02) fails with "column
  e.venue_requirements does not exist", with or without this story. CI
  doesn't run that suite.

**So that these tests keep running after this story merges:** the backend
test files are added to `backend/package.json`'s scripts, and the database
test file is added to `.github/workflows/application-checks.yml`. CI doesn't
discover either kind on its own.

## Run log

One row per run, newest at the bottom. Add a row every time the tests are run
for this story, whether they pass or fail. A failed run stays in the log; the
fix gets its own row.

- **When**: Singapore time, with the date.
- **Commit**: the short commit ID the run used (`git rev-parse --short HEAD`).
  An uncommitted working tree is recorded as `<commit>+local`.
- **Gate**: which test gate above the run belongs to.
- **Where**: `local` (and which database), or a CI run link.
- **Result**: passed/total, and the IDs of any failures. Runs cited as
  evidence also name their session record in `docs/testing/runs/`.
- **What was seen**: for failures and refusals, the actual status code and
  message, word for word, so it can be searched for later.

| When (SGT) | Commit | Gate | TC IDs | Command | Where | Result | What was seen | Run by |
|---|---|---|---|---|---|---|---|---|
| 2026-10-02 ≈00:00 | `e26732e+local` (the tree later committed as `b163245`) | 1 | _04, _08, _10 | `npm test` (backend) | local | 259/259 passed | — | Claude (for Aaron) |
| 2026-10-02 ≈00:01 | `e26732e+local` | 2 | _01–_12 | `npx tsx --test tests/decision.integration.test.ts`, run twice in one command | local, Docker `postgres:17` (17.11), `connectsphere_notification_test` (`public` migrated 0001–0009) | 16/16 passed, both times | — | Claude (for Aaron) |
| 2026-10-02 ≈00:02 | `e26732e+local`, with bugs put in on purpose | 2 | _01, _03, _05, _10, _12 | The same file, three times, each with one deliberate bug in `decision.ts`, restored byte for byte afterwards | local, same container | **Each bug was caught**, as intended: features not loaded failed _12; no targeted notice (generic only) failed _01, _03, _10, _12; rejected requests left editable failed _05 | Shows the tests check these rules rather than passing regardless | Claude (for Aaron) |
| 2026-10-02 ≈00:03 | `e26732e+local` | 3 | neighbours | `npm run test:db` and `npm run test:event-notifications:db` (backend) | local, same container | **test:db 44/45, failed E01-S02 (`eventVisibility`)**; notifications 12/12 | `error: 'column e.venue_requirements does not exist'`. On `main` since #161, not from this story (see Known limits). All 16 SCRUM-34 tests passed again in the batch | Claude (for Aaron) |
| 2026-10-02 00:04 | `e26732e+local` | 4 | — | `npm run typecheck` and `npm run build` (root) | local | both passed | — | Claude (for Aaron) |
| 2026-10-02 00:06 | `b163245` | 5 | _01–_12 | Real HTTP calls to the local API (`tsx src/dev.ts`, port 3033, `APP_URL=http://localhost:5173`), signed in as coord_a, coord_b, organiser_a, organiser_b and organiser_c, with the database checked after each step | local, freshly reset and seeded `connectsphere_dev_stack` in the same container | 23/23 checks passed. Session record `20261002-000649-Bl0oper-backend-api.md` | Refusals word for word: 403 "Only the assigned Coordinator can decide on this request." (coord_a; organiser_c on their own request) · 409 "A decision can only be made while the request is Under Review." (EVT-3002, EVT-3001, EVT-3005) · 400 "Add a reason for rejecting this request." (missing, empty, blank) · 400 "The reason must be 2000 characters or fewer." · 409 "This request can't be approved until its required information is complete." with missingFields ["Venue requirements","Accessibility needs","Equipment requirements","Layout preference","Registration setup"] (EVT-2003) · 409 "This request is rejected, so it can no longer be changed." with no `changeRequestUrl` (EVT-3005, Winter Gala) · 403 "Edit access denied." (organiser_a on EVT-3005). Notices: "Coordinator B approved Annual Tech Summit. The request is now Approved and moves to planning." and "Coordinator B rejected Winter Gala. The request is now Rejected and can no longer be changed. Reason: Requested date unavailable across all venues", one each, with email-outbox rows; the Coordinator got none. organiser_c's activity log on EVT-2003 had 0 rows with 3 `Access Denied` rows in the database | Claude (for Aaron) |
| 2026-10-02 00:07 | `b163245` | 1 | _04, _08, _10 | `npm test` (backend) | local | 259/259 passed. Session record `20261002-000718-Bl0oper-backend-unit.md` | — | Claude (for Aaron) |
| 2026-10-02 00:07 | `b163245` | 2 | _01–_12 | `npx tsx --test tests/decision.integration.test.ts` | local, same container | 16/16 passed. Session record `20261002-000725-Bl0oper-backend-db.md` | — | Claude (for Aaron) |
| 2026-10-02 00:07 | `b163245` | 3 | neighbours | `npm run test:db` and `npm run test:event-notifications:db` (backend) | local, same container | **test:db 44/45, failed E01-S02 (`eventVisibility`)**; notifications 12/12. Same session record | Same error as the 00:03 run, `column e.venue_requirements does not exist` | Claude (for Aaron) |
| 2026-10-02 00:07 | `b163245` | 4 | — | `npm run typecheck` and `npm run build` (root) | local | both passed | — | Claude (for Aaron) |
| 2026-10-02 00:10 | `b163245` | 2 | _01–_12 | `npx tsx --test tests/decision.integration.test.ts` (rerun while rewording two titles; the rewording hadn't applied yet) | local, same container | 16/16 passed | — | Claude (for Aaron) |
| 2026-10-02 00:10 | `4247a63` (two test titles reworded so the coverage audit shows them in full; no code change) | 1, 2 | _01–_12 | `npm test` (backend), then `npx tsx --test tests/decision.integration.test.ts` | local, same container | 259/259 and 16/16 passed | — | Claude (for Aaron) |
| 2026-10-02 00:11 | `4247a63+local` (these records) | 6 | — | `python scripts/check.py` | local | passed | — | Claude (for Aaron) |
| 2026-10-02 00:11 | `4247a63` | 4 | — | `npm run test:runtime` (root; the compiled API runtime tests CI runs, since `api/events.ts` changed) | local | 15/15 passed | — | Claude (for Aaron) |
| 2026-10-02 ≈00:17 | `3b57523` | 7 | _01–_12 | GitHub Actions on PR #174, checked per commit (`gh run list --commit`) | CI: Application Checks https://github.com/hongyime/sgConnectSphere2026/actions/runs/36890582155, CI https://github.com/hongyime/sgConnectSphere2026/actions/runs/36890582026 | All 9 workflows passed, none held: Application Checks (its "SCRUM-34 decision PostgreSQL acceptance test" step 16/16), CI (`repository-checks`, `pr-conventions`), LFS Guard, CodeQL, Semgrep, Dependency Review, TruffleHog, Vercel Deploy, Application Checks (skip) | — | Claude (for Aaron) |
| 2026-10-02 01:12 | `80d004b+local` (rejected check moved into the edit transaction, after Amareet's review and the Strix finding: a rejection committing between the old pre-check and the edit still let the edit land) | 2 | _01–_12 | `npx tsx --test tests/decision.integration.test.ts`, run twice in one command | local, same container | 17/17 passed, both times, including the new race test | — | Claude (for Aaron) |
| 2026-10-02 ≈01:12 | `80d004b+local`, with the new in-transaction call removed on purpose, restored afterwards | 2 | _05, _11 | The same file | local, same container | **14/17, failed _05, _11 and the race test**, as intended | Shows the tests, including the race test, depend on the check inside the edit transaction | Claude (for Aaron) |
| 2026-10-02 01:13 | `a67513a` | 1 | _04, _08, _10 | `npm test` (backend) | local | 259/259 passed. Session record `20261002-011304-Bl0oper-backend-unit.md` | — | Claude (for Aaron) |
| 2026-10-02 01:13 | `a67513a` | 2 | _01–_12 | `npx tsx --test tests/decision.integration.test.ts` | local, same container | 17/17 passed. Session record `20261002-011316-Bl0oper-backend-db.md` | — | Claude (for Aaron) |
| 2026-10-02 01:13 | `a67513a` | 3 | neighbours | `npm run test:db` and `npm run test:event-notifications:db` (backend) | local, same container | **test:db 45/46, failed E01-S02 (`eventVisibility`)**; notifications 12/12. Same session record | Same known error, `column e.venue_requirements does not exist`. All 17 SCRUM-34 tests passed again in the batch, the race test included | Claude (for Aaron) |
| 2026-10-02 01:13 | `a67513a` | 4 | — | `npm run typecheck`, `npm run build`, `npm run test:runtime` (root) | local | all passed; runtime 15/15 | — | Claude (for Aaron) |
| 2026-10-02 01:14 | `a67513a` | 5 | _01–_12 | The same real HTTP run as at 00:06 | local, freshly reset and seeded `connectsphere_dev_stack` | 23/23 checks passed. Session record `20261002-011404-Bl0oper-backend-api.md` | Same messages as the 00:06 run, word for word. The rejected refusals (EVT-3005, Winter Gala) still carry no `changeRequestUrl`; organiser_a's restricted edit on approved EVT-3001 still does | Claude (for Aaron) |
| 2026-10-02 01:15 | `a67513a+local` (these records) | 6 | — | `python scripts/check.py` | local | passed | — | Claude (for Aaron) |
| 2026-10-02 ≈01:20 | `18ca0dc` | 7 | _01–_12 | GitHub Actions on PR #174, checked per commit (`gh run list --commit`) | CI: Application Checks https://github.com/hongyime/sgConnectSphere2026/actions/runs/36898201158, CI https://github.com/hongyime/sgConnectSphere2026/actions/runs/36898270186 | All workflows passed, none held: Application Checks (its "SCRUM-34 decision PostgreSQL acceptance test" step 17/17, the race test included), CI (`repository-checks`, `pr-conventions`), LFS Guard, CodeQL, Semgrep, Dependency Review, TruffleHog, Vercel Deploy, Application Checks (skip). One CI run was cancelled because editing the PR body started a newer one, which passed | — | Claude (for Aaron) |
| 2026-10-02 ≈22:48 | `139217e+local` | F1 | _02, _04, _06–_10, _12 | `npx vitest run` on `DecisionPanel.test.tsx` and `shared.test.tsx` | local | **45/46, failed one layout test** | Test mistake, not an app fault: the test looked for an `<article>`, but `Card` renders a `<section>`. Fixed, then a second test mistake (a regex role name Testing Library doesn't support), fixed | Claude (for Aaron) |
| 2026-10-02 ≈22:50 | `139217e+local` | F1 | _02, _04, _06–_10, _12 | `npx vitest run src/features/coordinator/DecisionPanel.test.tsx` | local | 19/19 passed | — | Claude (for Aaron) |
| 2026-10-02 ≈22:50 | `139217e+local` | F1 | _05, _11 | `npx vitest run src/features/organiser/RejectedRequest.test.tsx` | local | 5/5 passed | — | Claude (for Aaron) |
| 2026-10-02 ≈22:51 | `139217e+local` | F1, F5 | all | `npx vitest run` (frontend, whole suite) and `npm run typecheck` (root) | local | 256/256 passed; typecheck passed | — | Claude (for Aaron) |
| 2026-10-02 ≈22:52 | `139217e+local` | F2 | _01–_05 + neighbours | `npx playwright test tests/e2e/e03.spec.ts tests/e2e/coordinator.spec.ts` | local, Playwright fake backend, desktop and Pixel 7 | **58 passed, 2 failed: _03** (desktop and mobile), 6 skipped | Test mistake, not an app fault: the regex for the rejection notice lost its backslashes when the test was written, so it never matched. Fixed | Claude (for Aaron) |
| 2026-10-02 ≈22:53 | `139217e+local` | F2 | _01–_05 | the same, E03-S03 only | local, Playwright fake backend | 10/10 passed | — | Claude (for Aaron) |
| 2026-10-02 ≈22:54 | `1e740f4`, with bugs put in on purpose, restored afterwards | F1, F2 | _02, _04, _05 | Three deliberate bugs: the empty-reason message reverted to the panel default; the blocked approval's missing items dropped; the Organiser's decision date read from `status_changed_at` instead of the decision | local | **Each bug was caught**, as intended: TC_04 failed; the D30 case failed; TC_02 failed in Vitest and in the browser | Shows the screen tests check these rules rather than passing regardless | Claude (for Aaron) |
| 2026-10-02 ≈22:55 | `1e740f4` | 2 | _01–_12 | `npx tsx --test tests/decision.integration.test.ts` (rerun because #190 changed this file's TC_05 and added migration 0010) | local, Docker `postgres:17`, `connectsphere_notification_test` (`public` migrated 0001–0010) | 17/17 passed. Session record `20261002-225500-Bl0oper-backend-db.md` | — | Claude (for Aaron) |
| 2026-10-02 ≈22:57 | `1e740f4` | F3 | all | click-through script | local, freshly reset and seeded `connectsphere_dev_stack` (migrations 0001–0010) | **aborted at step 4** | Script mistake, not an app fault: it looked new requests up by event code, but requests from New request have none, and then waited for a page that never went idle. It now uses the id. Recorded under Known limits | Claude (for Aaron) |
| 2026-10-02 ≈22:59 | `1e740f4` | F3 | all | click-through script | local, freshly reset and seeded | **38/39, failed step 14** | Script timing, not an app fault: it read My requests before the table had loaded. The table showed "Accessible Design Workshop … Approved" when checked again. Wait added | Claude (for Aaron) |
| 2026-10-02 ≈23:00 | `1e740f4` | F3 | all | click-through script | local, freshly reset and seeded | **38/39, failed step 15** | Script timing, not an app fault: it checked the pill in the moment between the green alert and the page's re-read (see Known limits). It now waits for the "nothing to decide" sentence | Claude (for Aaron) |
| 2026-10-02 ≈23:01 | `1e740f4` | F3 | all | click-through script | local, freshly reset and seeded | 39/39 passed | Screenshots showed the decide page's eyebrow as the raw id for a request with no event code ("64C0F418-…"). Fixed in `af3048b`: it now reads "Request" | Claude (for Aaron) |
| 2026-10-02 23:02 | `af3048b` | F1, F5 | all | `npm test --workspace frontend`, `npm run typecheck`, `npm run build` (root) | local | 257/257 passed; typecheck and build passed | — | Claude (for Aaron) |
| 2026-10-02 23:03 | `af3048b` | F2 | all | `npx playwright test` (full suite) | local, desktop and Pixel 7 | **212 passed, 2 failed**, 358 skipped | An old layout test (#140) still opened the mock decide page and expected one centred `<form>`: "expect(locator).toBeVisible() failed … locator('main > form')". The live page shows cards until a decision is chosen. The test now checks the live page's centred column (`036c4bc`) | Claude (for Aaron) |
| 2026-10-02 23:04 | `036c4bc` | F2 | _01–_05 + all others | `npx playwright test` (full suite) | local, desktop and Pixel 7 | 214 passed, 0 failed, 358 skipped (other stories' fixmes). Session record `20261002-230400-Bl0oper-frontend-e2e.md` | — | Claude (for Aaron) |
| 2026-10-02 23:05 | `036c4bc` | F1 | all | `npm test --workspace frontend` | local | 257/257 passed. Session record `20261002-230500-Bl0oper-frontend-vitest.md` | — | Claude (for Aaron) |
| 2026-10-02 23:05 | `036c4bc` | F3 | _01–_12 | click-through script in Chromium: login page, organiser_a, coord_b, coord_a, organiser_c, organiser_b; database checked after each step | local, freshly reset and seeded `connectsphere_dev_stack`, Docker `postgres:17` (17.11), API on 3001, `npm run dev` | 39/39 passed. Session record `20261002-230530-Bl0oper-frontend-e2e.md` | As in "What the screens say", word for word. Blocked: "This request can't be approved until its required information is complete. Missing: Venue requirements, Accessibility needs, Equipment requirements, Layout preference, Registration setup." Notices: "Coordinator B approved Accessible Design Workshop. The request is now Approved and moves to planning." and "Coordinator B rejected Winter Gala. The request is now Rejected and can no longer be changed. Reason: Requested date unavailable across all venues". Organiser: "Rejected on 2 Oct 2026 — Requested date unavailable across all venues"; EVT-3005: "Rejected on 2 Oct 2026. No reason was recorded." Stale edit: "This request is rejected, so it can no longer be changed." coord_a: "Access refused" / "Access denied. This event is not assigned to you."; organiser_c: "Access denied. This action is for Event Coordinators." 393px: no sideways scrolling on eight screens. Keyboard: Tab order Request clarification, Reject…, Approve… with a 3px ring; focus into and back out of the panel | Claude (for Aaron) |
| 2026-10-02 23:06 | `036c4bc+local` (these records) | F5 | — | `python scripts/check.py` | local | passed | — | Claude (for Aaron) |

## Completion boundary

- **Backend PR**: approve and reject, the approval completeness check, the
  rejected-edit check, the decision in the Organiser's event read, and the
  backend tests above. All in this story's own code; other owners'
  functions aren't changed.
- **Frontend PR**: the Coordinator's decide page (Approve, and Reject with a
  required reason, with the missing items listed when approval is blocked,
  and "Decide on request" on the event page), and the Organiser's read-only
  rejected view, with browser tests for TC_E03S03_01 to _05 and component
  tests for every TC. Two optional props added to the shared `ConfirmPanel`
  (`reasonRequiredMessage`, `busyLabel`; D29, D31).

The story is done only when both PRs have merged and every TC_E03S03 case has
a passing run recorded above.

## Traceability

- Jira: `SCRUM-34`, with subtasks:
  - Backend PR: `SCRUM-129` (approve or reject), `SCRUM-130` (rejected
    requests read-only, and the decision in event details), `SCRUM-131`
    (tests, CI wiring and this run record)
  - Frontend PR: `SCRUM-132` (Coordinator decision panel), `SCRUM-133`
    (Organiser rejected-request view)
- Story: `E03-S03`
- Test cases: `docs/testing/cases/E03.md`, TC_E03S03_01 to _12
- Pull requests: #174 (backend). Frontend PR to follow
