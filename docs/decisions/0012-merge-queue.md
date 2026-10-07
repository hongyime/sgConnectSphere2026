# 0012 - Require a merge queue on main

## Status

Accepted. Landed in two steps so no pull request is ever stuck in a queue whose
checks cannot report:

1. This PR merges the `merge_group` workflow triggers and the updated ruleset
   payload. Merging it changes no live GitHub setting.
2. An administrator then runs `python scripts/configure_github.py --apply`,
   which adds the `merge_queue` rule to the live `main-protection` ruleset. The
   script refuses to apply until the required checks have passed on the current
   `main` commit, which by then includes the new triggers.

Follows the ruleset migration in decision 0008, which was applied live on
2 October 2026 (ruleset id 24377800) as the prerequisite: merge queue is a
ruleset-only feature.

Step 2 was applied on 3 October 2026 by the repository admin with `main` at
`1956509` (#205 merged) and all four required checks green on that commit.
Read-back of `GET /repos/.../rules/branches/main` shows `merge_queue` with
`SQUASH`, `ALLGREEN`, 30-minute timeout, min 1 / max 5 / build 5 / wait 5, and
`strict_required_status_checks_policy: false`. The strict flag had already been
set to `false` on the live ruleset earlier the same day, ahead of this PR
merging, to stop the five open PRs invalidating each other's approvals; the
JSON in #195 already carried the same value, so nothing diverged. Five PRs
(#194, #195, #196, #204, #205) merged in the five minutes before the apply
through plain auto-merge; this PR is the first to go through the queue.

## Context

Sprint 2 ran with four to seven pull requests open at once, all targeting
`main`, all touching the shared continuity files `.agents/STATE.md` and
`.agents/JOURNAL.md`. The ruleset required branches to be up to date with
`main` before merging (`strict_required_status_checks_policy: true`). The
observed cost, recorded across `.agents/STATE.md` entries from 26 to
30 September and the Sprint 2 retrospective feedback:

- Every merge to `main` put every other open PR behind. The author (or the
  hourly `update-pr-branches.yml`) merged `main` in, which pushed a commit,
  which dismissed the existing approval (`dismiss_stale_reviews_on_push` and
  `require_last_push_approval` are both on), re-ran CI, and produced a Vercel
  preview deployment (decision 0010 counts 19 deployments in one 24-hour
  sample, most of them from exactly this loop).
- Reviewers approved the same PR two or three times. PR #134 was refreshed and
  re-approved after #124, #138, #140 and #143 in turn.
- Approvals were deliberately requested late to limit the damage
  (`CONTRIBUTING.md` "Review approvals are intentionally requested late"),
  which lengthened the time from "ready" to "merged".

The instructor's Sprint 2 feedback asked the team to "introduce a merge queue
to test approved PRs against the latest main and preceding changes, reducing
repeated branch updates and approvals".

## Decision

Add a `merge_queue` rule to the `main-protection` ruleset and turn off the
up-to-date requirement:

| Parameter | Value | Why |
| --- | --- | --- |
| `merge_method` | `SQUASH` | Matches the repository's squash-only setting (`repository.json`) and the PR-title-as-commit-title convention. |
| `grouping_strategy` | `ALLGREEN` | Every PR in a group must pass on its own merge commit. The team has had intermittent failures only in database tests behind a missing local URL, never in CI, so there is no case for `HEADGREEN`'s tolerance of individual failures. |
| `check_response_timeout_minutes` | `30` | `application-checks` takes 8 to 12 minutes including Playwright. Thirty leaves headroom for a slow runner without letting a broken trigger hold the queue for an hour. |
| `max_entries_to_build` | `5` | Public repository, so Actions minutes are free; the limit exists to bound concurrent Postgres and Redis service containers, not cost. |
| `max_entries_to_merge` | `5` | A group of five is still small enough that a post-merge Vercel failure is attributable. |
| `min_entries_to_merge` | `1` | A single ready PR should not wait for company. |
| `min_entries_to_merge_wait_minutes` | `5` | Required by the API when a minimum is set; with the minimum at 1 it has no practical effect. |
| `strict_required_status_checks_policy` | `false` | The queue builds each PR against the latest `main` plus everything ahead of it, which is what the up-to-date rule tried to approximate by hand. Keeping both would reintroduce the forced-update loop. |

Every other rule is unchanged: one approval, stale-review dismissal,
last-push approval, resolved conversations, linear history, no force pushes or
deletions, no bypass actors, the same four required checks.

### Workflow changes

GitHub runs the required checks on a temporary `gh-readonly-queue/main/...`
branch and dispatches a `merge_group` event, not `pull_request` or `push`. A
workflow without that trigger never reports, and the queue entry fails at the
timeout. So:

- `ci.yml` (`repository-checks`, `pr-conventions`) and `lfs-guard.yml` gain
  `merge_group: {types: [checks_requested], branches: [main]}`. Their
  concurrency keys gain `github.event.merge_group.head_ref` so queue runs do
  not cancel each other.
- `pr-conventions` already skipped `check_metadata.py pr` on non-PR events and
  reported success; the log line now says why that is correct on `merge_group`
  (the title and branch were validated on the PR before it could be queued).
- `application-checks.yml` gains the trigger too, but GitHub ignores `paths:`
  on `merge_group`, so the full suite runs on every queued merge commit
  including docs-only PRs. This is accepted: the repository is public, Actions
  are free, and the cost is 8 to 12 minutes of queue latency per PR rather
  than money. It also removes the decision 0007 caveat for queued merges: a
  mixed app-and-docs PR gets exactly one `application-checks` run there.
- `application-checks-skip.yml` deliberately does **not** gain the trigger.
  Two `application-checks` check runs on one merge commit would make the
  required status ambiguous. Its header comment says so.
- `update-pr-branches.yml` keeps only `workflow_dispatch`. Its scheduled and
  push-to-main triggers existed to satisfy the up-to-date rule; with the rule
  off they would only re-run CI and deploy previews for no merge benefit.

### What the team does differently

The step that used to be "enable squash auto-merge" becomes "Merge when
ready", which GitHub shows on the PR once review and checks pass. It adds the
PR to the queue. Nothing else in the review flow changes: still one human
approval, still no AI reviewer, still resolve conversations first. A PR no
longer needs to be updated with `main` before requesting review, so review
can be requested as soon as the PR's own checks are green.

A PR removed from the queue (CI failure against the combined changes, or a
conflict with a PR ahead of it) shows the reason on its timeline. The author
fixes it and re-queues; nobody else's PR is affected.

## Alternatives considered

- **Keep the up-to-date rule and the hourly updater.** Rejected: this is the
  state the retrospective asked the team to leave.
- **Turn off the up-to-date rule without a queue.** Rejected: two PRs that each
  pass against an older `main` can break `main` together. The queue is what
  makes dropping the rule safe.
- **`HEADGREEN` grouping.** Rejected for now; see the table. Revisit if a
  flaky required check appears.
- **Promote `vercel-deploy` to a required check so the queue also gates on a
  preview build.** Rejected: decision 0010 keeps it advisory, and a required
  deploy in the queue would spend Hobby-plan deployments on every queue
  rebuild.
- **Let the companion skip workflow run on `merge_group` so docs PRs skip the
  suite in the queue.** Rejected: see the ambiguity note above; GitHub offers
  no path filter on `merge_group` to make the two workflows exclusive.

## Consequences

- Required checks run twice per PR: once on the PR head, once on its queue
  merge commit. That is the mechanism, not waste.
- Docs-only PRs spend 8 to 12 minutes in the queue they did not before.
- `scripts/configure_github.py` needs no code change; `verify_ruleset`
  already compares every parameter of every rule in the payload, so a
  mis-applied `merge_queue` rule fails read-back.
- `docs/github-pr-automation.md` and `CONTRIBUTING.md` describe the new flow.
- If a required check stops reporting on `merge_group` (for example a future
  workflow added without the trigger), every queue entry fails after 30
  minutes with "timed out awaiting a successful CI result". The fix is the
  trigger, never a bypass.

## Reversibility

Remove the `merge_queue` rule from `main-ruleset.json`, set
`strict_required_status_checks_policy` back to `true`, run the script. The
`merge_group` triggers are harmless when no queue exists and can stay.

## References

- `.github/settings/main-ruleset.json`
- `.github/workflows/ci.yml`, `lfs-guard.yml`, `application-checks.yml`,
  `application-checks-skip.yml`, `update-pr-branches.yml`
- `scripts/configure_github.py`
- Decision 0007 (skip workflow), 0008 (rulesets), 0010 (single deploy path)
- GitHub docs: "Managing a merge queue"; "Events that trigger workflows:
  `merge_group`"; REST "Create a repository ruleset" (`merge_queue` rule
  parameters)
- Sprint 2 retrospective feedback (instructor), 2 October 2026
