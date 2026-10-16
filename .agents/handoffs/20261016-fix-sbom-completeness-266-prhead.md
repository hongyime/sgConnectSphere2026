# Fix SBOM completeness for PR #266

Goal: fix PR #266's confirmed npm SBOM omission of root-only dependencies, including `@playwright/test`, `@stryker-mutator/core`, and `@stryker-mutator/tap-runner`, with a regression test and complete generated snapshots.

## Findings

- Revalidated open PR #266 at head `6e5ce9f`; its public SBOM whitelist is intentionally limited to the two current CycloneDX outputs.
- Live package-lock inspection confirms all three root tools are declared direct root devDependencies and have locked package entries.
- `npm sbom --package-lock-only --workspaces --include-workspace-root` omitted these root-only tools because they are not referenced by the frontend or backend workspaces.
- Root-only `npm sbom --package-lock-only` includes the root tools but emits the worktree directory as the metadata name; normalize it from `package.json` when merging.
- `cyclonedx-py` omits the Python SBOM's final newline; normalize the generated output so the repository's end-of-file check stays clean.

## Remaining work

- Push this task branch without force. PR #266 remains open and requires its ordinary teammate review/merge gate; do not approve or merge it.
- Do not change `.agents/STATE.md`, `.agents/JOURNAL.md`, broad artifact ignore policy, package versions, or another PR branch.

## Completed and verified

- `b321bb3` records this branch handoff; `1d32337` adds root/workspace SBOM merging, root dependency completeness validation, newline normalization, and six regression tests.
- `ceac186` regenerates both tracked SBOMs; `bb68d50` documents the corrected coverage and root metadata behavior.
- The npm SBOM has 436 components and includes root tools at locked versions: `@playwright/test` 1.63.0, `@stryker-mutator/core` 10.0.0, and `@stryker-mutator/tap-runner` 10.0.0. The package manifests and lockfile are unchanged.
- `docs/testing/runs/20261016-080234-bryanseah234-tooling.md` records the six focused tests passing at `bb68d50`.
- `docs/testing/runs/20261016-080329-bryanseah234-tooling.md` records `python scripts/check.py` passing at `bb68d50` with 146 tooling tests and 323 run records validated. It reported the existing secondary-worktree warning.
- The basedpyright LSP is not installed in this environment; repository checks and the focused executable tests passed.
