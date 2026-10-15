# docs/t-93-manual-run-screenshots

Goal: record the team's 15 October decision (T-93), agreed by the product owner, that manual test
runs keep hand-taken screenshots in the repository, named by TC_ID and stored
with their T-65 session record, and update the test-run rules to match.

## Done

- `docs/bdr/B-team-decisions.md`: T-93 row. `docs/bdr/G-change-log.md`: dated
  entry.
- `docs/testing/runs/README.md`: "Screenshots for manual runs (T-93)" section,
  human procedure step 6 and an agent rule. `TEMPLATE.md`: `## Screenshots`
  section. `evidence/README.md`: folder layout and naming.
- `.github/pull_request_template.md`: the manual verification line asks for
  the screenshot folder and the PostPlan link. `AGENTS.md`: one agent rule.

## Decisions

- Folder per session record (`evidence/<record name>/`) so two people's runs
  never collide, matching T-65's one-file-per-session reasoning.
- Images only for PASS/FAIL rows; agent or Playwright screenshots never count
  as manual evidence.
- Not retroactive: merged records are immutable.

## Next

- First use: Le Xin's SCRUM-189 manual run (TC_E11S01_02) on #272.
