Tighten PR #382's `Docs-Impact` waiver parser so a waiver is accepted only when it includes a non-empty reason, and add a regression to the guard self-test.

## Scope

- Update `scripts/doc_guard.py` and its throwaway-repository self-test.
- Keep the documented `Docs-Impact: none — <reason>` format and reject a bare `Docs-Impact: none` trailer.

## Verification

- Test-first check: adding the no-reason case failed against the old parser (`selftest: FAIL b`).
- Final `python scripts/doc_guard.py --selftest`: PASS.
- `python scripts/doc_guard.py`: 0 errors and 157 expected pre-freeze front-matter warnings.
- `python scripts/check.py`: PASS, 186 tooling tests; 745 prior run records validated. Record: `docs/testing/runs/20261030-181616-bryanseah234-tooling.md`.

## Remaining

- PR #382 still needs independent human review and approval before merge.
- Existing review nits about malformed map diagnostics, broad test filename matching, and cwd-relative untracked paths are unchanged.
