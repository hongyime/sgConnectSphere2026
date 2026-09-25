# Agent Instructions

This repository is a school web application monorepo. The stack is not selected
yet, so repository tooling and documentation are the source of truth until real
frontend and backend code exists.

Before changing files, read `README.md`, `CONTRIBUTING.md`, `docs/repository-setup.md`,
and `.agents/STATE.md` enough to understand the current workflow and any
in-flight work from a previous session. `.agents/STATE.md` and
`.agents/JOURNAL.md` hold cross-session, cross-harness continuity state --
every AI coding agent working in this repo (Claude Code, Codex, Cursor,
OpenCode, or otherwise) reads them at the start of a task and updates them
after any significant piece of work, so the next session -- yours or a
teammate's, on any machine -- can resume with zero ambiguity. Do not write
secrets, tokens, connection strings, or personal data into either file --
reference secrets by env-var name only. Never write
secrets, personal data, or machine-specific paths into any other committed file.
For product, backlog, design, testing, or Jira work, also read
`docs/source-of-truth.md` before editing derivative Markdown, Figma notes, Jira
issues, or scaffold files.

Use short-lived branches and reviewed pull requests into `main`. Commit messages
and PR titles must follow the repository's conventional format, and branch names
must use the prefixes documented in `CONTRIBUTING.md`. Do not force push shared
branches or bypass hooks unless the user explicitly asks for a narrow recovery
operation.

Run `python scripts/check.py` before committing. A passing repository check
covers repository hygiene and tooling tests only; do not describe it as passing
application lint, tests, build, or deployment until those checks are implemented.

Keep imported template material scoped to what this repo actually uses. Do not
add paid services, AI reviewers, bot auto-merge, privileged `pull_request_target`
workflows, or deployment secrets without a recorded team decision.

## Pull-request hygiene (enforced in CI)

CI blocks a PR when any of these are missing. Fix them locally before opening
the PR rather than after CI flags them.

1. **Full PR body.** `.github/pull_request_template.md` defines four sections
   (`## What and why`, `## Verification`, `## Checklist`, `## Follow-ups`); all
   four must appear as headers in the body. `scripts/check_metadata.py pr`
   enforces this; dependabot PRs are exempt.
2. **Scope in the title.** Prefer `feat(backend): ...` or `fix(frontend): ...`
   over the bare `feat: ...` form when the change is clearly frontend, backend,
   or docs-scoped. This is a team convention, not a regex gate; the regex only
   enforces the type + optional scope shape.
3. **Traceability.** Cite the Jira issue key (for example `SCRUM-28`) and, when
   applicable, the story key (`E01-S01`) somewhere in the branch name, commit
   body, or PR body. Follow-up bug fixes should reference the originating PR
   number (for example "follow-up to #89"). Design or hygiene passes without a
   dedicated ticket should cite the source document instead (Figma plan,
   `docs/source-of-truth.md`, and so on).
4. **Verification section is honest.** State the commands you actually ran and
   their outcomes. Do not paste a boilerplate "all green" summary from a
   previous PR. Note anything you could not verify locally.

## Derived-doc regeneration

Some files are generated from other files. Never hand-edit them without also
re-running the generator, and commit the regenerated file in the same PR.

| Generated file | Source of truth | Regenerator |
| --- | --- | --- |
| `docs/testing/tc-coverage.md` | Every `test(...)`, `test.fixme(...)`, `test.skip(...)` block in `backend/tests/`, `tests/`, and `frontend/src/`, plus `docs/testing/PROJECT TEST CASES.xlsx` | `.venv-tools/bin/python scripts/tc_coverage_audit.py` |
| `docs/CONNECTSPHERE BACKLOGS CAA <DDMMYYYY>.xlsx` | `docs/backlog/` Markdown | `python scripts/export_backlog_xlsx.py` |
| `docs/testing/PROJECT TEST CASES CAA <DDMMYYYY>.xlsx` | `docs/testing/cases/` Markdown | `python scripts/export_testcases_xlsx.py` |

If a PR flips a test from `test.fixme` or `test.skip` to a live `test(...)`, or
vice versa, regenerate `docs/testing/tc-coverage.md` and stage the diff. CI
regenerates `tc-coverage.md` and fails if it drifts from what is committed.

## Jira reconciliation

Local Jira access is optional; `.env.template` documents the environment
variables an agent uses when the operator has provisioned a token. Agents that
have credentials should keep the Jira status column in sync with the PR
evidence rather than trusting a stale status. See `docs/jira-agent-workflow.md`
for the mapping between PR events and Jira states.

The variables are `JIRA_SITE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, and
`JIRA_PROJECT_KEY`.

To reconcile a merged PR against Jira from a teammate's machine:

```
python scripts/reconcile_jira.py --pr 94              # dry run
python scripts/reconcile_jira.py --pr 94 --yes        # apply
```

When the repository has `JIRA_SITE_URL` / `JIRA_EMAIL` / `JIRA_API_TOKEN`
provisioned as GitHub Actions secrets, `.github/workflows/jira-sync.yml`
performs the same reconciliation automatically on `pull_request: closed`
with `merged == true`. The workflow is advisory — a failure is visible in
Actions but never blocks a merge, because the merge has already happened
by the time the workflow fires. See `docs/decisions/0006-jira-status-sync.md`
for the design.

The script only trusts a SCRUM key when it appears in the branch name, the
PR title, or as an explicit `Closes SCRUM-42` / `Fixes SCRUM-42` clause in
the body. Bare body mentions ("follow-up to SCRUM-42") are ignored so a PR
that names an unrelated ticket does not accidentally close it.
