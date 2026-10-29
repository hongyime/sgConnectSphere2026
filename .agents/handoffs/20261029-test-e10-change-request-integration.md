Continue E10-S01 / SCRUM-70 from main 901d69b6 after merged #365 and #363. Ji Ning authorized pulling main and continuing available work. Add real-browser/API/PostgreSQL evidence for the delivered foundation and refused-edit handoff; preserve E10-S02's arrangement-application dependency.

## Scope

Isolated branch test/e10-change-request-integration. Root checkout has four unrelated staged historical review/evidence files; leave them untouched. E10-S02 shared preview/apply functions are not in main. Do not invent signatures, apply arrangement changes directly, or count Approved/unapplied as Scenario 4 complete. Existing Done subtasks stay Done; parent and acceptance remain open.

## Work in progress

Use the existing authenticated Playwright configuration and disposable native loopback PostgreSQL helper. New tests must use real sessions/API responses, not route fixtures. Verify current-value prefilling, refusal after concurrent approval, explicit submission, persisted comparison, safe approval/decline, and intentional arrangement waiting. No human manual PASS or provider receipt is claimed from automated runs.

## Remaining

E10-S02 integration, actual combined human TC_E10S01_01-07 and PO/delegate acceptance remain outstanding. Independent review of this increment is required. Keep PR within repository limits; no automatic story-closing branch key.

## Verified results

Six new real-stack cases ran on desktop/mobile: 12 passed. Covers readonly current-value prefill, actual refused PATCH with proposed-value navigation and explicit submission, persisted Pending snapshot, safe apply/publication and decline, intentional arrangement guard, and actual terminal API-to-Obsolete UI/history. No response interception, human/manual or provider delivery claim. Initial stopped database and duplicate synthetic organisation-name failures are preserved in the new frontend-e2e record; fixture uniqueness fixed. Backend focused regressions: 32 passed. Both typechecks passed. Records: 20261029-193704-jininggg-frontend-e2e.md and 20261029-193704-jininggg-full-regression.md. Testcase version 281026. Inventory regenerated.

Existing auth Playwright CI step auto-selects the new file, so no CI configuration change is needed. Manual guide updated for merged prefill and terminal workflows. No E10-S02 function wired, no fake application or new signature introduced. Repository checks and record validation passed. Commit/publication state is recorded below; parent acceptance remains pending.

## Delivery

All available work is a bounded test/evidence increment, not arrangement application. Repository hygiene/tooling passed; all newly cited runs have immutable T-65 records. Keep this intentional integration worktree for review. No production, Jira or teammate-message changes. Do not silently repeat human tests already evidenced.
