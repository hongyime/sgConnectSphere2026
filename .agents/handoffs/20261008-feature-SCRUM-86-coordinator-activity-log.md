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

## Not done / next step

1. Backend: return the Activity log to a Coordinator permitted to view the event
   (today only `eventVisibility.getEvent` builds it, behind `requireOrganiser`).
   Keep the `a.action <> 'Access Denied'` filter.
2. Frontend: show the read-only Activity log on the Coordinator event page.
3. Unit and integration tests labelled TC_E14S02_01/_02/_04/_08; 100% coverage of changed code.
4. Manual runs of TC_E14S02_01/_02/_04/_05/_08 with actual results in Remarks (T-65).
   Seed substitutions: coordinator_1 -> coord_b + EVT-2003; EVT-B01 -> EVT-2003; reseed after _04.
5. Raise Aaron's optional re-estimate of the remaining E14-S02 work at Sprint 3 planning.
