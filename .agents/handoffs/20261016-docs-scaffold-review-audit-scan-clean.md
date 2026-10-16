# Clean Scanner-Ready Scaffold Audit Replacement

Create a fresh review PR from the latest `origin/main` with the frozen audit report's facts unchanged, after a local pinned scanner preflight. Preserve open PRs [#270](https://github.com/hongyime/sgConnectSphere2026/pull/270) and [#285](https://github.com/hongyime/sgConnectSphere2026/pull/285); do not import or rewrite either history.

## Scope and decisions

- Base the replacement on the latest `origin/main`; copy only the verified frozen report blob from the prior replacement branch.
- Keep every count, status, case row, and disposition as audited at `dac955f`. The only report changes are a concise frozen-basis note and a plain-text rendering adjustment in the SCRUM-75 scope cell.
- Do not change scanner policy, exclusions, artifacts, ignore rules, source cases, or any audit disposition.
- Do not edit `.agents/STATE.md` or `.agents/JOURNAL.md`.
- Add one new T-65 tooling record for the actual local verification run; never edit an existing record.

## Progress

- Read required repository guidance, source-of-truth and grading guidance; reviewed the prior handoff, report, scanner workflow, and run-record schema.
- Verified the source report blob matches the approved prior report and created this branch from freshly fetched `origin/main`.
- The report correction is staged in the worktree. Before the first report commit, verify the exact approved scanner pattern has no matches and compare all matrix rows after normalizing Markdown links against the source report.

## Remaining

1. Run the pinned full Git-mode scanner against only the tracked new-commit range, with verification disabled as in the existing workflow. Stop before publication if it reports any finding or scan error.
2. Run `python scripts/check.py`; record only observed outcomes in one new T-65 file.
3. Commit the report, handoff, and run record on this clean branch. Push normally and open a new PR with the required four sections.
4. After the new PR exists, cross-link it from #270 and #285 without closing or editing their branches. Check current PR checks once; request the two specified teammate reviews only when checks are green or queued.

## Verification boundaries

- No external credential verification, Jira write, application test, database operation, deployment, or Docker Desktop startup is authorized.
- Report counts and dispositions remain historical audit facts, not current coverage or acceptance results.
