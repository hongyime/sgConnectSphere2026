# feature/SCRUM-50-e06s06-double-booking-finish

Goal: finish E06-S06 "Prevent double-booking of a venue" (story SCRUM-50) for its owner Le Xin, on top of the work Bryan already merged (#339 rules and test cases under T-100, #340 real-database backend tests). Bryan handed the remaining work to Le Xin in class. This branch links the backend tests to TC_E06S06_01 to _07, fills the untested case steps, brings in Bryan's Venue Staff conflict warning, replaces the seven `test.fixme` browser scaffolds, and adds the click-through guide plus the T-65/T-93 runs needed for Done.

## Who did what

- Bryan: #339 (T-100 story rules and the seven cases), #340 (seven real-PostgreSQL claim tests), and the Venue Staff conflict warning merged as #378 on 30 October (subtask SCRUM-231; Amareet approved). Manual acceptance stays under subtask SCRUM-232.
- #308 (Bryan's first-approval-wins build) was closed unmerged; T-100 rejects that rule, so none of it is used here.
- Le Xin: everything on this branch unless a commit says otherwise.

## Gaps found against main `eab9f89`

1. `backend/tests/venueClaimPolicy.integration.test.ts` titles carry no TC_IDs, so `tc-coverage.md` lists all seven cases as scaffold only.
2. Untested case steps: TC_01 (Confirmed plus Pending after buffer growth), TC_06 flag priority (earlier unflagged, later flagged), the Coordinator withdraw/replan path, a Rejected row never approvable, and the Scenario 2 / TC_05 "no other event title in the refusal" check.
3. Venue Staff request screens do not show the buffer conflict before Approve is pressed (the calendar does). Closed by #378.
4. All seven browser cases in `tests/e2e/e06.spec.ts` are `test.fixme`.
5. No E06-S06 click-through guide, automated real-database run or T-93 manual run.
6. Backlog Owner field blank; human review outstanding.

## Plan (task-by-task, owner approves each)

- T1 branch and this handoff. Done.
- T2 done. `venueClaimPolicy.integration.test.ts` titles now carry TC_E06S06_01 to _07; added TC_01 (Confirmed plus Pending after a real Venue Staff buffer edit), TC_04 and TC_05 with the case's zero-buffer data, TC_06 primary (rejection, Rejected stays terminal) and alternative (Coordinator withdraw and replan) paths, and the Scenario 2 no-disclosure check on the request path. The fixture gained `editBuffers` (real `updateVenue`, so C-109 flags are set), `withdraw`, `bookingRows` and an optional event title. Case wording left unchanged: the tests match TC_01/_06 as written, and the TC_03 "automated only" note goes in the T5 guide. Owner set to Le Xin in both E06 backlog views; dated exports are regenerated once in T7. `tc-coverage.md` regenerated: all seven E06-S06 cases active.
- T2b done (T-102). `holds.ts` findClash now returns the request-path sentence with the other booking's occupied buffered window and no longer reads the event code or title. Updated E06-S05 hold-message checks in `venueHolds.test.ts`, `venueHolds.integration.test.ts`, `VenueHolds.test.tsx`, `tests/e2e/venueHolds.spec.ts`, `tests/auth-e2e/venueHolds.spec.ts`, the E06-S05 click-through guide, E06-S05 Scenario 2 in both backlog views and TC_E06S05_01. TC_E06S06_02's hold path now checks no disclosure. Added an expiry-notice unit test so `eventName`'s code-prefixed branch stays covered.
- T2 tightening (owner's pre-T4 audit): restored the concurrent TC_06 approvals that T2 had made sequential, pinned the exact buffered window in every Scenario 2 refusal, approved (not only accepted) the buffered-adjacent request, and added an expired-hold check for Scenario 1's "unexpired Tentative". Claim suite 12/12; booking DB group 97/97; a refusal showing advertised instead of buffered times fails TC_E06S06_02.
- T3 done by Bryan in #378 (merged). This branch was rebased onto main `3ac6582`; only `tc-coverage.md` clashed and was regenerated. After the rebase: backend hold/claim/buffer suites 52/52, frontend venue and hold tests 187/187, typecheck clean.
- T4 done. New `tests/auth-e2e/venueClaimPolicy.spec.ts` (real sessions, API and loopback PostgreSQL, run by CI's `test:e2e:auth`) covers TC_E06S06_01, _02, _04, _05, _06 and _07 through the screens; setup claims are made by the real submission and decision services. TC_03 stays backend-only (two claims at one instant cannot be clicked), as do TC_06's withdraw/replan path and the expired-hold check. The seven `test.fixme` scaffolds in `tests/e2e/e06.spec.ts` were replaced by a pointer note.
- Bug found by TC_06 in the browser and fixed: after Venue Staff reject one conflicting request, the other kept its `buffer_conflict` flag (nothing clears it until the next buffer edit) and #378's `conflictDetection.ts` blocked Approve on the flag alone, although the server approves. Owner chose the screen fix: only a current buffered overlap blocks; a stale flag does not. Bryan's two flag-only unit expectations were replaced by a stale-flag (no block) and a flagged-with-overlap (block) case. Not done: clearing the stale flag server-side, so the calendar may still say "Buffer conflict — needs review" until the next buffer edit. Tell Bryan in the PR.
- T5 click-through guide, preconditions SQL, automated real local run (T-65).
- T6 Le Xin's T-93 manual run with hand-taken screenshots.
- T7 `python scripts/check.py`, PR with `Closes SCRUM-50`.

## Decisions to check

- No PO question needed for the listed gaps: each implements or proves T-100 as written.
- T-102 (PO Bryan, 30 October, relayed by Le Xin): a refused hold hides the other event's name, like a refused request. Recorded in `docs/bdr/B-team-decisions.md` and `G-change-log.md`; E06-S05 and E06-S06 cite it. E06-S05 is not reopened; its Done flag and old run records are untouched. Reviewers: E06-S05 owner (Amareet) should see the reworded Scenario 2 and TC_E06S05_01.

## Commands run (exploratory, not yet T-65 evidence)

- Native loopback PostgreSQL 5432, `TEST_DATABASE_URL` pointing at the disposable `connectsphere_notification_test` database; no Supabase, no Docker.
- `npx tsx --test tests/venueClaimPolicy.integration.test.ts`: 11/11 pass. Three deliberate breaks (request refusal naming the event, buffer edit flagging nothing, approval skipping the recheck) each failed the expected TC tests; source restored.
- `npm run test:venue-booking-requests:db`: 96/96 pass. `npm run typecheck`: pass.
- T2b: hold and claim suites plus buffer conflicts 51/51; backend `npm test` 612 pass, 1 skipped (existing), `holds.ts` 100% lines, branches 98.56% with only pre-existing gaps at lines 82 and 196 (main had the same two); old `holds.ts` restored temporarily failed the three new checks; `VenueHolds.test.tsx` 14/14; `tests/e2e/venueHolds.spec.ts` 10/10; `tests/auth-e2e/venueHolds.spec.ts` 2/2 on the loopback test schema.

## Not done / next step

Start T4 after the owner's go-ahead. The evidence run for the PR is recorded in T5 on a committed head. Jira was not reachable from this session (Atlassian app 403), so SCRUM-50 and its subtask statuses are unverified.
