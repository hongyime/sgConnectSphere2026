# Jira ticket classification

This document is the durable rule for how Jira tickets are shaped in the
SCRUM project. It supersedes any earlier informal practice. Both humans
and AI agents must follow it when creating or editing tickets.

Related: `docs/jira-agent-workflow.md`, `docs/source-of-truth.md`,
`docs/backlog/README.md`.

---

## The three ticket types

### 1. Story

A Story maps 1:1 to a user story in `docs/backlog/product/`. Its summary
uses the story ID as a prefix with no brackets: `E01-S05 Title`. It is
parented to its Epic. Stories in `docs/backlog/product/` already follow the
`EXX-SXX` identifier scheme; every Jira Story should have exactly one
matching Markdown file.

Do not create a Story unless a corresponding `EXX-SXX` entry exists in
`docs/backlog/product/` (or is being added in the same PR).

### 2. Subtask

A Subtask delivers a scoped slice of work for exactly one Story. The summary
uses a discipline prefix followed by a colon: `Backend: …`, `Frontend: …`,
`Tests: …`, `Docs: …`. The parent is that Story.

A documentation ticket that is triggered by a specific Story (for example,
updating an ADR or test-case file as part of delivering E03-S02) attaches as
a `Docs:` Subtask of that Story.

**The correct pattern** is demonstrated by SCRUM-121 through SCRUM-126
(Subtasks of SCRUM-33, E03-S02, split as Backend / Backend / Backend / Tests
/ Frontend / Frontend) and by SCRUM-113 (Subtask of SCRUM-42), SCRUM-114
(Subtask of SCRUM-32), and SCRUM-115 (Subtask of SCRUM-37). Follow these
when splitting a story into discipline-scoped work items.

A Subtask cannot have Subtasks of its own (Atlassian platform constraint).

### 3. Technical enabler (Story under E00)

A technical enabler covers cross-cutting work that serves no single user
story: CI pipeline changes, repository tooling, test harnesses, deploy
configuration, backlog or ADR migrations, and similar infrastructure.

These tickets cannot honestly be a Subtask, because a Subtask requires
exactly one Story parent. Forcing an enabler under an arbitrary Story would
misrepresent its scope and contradict the professor's requirement that Jira
tickets reflect user stories.

`E00 Platform, Tooling & Delivery` is the home for these. It keeps Epics E01
through E14 purely about user stories while giving infrastructure an honest
place to live. Bryan approved it on 30 September 2026 and it exists as
**`SCRUM-127`**; 19 enablers are already parented to it. Put new enablers there
rather than leaving them unparented.

---

## API limitation: Story-to-Subtask conversion (verified 30 September 2026)

The Jira REST API on this instance does not support converting an existing
Story to a Subtask programmatically. Verified:

- `GET /rest/api/3/issue/{key}/editmeta` returns allowed issue types Task,
  Story, Feature, Bug. Subtask is absent from the list.
- `POST /rest/api/3/issue/{key}/move` returns 404; the endpoint does not
  exist on this instance.
- `POST /rest/api/3/bulk/issues/move` exists and accepts a mapping, but
  every attempt to specify a target parent was rejected with "Invalid request
  payload". Without a parent the API returns the semantic error: "All the
  issues in the mapping should be of subtask issuetype if target parent is
  not defined and target issuetype is a subtask type."

**Conclusion:** conversion must be performed through the Jira UI bulk-change
Move wizard. No script can do this.

### UI click path for bulk Story-to-Subtask conversion

1. Open the project board or backlog in Jira.
2. Select the issues to convert using the checkboxes on the left of each row.
3. Click **... (Actions)** at the top of the list, then choose **Bulk change**.
4. In the bulk-change dialog, select **Move**.
5. On the "Select Move" step, choose **Subtask** as the target issue type.
6. On the "Select Parent" step, pick the parent Story for each issue.
   If multiple issues are being moved to different parents, repeat the
   bulk-move operation in groups — one group per target parent.
7. Review the field-mapping step. Map any fields the Subtask type requires
   that the Story type did not have.
8. Confirm and execute. Verify each ticket shows the correct parent and type
   after the operation.

---

## Rule for future ticket creation

Before creating any ticket:

1. Open `docs/backlog/product/` and search for the owning story by topic or
   epic.
2. **Exactly one story owns this work** → create a Subtask under that Story.
   Use the appropriate discipline prefix (`Backend:`, `Frontend:`, `Tests:`,
   `Docs:`).
3. **No story owns this work** (cross-cutting infrastructure, tooling,
   pipeline) → create a Story under Epic E00 Platform, Tooling & Delivery
   once that Epic exists.
4. **A new user story is needed** → add it to `docs/backlog/product/` in a
   PR first, then create the Jira Story pointing to it.

AI agents must not invent a parent. If the owning story is ambiguous or
absent, flag the uncertainty in a comment on the ticket or in the PR body,
and leave it for Bryan to resolve.

---

## Existing correct examples

| Subtask | Parent | Discipline label |
| --- | --- | --- |
| SCRUM-113 | SCRUM-42 (E05-S05) | — |
| SCRUM-114 | SCRUM-32 (E03-S01) | — |
| SCRUM-115 | SCRUM-37 (E03-S07) | — |
| SCRUM-121 | SCRUM-33 (E03-S02) | Backend |
| SCRUM-122 | SCRUM-33 (E03-S02) | Backend |
| SCRUM-123 | SCRUM-33 (E03-S02) | Backend |
| SCRUM-124 | SCRUM-33 (E03-S02) | Tests |
| SCRUM-125 | SCRUM-33 (E03-S02) | Frontend |
| SCRUM-126 | SCRUM-33 (E03-S02) | Frontend |

---

## What this document does not cover

- Sprint assignment and point estimation: see `docs/jira-agent-workflow.md`.
- Backlog Markdown format: see `docs/backlog/README.md`.
- The concrete per-ticket migration plan for the 45 current orphans: see
  `docs/plans/jira-reorg-2026-09-30.md`.
