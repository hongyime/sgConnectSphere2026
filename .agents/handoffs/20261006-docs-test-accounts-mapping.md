# Map test-case placeholder accounts to seeded accounts

Goal: let anyone follow the acceptance test cases by hand. The cases use
placeholder accounts (`coordinator_1@connectsphere.com` etc.) that the seed
does not have. `docs/testing/test-accounts.md` maps each placeholder to a
seeded account and lists seeded events by status; `docs/testing/README.md`
links to it. Docs only. Owner: Amareet.

## Not done / next step

- Team to agree the mapping, and decide what to do with `tech_support_3`,
  `lead_1` and `safety_1` (no seeded match; the last two are not system roles).
- After PR #217 merges (it edits seven `tests/e2e/*.spec.ts` files), a
  follow-up PR can rename the placeholders in `docs/testing/cases/` and
  `tests/e2e/` directly, re-export the test-case workbook, regenerate
  `tc-coverage.md`, and retire the table.
