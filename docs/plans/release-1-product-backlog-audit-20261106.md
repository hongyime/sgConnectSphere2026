# Release 1 Product Backlog audit — 6 November 2026

## Scope and evidence

- Customer requirements are indexed in
  [`H-release-1-requirements-register-20261106.md`](../bdr/H-release-1-requirements-register-20261106.md).
- Course backlog expectations are checked in
  [`release-1-backlog-rubric-checklist-20261106.md`](release-1-backlog-rubric-checklist-20261106.md).
- Current canonical Markdown selects 65 Release 1 stories; this audit added
  E06-S07 as a source-required follow-up because E06-S05 is already Done and
  must not be reopened.
- The pre-change Jira snapshot has 258 project issues and 53 fields. Jira marks
  Release 1 with Fix Version `Release 1`; only 47 of the original 64 selected
  stories carried that marker.
- The final Jira snapshot has 259 project issues and 53 fields. It has 65
  Release 1 Stories: 55 Done, 3 In Review, 2 In Progress and 5 To Do.

## Jira structural audit

| Check | Observed before correction | Resolution |
| --- | --- | --- |
| Requirement to story | All 64 original Release 1 story IDs already had Jira issues. | Created E06-S07 (`SCRUM-260`) as the one source-required follow-up; no duplicate issue was created. |
| Release scope | 17 existing selected stories lacked Fix Version `Release 1`. | Added the existing version to all 17. The final scope is 65 Jira Stories. |
| Story type | E02-S05 and E03-S08/S09/S10 were Bugs although each is a product user story. | Changed all four to Jira Story. The final Release 1 set contains 65 Stories and no Bugs. |
| Epic parent | E02-S05 and E03-S08/S09/S10/S11 had no parent. | Linked them to E02 (`SCRUM-3`) or E03 (`SCRUM-4`). Every final Release 1 Story has an epic parent. |
| Priority and assignee | Present on all 64 existing Release 1 stories. | Preserved them; the follow-up was assigned to the same accountable owner as E06-S05 and given High priority. Every final Release 1 Story has both fields. |
| Points | E02-S05 had a source-recorded 3 points but Jira was blank. Six other historical/current stories were blank in Jira and no source-backed estimate existed. | Set E02-S05 to 3. Seven final Stories were left unestimated at first; on 6 Nov the Product Owner set them, and E01-S12, E01-S13, E07-S08, E07-S09 and E08-S06 took their Jira values; see `[CONFIRM]`. |
| Sprint | E02-S05 had neither source-backed Sprint nor Jira Sprint. | Did not backdate a Sprint commitment at first. On 6 Nov the Product Owner backfilled Sprint 5 for E02-S05 from the earlier Done issue SCRUM-30; see `[CONFIRM]`. |
| Story/AC format | Five newly scoped issues had incomplete/non-canonical Jira descriptions. | Synchronized their title and source-backed user story/acceptance criteria, and synchronized E06-S07 after its taught user-story format correction. |

## Status reconciliation rule

The repository Definition of Done is stricter than a merged PR. A story requires
acceptance criteria, recorded evidence, independent human review, a merge and
Product Owner/delegate acceptance before a new Done transition. Existing Done
history is never reopened. Repository evidence supported and Jira allowed the
transitions of E04-S02, E08-S04 and E10-S02 to **In Review**. It did not
support marking them Done. E03-S08/S09/S10 remain To Do because their Lead-only
flow is not implemented.

## [CONFIRM]

- Estimates for E03-S08/S09/S10/S11/S12, E06-S07 and E14-S03 were completed and confirmed by the Product Owner on 6 Nov 2026 (22 points restored; total Release 1 scope reconciled to 65 stories and 252 points).
- Sprint 5 was backfilled from Jira for E02-S05 (SCRUM-30), E02-S07, E04-S02,
  E07-S08 and E07-S09. Jira has E03-S11, E03-S12 and E14-S03 in Sprint 3.
  Jira does not confirm the Markdown's Sprint 3 for E01-S12 (SCRUM-156 is in
  Sprint 5), E01-S13 (SCRUM-157 has no Sprint) or E03-S08/S09/S10 (the
  Release 1 issues SCRUM-256 to 258 have no Sprint; the earlier SCRUM-153 to
  155 are in Sprint 5). E06-S07 has no Sprint.
- E03-S08 is estimated at 5 here, but its earlier Jira issue SCRUM-153 has 8;
  the Product Owner should confirm which value Release 1 uses.
- The E06-S07 assignee was inherited from E06-S05 as a practical ownership
  assumption, not a customer requirement; the Product Owner should confirm it.
- C-111 and C-119 conflict on whether a venue block may be open-ended; confirmed resolved by the Product Owner citing Team Decision T-80 (the application, API and schema support both bounded and open-ended maintenance blocks until lifted; no code changes required).
- E06-S07 needs test cases and implementation by the venue-booking owners.
- E03-S08/S09/S10 need implementation and updated executable/manual tests by
  their owners; this documentation does not claim them delivered.
