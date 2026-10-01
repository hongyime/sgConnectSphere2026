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
| A rejected request is read-only for its Organiser (D11). Coordinators already can't edit rejected requests. The refusal offers no change request | 409 "This request is rejected, so it can no longer be changed." | TC_E03S03_05, _11 |
| The Organiser's view of a decided request shows the reason and decision date, and a rejected one has no edit actions (`canEdit: false`, `editableFields: []`). The date is the decision's own audit entry, so it stays right after later status changes; seeded rows without one use `status_changed_at`. Only a rejection's reason is shown | The read carries `decision: { outcome, reason, decidedAt }`; the frontend PR shows it as "Rejected on 10 September 2026 — <reason>" | TC_E03S03_05 |
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
- **Browser tests** (Playwright) check that the screens show the right things.
  These come in the frontend PR, after `design.md` is available (D13).

Every automated test must carry its TC ID in its title, so that
`scripts/tc_coverage_audit.py` counts it in `docs/testing/tc-coverage.md`.

| TC ID | Type | What the user sees | Backend test (backend PR) | Browser test (frontend PR) |
|---|---|---|---|---|
| TC_E03S03_01 | Happy path | Status becomes Approved. The Organiser gets one "Request approved" notice | `decision.integration.test.ts`: "TC_E03S03_01: approving a complete Under Review request…" and "…a failed email-outbox write leaves the request Under Review…" | `tests/e2e/e03.spec.ts` (fixme until then) |
| TC_E03S03_02 | Negative | Approval blocked, missing items listed, e.g. "Venue requirements" | `decision.integration.test.ts`: "TC_E03S03_02: approval is blocked while Venue requirements is missing…" and "…every missing item is listed…" | `tests/e2e/e03.spec.ts` (fixme until then) |
| TC_E03S03_03 | Happy path | Status becomes Rejected. The Organiser gets one "Request rejected" notice with the reason | `decision.integration.test.ts`: "TC_E03S03_03: rejecting with a reason…" | `tests/e2e/e03.spec.ts` (fixme until then) |
| TC_E03S03_04 | Negative | 400 "Add a reason for rejecting this request." | `decision.test.ts` and `decision.integration.test.ts`: "TC_E03S03_04: …" | `tests/e2e/e03.spec.ts` (fixme until then) |
| TC_E03S03_05 | Happy path | "Rejected on 10 September 2026 — <reason>"; no edit actions | `decision.integration.test.ts`: "TC_E03S03_05: the Organiser sees the reason and decision date of a rejected request…" and "…an approved request shows its decision date…" | `tests/e2e/e03.spec.ts` (fixme until then) |
| TC_E03S03_06 | Negative | 403 "Only the assigned Coordinator can decide on this request." | `decision.integration.test.ts`: "TC_E03S03_06: …" | Not needed |
| TC_E03S03_07 | Negative (business rule) | 409 "A decision can only be made while the request is Under Review." | `decision.integration.test.ts`: "TC_E03S03_07: …" | Not needed |
| TC_E03S03_08 | Negative | 403 "Only the assigned Coordinator can decide on this request." | `decision.test.ts` and `decision.integration.test.ts`: "TC_E03S03_08: …" | Not needed |
| TC_E03S03_09 | Negative (business rule) | 409 "A decision can only be made while the request is Under Review." | `decision.integration.test.ts`: "TC_E03S03_09: …" | Not needed |
| TC_E03S03_10 | Boundary | 400 "The reason must be 2000 characters or fewer." at 2001; 2000 accepted | `decision.test.ts` and `decision.integration.test.ts`: "TC_E03S03_10: …" | Not needed |
| TC_E03S03_11 | Negative (business rule) | 409 "This request is rejected, so it can no longer be changed.", with no change-request link | `decision.integration.test.ts`: "TC_E03S03_11: …" | Not needed |
| TC_E03S03_12 | Boundary | Approval goes ahead with features-only accessibility | `decision.integration.test.ts`: "TC_E03S03_12: …" | Not needed |

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

**Frontend PR (after `design.md`):**

1. Component tests: `npm test --workspace frontend`.
2. Browser tests TC_E03S03_01 to _05.
3. **Full click-through** of the real frontend, real API and a seeded
   disposable database. Every TC is clicked through as each role, including
   the refusals, with the message shown on screen checked against "What the
   user sees" above, and screenshots kept.
4. Gates 4, 6 and 7 above.

**Before the demo:** a **read-only check of production** (Supabase), inside
`BEGIN READ ONLY` … `ROLLBACK`, writing nothing and returning only counts and
object names:

- the `rejected` status and the `events.decision_reason` column exist, and
  all repository migrations are applied;
- how many Under Review requests are missing required information, since
  those can't be approved until the Organiser completes them.

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
- **The rejected-edit check sits in the edit route, not inside
  `updateEventInformation`** (SCRUM-37's code, not changed by this story).
  Today that route is the function's only caller. A new route that calls it
  would not get the check unless it calls `rejectedEditRefusal` too; TC_11's
  real-stack run exercises the route itself.
- **The seed's rejected request has no reason.** EVT-3005 is seeded as
  Rejected with no `decision_reason` and no status audit entry, so its
  decision shows no reason, dated from `status_changed_at`. Requests rejected
  through this story always carry both.
- **The missing-item labels are the request form's**, e.g. "Venue
  requirements". TC_E03S03_02's catalogue text writes "Venue Requirements";
  only the capitalisation differs.
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

## Completion boundary

- **Backend PR**: approve and reject, the approval completeness check, the
  rejected-edit check, the decision in the Organiser's event read, and the
  backend tests above. All in this story's own code; other owners'
  functions aren't changed.
- **Frontend PR** (after `design.md`): the Coordinator's decision panel
  (Approve, and Reject with a required reason, with the missing items listed
  when approval is blocked), and the Organiser's read-only rejected view,
  with the browser tests for TC_E03S03_01 to _05.

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
