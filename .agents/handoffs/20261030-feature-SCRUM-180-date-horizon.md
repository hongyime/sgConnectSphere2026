# feature/SCRUM-180-date-horizon

Goal: implement E02-S07 / SCRUM-180 so Event request submission accepts any non-past date through the two-calendar-year Singapore-local boundary, rejects later dates with the offending field identified, and preserves the existing past-date rule. Do not perform manual tester steps or create manual run records/screenshots.

## Scope and current state

- Canonical story: `docs/backlog/release-1/E02-event-request-submission.md`; acceptance cases: `docs/testing/cases/E02.md`; decisions: C-71, C-72 and T-87.
- Jira SCRUM-180 is To Do and assigned to Xiang Ying. It has no Story point estimate. The assignment was selected from eligible users tied at zero open story points.
- The existing Event request create/update paths are in `backend/src/modules/eventLifecycle/service.ts` and `frontend/src/features/organiser/OrganiserRequestFlow.tsx`.
- Repository search found no API that creates or edits Session date ranges. E02-S07's Session-date acceptance case cannot be exercised through an existing Session write path; keep that limitation explicit and do not add E04 scope implicitly.
- SCRUM-180 stays open until all acceptance evidence, independent human review, and PO/delegate acceptance are recorded. No manual tester work is performed by the agent.

## Next steps

1. Implement Singapore-local calendar-date horizon validation for Event start and end dates on submission, preserving draft saves and existing past/range checks.
2. Surface the rejected Event field and maximum date in the Organiser form.
3. Add boundary and error tests, keep changed code at 100% unit coverage, regenerate `docs/testing/tc-coverage.md` if test inventory changes, record only evidence runs actually used, run `python scripts/check.py`, and commit regularly.
4. Do not open another PR while the authenticated author already has three open PRs; preserve SCRUM-66's closed PR state and do not close unrelated PRs to free a slot.
