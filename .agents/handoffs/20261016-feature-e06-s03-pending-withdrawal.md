# E06-S03 Pending withdrawal implementation

Implement E06-S03 / SCRUM-47 Pending-request withdrawal and replacement retry/chain rules under T-94/T-95/T-96 on feature/e06-s03-pending-withdrawal, based on main 8599ad2. Keep screenshot archive PR #294 separate. Implementation is local and uncommitted; no Jira, production database, commit, push or PR creation in this task.

## Implemented

POST /api/venues action withdraw_booking, booking_id UUID, shares submission HTTP origin/authentication boundary. Assigned active Coordinator only; lock venue before booking, recheck Pending and account/assignment. Event/account authority locks use FOR SHARE NOWAIT after venue/booking to avoid deadlock with existing event-first submission/conversion/reassignment. Lock contention gives refreshable 409. Only one booking becomes Released; event/other bookings unchanged. Converted hold remains Released with null expiry, never restored.

Booking Withdrawn audit uses venue_booking entity and status pending to released. New booking_withdrawn notification category sends only to requested venue's current active assigned staff; audit, status, inbox/email outbox persist together. Distinct from Coordinator-only booking_decided released route. Repeated withdrawal gives 409 without repeated effects.

New migration 0020_released_booking_replacement_retry.sql changes only venue_booking_replacement_idx to status <> released. Does not edit applied 0019. Submission duplicate check and list has_replacement match predicate. Old submission keys return their historical rows; Released permits a fresh row/key, Rejected consumes predecessor, next suggestion references latest rejection with no fixed two-attempt cap.

UI uses shared ConfirmPanel/Alert/Button components, busy and cancel controls, success notice/list refresh and conflict refresh button. Updated contract/schema/testing guide/manual steps and regenerated tc-coverage inventory (185 active of 359). No backlog/case requirements or exports changed.

## Verification

Six T-65 records: docs/testing/runs/20261016-161925-jininggg-backend-unit.md through 20261016-161930-jininggg-tooling.md. Backend unit 403 pass; withdrawal service plus existing changed booking modules 100% coverage. Focused component/form 17 pass and 100% coverage of screen/form/API. Real loopback PostgreSQL 44 pass across booking/list/hold/buffer/notification files, including populated 0019 index upgrade and deterministic blocked writers via pg_blocking_pids. E06-S04 decision writers simulate its database lock/status contract: not its unmerged service/UI. Intercepted Playwright 16 pass desktop/mobile. Runtime18 pass. Typecheck/build pass. Existing repository tooling 146 tests retains 3 failures/11 errors in Windows worktree fixtures; no bypass. Run-record validator passes362 records. Automated screenshots stay ignored, not T-93 manual evidence. No shared Supabase or Docker use.

## Next steps and review gates

Fresh partial human verification is now recorded below; full acceptance integration remains outstanding. E06-S04 actual decision/service integration and primary behaviour remain with that owner; current race tests only model shared DB contract. Peer-review lock ordering, scoped routing and migration0020 ownership/number before merge; no conflicting migration file was found in current main or open #283 files. Recheck number at PR time. Do not mark story Done solely from these tests. Required Linux CI must confirm platform checks.

No source original screenshot archive files are on this branch (separate #294). Do not accidentally mix those changes into this implementation. Do not edit STATE/JOURNAL. The automated-only PostgreSQL instance was stopped, then a fresh local manual database and API/frontend were started for the guided human run. They remain running; do not stop the user's sessions without coordination. Retain persistent local fixture data and ignored configuration.


## Manual testing and final preparation (16 October)

The fresh partial human run is docs/testing/runs/20261016-162300-jininggg-frontend-e2e.md, with 24 original screenshots in its matching evidence folder. Observations and agent read-only DB corroboration are explicit; direct API refusals, real staff races, provider receipt, replay, extended chains and no-suggestion termination were not human-tested. Synthetic rejection fixture setup is distinguished from E06-S04 decision execution. Original run records/images are immutable and unchanged.

Human testing found two UI gaps now fixed and retested: embedded switch success uses onViewBookings callback to close the form/reload instead of linking to the same route; assigned event details expose Venue bookings for every status including Confirmed. Human confirmed list refresh without F5 and clicked the event-page link. Final browser regression now exercises the refresh button on desktop/mobile. A test-only invalid Testing Library exact option was caught by the final build and removed.

Final records: 20261016-173359-jininggg-backend-unit.md (403 pass, withdrawal service100%); 173400-jininggg-frontend-vitest.md (32 pass, booking form/list/API100%, CoordinatorWorkspace legacy gaps stated); 173401-jininggg-frontend-e2e.md (16 intercepted browser pass); 173402-jininggg-tooling.md (build pass; repository146 tests retains3 failures/11 errors on Windows). Earlier DB44 and runtime18 remain separately recorded; no backend business code changed during UI fixes. Final screenshot visual inspection and image-size/decoding pass; synthetic fixture emails only.

GitHub main advanced to5675ea8 during this preparation; changes since8599ad2 were docs/tooling/evidence, including separate screenshot archive #294 now merged. No merged booking migration0020 collision or E06-S04 decision implementation was found in the comparison/open PR list. Recheck main and migration numbering when opening the implementation PR. In particular #267 now tracks artifacts on main: keep scratch scripts, local configurations and logs untracked when syncing; never stage artifacts wholesale. Do not commit or push until user explicitly authorises; latest request authorises preparation only. No staging, commit, push, PR creation, Jira update or production migration in this preparation.

Before full-story completion, obtain human review of code AND test cases; coordinate actual E06-S04 suggestions/decisions/primary and race integration with Le Xin, review acceptance/manual SKIPs honestly, link evidence, pass required CI and merge. Confirmed cancellation is outside this story. Shared production migration0020 requires its owning workflow and separate record, not an implicit apply during testing.


## E06-S04 owner coordination implemented (16 October, evening)

User authorised primary reselection, ownership correction and actual decideBooking race tests; no commit/push/merge remains authorised. Le Xin agreed races live in this follow-up and will review them; #298 still waits for Bryan on TC_E06S04_07.

Added bookingPrimary.ts, set_primary HTTP dispatch and Coordinator Confirmed non-primary selection/confirmation UI. Event FOR NO KEY UPDATE comes first, then account check and booking locks; clears old primary before setting target, writes Primary Venue Changed audit with venue names. Non-Confirmed/foreign/stale actors refused; current-choice retry no-op. No new migration; no status/period/expiry/event-status mutation. Contract ownership changed from E06-S04 to E06-S03 for explicit reselection; E06-S04 retains first-confirmed automatic primary.

New bookingDecisionIntegration.integration.test.ts directly loads actual decisions.ts when available and otherwise explicitly skips eight dependent cases. Never substitute a fake service. Added test file to full/targeted DB commands. For observed verification, created detached isolated checkout of PR298 head463f0e8ef982f2680fa644c8292ab4d631c90a70; overlaid E06-S03 source/test working files without touching decisions.ts (Git diff exit0), ran against existing guarded loopback test database with fresh random schemas.27 tests passed with zero skips: six real approval/rejection-withdrawal orderings, two real automatic-primary/explicit-selection orderings and19 submission/retry/primary regressions. Real BEGIN/COMMIT on two dedicated clients, post-SQL barriers and pg_blocking_pids checks. Effects assertions cover audit/inbox/outbox loser silence and exact winner counts. Temporary checkout removed safely after tests. No #298 source added to root branch, and no GitHub merge.

407 backend units passed; bookingPrimary100% coverage.19 component/form tests passed; list/API100%.20 intercepted desktop/mobile browser tests passed, including primary confirmation/cancel/conflict refresh.19 compiled API runtime tests passed. Typecheck/build pass; current repo check retains Windows146 tests,3 failures/11 errors. Inventory regenerated185 active/138 scaffold/36 none of359; it cannot represent runtime dependency skips and is not acceptance proof.

Six new records20261016-215604-jininggg-backend-unit.md through215609-jininggg-tooling.md; older records and24 human screenshots untouched. Fresh human primary-reselection run is still needed; old manual run cannot prove it. Manual script and guide updated. Earlier notes saying primary reselection belongs to E06-S04 or no decision PR exists are superseded by this section. Le Xin should review races/locks and explicit primary implementation before integrating dependencies. Current manual API must load updated code before primary UI testing; restarting only local API preserves database/browser sessions.

## Manual primary run and PR preparation (16 October, 22:20 onward)

Human completed primary confirmation/cancel, initial selection, switching Orchid to Cedar, refresh persistence and absence of controls on Pending/Rejected/Released. Nine original images are in evidence/20261016-221852-jininggg-frontend-e2e; matching immutable record discloses initial stale-API failure and retry. API restarted with current code using the same guarded disposable local database; synthetic Confirmed Cedar added for switching. No staff approval UI claim. User subsequently authorised final checks, commit, push and draft PR. Migration0020 remains available on fetched main; final repository hygiene passed, Windows tooling still146 tests/3 failures/11 errors. No production migration or #298 merge authorised. Hosted PostPlan: https://yn2ouq6ojr23.postplan.dev. Scratch artifacts must not be staged wholesale. Le Xin human review and required CI remain pending.


## Le Xin review fixes (17 October)

Primary activity formatter now handles primary_venue before status/hold formatting and preserves actual venue names; regression covers previous primary, no previous primary and absent new value. Ten activity tests pass with100% component coverage; four withdrawal units pass with exact revised busy409 message mentioning staff decision or event/account update and refresh/retry. Frontend typecheck passes; inventory regeneration has no diff. Fresh immutable records20261017-004600 and004601. E06-S02 work remains safely stashed on its separate test branch. Do not conflate these mocked tests with a new combined database or human run. User authorised PR299 review fixes; no #298 merge.

## Main conflict resolution (17 October)
Merged current origin/main into PR299; sole conflict tc-coverage.md regenerated from combined source (190/364 active). Targeted frontend30/backend22 tests passed. Repo hygiene passed;153 Windows tooling tests retain3 failures/11 errors. Record20261017-005012-jininggg-full-regression.md. E06-S02 stash untouched. No #298 merge.

## Second main conflict resolution (17 October)
Merged origin/main d87081d; only tc-coverage conflict regenerated190/375 active. Merged export/story-boundary targeted tests12 pass;158 full tooling tests retain3 failures/11 errors with hygiene/env passing. Record20261017-011355-jininggg-tooling.md. No application conflict, no #298 merge; E06-S02 remains separate.

## Completion-summary refresh (17 October)
Updated venue-booking-requests.md to link completed human primary run and Le Xin's reviewer-reported48-test isolated integration; retained exact tested heads and source distinction from root CI. Current approval/dependency integration, migration0020 release-sequencing/application verification and SCRUM195 roster gates remain explicit. No application change or additional manual acceptance claim. Earlier pending-primary statements superseded.

## Main merge ea9d5e0 (17 October)
Only coverage inventory conflict, regenerated195/375 active. Fifteen targeted activity/organiser-save-alert tests passed; repo hygiene/env checks pass, existing Windows tooling158 tests3 failures/11 errors. Records20261017-171609-frontend-vitest and171618-tooling. No dependency merge or application change in resolution.

## CI save-alert race fix (17 October)
CI run39020544510 failed organiser save-alert TC_E03S12_01 from main: transient success text could resolve before reload hides its container. Test now waits for refreshed event heading before querying the final alert; product code/real assertions unchanged. Full frontend422/422 pass across45 files. Record20261017-203558. Repo hygiene/env pass;158 Windows tooling tests retain3 failures/11 errors (record203449). E11 uncommitted implementation preserved in task-specific stash before switching; do not drop or apply on this branch. User corrected accidental test execution denial; full run completed. Pushing focused CI test fix to PR299; no website restarted.

## Xiang Ying final release/conflict follow-up (17 October)
Merged main c44c6af into remote latestaea9fad. Conflicts backend test scripts (union retains readiness + withdrawal/primary/combinedDB lists), workspace (one equipment action including safety_review plus Venue bookings + readiness) and regenerated inventory201/376. Focused36frontend pass; frontend/backend typechecks pass; Windows158 tooling retain3failures11errors with hygiene/env passing. Record20261017-210349.
Concrete release prerequisite migration-only PR306 created from c44c6af with exact0020 SQL and docs/evidence only. Local populated-index upgrade1pass0skips (record in306 pins root actual checkout); byte parity verified. Deploy owner still must merge migration-only, precheck/apply/postverify and commit sanitized record before299 can queue. No production query/write. After migration merge, merge main into299 to remove SQL diff. #298 remains distinct;8combined cases still dependency-gated. E11 work remains stashed. Temporary migration worktree to be removed once clean/fully pushed.

## 18 October main conflict resolution
Merged origin/main1b06812 into remote15d5d40. Resolved duplicate save-alert fix using main's reviewed version; regenerated inventory207/376 active. ActivityLog auto-merge preserves primary-venue handling plus main's Singapore edited-time formatter. Full frontend443/443 across48files;8withdrawal/primary units and both typechecks pass. Record20261018-015600. PR306 conflict resolution pushed88a1204, SQL unchanged and production gate remains; no298 merge, production action or website start. E11 resumed work preserved in latest named stash.

## 22 October conflict resolution
Merged origin/main 56d7117 into PR299 head 2c5ac1d in an isolated disposable worktree. Only backend/package.json conflicted; union preserves main equipmentNotifications and withdrawal/primary/combinedDB lists. Regenerated coverage207/376. Backend426pass, frontend447pass/48files, bothtypespass. Initial frontend plugin resolution failed before tests; existing dependency junctions resolved environment only. check.py hygiene/env pass;158Windows tooling3failures11errors remain; record 20261022-195546-jininggg-full-regression.md. No298 merge or fresh combined DB run: user explicitly waits for298 first (now a0f18b8, stillopen). Migration0020 and314record gate complete; no production operation. Current-head CI/review, combined evidence and outstanding manual cases remain. Root SCRUM203 uncommitted work and local202commit preserved. Prepare normal merge commit/push, noforce/noauto-merge.

## 22 October latest review follow-up

User authorised necessary fixes/push for PR299 reviews. Addressed Le Xin inline4348326888 lock-order comment,4348326902 Activity-query dependency note,4348326910 terminal primary mutation. Primary service reads/checks active Event status under existing Event lock, before writes or replay; UI hides selection on ended Events. Unit+realDB tests preserve flags/audit on refusal. Record20261022-214841-jininggg-full-regression.md:20realDB,9units with100% services coverage,25frontend,both types pass. Inventory regenerated unchanged207/376. Repo hygiene/env pass;Windows158 tests3fail11error remain. No298 integration, production action or new human evidence. E10 branch untouched. Publish normal update and request human re-review; keep unqueued.

Main advanced to10bef44 and GitHub reported a conflict after initial fix push. Merged at e2d9d26; sole conflict generated inventory regenerated208/376. Post-merge20realDB,9unit,25frontend,both types pass. Repository163tests3fail11error; new immutable20261022-215601-jininggg-full-regression.md. Updated PostPlan https://so84l4vridjb.postplan.dev. Keep299unqueued,298a0f18b8stillopen.

## 23 October conflict resolution

User authorised merge-conflict resolution/push. Merge main38ffa99 into cbd43ea in isolated worktree. Conflicts .gitignore/backend test lists/generatedinventory resolved by union/regeneration213/376. Cancellation notification/navigation auto-merges inspected. Backend full units exit0; frontend full captured469pass3timingfail, isolated44+8pass; both types pass. Repository163tests3fail11error. Evidence20261023-113712-jininggg-full-regression.md; do not claim full frontend green. No298 integration/production/manual action. Keep PR unqueued and current-head human/CI gates. E10 branch preserved.

## 24 October actual merged298 integration

User authorised resolving299 after298merged. Main9c8a37f includes actual decisions.ts. Union .gitignore/backend/runtime tests; regenerate229/376. Preserve primary-specific formatting against generic venue_booking formatter; existing realistic test covers it. Added combinedfile to CI-used booking selector. Record20261024-161007-jininggg-full-regression.md:8realraces no skips,43submission/decisionDB,exactCIcommand52realDB,471backendunits,52targetfrontend,both types/build pass. Runtime22API assertionspass butafter-hookjunction containmentfails; repo163tests3fail11error. InitialduplicatefixtureTS1117 corrected, no assertions weakened. No fullfrontend/manual rerun.298waiting andActivityquerygates nowclear; freshCI/currentheadhumanreview and outstandingmanualcasesremain. No0020rerun orauto-merge.


## 24 October manual replacement refresh finding

Human tested local b5f5736: staff approval, automatic first primary, approval Activity and Coordinator inbox observed; rejection with suggestion, replacement withdrawal/retry, and no-suggestion controls observed. Replacement and retry saved but list required F5 twice: not a clean manual pass. Human screenshots supplied in conversation and named for saving; originals still need importing to a formal T-93 evidence directory. UI button is Venue bookings.

Fix in intentional manual worktree adds successful-submit callback to embedded form; parent closes form, reports Pending replacement and reloads immediately. Regression asserts updated list without clicking View. 21 focused component tests and frontend types pass; immutable record 20261024-164833-jininggg-frontend-vitest.md. No new human rerun, commit or push yet. Local manual server remains active with fresh isolated native database; preserve this worktree and existing human fixture state. Root E10 work and review notes untouched.

Human final retests confirmed automatic refresh for both initial replacement and retry. All14 original screenshots imported; focused manual record20261024-162200 preserves original FAIL and fixed PASS, explicitly excludes full canonical TC11/13 claims. Test catalogue version211026 used for final record. Repository check hygiene/env/record validation pass;163Windows tests3fail11errors persist. Ready for normal commit/push, no auto-merge.
