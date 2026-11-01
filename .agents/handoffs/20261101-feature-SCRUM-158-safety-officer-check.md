# SCRUM-158 / E08-S06 Safety Officer check

Implement the Operational Safety Check for Safety Officers, including the review queue/detail data, structured seven-factor decision validation, approve/request-changes/reject outcomes, audit logging, notifications, and automated coverage up to (but not including) manual acceptance.

## Done so far

- Branch is based on the pushed SCRUM-155 lead-oversight branch.
- Existing code provides the Safety Review status, Safety Officer queue list, readiness gate, and role protection; the approval path is intentionally still a placeholder.

## Next step

Write failing unit tests for the decision contract and queue/detail query shape, then implement the smallest schema/service/API/frontend changes needed by E08-S06.

## Constraints

- Use TDD and repository conventions.
- Do not perform manual acceptance testing or add manual-run evidence.
- Run repository checks and doc guard before commit; push this branch without opening a PR.
- Do not edit `.agents/STATE.md` or `.agents/JOURNAL.md`.

## Decisions to verify

- Use a dedicated safety-review decision record to retain the checklist immutably rather than overloading the event status reason.
- Flag affected arrangement rows for re-review only for factors that identify a venue/equipment/support concern; no automatic cancellation or destructive arrangement changes.
