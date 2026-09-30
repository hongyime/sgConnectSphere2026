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

## Test plan

The test cases are in `docs/testing/cases/E03.md` (TC_E03S02_01 to _12).

- **Backend tests** check the rules against a real, disposable PostgreSQL 17
  database. The browser can't be trusted to enforce a rule, so these are what
  prove it holds.
- **Browser tests** (Playwright) check that the screens show the right things.
  These come in the frontend PR, which follows the backend PR.

Every automated test must carry its TC ID in its title, so that
`scripts/tc_coverage_audit.py` counts it in `docs/testing/tc-coverage.md`.

| TC ID | Type | What the user sees | Backend test (backend PR) | Browser test (frontend PR) |
|---|---|---|---|---|
| TC_E03S02_01 | Happy path | Status becomes Awaiting Clarification. The Organiser gets one notice containing the question text | Planned | `tests/e2e/e03.spec.ts` (fixme until then) |
| TC_E03S02_02 | Happy path | Status returns to Under Review. The Coordinator gets one notice | Planned | `tests/e2e/e03.spec.ts` (fixme until then) |
| TC_E03S02_03 | Happy path | Each outstanding question is listed with the date raised, e.g. "08/09/2026" | Planned | `tests/e2e/e03.spec.ts` (fixme until then) |
| TC_E03S02_04 | Cross-cutting (UI filtering) | Only Awaiting Clarification events are listed | Planned | `tests/e2e/e03.spec.ts` (fixme until then) |
| TC_E03S02_05 | Negative | 403 "Only the assigned Coordinator can request clarification on this request." | Planned | Not needed |
| TC_E03S02_06 | Negative (business rule) | 409 "Clarification can only be requested while the request is Under Review." | Planned | Not needed |
| TC_E03S02_07 | Negative | 400 "Add at least one question." | Planned | Not needed |
| TC_E03S02_08 | Boundary | 400 "Each question must be 2000 characters or fewer." (2001); accepted (2000) | Planned | Not needed |
| TC_E03S02_09 | Negative (business rule) | 400 "Answer every outstanding question before resubmitting." | Planned | Not needed |
| TC_E03S02_10 | Cross-cutting (security) | 403 "Only the Organiser who submitted this request can answer its questions." | Planned | Not needed |
| TC_E03S02_11 | Negative (business rule) | 409 "This request is not awaiting clarification." | Planned | Not needed |
| TC_E03S02_12 | Happy path | Both questions in one notice, both listed, both resolved after one response | Planned | Planned |

"Planned" is replaced with the test file and test name once the test exists.
The messages are the planned wording. The final wording is recorded here once
the code exists, so that a message a customer reports can be searched for and
traced to its test case.

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

**Frontend PR (later):**

1. Component tests: `npm test --workspace frontend`.
2. Browser tests TC_E03S02_01 to _04 and _12.
3. **Full click-through** of the real frontend, real API and a seeded
   disposable database. Every TC is clicked through as each role, including
   the refusals, with the message shown on screen checked against "What the
   user sees" above, and screenshots kept.
4. Gates 4, 6 and 7 above.

**Before the demo:** a **read-only check of production** (Supabase) that
everything this story relies on is there: the `awaiting_clarification`
status, the clarification thread types, and all repository migrations applied.
It runs inside `BEGIN READ ONLY` … `ROLLBACK` and writes nothing.

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
- **Browser tests use fixed sample data.** The full click-through (frontend
  gate 3) is what joins real screens to the real API.

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
- **Gate**: which test gate above the run belongs to.
- **Where**: `local` (and which database), or a CI run link.
- **Result**: passed/total, and the IDs of any failures.
- **What was seen**: for failures and refusals, the actual status code and
  message, word for word, so it can be searched for later.

| When (SGT) | Commit | Gate | TC IDs | Command | Where | Result | What was seen | Run by |
|---|---|---|---|---|---|---|---|---|
| _No runs yet._ | | | | | | | | |

## Completion boundary

- **Backend PR** (this branch): clarification request and response,
  outstanding questions in the event detail reads, the status filter, and the
  backend tests above.
- **Frontend PR** (follows, once `design.md` is available): the Coordinator's
  "Request clarification" form and status filter, the Organiser's outstanding
  questions and answer screen, and the browser tests for TC_E03S02_01 to _04
  and _12.

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
- Pull requests: to be added
