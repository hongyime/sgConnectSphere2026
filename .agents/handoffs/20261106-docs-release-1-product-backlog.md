# Release 1 product-backlog handoff

Audit and reconcile the Release 1 Product Backlog against the original customer sources, course backlog method, current Jira and current `main`; stage the required Jira CSV and generated PDF in the external submission folder.

## Baseline

- Branch starts from `origin/main` `0773a721` in an isolated worktree; the user
  checkout's uncommitted files were not touched.
- The pre-change Jira snapshot is external-only and contains 258 project issues
  and 53 available fields. Its observed Release 1 marker is Fix Version
  `Release 1`.
- The original Release 1 Markdown had 64 stories. All had Jira issues, but 17
  existing stories lacked the Release 1 fix version. The audit adds E06-S07 as
  a new source-required follow-up without reopening historical E06-S05.

## Completed work

- Added a source-located requirements register, course backlog checklist and
  requirement-to-story-to-test traceability matrix.
- Corrected the current E03 Lead criteria. E06-S07 carries the later
  configurable pre-expiry warning; E11-S01 retains its completed T-92
  expiry-only routing acceptance criterion.
- Ran and applied a 21-operation Jira plan: fixed the 17 missing Release 1
  versions; made E02-S05 and E03-S08/S09/S10 Stories; added their required
  parents/descriptions; set E02-S05 to its source-recorded 3 points; created
  E06-S07 as `SCRUM-260`; and moved E04-S02, E08-S04 and E10-S02 to In Review.
  A subsequent one-field Jira update synchronized the corrected E06-S07 user
  story wording.
- The final Jira export has 259 issues and 53 fields. It has 65 Release 1
  Stories, no missing canonical mapping or Release 1 marker, and no Release 1
  Bugs. Seven point estimates and six Sprint assignments remain `[CONFIRM]`.
- Generated and visually checked the 48-page external PDF plus the full final
  Jira CSV, retained the pre-change CSV backup, and exported the current
  backlog workbook to the external submission folder. The unresolved-items
  checklist is `_CONFIRM-product-backlog.md` there.

## Remaining steps

- Commit the final audit/format correction, run repository checks, push the
  same early PR #442, update its body and inspect its live checks. Do not alter
  the unrelated open audit PR #436 or the user checkout's uncommitted files.
