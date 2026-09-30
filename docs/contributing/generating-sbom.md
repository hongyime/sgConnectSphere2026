# Generating an SBOM

A **Software Bill of Materials** (SBOM) is a machine-readable inventory of the
third-party dependencies a project ships. It is the input to supply-chain
security work: license review, CVE cross-referencing, and dependency
provenance auditing.

This repository generates an SBOM manually, on demand. There is no CI job that
publishes SBOMs as build artefacts, mirroring the manual export convention used
for the backlog and test-case workbooks documented in
`docs/backlog/README.md`. Regenerate when the dependency tree changes and you
need a fresh snapshot for review; do not commit the output.

## What it produces

Two CycloneDX 1.5 JSON files under `artifacts/sbom/` (gitignored):

| File | Covers | Producer |
| --- | --- | --- |
| `npm.cdx.json` | npm workspace tree (root, `frontend/`, `backend/`) | `npm sbom` (built into npm >= 10) |
| `python-tooling.cdx.json` | Python dependencies pinned in `tooling/requirements.txt` | `cyclonedx-py requirements` (from `cyclonedx-bom` in the tooling env) |

CycloneDX was chosen over SPDX because `npm sbom` emits CycloneDX natively and
`cyclonedx-py` is the canonical CLI for the Python side. Using both produces a
single format across both dependency trees without introducing a third-party
tool for the npm side.

## Command

From the repository root:

```text
npm run sbom
```

Requirements: Node.js >= 22 (npm >= 10) and the repository tooling installed
via `python scripts/setup.py` (which pins `cyclonedx-bom` in
`tooling/requirements.txt`). The script uses the same
`scripts/tooling_env.py` interpreter-resolution pattern as
`scripts/check.py` and `scripts/coverage_tooling.py`, so it works
identically on local clones and on the Windows network-share cache.

The script fails loudly if either SBOM is empty or the JSON does not parse as
CycloneDX. Expect roughly 250+ components in `npm.cdx.json` and 40+ components
in `python-tooling.cdx.json` today.

## When to regenerate

- Before a release cut, alongside the backlog/test-case workbook exports.
- After a dependency bump PR (`package-lock.json` or `tooling/requirements.txt`)
  where you need to review the new transitive tree.
- On demand when a supply-chain advisory (CVE, license issue, deprecation)
  needs a fresh inventory.

If a future team decision moves SBOM generation into CI as a scheduled artefact,
record it in `docs/decisions/` and adjust this guide together with the workflow.

## Inspecting the output

The files are standard CycloneDX 1.5 JSON and open in any SBOM viewer. For a
quick sanity check, filter the `components[].name` list:

```text
python -c "import json; d=json.load(open('artifacts/sbom/npm.cdx.json')); print(len(d['components']), 'components')"
```

Feed either file into an external tool (Dependency-Track, `grype`, `osv-scanner`,
GitHub's dependency review) when you need CVE cross-referencing; this repository
does not embed one.
