# Fix SBOM completeness for PR #266

Goal: fix PR #266's confirmed npm SBOM omission of root-only dependencies, including `@playwright/test`, `@stryker-mutator/core`, and `@stryker-mutator/tap-runner`, with a regression test and complete generated snapshots.

## Findings

- Revalidated open PR #266 at head `6e5ce9f`; its public SBOM whitelist is intentionally limited to the two current CycloneDX outputs.
- Live package-lock inspection confirms all three root tools are declared direct root devDependencies and have locked package entries.
- `npm sbom --package-lock-only --workspaces --include-workspace-root` omitted these root-only tools because they are not referenced by the frontend or backend workspaces.
- Root-only `npm sbom --package-lock-only` includes the root tools but emits the worktree directory as the metadata name; normalize it from `package.json` when merging.
- `cyclonedx-py` omits the Python SBOM's final newline; normalize the generated output so the repository's end-of-file check stays clean.

## Remaining work

- Commit this handoff first, then commit regression coverage, generator changes, documentation, and regenerated snapshots in focused commits.
- Run targeted tests and `python scripts/check.py`; record actual T-65 evidence with the authenticated GitHub runner and exact HEAD.
- Push the task branch without force. Do not change `.agents/STATE.md`, `.agents/JOURNAL.md`, broad artifact ignore policy, package versions, or another PR branch.
