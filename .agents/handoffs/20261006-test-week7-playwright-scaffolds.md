# test/week7-playwright-scaffolds

Goal: Keep the 58 Week 7 acceptance-case Playwright scaffolds aligned with current `main` for PR #217 (SCRUM-178), regenerate the derived coverage inventory, and preserve live tests without duplicate or misleading fixme declarations.

## Current state

- The branch fast-forwarded to hosted PR head `45113b9`, then normally merged current `main` (`0379cb2`). The only content conflict was generated `docs/testing/tc-coverage.md`; it was regenerated from source rather than hand-resolved.
- Retained live assertions that main added for E01, E06, E09 and other cases. Removed only duplicate `test.fixme` declarations for TC_IDs already present in live tests; a static inventory found 283 test-title TC_ID declarations with zero duplicates. Unimplemented cases remain fixme scaffolds.
- Regenerated coverage: 354 catalogue cases; 179 automated (36 real-DB, 1 mock-backed, 142 live assertion), 139 scaffold, 36 with no test reference.
- Repository check at `45113b9`: PASS, 140 tooling tests. T-65 record: `docs/testing/runs/20261016-075459-bryanseah234-tooling.md`.
- `git diff --check` passed. `npm run test:e2e:scaffold -- --list` could not start because this checkout has no installed JS dependencies (`playwright: not found`). No browser/application suite was run, and scaffolds are not acceptance evidence. TypeScript LSP is unavailable; no dependency install was authorized.
- Merge commit `3b16db4` and evidence commit `556d0ad` were pushed normally. GitHub reports `MERGEABLE`; all checks shown by `gh pr checks 217` passed on `556d0ad`, including Vercel.
- Review feedback was read from all PR reviews, inline comments, and issue comments. Reviewers approved the scaffold intent subject to current-main integration and regeneration; no approval has been granted for the latest head. Teammate approval remains outstanding.

## Remaining work

- Await teammate approval on the latest head; do not self-approve or merge.
- Do not claim acceptance behavior from fixme scaffolds or from repository hygiene checks.

## Decisions without team sign-off

- When current main already has a live test title carrying the same TC_ID as a fixme stub, the live test is canonical for that case; remove the duplicate stub while preserving unrelated fixme cases. No executable test was downgraded and no product behavior was changed.
- `.agents/STATE.md` and `.agents/JOURNAL.md` match current main in the merge result; this PR does not add a net change to either protected file.
