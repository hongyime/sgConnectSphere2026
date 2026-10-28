# SCRUM-205 refused-edit frontend

Implement SCRUM-205 / E10-S01 Scenario 3 (TC_E10S01_03), reusing Ji Ning's
merged change-request form. SCRUM-70 is parent context only, never closed here.

## Implemented

Owning Organiser's readonly fields link to the specific selected field/current
value. A 409 with an explicit same-Event server changeRequestUrl offers a link
carrying only attempted restricted values into the form. Proposed data stays in
Event-scoped router state, outside URL/localStorage. No automatic submission.
Unknown fields, bad draft types, external/wrong-Event links are refused/ignored;
server permissions and terminal states remain authoritative. Coordinator forms
retain normal error behavior. Existing form's structured-field input formatter
is reused. No backend/schema/config/dependency change.

## Verification

Full frontend suite: 671 passed; focused slice:90 passed. New prefill helper:
100% statements, branches, functions and lines. Frontend typecheck/build pass.
Six desktop/mobile intercepted-API checks cover the refused PATCH, preselection,
review/send and existing date-field navigation. Screenshots are automated API
fixture output, never human manual evidence. Initial browser run had a strict
selector matching both the error recovery and readonly-field links; narrowed to
the refusal panel and rerun. See immutable T-65 records for final runs.

## Remaining

Independent human code/test review and canonical manual TC_E10S01_03 remain
open; parent SCRUM-70 and whole-story SCRUM-204 evidence are not completed by
this frontend increment. PostPlan HTML will be committed; hosting requires CLI
authentication that was missing during SCRUM-206. Keep original run records.
