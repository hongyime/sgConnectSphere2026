## What and why

Describe the problem and resulting behaviour.

Closes #<!-- issue number, or explain why no issue is needed -->

## Verification

List actual commands and results. For every test run cited as evidence give the
command, the commit it ran on, the outcome and the environment (`local` or `ci`),
and say whether it ran against mocked data or a real database. Acceptance
criteria that involve persistence or interactions between features need
real-database or end-to-end evidence; mocked tests alone do not satisfy them.
Identify anything not tested.
Attach screenshots for visible UI changes and note migrations or configuration changes.

## Checklist

Each checked box must include the evidence asked for after the dash.
The CI gate rejects a checked box whose evidence placeholder is still blank.

- [ ] One logical change, conventional title — _PR title:_ `____`
- [ ] `python scripts/check.py` passes — _CI run:_ `____`
- [ ] Application tests pass (`npm test` / Playwright) — _command, commit, outcome, environment:_ `____` — _mocked or real database:_ `____` — _execution record in `docs/testing/runs/`:_ `____` or N/A
- [ ] Regression tests added where needed — _test file(s):_ `____` or N/A
- [ ] Manual verification done — _PostPlan link or screenshot:_ `____`
- [ ] Branch up to date with `main`, no conflicts, required checks green — _last commit SHA:_ `____`
- [ ] Documentation/architecture updated if affected — _file:_ `____` or N/A
- [ ] TC_IDs traced from story → test title — _TC_IDs:_ `____` or N/A
- [ ] Copy-forward rules followed if CAA-dated file touched — _new filename:_ `____` or N/A
- [ ] Backlog derivatives updated if backlog changed — _derivatives checked:_ `____` or N/A
- [ ] Diff reviewed for secrets and generated files — no credentials, `.env` values, or personal paths

## Follow-ups

Record limitations or linked follow-up issues, if any.
