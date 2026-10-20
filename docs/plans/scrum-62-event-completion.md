# SCRUM-62 / E08-S05 — Complete an event

Implementation is ready for acceptance verification, not a Done declaration.
Canonical scope remains `docs/backlog/release-1/E08-readiness-confirmation.md`
and `docs/testing/cases/E08.md`. T-26/T-48 use the event's own stored range.

## Traceability

| Requirement | Behavior | Evidence |
| --- | --- | --- |
| Scenario 1; TC_E08S05_01 | Existing daily maintenance evaluates Confirmed events whose end <= server time; internal evaluator supports authorized on-demand evaluation | completion.integration.test.ts exact-end test; authenticated completion browser suite |
| Scenario 2; TC_E08S05_02 | Assigned active/unlocked Coordinator can complete Confirmed once start <= server time; real server clock, not browser body | completion.test.ts boundaries; integration persistence/role tests; EventCompletion component and real-stack browser tests |
| Scenario 3; TC_E08S05_03 | Before start: disabled UI with explanation; server returns 409 even with a forged future clock field | rule/integration boundaries; browser assertion |
| Scenario 4; TC_E08S05_04 | Cancelled never selected; locked status rechecked so concurrent cancellation remains Cancelled | real-DB cancellation race, excluded-status tests; browser evaluator |
| Activity log; TC_E08S05_05 | Manual Coordinator or automatic System, Confirmed → Completed, durable timestamp; visible live Coordinator Activity log | real PostgreSQL audit and actor assertions; ActivityLog component test; browser desktop capture |
| Boundary; TC_E08S05_06 | One millisecond before end remains Confirmed; exactly at end completes when evaluated | injected-clock unit and real-DB tests; not a human clock-change claim |
| T-88 / C-77 | Only Pending change requests become Obsolete with history, atomically with completion/outbox | real-DB manual/auto tests, non-Pending preservation and synthetic outbox rollback |
| Permissions/replay | Non-owner, wrong role, stale inactive/locked accounts refused; concurrent manual/auto yields one audit; repeated completion no duplicate notice | unit auth checks, database account-lock/race/replay, authenticated browser |

## Delivery and scheduling

- Live route `/coordinator/events/:eventCode/complete`, linked from Confirmed and
  Completed event detail. Shared skeleton, confirmation/back-out, busy/loading,
  retry/refusal and stale-response handling.
- API and locks in `docs/contracts/event-completion.md`. Reuses existing event
  API and existing maintenance cron function; no new function or schedule.
- Existing hold-expiry maintenance runs daily at 23:50 UTC / 07:50 Singapore.
  Completion is eventual at evaluation, not a real-time end timer. Authorized
  operators may invoke its completion task independently. Production checks
  require the existing CRON_SECRET; never expose it through the frontend.
- Migration 0022 from #319 is merged into main; deployment application still
  requires authorized-owner verification. No additional migration in this PR.
- E10-S04 (#320) remains a separate unmerged implementation. Both touch the
  lifecycle helper; combined current-main checks/review still apply before merge.
- E09-S06 attendance and the broader E10-S01 management UI are separate stories.

## Verification evidence

Local synthetic PostgreSQL; no production writes. Earlier runs used actual HEAD
39b3b79 plus uncommitted story changes; the immutable records disclose this.
Main was subsequently integrated at 71761cd; source files remain isolated from
other worktrees. Final checks below/PR distinguish later verification.

| Run | Result | Immutable record |
| --- | --- | --- |
| Backend units | 418 passed | [record](../testing/runs/20261020-004259-xiangyingg-backend-unit.md) |
| Completion units + real DB | 8 passed, no skips; completion service/rules 100% combined coverage | [record](../testing/runs/20261019-235309-xiangyingg-backend-db.md) |
| Shared lifecycle/audit/readiness real DB | 25 passed, no skips | [record](../testing/runs/20261020-004615-xiangyingg-backend-db.md) |
| Frontend suite | 444 passed on current-main integration | [record](../testing/runs/20261020-225435-xiangyingg-frontend-vitest.md) |
| Completion component | 7 passed; 100% statements, branches, functions and lines | [record](../testing/runs/20261019-235310-xiangyingg-frontend-vitest.md) |
| Authenticated desktop/393px browser | 1 passed after correcting a raw-versus-formatted activity label assertion | [record](../testing/runs/20261020-004346-xiangyingg-frontend-e2e.md) |
| Compiled runtime | 20 passed after moving auth ahead of pool construction | [record](../testing/runs/20261020-004519-xiangyingg-runtime.md) |

The earlier browser and runtime FAIL records remain alongside the successful
reruns; they are not rewritten. Production build and typecheck also passed.
Automated review captures live in `artifacts/e08-completion-automated-*.png` and
are explicitly not T-93 manual screenshots.

### Changed-code coverage explanation

`completionRules.ts` is 100% unit-covered. `EventCompletion.tsx` is 100%
component-unit-covered. `completion.ts` is 100% statements/branches/functions/
lines in the combined unit + real-PostgreSQL run. SQL lock/transaction/outbox
orchestration is deliberately proved with real database tests, rather than
claiming a stub proves persistence or rollback. The small API/cron dispatch and
shared lifecycle adaptation are also exercised by compiled runtime, shared DB
and authenticated browser tests. This is an explicit exception to a claim of
100% unit-only SQL/HTTP orchestration coverage, not a waived behavior check.

## Human acceptance and release gates

Use [the human guide](../testing/manual/E08-S05-click-through.md), take original
screenshots and create a new T-65 record; none is prefilled PASS. The canonical
TC05 example asks for System Administrator. This branch uses the existing live
assigned-Coordinator Activity log; the administrator screen is still a mock.
Record that role substitution and obtain reviewer acceptance; do not claim the
admin page was tested or silently change the canonical case.

Before Done: human acceptance evidence, independent current-head code/test
review, required CI, authorized migration-0022 application verification and
reviewed merge into main. Jira stays In Progress while these gates remain.

## Final current-main verification

- [Completion database rerun](../testing/runs/20261020-225623-xiangyingg-backend-db.md): 8/8 and 100% focused combined coverage.
- [Current-stack browser run](../testing/runs/20261020-225844-xiangyingg-frontend-e2e.md): 1/1 including the actual scheduled-maintenance task and protected standalone retry.
- A setup-only ECONNREFUSED run is retained in `20261020-225428-xiangyingg-backend-db.md`; Docker was stopped between sessions and restarted without resetting data.
