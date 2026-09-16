# Jira SCRUM board — sprint and burndown setup

This is a point-in-time audit of the ConnectSphere Jira project (`SCRUM` in
`theprawnworkspace.atlassian.net`) against the prerequisites for a meaningful
Sprint Burndown chart. Anyone with the Jira credentials described in
[jira-agent-workflow.md](jira-agent-workflow.md) can rerun it against the
Agile REST API.

## Prerequisites for a Sprint Burndown chart

| # | Prerequisite | Why it matters |
| --- | --- | --- |
| 1 | Board type is Scrum, not Kanban | Kanban boards do not have a Sprint Burndown chart. |
| 2 | An active sprint exists with explicit start and end dates | Burndown plots remaining points across the sprint window. Without a window there is no chart. |
| 3 | An estimation statistic is configured on the board | Story Points is the usual choice. Without it, burndown has nothing to burn. |
| 4 | Issues are added to the active sprint (not just the backlog) | Backlog items are not counted on the current sprint chart. |
| 5 | Each in-sprint issue carries an estimate at sprint start | Adding or changing points mid-sprint distorts the ideal line. |
| 6 | Issues transition to Done via the workflow | The remaining line only drops when issues reach the Done column. Merging a PR does not transition an issue by itself. |

## Current state

Audited against `board 1 = "SCRUM board"` in the `SCRUM` project.

| # | Prerequisite | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Board type | Pass | Board 1 exposes the sprint endpoint; four sprints defined. |
| 2 | Active sprint with dates | Pass | `SCRUM Sprint 1`, `2026-09-14 → 2026-09-19`. Sprints 2, 3, 4 are already scheduled through 2026-10-31. |
| 3 | Estimation field | Pass | `customfield_10016` "Story point estimate" is configured on the board. |
| 4 | Issues added to sprint | Pass | Twelve issues in the active sprint. |
| 5 | Points on in-sprint issues | Pass | 12 of 12 issues carry story points. Total commitment: 36 points. |
| 6 | Issues transitioning to Done | Fail | 0 Done, 5 In Review, 7 To Do, 0 In Progress. The burndown remaining line will stay flat at 36 until issues move to Done. |

Workflow columns are `To Do → In Progress → In Review → Done`, all mapped to
statuses on the board.

## The actual problem right now

The board is configured correctly. The burndown chart is flat because merged
work is not being marked Done in Jira. Concrete cases from the active sprint:

| Jira issue | Story | Merged PR | Jira status now |
| --- | --- | --- | --- |
| SCRUM-17 | E01-S02 Restrict event visibility to my own client | #41 | In Review |
| SCRUM-18 | E01-S03 Hide internal planning info from Attendees | #42 | In Review |
| SCRUM-19 | E01-S04 Update my account details | #47 | In Review |
| SCRUM-23 | E01-S08 Create an account | #43 | In Review |
| SCRUM-40 | E05-S01 Maintain the venue catalogue | #48 | In Review |

Each of these has a merged PR but the Jira issue is still in `In Review`. Until
they transition to `Done`, the burndown chart shows a flat line at 36 points.

## Fix

Two options, in order of preference:

1. **Manual transition, once per issue.** Open each of the five issues listed
   above and move them to Done. Fastest path to a meaningful chart today. Only
   count an issue as Done when it also meets the Definition of Done in
   [CONTRIBUTING.md](../CONTRIBUTING.md) — merge alone is not sufficient.
2. **Automation, for the next merges.** In Jira project settings → Automation,
   add a rule: when a linked GitHub PR is merged and the associated issue is
   still in `In Review`, transition it to `Done`. Requires the GitHub for Jira
   integration and that PR titles or branch names carry the Jira key. See
   [jira-agent-workflow.md](jira-agent-workflow.md). Do not enable this without
   a team decision — some issues justifiably stay in `In Review` after merge
   (missing test evidence, pending design review, migration notes).

## Nice-to-haves, not burndown blockers

- All four sprints have empty `goal` fields. Setting a sprint goal helps the
  Scrum board header and does not affect the burndown line itself.
- No linked GitHub commits on some sprint issues. Adding the Jira key to
  branch names, commit bodies, or PR descriptions (the repository convention)
  lets the integration populate the Development panel automatically.

## Reproducing this audit

The commands used, expressed as pseudo-curl for portability. Substitute your
own `JIRA_EMAIL` and `JIRA_API_TOKEN`:

```text
GET  {JIRA_SITE_URL}/rest/agile/1.0/board?projectKeyOrId=SCRUM
GET  {JIRA_SITE_URL}/rest/agile/1.0/board/{boardId}/configuration
GET  {JIRA_SITE_URL}/rest/agile/1.0/board/{boardId}/sprint
GET  {JIRA_SITE_URL}/rest/agile/1.0/sprint/{sprintId}/issue?fields=summary,status,customfield_10016
```

Authenticate with HTTP Basic using `{JIRA_EMAIL}:{JIRA_API_TOKEN}` base64
encoded. Never commit the token; keep it in a local `.env` file.

## When to rerun this audit

- Before a class demo or submission that references the burndown chart.
- After creating or ending a sprint, since the active-sprint issue set changes.
- If someone reports the burndown chart is empty or stuck flat.
