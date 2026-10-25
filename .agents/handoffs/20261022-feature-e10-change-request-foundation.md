Publish the independently reviewable E10-S01 foundation so Xiang Ying can integrate SCRUM-205/206. User explicitly authorised renaming the local UI branch, committing, pushing and opening a PR on 22 October. This supersedes earlier instructions to keep E10 work local.

Branch: feature/e10-change-request-foundation. Includes backend base5470919 plus structured-field follow-up and real frontend. This is one vertical foundation increment, not completion of SCRUM-70, SCRUM-202, SCRUM-203 or SCRUM-204. Keep all those issues open. Jira references remain ordinary PR-body traceability only; no Jira key in branch/title and no closing clause. Existing committed message mentioning SCRUM-202 does not drive the inspected sync script.

Xiang Ying can use the real form/read/decision API and existing requested_changes.fields/before lifecycle. Her refused-edit prefilling and Completed-to-Obsolete handling remain her work. No team message sent. Le Xin E10-S02 preview/apply, Session contract, integration regressions and formal human screenshots remain outstanding. Arrangement approval is deliberately Approved/unapplied, not completed Scenario4.

Verification and documented coverage exceptions: records20261022-194403 and20261022-211022. Latest development results: frontend457/457, backend423/423, focused20/20 (15 real native PostgreSQL), both types/build pass. Old database instance failed missing physical file; preserved, not reset. Fresh isolated database used for final checks. Earlier parallel frontend timing failures retained in record. No production/email/manual acceptance claim. Historical UI/backend handoffs retained for provenance; this file is current publication state.

Resume remaining integration work from main after this PR is actually merged; do not assume approval or merge from publication. User owns final combined manual run, other owners their subtask tests. Existing PR299 dependencies remain unchanged.

Publication verification: merged main c7ccd48 at a287668. Sole conflict generated inventory, regenerated206/376. Post-merge focused backend20/20 (15 realDB), frontend17/17, both typechecks/build pass. New immutable publication record retained worker-EPERM retry. check.py hygiene/env pass;158 tooling3fail11error remain. PostPlan https://oeiqxqzntfro.postplan.dev rendered and visually inspected; no human acceptance screenshots.

## 23 October application CI repair

User authorised fixing failed application checks. Fast-forwarded to remote195375f (main integration by another session) without overwriting it. Actual latest failure39815991532 differs from earlier timeout: TC_E03S07_04 desktop/mobile still expected old Coming-soon page; real-form route also needed its own API fixture instead of Event-detail JSON. Added exact GET contract fixture and real-form assertions, preserving readonly/link/URL checks. Local focused2/2; surrounding E03-S07 group12pass/2existingfixme, both types pass. Inventory regenerated unchanged206/376. No product/CI-timeout change or SCRUM205prefill completion claim. Publish normal follow-up, keep all remaining integration gates.

## Repeated CI time limit (23 October)

Current application run39823362107 at4cb5200 passed all executed pre-browser tests/build, then hit the15min job cap during Playwright install. Installation started17:33:17Z and completed browser download17:45:57Z (12m40s), immediately before cancellation. This is separate from the repaired stale assertion. User asked to fix the continuing checks; raise existing job budget to30min, retain finite cap/all commands/assertions/services. No new CI service or bypass. Linux CI must establish full outcome; Windows cannot emulate apt installation timing.

## 23 October cancellation/main merge

User authorised resolving PR341 conflicts against main38ffa99. Retain both API dispatches/live routes, remove obsolete mock ChangeRequest/CancellationForm, union backend tests/artifacts, regenerate211/376; preserve30minCIcap. Verification20261023-134942-jininggg-full-regression.md:427backendunits,480frontend(two workers),20focusedbackend(15realDB),2desktop/mobile nav,17runtime,both types/build pass. Old database stopped caused15DBfail/5unitpass; fresh native disposable server started and20pass. Repo163tests3fail11error remain. No whole-storyDone or production/manual claim. Push normal merge, retain remaining integration gates and request current-head review/CI.

## Review comment6360199335 (23 October)

Add the missing explicit changeRequests.integration.test.ts workflow step using
the same managed PostgreSQL env/working directory as cancellation. test:db alone
was not executed by Actions; prior15 DB results were local only, not CI proof.
The new step must pass on the published head before claiming CI DB evidence.

Timeout accounting: original branch repair changed15 to30 at8f2d866. Main later
merged a25-minute budget; after14761b0 the actual PR diff is25 to30. Retain the
finite30-minute budget, explicitly label this cross-cutting CI maintenance under
E00 (SCRUM-127 is the Epic, not a newly created enabler ticket). Reviewer offered
body correction as an alternative to splitting; take that option. No Jira change.

The two unmerged predecessor handoffs are consolidated below and removed from
this PR. Their original content remains in Git history. Historical authorisation,
branch and process states are superseded by this file's current publication state;
only the foundation branch is current. Test records are immutable and unchanged.

## Historical notes: Backend predecessor

Implement SCRUM-202, the E10-S01 backend increment: submit/read/decide/apply change requests with transactional audit and notifications. Parent SCRUM-70 remains open; SCRUM-203/204 and Xiang Ying's SCRUM-205/206 are separate.

## Boundaries

20 October SCRUM-70 agreement authorises title, description and purpose as safe fields. Arrangement changes must remain approved/unapplied until a reviewed E10-S02 implementation is integrated; no configurable bypass or fake successful apply. Cancellation requests use action=cancel and must remain excluded. Snapshot changed fields for stale checks; serialize decisions/application on the Event lock. No production changes, mail send or human acceptance claimed.

## Progress

Fresh branch from origin/main; implementation and verification in progress. Historical E11 branch preserved. Read repository workflow, DoD, source-of-truth and native database restrictions. Branch creation required filesystem escalation; no protection bypass.

Implemented requests.ts and GET/POST dispatch in existing api/events.ts. Stored JSON shape {fields,before}; safe title/description/purpose apply, existing public name follows title only, approved arrangement changes remain unapplied. Event -> request locks, NOWAIT shared actor lock, stale/terminal/account/owner checks, targeted outbox/audits and separate denial audits. Cancellation action excluded. Contract documents supported field subset and future Session/layout/registration/E10-S02 boundaries.

Final focused 14 tests pass (3 unit/unauthenticated-handler, 11 real DB), both typechecks pass; earlier full backend 420 pass predates final small additions. Combined service coverage 99.56% lines/statements,100% functions,99.29% branches; defensive unexpected account-lock error rethrow uncovered, unit-only SQL coverage not claimed. Record 20261022-172755-jininggg-full-regression.md preserves limits and initial EPERM/ECONNREFUSED. Native disposable PostgreSQL restarted on55422 (session72216); no website started. Repository check initially hit read-only pre-commit cache; escalated retry in progress. Coverage inventory regenerated204/376. No commit/push/PR/Jira mutation or human acceptance.

Next: complete verification/hygiene outcome, peer review and SCRUM-203 UI; agree E10-S02 typed preview/apply contract with Le Xin, add remaining structured fields before whole-story completion. Xiang Ying owns refused-edit and terminal handling. Do not mark SCRUM-202 or SCRUM-70 Done from this bounded increment. #299 remains paused per user's instruction.

Verification completed: final14 focused tests and both typechecks pass. Explicit pre-commit checks on all new/changed implementation files pass (including secrets and API conventions). Full check.py hygiene/env passed but tooling158 retains3failures/11errors in Windows worktree fixtures; record20261022-173658. No baseline rerun or whole-repo-green claim. New draft records needed scope/BOM formatting corrections before validation; no observed outcomes altered. Test titles now spell each TC_ID in full for the generator. No commits or remote changes made.

## Historical notes: Frontend predecessor

Implement SCRUM-203, the E10-S01 frontend increment, stacked on local SCRUM-202 backend commit5470919. Build real form, comparison and Coordinator decisions; parent SCRUM-70 remains incomplete. No push/PR authorised by this implementation step.

Follow ADR-017 shared blocks and design.md. Xiang Ying owns refused-edit prefilling (SCRUM-205); this increment only supplies the real target page. Arrangement fields stay Approved/unapplied until E10-S02, not a fake successful apply. Add minimal private read Event metadata to the backend contract so terminal-state controls can be hidden. Backend branch remains at5470919; UI work is on feature/SCRUM-203-change-request-ui.

Implementation/verification in progress. No fresh human acceptance, production or email evidence claimed. SCRUM-204 remains open for whole-story manual evidence. #299 stays paused pending #298 per user instruction.

Built ChangeRequests.tsx/API module using shared blocks, real routes for organiser and Coordinator and existing query-link target; removed unreachable old mock export. Event pages link to requests/history. Form submits selected supported fields; Singapore date inputs; server refusals retain draft; GET/POST late replies cannot affect a different Event. Coordinator confirmation supports optional note, Cancel focus restoration and exact returned Applied/Approved-waiting/Declined wording. Focus/scroll feedback avoids earlier E11 offscreen acknowledgement issue. Terminal Events hide mutations.

Initial focused frontend10/11 pass: test incorrectly expected shared403 ErrorState to offer retry; corrected to test503 retry and added separate403 privacy test (no product weakening). Next12/12 focused pass; initial coverage100% lines,95.2% statements,97.56%functions,92.53%branches before focus/note follow-up. Backend11 realDB tests pass with read metadata; build/typechecks pass (existing chunk advisory). Full frontend run in progress; no final all-green claim yet. Prepared five-check human guide, unexecuted.

Final product checks: frontend453/453 across49 files; final focused15/15 after two test-only additions. New UI/API100% lines/functions,98.13%statements,95.77%branches; native-input/disabled-control defensive gaps disclosed. Backend11/11realDB verifies role permissions and metadata; frontend uses server permissions so Coordinator URLs cannot grant Organiser controls. Both types/build pass. check.py hygiene/env pass, Windows158tooling3failures11errors remain; no fresh baseline comparison. No visual browser/manual run claimed. Coverage inventory regenerated205/376. Immutable new full-regression record contains actual commands, initial failure and limits.

Next: explicit-file hygiene, human focused run when local runtime is prepared, peer code/test review. Backend local commit5470919 on SCRUM-202 branch; UI branch is stacked on it and must not be published as a duplicate all-backend main PR. No UI commit/push/PR/Jira mutation. Do not merge parent or declare E10-S01 Done; E10-S02/structured field scope and other owners' terminal/prefill work remain open. #299 remains paused.

## Structured-field continuation

User confirmed the three exploratory browser checks (submission, safe-name approval, purpose decline); observations only, no formal screenshots/session acceptance claim. Synthetic Event EVT-E10-MANUAL and two local accounts prepared in a fresh disposable database; API/frontend process59006. API does not hot-reload: restart that owned API against its same temporary environment before further human checks of newly added fields. Never print committed connection data or reuse a production config.

Audited current Event/Session schema and E09-S03. Added layoutId nullable UUID, accessibilityFeatureIds canonical set, strict registration/waitlist booleans, nullable ordered registration window and withdrawal deadline. Reference integrity checked at submit/approval; arrays/windows included in stale snapshots; GET catalogues provide human labels. UI selects/booleans/window controls preservefalse/null/empty semantics. All remain arrangement-affecting and cannot apply without E10-S02. Session writes need shared contract; capacity is derived by E09 rather than a guessed scalar. Draft coordination checklist in contract, not sent to anyone. Initial structured tests20backend (15realDB+5unit) and17frontend pass; final regression/coverage pending. No push or new local commit; keep both branches local as user directed.

Final structured verification:17 focused frontend pass; standalone457/457 frontend pass after initial451pass/6fail async-timing run in5unchanged files;423/423backend units;20/20focused backend on fresh native loopback63250 (15realDB+5units). Types/build/env/generator and explicit hygiene pass. Old PostgreSQL repeat failed58P01 global/2964; old native bundle also lacked postgres.bki. Restored the exact helper18.4.0-beta.17 in a new temporary prefix; fresh server74467 and e10-audit-test.env usable. Existing cluster/manual data untouched; inspect before reusing old e11-test.env. Record20261022-211022 retains failures and coverage gaps. No new manual run, commit or push. Before publication, separate backend follow-up changes onto the local202branch; the uncommitted203worktree currently includes both sides. Sandbox append of this note was denied; retried with explicit filesystem permission.

## Le Xin review5628492414 follow-up

Address4359725845 plain Event read for listing (mutations still lock),4359725851 canSubmit requiresCoordinator,4359725873 request-specific all-or-nothing confirmation. Proposal4359725866 documented with unpublished E10-S02 shared path and structured-field gaps, not guessed implementation. Record20261023-223641-jininggg-full-regression.md:22backend(17realDB),20frontend,both typespass; coverage backend99.65lines/UI99.25lines with existing defensive gaps. New UI fixture mistakes fixed, initial failures retained in record. Inventory211/376 unchanged; repo163tests3fail11error. No parent/subtaskDone or full integration claim. Push normal review follow-up.
