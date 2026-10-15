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

- 15 Oct, Amareet's review: one cutoff keyed on the record `date`
  (2026-10-16T00:00:00+08:00, like #269 and `DATABASE_FIELD_CUTOFF`); PostPlan
  optional in the PR template; README says the rule is not enforced yet;
  template example moved inside the comment; cropping/JPG guidance.

- Sprint 3 Done stories (10: E06-S05, E07-S01..S07, E14-S02, E03-S11) are
  re-run by their owners with screenshots before the Sprint 3 Review, as new
  records; they stay Done (T-74); a failing re-run means a new user story.
  Sprint 1 and 2 stories are left as they are. Needs the team's agreement
  in review, since it gives work to five people.

## Next

- Follow-up: extend `scripts/check_test_run_records.py` to require the
  `## Screenshots` section and existing linked images for manual records
  dated on or after the cutoff, and add a CI image-size check.
- First use: Le Xin's SCRUM-189 manual run (TC_E11S01_02) on #272.
