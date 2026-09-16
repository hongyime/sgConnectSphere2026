# Source of truth and derivative documentation

This guide tells human contributors and AI agents how to treat ConnectSphere
product documents, Markdown summaries, Figma boards, Jira issues, and future code.

## Current primary source files

The four files below are the current primary product sources. The dated
filenames follow the copy-forward convention described in the next section.
When a new dated copy is added, update this table in the same commit so the
authoritative filenames never drift out of sync with what is on disk.

| Domain | Current authoritative source | Generated export |
| --- | --- | --- |
| Product backlog | `docs/backlog/` (Markdown, per-epic under `release-1/` and `product/`) | `docs/CONNECTSPHERE BACKLOGS CAA 160926.xlsx` |
| Backlog decision review | `docs/BACKLOG DECISION REVIEW CAA 160926.docx` | — |
| Architecture decision records | `docs/ARCHITECTURE DECISION RECORDS CAA 160926.docx` | — |
| Project test cases | `docs/testing/cases/` (Markdown, per-epic) | `docs/testing/PROJECT TEST CASES CAA 160926.xlsx` |

The workbook exports under `docs/CONNECTSPHERE BACKLOGS CAA <DDMMYYYY>.xlsx` and
`docs/testing/PROJECT TEST CASES CAA <DDMMYYYY>.xlsx` are regenerated from the
Markdown by running `python scripts/export_backlog_xlsx.py` and
`python scripts/export_testcases_xlsx.py`. Do not edit the workbooks directly;
changes there will be lost the next time the export runs. Older CAA-dated
workbook copies remain on disk as history.

The two decision documents (`CAA 160926.docx` above) are updated per the
copy-forward convention alongside the ADR-015 refresh (see the ADR document
for context). Older dated copies remain on disk as history.

## Copy-forward convention for CAA-dated files

The `CAA DDMMYYYY` suffix is not decorative. It records the day a source file
was last edited, and lets multiple dated copies coexist in the repository so
that history is preserved and reviewers can compare versions.

The rules:

1. **Do not overwrite an older dated copy.** When you need to edit any
   `CAA DDMMYYYY` file, first copy it to a new filename with today's date, then
   edit the copy. The original file stays untouched.
2. **Same-day edits happen in place.** If a file with today's date already
   exists (someone else on the team edited earlier today), edit that file
   directly. Do not create `CAA DDMMYYYY (2).xlsx` or similar suffixed forks;
   note your change in the PR body instead.
3. **Latest date on disk is authoritative.** Downstream readers, humans and
   agents alike, should treat the file with the newest `CAA DDMMYYYY` date as
   the current authority for its domain. Older copies are history only.
4. **Update this document in the same commit.** The PR that introduces a new
   dated copy must also update the "Current primary source files" table above
   so references stay in sync. CI does not enforce this; reviewers should.
5. **Merge PRs against binary source files sequentially.** This rule
   applies only to files that are still binary: the two `CAA DDMMYYYY.docx`
   decision documents and the `docs/testing/PROJECT TEST CASES.xlsx`
   workbook. `.docx` and `.xlsx` cannot be 3-way merged. If two PRs edit
   the same binary source file, land the first one, rebase the second,
   then merge the second. The Markdown backlog under `docs/backlog/`
   merges normally with git 3-way merge and is exempt from this rule.

## Authority order

1. Primary product sources (see table above). The Markdown backlog under
   `docs/backlog/` is authoritative; the CAA-dated xlsx exports are
   generated snapshots.
2. Recorded repository decisions:
   - `docs/decisions/`
   - architecture Markdown under `docs/`
3. Derivative planning views:
   - Markdown summaries and implementation plans
   - Figma proposal boards
   - Jira issues created from the primary sources
4. Implementation artifacts:
   - frontend, backend, migrations, tests, and CI created after the relevant
     decisions are recorded

The Word and Excel files are not temporary attachments. Do not delete them, do
not replace them with Markdown-only summaries, and do not treat generated
Markdown as higher authority when the source documents disagree.

## When source documents change

When a teammate updates a Word or Excel source file, the next agent touching the
related area should do a small reconciliation pass:

1. Identify which source file changed and what section, sheet, or story changed.
2. Update the matching Markdown interpretation only if the source change affects
   team decisions, backlog scope, acceptance criteria, testing, design, or
   implementation work.
3. Note contradictions instead of silently resolving them. If the source and
   Markdown disagree, the pull request should say which file was treated as
   primary.
4. Keep generated exports or summaries scoped. Do not commit private notes,
   personal paths, local tokens, or tool caches.

## Backlog changes are upstream; derivatives follow

The product backlog is the most upstream source. When it changes, the
following derivatives may need reconciliation, in this order:

1. C4 / architecture diagrams (`docs/c4-diagrams.md`,
   `docs/modular-monolith-architecture.md`) if new modules, boundaries, or
   integrations are implied.
2. User flow documents (`docs/dynamic-user-flows.md`, Figma boards) if
   Organiser / Coordinator / Venue Staff / Technical Support / Attendee flows
   change.
3. Test cases (`docs/testing/PROJECT TEST CASES.xlsx`) if acceptance
   criteria, error paths, or coverage areas shift.
4. Jira issues, epics, sprint assignments, points, priorities.

The PR that changes the backlog should either update these derivatives in the
same PR, or note in the PR body which derivatives were checked and why no
update was needed. The PR template checklist reminds contributors to do this.

## Jira reconciliation after backlog merges

Jira is a derivative of the primary source documents, not a peer. When a
backlog PR merges:

1. The PR author (or their agent) opens a small follow-up PR titled
   `docs: reconcile Jira after <backlog-PR-number>`.
2. The follow-up PR body lists the Jira issues that were created, updated, or
   retired to match the merged backlog change.
3. If no Jira changes were needed, the follow-up PR body records that
   explicitly so future readers know the reconciliation happened.

Do not edit Jira issues in parallel with the backlog PR. If both are edited at
the same time, the sources will diverge silently.

## Mapping sources to repo docs

| Source | Update these derivatives when relevant |
| --- | --- |
| Product backlog (Markdown, `docs/backlog/`) | Jira backlog, `docs/design/figma-wireframe-refinement-plan.md`, testing plans, implementation tickets |
| Backlog decision review Word doc | user roles, feature scope, future backlog labels, definition of done, release boundaries |
| Architecture decision records Word doc | `docs/decisions/`, `docs/architecture.md`, `docs/modular-monolith-architecture.md`, `docs/db_schema.md` |
| Test cases workbook | testing README, scaffold reference tests, Jira acceptance evidence |

Markdown is useful because reviewers, CI, and agents can diff it. It is still a
derivative view unless it records an accepted team decision in `docs/decisions/`.

## Design and Figma rules

Figma boards are design proposals derived from the source documents. They should
link back to backlog stories or Jira issues once those exist.

Use controlled Figma passes:

- batch related screens together instead of repeatedly fetching or writing one
  frame at a time;
- preserve existing boards unless a team decision says to replace them;
- keep desktop and mobile variants paired when the workflow is user-facing;
- separate role-specific boards so Organiser, Coordinator, Venue Staff,
  Technical Support, and Attendee flows can be reviewed independently.

## Jira and progress rules

Jira should be populated from the primary source documents, then kept in sync
with repository evidence:

- backlog fields come from the Excel backlog and Word decision review;
- definition of done comes from the decision review and testing plan;
- progress evidence comes from linked branches, commits, pull requests, and
  review/test notes;
- team members use their own Jira accounts or tokens. Never share or commit
  Jira credentials.

See `docs/jira-agent-workflow.md` for the concrete agent workflow.
