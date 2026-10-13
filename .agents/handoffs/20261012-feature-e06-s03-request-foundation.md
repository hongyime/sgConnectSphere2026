# E06-S03 request foundation

Implement the unblocked E06-S03 / SCRUM-47 read and preparation foundation without racing the shared buffer/hold migration or exposing a premature booking write endpoint.

## Done

Branch feature/e06-s03-request-foundation starts at main 01ad35b (#242 merged).
Added assigned-event booking list service/GET handler, shared-layout live list and search navigation, reusable preparation validator and unmounted controlled form. No schema changes or writes. See docs/testing/venue-booking-requests.md for module scope and dependencies. Tests and generated coverage inventory updated.

## Resume / blockers

Do not expose submission yet. #231 buffered occupancy and the agreed subsequent 0014 fields/exclusion must be integrated first. #245 owns holds; holds-only 0013 merged in #246. Shared direct submission/hold conversion needs locks, expiry/repeat races, atomic Approved-to-Planning, audit/outbox and responsible-staff recipients. E06-S04 owns staff decisions/primary selection. Revalidate current PR state on resume.

Jira SCRUM-47 was incorrectly marked Done after docs-only #244. Per the team decision clarified by the user, restored In Progress on 12 October; comment 10254 supersedes 10253. Continue under the existing story/subtasks; no duplicate implementation story. Old TC_E06S03_03 conflicts with multiple-booking PO rules; contract has Draft labels and incorrectly attributes merged 0013 to #245. No contract edits made; the Jira status correction is recorded above.

## Verification

Evidence: docs/testing/runs/20261012-203121-jininggg-full-regression.md and 20261012-203121-jininggg-backend-db.md. Backend unit suite passed; 38 focused backend tests; 10 frontend tests; 18 mocked desktop/mobile browser tests; two real local PostgreSQL tests; 15 runtime checks; typecheck/build and repository checks (87 tooling tests) passed. New service/handler and API/screen/form unit coverage 100%. No human manual run or real submission evidence. Existing application route/dispatch wiring not claimed at 100% coverage.

## Learnings

Keep E06-S03 preparation separate from committing authorization: future callers must lock/revalidate inside the final transaction. Status read is safe to deliver before shared migration; it does not justify marking the whole story Done. On 13 October the user authorized committing and pushing this foundation. Keep the branch/title free of the SCRUM key and avoid closing clauses for this partial slice; reference SCRUM-47 in the commit body. No PR creation or merge requested.

## PR 256 conflict resolution - 13 October

Merged main c9de13f (Week 9 decisions/catalogue). Only docs/testing/tc-coverage.md conflicted: regenerated from merged catalogue and branch tests, retaining both. No application or migration conflicts. PR #256 exists as a draft; user requested conflict resolution. Application code unchanged by this merge.
