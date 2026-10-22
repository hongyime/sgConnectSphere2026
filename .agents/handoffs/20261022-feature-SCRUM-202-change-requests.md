Implement SCRUM-202, the E10-S01 backend increment: submit/read/decide/apply change requests with transactional audit and notifications. Parent SCRUM-70 remains open; SCRUM-203/204 and Xiang Ying's SCRUM-205/206 are separate.

## Boundaries

20 October SCRUM-70 agreement authorises title, description and purpose as safe fields. Arrangement changes must remain approved/unapplied until a reviewed E10-S02 implementation is integrated; no configurable bypass or fake successful apply. Cancellation requests use action=cancel and must remain excluded. Snapshot changed fields for stale checks; serialize decisions/application on the Event lock. No production changes, mail send or human acceptance claimed.

## Progress

Fresh branch from origin/main; implementation and verification in progress. Historical E11 branch preserved. Read repository workflow, DoD, source-of-truth and native database restrictions. Branch creation required filesystem escalation; no protection bypass.

Implemented requests.ts and GET/POST dispatch in existing api/events.ts. Stored JSON shape {fields,before}; safe title/description/purpose apply, existing public name follows title only, approved arrangement changes remain unapplied. Event -> request locks, NOWAIT shared actor lock, stale/terminal/account/owner checks, targeted outbox/audits and separate denial audits. Cancellation action excluded. Contract documents supported field subset and future Session/layout/registration/E10-S02 boundaries.

Final focused 14 tests pass (3 unit/unauthenticated-handler, 11 real DB), both typechecks pass; earlier full backend 420 pass predates final small additions. Combined service coverage 99.56% lines/statements,100% functions,99.29% branches; defensive unexpected account-lock error rethrow uncovered, unit-only SQL coverage not claimed. Record 20261022-172755-jininggg-full-regression.md preserves limits and initial EPERM/ECONNREFUSED. Native disposable PostgreSQL restarted on55422 (session72216); no website started. Repository check initially hit read-only pre-commit cache; escalated retry in progress. Coverage inventory regenerated204/376. No commit/push/PR/Jira mutation or human acceptance.

Next: complete verification/hygiene outcome, peer review and SCRUM-203 UI; agree E10-S02 typed preview/apply contract with Le Xin, add remaining structured fields before whole-story completion. Xiang Ying owns refused-edit and terminal handling. Do not mark SCRUM-202 or SCRUM-70 Done from this bounded increment. #299 remains paused per user's instruction.

Verification completed: final14 focused tests and both typechecks pass. Explicit pre-commit checks on all new/changed implementation files pass (including secrets and API conventions). Full check.py hygiene/env passed but tooling158 retains3failures/11errors in Windows worktree fixtures; record20261022-173658. No baseline rerun or whole-repo-green claim. New draft records needed scope/BOM formatting corrections before validation; no observed outcomes altered. Test titles now spell each TC_ID in full for the generator. No commits or remote changes made.
