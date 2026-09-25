"""Generate a Software Bill of Materials (SBOM) for this repository.

Two SBOM files are produced side-by-side, both in CycloneDX 1.5 JSON format:

- `artifacts/sbom/npm.cdx.json` covers the npm workspace tree (frontend and
  backend) produced by npm's native `npm sbom` command (npm >= 10).
- `artifacts/sbom/python-tooling.cdx.json` covers the Python tooling in
  `tooling/requirements.txt` produced by the `cyclonedx-py` CLI shipped with
  `cyclonedx-bom`.

CycloneDX was chosen over SPDX for two reasons: npm's native `npm sbom` emits
CycloneDX by default, and `cyclonedx-py` is the canonical CLI for the Python
tooling side; using both means a single format across the two dependency trees
without shelling out to a third-party tool for the npm side.

The output is intentionally not committed. Regenerate on demand for release
audits, dependency reviews, or supply-chain security work; see
`docs/contributing/generating-sbom.md` for when and why. This mirrors the
manual export convention used for the backlog and test-case workbooks in
`docs/backlog/README.md`.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from tooling_env import python_path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "artifacts" / "sbom"
NPM_OUTPUT = OUTPUT_DIR / "npm.cdx.json"
PYTHON_OUTPUT = OUTPUT_DIR / "python-tooling.cdx.json"
PYTHON_REQUIREMENTS = ROOT / "tooling" / "requirements.txt"


def _resolve_npm() -> str:
    """Return the npm executable path; on Windows this is `npm.cmd`."""
    for candidate in ("npm.cmd", "npm"):
        found = shutil.which(candidate)
        if found:
            return found
    raise SystemExit("npm not found on PATH. Install Node.js >= 22 and retry.")


def _generate_npm_sbom() -> int:
    """Invoke `npm sbom` and write CycloneDX JSON to NPM_OUTPUT."""
    npm = _resolve_npm()
    print(f"Generating npm SBOM into {NPM_OUTPUT.relative_to(ROOT)}...")
    result = subprocess.run(
        [
            npm, "sbom",
            "--sbom-format", "cyclonedx",
            "--package-lock-only",
            "--workspaces",
            "--include-workspace-root",
        ],
        cwd=ROOT, capture_output=True, text=True, check=False,
    )
    if result.returncode:
        print(result.stderr)
        return result.returncode
    NPM_OUTPUT.write_text(result.stdout, encoding="utf-8")
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
    if _sanity_check(PYTHON_OUTPUT, minimum_components=1):
        return 1
    print(f"\nSBOM artifacts written to {OUTPUT_DIR.relative_to(ROOT)}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
