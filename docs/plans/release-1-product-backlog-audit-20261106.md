# Release 1 Product Backlog audit — 6 November 2026

## Scope and evidence

- Customer requirements are indexed in
  [`H-release-1-requirements-register-20261106.md`](../bdr/H-release-1-requirements-register-20261106.md).
- Course backlog expectations are checked in
  [`release-1-backlog-rubric-checklist-20261106.md`](release-1-backlog-rubric-checklist-20261106.md).
- Current canonical Markdown selected 64 Release 1 stories; this audit adds
  E06-S07 as a source-required follow-up because E06-S05 is already Done and
  must not be reopened.
- The pre-change Jira snapshot has 258 project issues and 53 fields. Jira marks
  Release 1 with Fix Version `Release 1`; only 47 of the original 64 selected
  stories carried that marker.

## Jira structural audit

| Check | Observed before correction | Resolution |
| --- | --- | --- |
| Requirement to story | All 64 original Release 1 story IDs already had Jira issues. | Add E06-S07 as a new Story; do not create duplicate issues. |
| Release scope | 17 existing selected stories lacked Fix Version `Release 1`. | Add the existing version to those 17 stories. |
| Story type | E02-S05 and E03-S08/S09/S10 are Bugs although each is a product user story. | Change them to Jira Story. |
| Epic parent | E02-S05 and E03-S08/S09/S10/S11 have no parent. | Link them to E02 (`SCRUM-3`) or E03 (`SCRUM-4`). |
| Priority and assignee | Present on all 64 existing Release 1 stories. | Preserve them. |
| Points | E02-S05 has a source-recorded 3 points but Jira is blank. Six other historical/current stories are blank in Jira and no source-backed estimate exists. | Set E02-S05 to 3; retain unsupported estimates as `[CONFIRM]`. |
| Sprint | E02-S05 has neither source-backed Sprint nor Jira Sprint. | Do not backdate a Sprint commitment; `[CONFIRM]` for refinement. |
| Story/AC format | Five newly scoped issues have incomplete/non-canonical Jira descriptions. | Sync their title and source-backed user story/AC description. |

## Status reconciliation rule

The repository Definition of Done is stricter than a merged PR. A story requires
acceptance criteria, recorded evidence, independent human review, a merge and
Product Owner/delegate acceptance before a new Done transition. Existing Done
history is never reopened. Repository evidence supports moving E04-S02,
E08-S04 and E10-S02 to **In Review** if Jira's live workflow offers that
transition; it does not support marking them Done. E03-S08/S09/S10 remain To Do
because their Lead-only flow is not implemented.

## [CONFIRM]

- Team refinement must estimate E03-S08/S09/S10/S11/S12 and E14-S03; their
  existing Jira records have no defensible point value.
- Team refinement must select a Sprint and accountable assignee for E02-S05 and
  the new E06-S07; neither is supported by a source-backed commitment.
- C-111 and C-119 conflict on whether a venue block may be open-ended.
- E06-S07 needs test cases and implementation by the venue-booking owners.
- E03-S08/S09/S10 need implementation and updated executable/manual tests by
  their owners; this documentation does not claim them delivered.
