# feature/SCRUM-86-coordinator-activity-log

Goal: finish E14-S02 Record significant actions in an activity log (Jira
SCRUM-86, owner Le Xin): let an Event Coordinator read the Activity log of an
event they may view (T-75), keep access-denial entries out of that log, label
and add the automated tests for TC_E14S02_01/_02/_04/_08, and record the manual
runs needed for the Definition of Done.

## Done so far

- Earlier PRs: #88 (status-change and access-denial logging), #190 (log entries
  immutable, TC_E14S02_05). Deactivation already writes `Account Deactivated`
  (`backend/src/modules/accessControl/deactivation.ts`).
- This branch, docs commit: acted on the two open review notes from #192.
  - Aaron's post-merge review: added "access-denial entries are not shown in
    that log" to Scenario 1 and the checklist (both backlog views), plus
    `TC_E14S02_08` in `docs/testing/cases/E14.md` and a `test.fixme` scaffold
    in `tests/e2e/e14.spec.ts`. Story is not Done, so updated in place (T-74).
  - Le Xin's own review: `technical_support` -> `technical_support_staff` in TC_E14S02_05.
  - Regenerated `CONNECTSPHERE BACKLOGS CAA 081026.xlsx`,
    `PROJECT TEST CASES CAA 081026.xlsx` (315 cases), the legacy
    `PROJECT TEST CASES.xlsx` audit input and `tc-coverage.md`; pointed
    `docs/source-of-truth.md` at the 081026 exports.

## Decisions for the reviewer to check

- The new rule and TC_E14S02_08 add to the story's criteria; Product Owner
  (@bryanseah234) sign-off is needed on the PR.
- TC_E14S02_08 names seeded accounts (coord_b, organiser_a, EVT-2003) rather
  than placeholders, in line with #230.

## Done on this branch

- `832cc53` docs: denial rule, TC_E14S02_08, role typo, regenerated exports.
- `1291346` backend: `listEventActivity()` shared by the Organiser and the
  assigned Coordinator reads; `activityLog` on `GET /api/events?assigned=1&id=`.
  `backend/tests/activityLog.integration.test.ts` (TC_E14S02_01/_02/_04/_08) in `test:db`.
- `c2ba65a` frontend: read-only `ActivityLog` card (Card + DataTable) on
  `/coordinator/events/:eventCode`; `ActivityLog.test.tsx`.
- Evidence on `c2ba65a` in `docs/testing/runs/20261008-*-lexinphun2024-debug-*.md`:
  backend unit 313/313, activity-log DB tests 8/8, Vitest 331/331, and the
  manual run of TC_E14S02_01/_02/_04/_05/_08, all PASS. Desktop and 393px
  screenshots taken by Le Xin for the PR.
- `8ac817e` fix: coordinator assignment/reassignment entries showed account
  UUIDs; `listEventActivity()` now resolves them to names (Organiser view too).
  Automated runs re-recorded on `8ac817e` (unit 313/313, DB 9/9, Vitest 331/331).
  The manual run stays on `c2ba65a`: the fix only changes coordinator-assignment
  rows, which that run did not exercise.
- `b6e6a24` design.md fixes: status changes as StatusPills (section 7),
  "Status changed" / "Details edited" wording (section 8.1). Vitest 333/333
  re-recorded; no horizontal overflow at 393px and 320px. Desktop and phone
  screenshots retaken for the PR. Not done here (section 12): the shared
  `coordinator.css` drift (7 hex codes, 22 font sizes) belongs to a separate clean-up.
- AC audit: every status change path writes an audit row (applyEventStatusChange,
  auto-assignment, submit); role refusals in the newer equipment/support/venue
  modules are logged; unlogged 403s are origin (CSRF) checks. ADR-009 already
  describes T-75, so no architecture doc change.

## Notes for the reviewer

- `eventVisibility.integration.test.ts` fails on `main` too (it applies only
  migrations 0001-0004, so `venue_requirements` is missing); unrelated.
- Running the local API with the whole `.env` sends `eventVisibility/runtime.ts`
  queries to `DATABASE_POOLER_URL` (shared Supabase). During this run a
  couple of sessions and Access Denied rows for organiser_a on EVT-2003 likely
  reached Supabase before the API was restarted with only `DATABASE_URL`.
- Found, not fixed here: the Organiser edit form has no registration setup
  field, so a seeded request missing it cannot be completed through the UI;
  its "Opens" label renders outside the registration dates fieldset.

## Next step

1. Push, open the PR (four template sections, `Closes SCRUM-86`), attach the
   two screenshots, request review from someone other than Le Xin.
2. Tell @bryanseah234 about the added rule and TC_E14S02_08 (Aaron's #192 review).
3. Raise Aaron's optional re-estimate at Sprint 3 planning.
