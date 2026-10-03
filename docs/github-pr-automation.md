# GitHub PR automation

This repository uses protected pull requests into `main`, merged through a
merge queue.

Current live repository settings:

- Squash merge only.
- Delete branch on merge.
- Update-branch support enabled (manual use only).
- Merge queue required on `main` (see [decision 0012](decisions/0012-merge-queue.md)).
- `main` requires the required checks, one human approval, resolved
  conversations, linear history, and no force pushes or deletions. Branches do
  not need to be up to date with `main`; the queue handles that.

## What "Merge when ready" means here

The queue does not bypass review. Once a PR has one approval, resolved
conversations and green required checks on its own head commit, anyone with
write access can press **Merge when ready**. GitHub then:

1. Creates a temporary merge commit of the PR on top of the latest `main` and
   every PR queued ahead of it.
2. Re-runs the required checks (`repository-checks`, `pr-conventions`,
   `lfs-guard`, `application-checks`) on that commit via the `merge_group`
   event.
3. Squash-merges when they pass and deletes the branch, or removes the PR from
   the queue with the reason on its timeline when they do not.

The normal flow is:

1. Open a draft PR.
2. Resolve merge conflicts and failing checks.
3. Wait for the required checks on the latest commit.
4. Mark the PR ready and request a human approval.
5. Resolve conversations.
6. Press **Merge when ready**.

Request reviews only after the PR is review-ready: no merge conflicts and
required checks passing or queued for the latest commit. Protected branch rules
still dismiss stale approvals after new commits, so finish your own changes
first. Being behind `main` is no longer a reason to wait.

## What is not automated

GitHub does not queue PRs by itself. Someone with write access presses the
button per PR, after review.

`allow_update_branch` keeps the update-branch operation available. The
`Update PR branches` workflow is now manual (`workflow_dispatch`) only. It
used to run hourly and after every push to `main` to keep PRs up to date for
the old strict rule; with the queue that produced CI re-runs and Vercel preview
deployments for no merge benefit. Run it by hand when a specific PR needs
`main` merged in, for example to resolve a conflict that GitHub reports.

The updater is intentionally narrow:

- It only updates PRs targeting `main`.
- It only updates branches in this repository.
- It skips draft PRs.
- It updates only PRs GitHub reports as `BEHIND`.
- It does not merge PRs.
- It does not use `pull_request_target`.

Do not add a bot workflow that approves or queues PRs automatically unless the
team records that decision first. Human approval followed by a human pressing
**Merge when ready** is the current merge automation boundary.
