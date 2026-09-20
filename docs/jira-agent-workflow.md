# Jira agent workflow

This guide describes how ConnectSphere should connect Jira to the repository and
source documents without sharing credentials between teammates or agents.

## Connection model

Each teammate should connect Jira from their own agent environment using their
own Jira access. Do not commit tokens, email addresses, cloud IDs, cookies, or
machine-specific configuration.

Recommended local-only configuration names:

```text
JIRA_SITE_URL=https://example.atlassian.net
JIRA_PROJECT_KEY=CS
JIRA_EMAIL=<your Jira login email>
JIRA_API_TOKEN=<your own token or connector secret>
```

Use `.env.template` as the committed template. Each teammate can copy it to
`.env` or configure the same variables in their own agent, shell, deployment
dashboard, or secret store. Real `.env` files are ignored by Git.

Use one of these methods, depending on what a teammate's agent supports:

| Method | Use when | Notes |
| --- | --- | --- |
| Native Jira connector or MCP server | The agent already supports Jira tools | Best for reading/updating issues directly. Each teammate authorizes their own account. |
| Jira REST API script | The agent can run local scripts but has no connector | Store credentials in local environment variables only. Commit scripts, not secrets. |
| Jira CSV import | Direct API access is unavailable | Generate a CSV from the source workbook and import through Jira UI. Useful as a safe first load. |
| GitHub for Jira / automation rules | The team wants PRs to update progress | Use branch names, commit bodies, and PR descriptions containing Jira issue keys. |

REST access was used for the 20 September 2026 Sprint 1 reconciliation. Its
results and evidence are recorded in [the delivery ledger](backlog/sprint-1-delivery.md).

## Backlog import source

Use these primary files:

- `docs/backlog/` (canonical Markdown, per-epic files under `release-1/` and `product/`)
- `docs/CONNECTSPHERE BACKLOGS CAA 160926.xlsx` (generated export)
- `docs/bdr/` (canonical decisions and clarifications)
- `docs/adr/` (canonical architecture decisions)
- `docs/testing/cases/` (canonical acceptance cases)
- `docs/backlog/sprint-1-delivery.md` (audited delivery/contributor evidence)

Dated XLSX and DOCX files are generated/historical views. See
`docs/source-of-truth.md` for the legacy workbook used by the coverage tool.

Suggested Jira mapping:

| Jira field | Source |
| --- | --- |
| Issue type | Story for backlog rows; Task/Sub-task for technical work |
| Summary | Story ID plus short story title |
| Description | User story, workflow notes, and decision-review context |
| Acceptance criteria | Backlog/test-case acceptance criteria |
| Epic or label | Epic code such as `E02`, `E05`, `E07` |
| Sprint or fix version | Release/sprint columns from the backlog workbook |
| Story points | Points from the backlog workbook |
| Priority | Source priority if present; otherwise team triage |
| Links | Related Figma frame, PR, source document section, test case IDs |

Future-backlog items should stay visible in Jira, but marked with a clear label
such as `future-backlog` and kept out of the active sprint until selected.

## Definition of done

The definition of done should not live only in one agent's prompt. Put it in Jira
as either a project-level checklist, an issue template, or repeated issue
checklist fields if the team's Jira plan supports that.

Minimum issue-level done evidence:

- acceptance criteria reviewed against the source documents;
- linked branch and pull request;
- repository checks run with the result stated accurately;
- relevant frontend/backend/test evidence once application checks exist;
- screenshots or Figma frame links for UI work;
- reviewer approval and unresolved review comments addressed.

Before real application checks exist, do not describe `python scripts/check.py`
as application lint, tests, build, or deployment. It only verifies repository
hygiene and tooling.

## Progress from GitHub

Use Jira issue keys consistently once the Jira project key is known:

```text
feature/SCRUM-123-event-request-form
feat(frontend): add event request form
docs: update organiser workflow notes
```

PR titles should still follow the repository's conventional format. Put the Jira
key in the branch name, commit body, or PR body, and add these links in the PR
description:

- Jira issue;
- Figma frame or board;
- source backlog/story ID;
- acceptance criteria and verification evidence.

If GitHub for Jira or Jira automation is enabled, configure transitions around
repository events:

| Evidence | Suggested Jira state |
| --- | --- |
| Issue exists but no branch/PR | Backlog or Selected |
| Branch pushed | In Progress |
| PR opened or marked ready for review | In Review |
| PR changes requested | In Progress |
| PR approved and checks pass | Ready to Merge |
| PR merged | Done, after definition of done is satisfied |

Do not auto-close or auto-transition issues to Done solely because a PR merged if
the issue still lacks test evidence, design review, migration notes, or source
document updates required by the definition of done.

The Sprint 1 audit found a concrete false positive: PR #97's explanatory
closing-clause examples caused SCRUM-42 (venue calendar) to be closed by the
sync script. PR #78's similarly mislabelled branch is also not calendar work.
Review the issue's actual story and accepted scope before applying a transition.
An explicit body saying "partial" is not evidence that the whole story is Done.
The current automation still needs this guard; see the delivery ledger's actions.

## Agent operating checklist

Before an agent updates Jira:

1. Read `docs/source-of-truth.md`.
2. Read the source document or workbook section behind the issue.
3. Check GitHub PR and commit evidence for progress.
4. Update only the Jira fields that can be justified from source documents or
   repository evidence.
5. Add a concise Jira comment when a contradiction or missing source reference is
   found.

Agents should not invent backlog scope, issue points, sprint assignments, or done
status when the source files do not support the change.
