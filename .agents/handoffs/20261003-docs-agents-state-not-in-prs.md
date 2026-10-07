# docs/agents-state-not-in-prs

Goal: stop every pull request conflicting with every other on
`.agents/STATE.md` and `.agents/JOURNAL.md` (decision 0014). PRs no longer
edit those two files; CI enforces it; a script lists the per-task handoff
files instead; the owner consolidates in a `chore(agents):` PR. Follows the
3 October experience of resolving the same two files in nine PRs, each
resolution dismissing an approval.

Done: `check_changed_files()` in `scripts/check_metadata.py` with a unit test;
`pr-conventions` gains `fetch-depth: 2` and a step that exports
`PR_CHANGED_FILES` from `git diff --name-only HEAD^1 HEAD` before the check;
new `scripts/agent_handoffs.py` (newest-first listing with goal line,
`--branch`, `--all`); `.gitattributes` marks both files `merge=union` with a
note that GitHub ignores it; AGENTS.md continuity paragraph rewritten;
`.agents/handoffs/README.md` lifecycle and a Consolidation section; decision
0013 Status points at 0014; decision 0014 written.

Decisions without team sign-off: the `chore(agents):` title prefix as the
exemption key (simple, visible, grep-able; a label would need the workflow to
read labels); `fetch-depth: 2` rather than a full clone (only the merge
commit's first parent is needed); no pre-commit hook yet (CI is the
enforcement, a hook can follow).

Learnings: GitHub does not apply `.gitattributes` merge drivers to the PR
conflict banner or the web editor, so `merge=union` never un-conflicts a PR on
github.com; it only helps a local merge. Appending instead of prepending does
not help either, two PRs adding at the same end conflict the same way.

Not done: the first consolidation PR (owner, at Sprint 2 close); a pre-commit
mirror of the CI check; a `Learnings` heading in the nine handoff files
already on main (the first consolidation reads them whole).
