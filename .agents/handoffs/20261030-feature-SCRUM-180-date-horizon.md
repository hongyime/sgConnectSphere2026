# feature/SCRUM-180-date-horizon

Goal: implement E02-S07 / SCRUM-180 so Event request submission accepts any non-past date through the two-calendar-year Singapore-local boundary, rejects later dates with the offending field identified, and preserves the existing past-date rule. Do not perform manual tester steps or create manual run records/screenshots.

## Scope and current state

- Canonical story: `docs/backlog/release-1/E02-event-request-submission.md`; acceptance cases: `docs/testing/cases/E02.md`; decisions: C-71, C-72 and T-87.
- Jira SCRUM-180 is To Do and assigned to Xiang Ying. It has no Story point estimate. The assignment was selected from eligible users tied at zero open story points; the To Do status remains consistent with the repo's PR-based Jira workflow while this branch has no PR.
- The existing Event request create/update paths are in `backend/src/modules/eventLifecycle/service.ts` and `frontend/src/features/organiser/OrganiserRequestFlow.tsx`.
- Implemented Singapore-local two-calendar-year validation for submitted Event start/end dates, including the exact boundary and leap-day clamp. Draft saves keep farther dates, but draft submission rechecks them. No fixed minimum lead time was added.
- The Organiser form reports which Event date exceeds the boundary. Backend tests cover boundary/timezone/leap-year/near-term/draft cases; frontend tests cover both fields and malformed error fields. `docs/testing/tc-coverage.md` was regenerated.
- Repository search found no API that creates or edits Session date ranges. The database's single default Session inherits the validated Event range; E02-S07's multi-Session date acceptance cannot be exercised through an existing write path. Keep this limitation explicit and do not add E04 scope implicitly.
- SCRUM-180 stays open until all acceptance evidence, independent human review, and PO/delegate acceptance are recorded. No manual tester work is performed by the agent.

## Next steps

1. Implementation and refreshed coverage are committed as `f86576a` and pushed to `feature/SCRUM-180-date-horizon`. Post-commit run records are `20261030-071336-bryanseah234-backend-unit.md`, `20261030-071353-bryanseah234-frontend-vitest.md`, and `20261030-071454-bryanseah234-tooling.md`.
2. Jira SCRUM-180 is assigned to Xiang Ying and remains To Do; an implementation/verification comment records the branch, commit and remaining Session-path limitation.
3. No PR was opened because the authenticated author already has three open PRs. Preserve SCRUM-66's closed PR state and do not close unrelated PRs to free a slot.
4. Keep the story open: E02-S07's multi-Session date cases need an E04 Session write path, and the team still owns independent review and acceptance. No manual tester steps or screenshots were created.

## 31 October delivery follow-up (Xiang Ying)

- Preserved Bryan's implementation and merged main f0797f59 without conflicts.
- Real API/PostgreSQL regression reproduced a double response on refused draft
  submission. PATCH now uses respondWithResult for one structured response.
- Added Event-only API/persistence tests and wired them into existing CI.
- Session authoring remains absent; contract and human-test handoff are in
  docs/contracts/event-date-horizon.md. No manual evidence was fabricated.
- Jira SCRUM-180 is In Progress. Estimate #388 proposes 3 points pending review;
  leave Jira estimate unset until accepted. Prepare a partial implementation PR,
  with Session acceptance and independent human review explicitly outstanding.

- Latest main b884126f merged after the initial verification commit bf72964;
  regenerated tc-coverage.md to resolve its sole generated-file conflict.
  Fresh combined-tree units: 643 backend passes/1 database-only skip,
  749 frontend passes, both TypeScript checks passed.

- Implementation PR #389 is Ready for review at 0c5082ac, with the PostPlan
  linked in its top-level comment. Jira comment 10398 links delivery and
  remaining acceptance; status remains In Progress and estimate unset.
- Hosted doc guard exposed its broad Shared contracts mapping: any backend
  module requires venue-bookings.md even for Event-only validation. Use the
  documented Docs-Impact waiver: Event date contract/API/architecture/frontend
  docs are updated; this increment does not change venue-booking semantics.

## PR #389 merge-conflict follow-up — 31 October

Merged main 4e5b3f3e (estimate PR #388). Resolved the sole .gitignore conflict
by preserving both durable PostPlan exceptions. No application code changed.
The preceding Ponytail review of head 1ad7bb0 found no blocking Event-level
code issue and passed 43 lifecycle unit tests plus 17 request-form tests; its
new immutable record is included. Session integration and human acceptance
remain open. The estimate proposal is now merged; Jira was not edited here.
