"""Generate a Software Bill of Materials (SBOM) for this repository.

Two CycloneDX JSON files are produced side-by-side. Their spec versions are
reported by the generator because npm and the Python tooling can emit different
CycloneDX versions:

- `artifacts/sbom/npm.cdx.json` covers the npm workspace tree (frontend and
  backend) produced by npm's native `npm sbom` command (npm >= 10).
- `artifacts/sbom/python-tooling.cdx.json` covers the Python tooling in
  `tooling/requirements.txt` produced by the `cyclonedx-py` CLI shipped with
  `cyclonedx-bom`.

CycloneDX was chosen over SPDX for two reasons: npm's native `npm sbom` emits
CycloneDX by default, and `cyclonedx-py` is the canonical CLI for the Python
tooling side; using both means a single format across the two dependency trees
without shelling out to a third-party tool for the npm side.

The generated files are committed as the public dependency inventory for the
current manifests and lockfiles. Regenerate and include both outputs in the
same change when npm manifests or lockfiles, `tooling/requirements.txt`, or
this generator changes. See `docs/contributing/generating-sbom.md` for details.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path
from typing import NotRequired, TypedDict

from tooling_env import python_path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "artifacts" / "sbom"
NPM_OUTPUT = OUTPUT_DIR / "npm.cdx.json"
PYTHON_OUTPUT = OUTPUT_DIR / "python-tooling.cdx.json"
PYTHON_REQUIREMENTS = ROOT / "tooling" / "requirements.txt"
PACKAGE_LOCK = ROOT / "package-lock.json"


BomComponent = TypedDict(
    "BomComponent", {"name": str, "bom-ref": str},
)


class BomDependency(TypedDict):
    ref: str
    dependsOn: NotRequired[list[str]]


class BomMetadataComponent(TypedDict, total=False):
    name: str


class BomMetadata(TypedDict):
    component: BomMetadataComponent


class NpmBom(TypedDict):
    components: list[BomComponent]
    dependencies: list[BomDependency]
    metadata: BomMetadata


class PackageManifest(TypedDict):
    name: str


class LockPackage(TypedDict, total=False):
    dependencies: dict[str, str]
    devDependencies: dict[str, str]
    optionalDependencies: dict[str, str]
    peerDependencies: dict[str, str]


class PackageLock(TypedDict):
    packages: dict[str, LockPackage]


def _resolve_npm() -> str:
    """Return the npm executable path; on Windows this is `npm.cmd`."""
    for candidate in ("npm.cmd", "npm"):
        found = shutil.which(candidate)
        if found:
            return found
    raise SystemExit("npm not found on PATH. Install Node.js >= 22 and retry.")


def _generate_npm_sbom() -> int:
    npm = _resolve_npm()
    print(f"Generating npm SBOM into {NPM_OUTPUT.relative_to(ROOT)}...")
    command = [npm, "sbom", "--sbom-format", "cyclonedx", "--package-lock-only"]
    workspace_result = subprocess.run(
        [*command, "--workspaces", "--include-workspace-root"],
        cwd=ROOT, capture_output=True, text=True, check=False,
    )
    if workspace_result.returncode:
        print(workspace_result.stderr)
        return workspace_result.returncode
    root_result = subprocess.run(
        command, cwd=ROOT, capture_output=True, text=True, check=False,
    )
    if root_result.returncode:
        print(root_result.stderr)
        return root_result.returncode
    workspace_bom: NpmBom = json.loads(workspace_result.stdout)
    root_bom: NpmBom = json.loads(root_result.stdout)
    package_manifest: PackageManifest = json.loads(
        (ROOT / "package.json").read_text(encoding="utf-8"),
    )
    NPM_OUTPUT.write_text(
        json.dumps(
            _merge_npm_boms(workspace_bom, root_bom, package_manifest["name"]),
            indent=2,
        ) + "\n",
        encoding="utf-8",
    )
    return 0


def _merge_npm_boms(
    workspace_bom: NpmBom, root_bom: NpmBom, root_name: str,
) -> NpmBom:
    components = {
        component["bom-ref"]: component
        for component in [*workspace_bom["components"], *root_bom["components"]]
    }
    dependency_edges: dict[str, set[str]] = {}
    for dependency in [*workspace_bom["dependencies"], *root_bom["dependencies"]]:
        refs = dependency_edges.setdefault(dependency["ref"], set())
        refs.update(dependency.get("dependsOn", []))

    workspace_bom["components"] = [components[key] for key in sorted(components)]
    workspace_bom["dependencies"] = [
        {"ref": ref, "dependsOn": sorted(dependency_edges[ref])}
        for ref in sorted(dependency_edges)
    ]
    workspace_bom["metadata"]["component"]["name"] = root_name
    return workspace_bom


def _missing_root_dependencies(bom: NpmBom, package_lock: PackageLock) -> list[str]:
    root_package = package_lock["packages"][""]
    declared = set().union(
        root_package.get("dependencies", {}),
        root_package.get("devDependencies", {}),
        root_package.get("optionalDependencies", {}),
        root_package.get("peerDependencies", {}),
    )
    included = {component["name"] for component in bom["components"]}
    return sorted(declared - included)


def _check_root_dependency_completeness() -> int:
    bom: NpmBom = json.loads(NPM_OUTPUT.read_text(encoding="utf-8"))
    package_lock: PackageLock = json.loads(PACKAGE_LOCK.read_text(encoding="utf-8"))
    missing = _missing_root_dependencies(bom, package_lock)
    if missing:
        print(f"FAIL: npm.cdx.json is missing root dependencies: {', '.join(missing)}")
        return 1
    print("PASS: npm.cdx.json includes every root package-lock dependency.")
    return 0


def _generate_python_sbom() -> int:
    """Invoke `cyclonedx-py requirements` for the tooling requirements file."""
    tool_python = python_path()
    if not tool_python.is_file():
        print("Missing repository tooling. Run: python scripts/setup.py")
        return 1
    print(f"Generating Python tooling SBOM into "
          f"{PYTHON_OUTPUT.relative_to(ROOT)}...")
    result = subprocess.run(
        [
            str(tool_python), "-m", "cyclonedx_py", "requirements",
            str(PYTHON_REQUIREMENTS),
            "--of", "JSON",
            "-o", str(PYTHON_OUTPUT),
        ],
        cwd=ROOT, check=False,
    )
    if result.returncode:
        return result.returncode
    python_output = PYTHON_OUTPUT.read_text(encoding="utf-8")
    if not python_output.endswith("\n"):
        PYTHON_OUTPUT.write_text(python_output + "\n", encoding="utf-8")
    return result.returncode


def _sanity_check(path: Path, minimum_components: int) -> int:
    """Confirm the SBOM parses and has at least `minimum_components` items."""
    try:
        document = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"FAIL: {path.name} is not valid JSON: {exc}")
        return 1
    if document.get("bomFormat") != "CycloneDX":
        print(f"FAIL: {path.name} does not declare bomFormat=CycloneDX.")
        return 1
    components = document.get("components", [])
    if len(components) < minimum_components:
        print(f"FAIL: {path.name} lists {len(components)} components, "
              f"expected at least {minimum_components}.")
        return 1
    print(f"PASS: {path.name} lists {len(components)} components "
          f"(CycloneDX {document.get('specVersion', '?')}).")
    return 0


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    exit_code = _generate_npm_sbom()
    if exit_code:
        return exit_code
    exit_code = _generate_python_sbom()
    if exit_code:
        return exit_code
    if _sanity_check(NPM_OUTPUT, minimum_components=10):
        return 1
    if _check_root_dependency_completeness():
        return 1
    if _sanity_check(PYTHON_OUTPUT, minimum_components=1):
        return 1
    print(f"\nSBOM artifacts written to {OUTPUT_DIR.relative_to(ROOT)}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
