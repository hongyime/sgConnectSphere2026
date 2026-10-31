# 0018 - Guard code changes against doc drift

## Status

Accepted. `docs/doc-map.json`, `scripts/doc_guard.py`, and
`.github/workflows/doc-guard.yml` in this change are the implementation. Strict
mode begins when `docs/FREEZE` is created at release freeze.

## Decision

`docs/doc-map.json` maps seven code areas to the docs that own them: API
handlers, backend modules and services, data model and migrations, frontend,
shared contracts, dependencies and infra, and tests. An `exempt` list keeps
generated and evidence directories out of the per-doc checks:
`docs/testing/runs`, `docs/testing/history`, `docs/testing/manual`,
`docs/plans`, exported `.xlsx`, `.docx`, and `.pdf` files, register READMEs, and
`docs/testing/tc-coverage.md`.

A pull request that changes mapped code must also change at least one mapped
doc, or carry the commit trailer `Docs-Impact: none — <reason>` in a commit
body inside the PR range.

`scripts/doc_guard.py` is stdlib-only. It reads no environment variable and does
not contact Jira or the network. The base ref or SHA is its first argument,
defaulting to `origin/main`. It exits 1 on an unwaived rule hit and 2 when the
base has not been fetched.

Per-doc front-matter findings are warnings today: a missing front-matter block,
a `status` outside draft, provisional, or final, and a `verified_against`
commit that is not in the branch history or is stale against mapped code.

`docs/FREEZE` flips every warning to an error. It also fails a doc whose status
is not `final`, or that contains `NEEDS-REVIEW` or the provisional Sprint 4
marker. The file must only be created at release freeze.

## Rationale

Docs and code drift silently. The runtime contract changes in
`docs/architecture.md`, `docs/db_schema.md`, `docs/contracts/`, and `design.md`
were previously caught only when a human remembered to look.

The guard is direction-agnostic. It does not reverse the Markdown-authoritative
order in decisions 0004 and 0005, and it does not derive docs from Git or Jira.
It only requires that code and the docs that own it move together.

A narrow, reviewable waiver in a commit body beats the implicit alternative: a
docs-only commit that looks compliant but does not document the change.

Keeping the mapping as data makes a rule change a one-file edit. Front matter is
deliberately deferred to the freeze, so this change does not require a sweep of
about 150 existing docs.

## Enforcement

`.github/workflows/doc-guard.yml` runs job `guard` on `pull_request` to `main`,
with read-only `contents: read`, `fetch-depth: 0`, Python 3.12, and the PR base
SHA passed through `env` so fork and dependabot pull requests work.

Locally, run `python scripts/doc_guard.py`. `python scripts/doc_guard.py
--selftest` is the offline self-check.

`AGENTS.md` documents the guard, the trailer, and `docs/FREEZE` for every
harness.

The residual cost is honest: until `docs/FREEZE` exists, per-doc checks are
advisory, so "stale since last check" is visible but not blocking. A waiver is
only as trustworthy as the reviewer who reads it.
