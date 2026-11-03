# SCRUM-158 / E08-S06 implementation status

Conduct the Operational Safety Check as the Safety Officer. This file
records what was built, which test proves each acceptance criterion, and
**every run of those tests**, so each result can be traced back to the
exact code it ran against.

## Scope

From `docs/backlog/product/E08-readiness-confirmation.md`, E08-S06
Scenarios 1-10 and the checklist (BDR C-70, C-101, C-131 to C-135, T-71,
T-72, T-82, T-103; O-39 to O-43, all closed). Test cases
`docs/testing/cases/E08.md` TC_E08S06_01 to TC_E08S06_06.

Already on `main` before this branch: the `safety_review` status
(migration 0017) and its transitions, the Safety Officer-only confirm
check, automatic entry into Safety Review, the reconfirmation flags on
venue bookings, equipment reservations and Technical Support requests, and
Scenario 9's tracker and deactivation behaviour.

**Who wrote what.**
- Bryan built the first version on `feature/SCRUM-158-safety-officer-check`
  (1 November, no PR): the seven-factor decision check, the review detail
  and decision endpoints, the Activity log row with the checklist, the
  notices, the re-review flags and an inline review control. His commits
  `2058ede` and `83dc389` are cherry-picked here.
- Bryan's SCRUM-157 commit `fe9c4ef` (the Safety Officer role, landing
  route and queue) is carried here until his SCRUM-157 PR merges.
- This branch (Aaron, with Claude) finishes the story: see Known gaps.

## Rules this story applies

The messages are the code's wording, word for word.

| Rule | What the user sees | Test case |
|---|---|---|
| The queue lists every Event in Safety Review, oldest entry first, with what the check needs | Safety Officer's **Safety review queue**: table "Events awaiting their Operational Safety Check, oldest first", each title linking to its review, column "In Safety Review since". Review page "Decide: <title>": card "What you're deciding" (Organiser, Coordinator, Event date, Expected attendance, In Safety Review since, Technical Support), then one card per Session (When, Expected attendance, Layout, Accessibility requirements, Venues "<name>: capacity <n>; restrictions: …", Equipment "<n> × <name>, <n> reserved; placement: …") | TC_E08S06_01 |
| Every one of the seven factors is marked satisfactory or not, with a comment, before deciding | Card "Safety checklist": each factor a select starting at "Choose…" (Satisfactory, Not satisfactory) and a required comment. Deciding with any gap: "Fix the highlighted factors, then decide again.", "Choose satisfactory or not satisfactory.", "Comment is required." Server: 400 "Record every safety factor before deciding." or "Each safety factor needs a comment of 1 to 2000 characters." | TC_E08S06_02 |
| Approval with every factor satisfactory confirms the Event and notifies Organiser and Coordinator | **Approve…**, panel "Approve the safety check?", button **Approve safety check**; then "Approved. The event is Confirmed, and the Organiser and the Coordinator have been notified." and the pill shows Confirmed. With a factor not satisfactory: "Approval needs every factor to be satisfactory." (server: 409 "Approval is refused while any safety factor is unsatisfactory."). Notice "Event confirmed": "<event> passed the Operational Safety Check and is now Confirmed. When: … Venues: … Equipment: …" | TC_E08S06_02 |
| Request changes returns the Event to Planning, names the items and flags the affected arrangements | **Request changes…**, panel "Request changes?", Reason, button **Request changes**; then "Changes requested. The event is back in Planning, and the Organiser and the Coordinator have been notified." With no factor marked: "Mark the factors that need changes as not satisfactory." Notice "Safety check: changes requested": "The Safety Officer requested changes, so <event> is back in Planning. Reason: <reason>. Items to address: <factor>: <comment>." Coordinator's readiness page: alert "Safety check: changes requested" with the date and reason, and the flagged item "<name> — needs review (<r> of <n> reserved)"; submitting is refused with "This event can't be submitted for its safety check until every outstanding item is resolved." | TC_E08S06_03 |
| Rejection returns the Event to Planning with a visible flag and reason, never cancelling it | **Reject…**, panel "Reject the safety arrangement?" ("The event returns to Planning; it is not cancelled. …"), button **Reject safety arrangement**; then "Rejected. The event is back in Planning, not cancelled, and the Organiser and the Coordinator have been notified." Coordinator's readiness page and Organiser's event page: alert "Safety arrangement rejected": "The Safety Officer rejected the safety arrangement on <date>. Reason: <reason>. The event goes back to Safety Review once it's resubmitted for its safety check." | TC_E08S06_04 |
| Reject and request changes need a reason; only a Safety Officer decides | Empty reason: "Reason is required." under the panel's Reason field (server: 400 "A reason is required for this safety decision."). Any other role: the queue and review page show "Access refused" with "Access denied. This action is for Safety Officers."; a decision is refused with 403 "Only a Safety Officer can confirm an event in Safety Review."; each refusal is an Access Denied row, kept out of user-facing Activity logs | TC_E08S06_05 |
| Events confirmed earlier are untouched; tracker and deactivation treat Safety Review as active | An Event Confirmed before this story stays Confirmed, with no safety row and no queue entry. Organiser's event page: "Current status" **Safety Review**, "Reached on <date>"; organisation list "<code> · safety review". Coordinator's Deactivate Account: "Reassign your active events before deactivating your account." with "<code>: <title>" | TC_E08S06_06 |
| Every decision is one immutable Activity log row with the checklist | Activity log: one entry per decision (the status change's own row is left out of the read since Le Xin's #412 review), "Safety check approved", "Safety check changes requested" or "Safety arrangement rejected", by the Safety Officer, with "Now Confirmed. Every factor satisfactory" or "Back in Planning. Not satisfactory: <factors>. Reason: <reason>", on the shared Activity log and the Organiser's event page. A flagged booking or reservation also gets "Reconfirmation required: safety check changes requested" | TC_E08S06_02 to _05 |

## Test plan

| TC ID | What it proves | Automated tests |
|---|---|---|
| TC_E08S06_01 | Queue order, the per-Session detail, other roles refused | `roleQueues.test.ts`, `safetyReview.test.ts` (unit); `safetyReview.integration.test.ts` (real database); `RoleQueues.test.tsx`, `SafetyReview.test.tsx` (Vitest); `e08.spec.ts` (Playwright) |
| TC_E08S06_02 | Approval, its notice and its checklist row, shown in words | `safetyReview.test.ts`; `safetyReview.integration.test.ts`; `SafetyReview.test.tsx`, `ActivityLog.test.tsx`, `ActivityLog.singaporeTime.test.tsx`; `e08.spec.ts` |
| TC_E08S06_03 | Request changes: Planning, notice, equipment flagged and venue not, resubmission needed | `safetyCheck.test.ts`, `safetyReview.test.ts`; `safetyReview.integration.test.ts`; `SafetyReview.test.tsx`; `e08.spec.ts` |
| TC_E08S06_04 | Rejection: Planning not Cancelled, arrangements untouched, the flag for both roles | `safetyReview.test.ts`; `safetyReview.integration.test.ts`; `SafetyReview.test.tsx` (including `SafetyReturnAlert`); `e08.spec.ts` |
| TC_E08S06_05 | Reasons required; every other role refused with an Access Denied row | `safetyCheck.test.ts`, `safetyReview.test.ts`; `safetyReview.integration.test.ts`; `SafetyReview.test.tsx`; `e08.spec.ts` |
| TC_E08S06_06 | Legacy Confirmed Event untouched; tracker; deactivation | `safetyReview.integration.test.ts` (legacy Event); `e08.spec.ts` (tracker and deactivation, API faked); `deactivation.test.ts` (the blocking statuses include `safety_review`; its title carries no TC ID) |

The Playwright tests answer every API call with a fake server: they prove
what each role sees and sends, and the real-database test proves the
server's rules.

## Known gaps (from Bryan's version) and where each is closed

The story ships in three PRs, one per Jira subtask, to stay inside the PR
guardrails (decision 0017): SCRUM-247 backend, SCRUM-248 frontend,
SCRUM-249 acceptance evidence.

| Gap | Closed by |
|---|---|
| The queue orders by event date, not by time entered Safety Review | SCRUM-247 |
| Accessibility shows only the free-text note, not the features | SCRUM-247 (per Session, D117) |
| Venue layout read from the Event, wrong once Sessions differ (#408) | SCRUM-247 (D117) |
| No "safety arrangement rejected" state to show | SCRUM-247 (`safetyReturn`); shown by SCRUM-248 |
| Notices carry no confirmed details or unsatisfactory factors | SCRUM-247 (D115) |
| The equipment flag also marks released reservations | SCRUM-247 |
| A returned Event that was Confirmed before re-enters Safety Review by itself | SCRUM-247 (D118) |
| Every factor pre-marked satisfactory; the review sits in a table cell | SCRUM-248 |
| Tests cover only the parser and one refusal | SCRUM-247 (unit, real database); SCRUM-249 (Playwright, manual) |

## Test gates

Each gate is recorded in the Run log below.

| Gate | Where it ran | Result |
|---|---|---|
| 1. Backend unit tests (`npm test --workspace backend`) | `8054e44`, `578fc4d`; CI on `be0eb43` | 714 passed, 1 skipped at `578fc4d`; CI green |
| 2. Real database (Docker `postgres:17`, never Supabase) | `safetyReview.integration.test.ts` + 7 related suites at `8054e44`; the whole `test:db` batch at `578fc4d`; its own `application-checks` step | 55/55, then 340/340 |
| 3. Coverage of new and changed lines | backend at `578fc4d`, frontend at `524f478` (first measured at `8054e44` / `f30e9b5`) | 100%: #412's backend 347/347 changed lines against `main`, #413's frontend 76/76 against #412, so the fix commits `be0eb43`, `e49b4c3`, `578fc4d` and `524f478` included |
| 4. Typecheck (`npm run typecheck`, root) | `8054e44`, `f30e9b5`, `c2de0a1`, `578fc4d`, `524f478`; CI on `be0eb43`, `e49b4c3` | clean |
| 5. Vitest (whole frontend suite) | `f30e9b5`, `524f478`; CI on `e49b4c3` | 813/813 at `524f478`; CI green |
| 6. Playwright (whole suite, desktop and Pixel 7) | `c2de0a1`, `681f0c7` | 462 passed, 218 skipped, 0 failed |
| 7. Aaron's manual T-93 run of TC_E08S06_01 to _06 on the local real stack | `d8ba321`, rerun at `6c319a3` | TC_02, _03 FAIL, then PASS after `be0eb43` and `e49b4c3`. Le Xin's review fixes (`578fc4d`, `524f478`) change what TC_02 and _03 show; Aaron's recheck of those two is still to do |
| 8. Repository checks (`python scripts/check.py`, `doc_guard.py`, `tc-coverage.md` regenerated last) | each branch before pushing; CI on #412 (`be0eb43`) and #413 (`e49b4c3`) | pass. #413's other required checks run once it targets `main` |

## Known limits

- **A refused safety decision mentions confirming.** Another role's
  decision gets 403 "Only a Safety Officer can confirm an event in Safety
  Review." even for a rejection or a request for changes. It is Bryan's
  wording, shared with the old confirm route; Aaron chose to keep it.
- **Deactivation is proved in two halves.** The server's blocking list
  includes `safety_review` (`deactivation.test.ts`), and Playwright shows
  the refusal naming the Event with the API faked. No real-database test
  deactivates a Coordinator whose only active Event is in Safety Review:
  `deactivation.integration.test.ts` has no such case and no CI step (a
  follow-up from #394). Aaron's manual run didn't isolate it either, since
  `coord_a` had other active Events.
- **A flag's cause is only in the Activity log.** The readiness page says
  "needs review" for any flagged item, whether a stock change, a date
  change or the Safety Officer flagged it; since Le Xin's review each
  safety flag has its "Reconfirmation required: safety check changes
  requested" row.
- **A request for changes flags every booking or reservation of its
  kind.** The checklist is for the whole Event (D111), so a venue factor
  flags every confirmed venue booking across all Sessions, and equipment
  placement every live reservation. Scoping a factor to a Session would
  need the checklist per Session; Aaron kept it event-wide (3 Nov).
- **The checklist lives in the decision's `audit_logs` row** (D110).
  `docs/db_schema.md` still shows planned `SAFETY_CHECKS` and
  `SAFETY_CHECK_FACTORS` tables, which this story doesn't build.
- **The checklist's error message sits above the factors**, at the top of
  the "Safety checklist" card (`design.md` 5.2). On a long page you see
  the highlighted fields before the message.
- **The cases name accounts the seed doesn't have** (`safety_1`, `lead_1`,
  `coordinator_1`). The manual runs used the seeded
  `safety_officer@connectsphere.com`, `coord_a`, `coord_lead` and
  `organiser_a`, and set up their Events with
  `docs/testing/manual/E08-S06-preconditions.sql`.

## Run log

| When (SGT) | Commit | Gate | TC IDs | Command | Where | Result | What was seen | Run by |
|---|---|---|---|---|---|---|---|---|
| 2026-11-02 ≈00:46 | `8fdf63b+local` (committed as `a89272a`) | typecheck | - | `npm run typecheck` (root) | local | clean | checks the cherry-pick conflict resolution compiles | Claude (for Aaron) |
| 2026-11-02 ≈00:46 | `8fdf63b+local` (committed as `a89272a`) | unit | _05 | `npx tsx --test tests/safetyCheck.test.ts tests/roleQueues.test.ts` (backend) | local | 10/10 passed | Bryan's tests, unchanged | Claude (for Aaron) |
| 2026-11-02 ≈00:46 | `8fdf63b+local` (committed as `a89272a`) | Vitest | - | `npx vitest run --no-file-parallelism src/features/roleQueues src/app/routes.test.tsx src/features/accessControl/LoginPage.test.tsx` | local | 34/34 passed in 3 files | Bryan's tests, unchanged | Claude (for Aaron) |
| 2026-11-02 ≈00:48 | `ac5bf31` | unit | _05 | `npm test --workspace backend` | local | 696 passed, 1 skipped | the skip is a database contract with no `TEST_DATABASE_URL` | Claude (for Aaron) |
| 2026-11-02 ≈00:48 | `ac5bf31` | repository | - | `python scripts/doc_guard.py origin/main` | local | 0 errors, 156 warnings | - | Claude (for Aaron) |
| 2026-11-02 17:53 | `8054e44` | typecheck | - | `npm run typecheck` (root) | local | clean | - | Claude (for Aaron) |
| 2026-11-02 17:53 | `8054e44` | unit | _01 to _05 | `npm test --workspace backend` | local | 714 tests: 713 passed, 1 skipped | new and changed safety files at 100%; record `20261102-175346-Bl0oper-backend-unit.md` | Claude (for Aaron) |
| 2026-11-02 17:54 | `8054e44` | real database | _01 to _06 | `npx tsx --test tests/safetyReview.integration.test.ts` + 7 related integration suites (backend), Docker `postgres:17` | local | 55/55 passed | record `20261102-175404-Bl0oper-backend-db.md` | Claude (for Aaron) |
| 2026-11-02 18:07 | `f30e9b5` | typecheck | - | `npm run typecheck` (root) | local | clean | - | Claude (for Aaron) |
| 2026-11-02 18:07 | `f30e9b5` | Vitest | _01 to _05 | `npx vitest run --no-file-parallelism` (frontend) | local | 812/812 passed in 76 files | record `20261102-180747-Bl0oper-frontend-vitest.md`; every changed line covered | Claude (for Aaron) |
| 2026-11-02 18:10 | `f30e9b5` | Playwright regression | - | `npx playwright test` on 9 specs (coordinator, e03, e06, e08, e10, e14, eventReadiness, venueBookingDecisions, skeleton) | local, desktop + Pixel 7 | 122 passed, 126 skipped, 0 failed | the skips are `test.fixme` scaffolds; record `20261102-181032-Bl0oper-frontend-e2e.md` | Claude (for Aaron) |
| 2026-11-02 19:13–19:42 | `d8ba321` | manual (T-93) | _01 to _06 | Aaron's click-through of TC_E08S06_01 to _06, setup `docs/testing/manual/E08-S06-preconditions.sql` | local real stack (Docker `postgres:17`) | **TC_02 and TC_03 FAIL**, others PASS | the Organiser's Activity log showed the checklist as raw JSON (fixed in `e49b4c3`); also fixed: stale review pill, notice full stop, "stock changed" wording (`be0eb43`, `e49b4c3`); record `20261102-191300-Bl0oper-frontend-e2e.md`, 22 screenshots | Aaron |
| 2026-11-02 19:57–20:04 | `6c319a3` | manual (T-93) rerun | _02, _03 | Aaron's rerun of the failed and changed steps, same setup SQL, API restarted on this commit | local real stack (Docker `postgres:17`) | PASS | Organiser Activity log in words; pill Confirmed / Planning; notice full stop; "needs review (1 of 1 reserved)"; record `20261102-195700-Bl0oper-frontend-e2e.md`, 6 screenshots | Aaron |
| 2026-11-02 19:52–20:05 | `be0eb43` | CI (#412) | _01 to _06 | GitHub Actions: `CI` (repository checks) run 41440195262, `Application Checks` run 41440195114 (typecheck, unit, real-database steps, Vitest, Playwright) | CI | all required checks green | - | GitHub Actions |
| 2026-11-02 19:52–20:07 | `e49b4c3` | CI (#413) | _01 to _05 | GitHub Actions: `Application Checks` run 41440229925 | CI | green | the PR targets #412's branch, so only `application-checks` runs | GitHub Actions |
| 2026-11-02 ≈20:24 | `f78a8a8+local` (committed as `c2de0a1`) | Playwright | _01 to _06 | `npx playwright test tests/e2e/e08.spec.ts -g "E08-S06"` | local, desktop + Pixel 7 | **11 passed, 1 failed** | TC_01 on Pixel 7: the test counted the queue's header row, which the mobile layout hides; fixed in the test before committing | Claude (for Aaron) |
| 2026-11-02 20:26–20:29 | `c2de0a1` | Playwright | _01 to _06 | `npx playwright test` (whole suite) | local, desktop + Pixel 7, API faked | 462 passed, 218 skipped, 0 failed | TC_E08S06_01 to _06 pass on both projects, including deactivation with Safety Review as the only active Event; the skips are other stories' `test.fixme` scaffolds; record `20261102-202637-Bl0oper-frontend-e2e.md` | Claude (for Aaron) |
| 2026-11-03 ≈16:30 | `be0eb43+local` (committed as `578fc4d`) | unit | _01 to _05 | `npm test --workspace backend` | local | **712 passed, 2 failed**, 1 skipped | after Le Xin's review fixes: two older tests read the Activity log query by its old values and by the text `field_changed = 'status'`, which the new filter also contains; the tests were updated, no product change | Claude (for Aaron) |
| 2026-11-03 16:42–16:43 | `578fc4d` | typecheck, unit, coverage | _01 to _05 | `npm run typecheck` (root); `npm test` then `npm run test:coverage` (backend) | local | clean; 714 passed, 1 skipped; 347/347 changed lines covered | record `20261103-164251-Bl0oper-backend-unit.md` | Claude (for Aaron) |
| 2026-11-03 16:44 | `578fc4d` | real database | _01 to _06 | `npm run test:db --workspace backend`, Docker `postgres:17` | local | 340/340 passed | one Activity log entry per decision; the flag's audit row; approval keeps `decision_reason`; record `20261103-164424-Bl0oper-backend-db.md` | Claude (for Aaron) |
| 2026-11-03 16:45–16:49 | `524f478` | typecheck, Vitest, coverage | _02, _03 | `npm run typecheck` (root); `npx vitest run --no-file-parallelism --coverage` (frontend) | local | clean; 813/813 in 76 files; 76/76 changed lines covered | record `20261103-164506-Bl0oper-frontend-vitest.md` | Claude (for Aaron) |
| 2026-11-03 ≈16:50 | `b186d7c+local` (committed as `681f0c7`) | Playwright | _01 to _06 | `npx playwright test tests/e2e/e08.spec.ts -g "E08S06"` | local, desktop + Pixel 7 | 12/12 passed | after updating the two expected Activity log texts | Claude (for Aaron) |
| 2026-11-03 16:50–16:52 | `681f0c7` | Playwright | _01 to _06 | `npx playwright test` (whole suite) | local, desktop + Pixel 7, API faked | 462 passed, 218 skipped, 0 failed | record `20261103-165036-Bl0oper-frontend-e2e.md` | Claude (for Aaron) |
