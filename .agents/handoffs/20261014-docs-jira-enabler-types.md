# Align Jira type guidance for technical enablers

Goal: align the Jira workflow and ticket-classification guides so product user-story Stories, cross-cutting E00 technical-enabler Stories, and discipline-scoped Subtasks are described consistently without contradicting each other.

## Current state

- `origin/main` is `8f246ae`; PR #262 is ready for review with auto-merge enabled, so it will enter the merge queue once required review and checks pass.
- The durable classification in `docs/jira-ticket-classification.md` defines technical enablers as Jira Stories under E00, while its general Story rule also said every Story needed a product `EXX-SXX` row. The Jira workflow table separately still said `Task/Sub-task` for technical work.
- Jira SCRUM-182 was corrected from Task to Story under SCRUM-127 (E00); its status, assignee, scope, and sprint assignment were preserved.

## Scope

- Clarify that product user-story Stories require a matching `EXX-SXX` row, while cross-cutting enabler Stories under E00 do not.
- Update the Jira workflow mapping row to match that distinction and the Subtask parent rule.
- Do not change backlog scope, issue hierarchy, statuses, or application code.

## Verification

- `PATH=.venv-tools/bin:$PATH python scripts/check.py` passed repository hygiene and 87 tooling tests at base `8f246ae`; T-65 record: `docs/testing/runs/20261014-090022-bryanseah234-tooling.md`.
- `PATH=.venv-tools/bin:$PATH python scripts/check.py` passed repository hygiene and 87 tooling tests at base `fc64a88`; T-65 record: `docs/testing/runs/20261014-091651-bryanseah234-tooling.md`.
- Teammate review is pending on the documentation PR.
