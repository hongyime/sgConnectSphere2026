# docs/per-task-handoff-files

Goal: land the Sprint 2 retrospective ask "separate handoff files per task, one
person consolidates the shared summary" (decision 0013). No Jira key;
technical enabler.

Done: .agents/handoffs/README.md (naming, contents, lifecycle, union rule for
conflicts), docs/decisions/0013-per-task-handoff-files.md, AGENTS.md
continuity paragraph rewritten. This file is the first example of the
convention.

Not done / next: nothing on this branch. After merge, the three DIRTY PRs
(#185, #187, #192) each need one more union-style resolution of .agents/*;
from then on the rule applies.

Decisions without team sign-off: five-to-ten-line cap on STATE entries;
Bryan consolidates STATE.md at sprint close; JOURNAL.md never trimmed.
Reviewer should push back if any of those is wrong.

Commands: python scripts/check.py in the worktree (see PR Verification).
