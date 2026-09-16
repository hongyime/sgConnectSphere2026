# Source of truth and derivative documentation

This guide tells human contributors and AI agents how to treat ConnectSphere
product documents, Markdown summaries, Figma boards, Jira issues, and future code.

## Authority order

1. Primary product sources:
   - `docs/CONNECTSPHERE BACKLOGS CAA 140926.xlsx`
   - `docs/BACKLOG DECISION REVIEW CAA 140926.docx`
   - `docs/ARCHITECTURE DECISION RECORDS CAA 140926.docx`
   - `docs/testing/PROJECT TEST CASES.xlsx`
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

## Mapping sources to repo docs

| Source | Update these derivatives when relevant |
| --- | --- |
| Product backlog workbook | Jira backlog, `docs/design/figma-wireframe-refinement-plan.md`, testing plans, implementation tickets |
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
