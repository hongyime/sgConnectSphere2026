# Generating and publishing SBOMs

A **Software Bill of Materials (SBOM)** is a machine-readable inventory of a
project's dependencies. It supports supply-chain review, including license
review, vulnerability cross-referencing, and dependency provenance checks.

## Why these files were ignored

The repository-wide `artifacts/` ignore rule keeps local review and scratch
outputs out of Git, including rendered PostPlans, screenshots, and test
reports. When the SBOM generator was added in
[PR #125](https://github.com/hongyime/sgConnectSphere2026/pull/125), its output
was put under that directory and intentionally left untracked. The PR chose
manual generation and treated the files like temporary exports; it did not
identify a security or privacy reason to keep them private.

That choice avoided generated-file diffs and stale snapshots, but also meant
there was no durable, public SBOM to download. The current policy tracks the two
SBOM files as the public dependency inventory. Their contents are derived from
the repository's public manifests, lockfile, and pinned tooling requirements.
The rest of `artifacts/` remains ignored for local scratch output.

CycloneDX includes package integrity hashes. The entropy-based secret scanner
mistakes these generated digests for credentials, so its hook skips only the two
SBOM files; the package manifests, npm lockfile, and Python requirements remain
in the normal secret scan.

Committed snapshots give readers direct access from the repository and remain
available with the source history. This repository has no tagged-release
publishing process, so attaching release assets would add a release workflow
that does not otherwise exist. CI artifacts would require a new workflow and
would be temporary. The tracked files do create diffs when dependencies change;
keep them current by regenerating them in the same change as dependency or
generator updates.

## What the files cover

Both files are generated under `artifacts/sbom/` and are tracked by Git:

| File | Covers | Producer | Current format |
| --- | --- | --- | --- |
| `npm.cdx.json` | Root, frontend, and backend npm workspaces from the lockfile | npm's built-in `npm sbom` | CycloneDX 1.5 |
| `python-tooling.cdx.json` | Python dependencies pinned in `tooling/requirements.txt` | `cyclonedx-py requirements` | CycloneDX 1.6 |

The listed format versions are those emitted by the current generator run; npm
or `cyclonedx-bom` upgrades may change them. These SBOMs describe the dependency
manifests and lockfile, not an operating-system image, hosted runtime, or a
container image. Generate a separate SBOM from a final image if the project
starts shipping one.

## Generate and update

From the repository root, install the tooling as described in
[repository setup](../repository-setup.md), then run:

```text
npm run sbom
```

This needs Node.js 22 or newer (npm 10 or newer) and the repository tooling
environment, which pins `cyclonedx-bom` in `tooling/requirements.txt`. On a
Unix-like shell where `python` is not on `PATH`, run the same generator with:

```text
python3 scripts/generate_sbom.py
```

The generator reads `package-lock.json` without installing npm dependencies and
reads the pinned Python requirements. It validates that both outputs parse as
CycloneDX JSON and contain components. Include both updated files in the same
change when npm manifests or the lockfile, `tooling/requirements.txt`, the
generator, or its SBOM-producing tool versions change. Review component and
version changes alongside the source dependency diff.

The generated files are inventories only. They do not scan for known
vulnerabilities or establish license compliance; run the team's chosen review
tools separately when those checks are needed.

## Inspecting an output

For a quick count of npm components:

```text
python3 -c "import json; d=json.load(open('artifacts/sbom/npm.cdx.json')); print(len(d['components']), 'components')"
```

Either JSON file can be loaded by CycloneDX-compatible tools such as
Dependency-Track, `grype`, or `osv-scanner` for further review.
