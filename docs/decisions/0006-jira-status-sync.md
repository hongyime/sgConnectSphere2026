# 0006 — Jira status sync after PR merge

## Status

Proposed — landing with PR that introduces `scripts/reconcile_jira.py` and
`.github/workflows/jira-sync.yml`.

## Context

Sprint 1 saw multiple PRs merge into `main` while their linked SCRUM issues
stayed in `In Progress` or `In Review`. The audit that produced PR #95 and
PR #96 found the following drift on 2026-09-19:

| Issue | Status before | PR that shipped it | Merged |
| --- | --- | --- | --- |
| SCRUM-86 | In Review | #88 | 2026-09-18T10:40Z |
| SCRUM-28 | In Progress | #94 | 2026-09-19T01:11Z |

Both were transitioned to Done manually while opening this PR. The pattern
kept recurring because there is no signal — no CI check, no automation, no
teammate agent workflow — that a merged PR should transition its ticket. The
existing `docs/jira-agent-workflow.md` describes the mapping between PR
events and Jira states but leaves execution to each teammate's agent, which
in practice has been unreliable across the team.

Adding secrets to GitHub Actions triggers the `AGENTS.md` "no deployment
secrets without a recorded team decision" rule. This ADR is that decision.

## Decision

Reconcile Jira status in two overlapping ways, tolerant of either failing.

1. **A local reconciliation script** — `scripts/reconcile_jira.py` — that any
   teammate can run against their own PR(s) using the four Jira environment
   variables already documented in `.env.template`:

   ```
   python scripts/reconcile_jira.py --pr 94              # dry run
   python scripts/reconcile_jira.py --pr 94 --yes        # apply
   ```

   No repository state changes; nothing is written to disk. The script uses
   only the Python standard library plus the existing `gh` CLI. It short-
   circuits on issues already in a terminal status, so re-runs are safe.

2. **An advisory CI workflow** — `.github/workflows/jira-sync.yml` — that
   runs the same script on `pull_request: closed` when `merged == true` and
   the author is not a bot. Uses three repository secrets:

   - `JIRA_SITE_URL` — for example `https://theprawnworkspace.atlassian.net`.
   - `JIRA_EMAIL` — mailbox for the service account or repo maintainer.
   - `JIRA_API_TOKEN` — a Jira API token belonging to the same account.

   The workflow is advisory: because `pull_request: closed` fires after the
   merge has completed, a failure cannot un-merge the PR. The teammate will
   see a red run on the Actions dashboard and can either re-run the local
   script or transition the ticket by hand.

The script only trusts a SCRUM key when it appears in the branch name, the
PR title, or as an explicit `Closes SCRUM-42` / `Fixes SCRUM-42` clause in
the body. Bare body mentions ("follow-up to SCRUM-42") are ignored so a PR
that names an unrelated ticket does not accidentally close it.

Both the script and the workflow are guarded by unit tests in
`tooling/tests/test_reconcile_jira.py` and exercised locally against the
current live tickets before landing.

## Alternatives considered

- **Do nothing.** Continue the current pattern where each teammate transitions
  their own tickets. Rejected: the pattern already failed twice in one sprint,
  and the audit surface area only grows as the codebase does.
- **Local script only, no CI.** Simpler; no secrets to manage. Rejected because
  the script still relies on the teammate remembering to run it, which is the
  exact failure mode that produced SCRUM-86 and SCRUM-28's drift. Keeping the
  local script as a fallback (option 1 above) preserves the "no CI secrets"
  path for teammates who prefer it.
- **Atlassian GitHub for Jira app.** Bidirectional link with automatic
  transitions when a PR merges. Rejected: adds a third-party app to the
  organization, requires GitHub app-installation permissions, and hides the
  logic behind a vendor product. This can be revisited if the team wants a
  richer link (comments, deploy status).
- **A `pull_request_target` workflow.** Rejected explicitly: `AGENTS.md`
  forbids `pull_request_target` without a separate team decision. This ADR
  does not authorise it.

## Consequences

- The three secrets above must be provisioned in
  `Settings > Secrets and variables > Actions > Repository secrets` before
  the workflow does anything. Until they are, the workflow logs a warning
  and exits 0 — so this PR merging does not create a red CI run for teams
  without Jira set up.
- The account behind the API token needs Jira permission to transition
  SCRUM issues. A dedicated service account is preferred to a personal PAT.
- If Jira workflow states change (for example a new `Ready to Release`
  column is added between `In Review` and `Done`), the script's
  `TERMINAL_STATUSES` set can be updated in one place; no other file
  changes are needed.
- The workflow is scoped to `pull_request: closed` on `main` only. Draft
  PRs and non-main merges never trigger it.
- The `docs/jira-agent-workflow.md` document remains authoritative for the
  broader flow (labels, description mapping, sprint assignment). This ADR
  narrows its "Progress from GitHub" section to concrete automation.

## Reversibility

Deleting `.github/workflows/jira-sync.yml` disables the automation with no
downstream effects. Deleting `scripts/reconcile_jira.py` (and its tests)
removes the local tool. The secrets can be rotated or removed from the
repository settings independently of the code.

## References

- `.env.template` for the environment variable names and shape.
- `docs/jira-agent-workflow.md` for the broader Jira ↔ repo mapping.
- `scripts/reconcile_jira.py` for the implementation.
- `tooling/tests/test_reconcile_jira.py` for the invariants covered by tests.
- The audit report on PR #95 for the drift that motivated this ADR.
