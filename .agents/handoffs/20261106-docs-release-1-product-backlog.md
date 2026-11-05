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

## Current work

- Added a source-located requirements register, course backlog checklist and
  requirement-to-story-to-test traceability matrix.
- Corrected the current E03 Lead criteria and E11 routing wording to the later
  customer clarifications; the implementation remains an issue for its owners.
- Jira writes are pending a dry-run plan and live transition inspection. Never
  invent an unsupported estimate, sprint commitment, assignee or acceptance.

## Next steps

- Open the early PR after the initial documentation commit.
- Apply the justified Jira fix-version, parent, type, title/description and
  status corrections; retain unsupported planning gaps as `[CONFIRM]`.
- Export final Jira CSV, generate/validate the PDF, update this handoff and push
  the same PR.
