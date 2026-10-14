# Align Jira type guidance for technical enablers

Goal: align `docs/jira-agent-workflow.md`'s issue-type mapping with `docs/jira-ticket-classification.md`, so product Stories, cross-cutting E00 technical-enabler Stories, and discipline-scoped Subtasks are described consistently.

## Current state

- `origin/main` is `8f246ae`.
- The durable classification in `docs/jira-ticket-classification.md` defines technical enablers as Stories under E00. The older Jira workflow table still says `Task/Sub-task` for technical work.
- Jira SCRUM-182 was corrected from Task to Story under SCRUM-127 (E00); its status, assignee, scope, and sprint assignment were preserved.

## Scope

- Update the one contradictory mapping row in `docs/jira-agent-workflow.md`.
- Do not change backlog scope, issue hierarchy, statuses, or application code.

## Verification

- `PATH=.venv-tools/bin:$PATH python scripts/check.py` passed repository hygiene and 87 tooling tests at base `8f246ae`; T-65 record: `docs/testing/runs/20261014-090022-bryanseah234-tooling.md`.
- Teammate review is pending on the documentation PR.
