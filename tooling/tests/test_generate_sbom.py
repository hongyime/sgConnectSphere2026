"""Regression tests for complete npm SBOM generation."""

import importlib.util
import json
import sys
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "generate_sbom.py"
sys.path.insert(0, str(SCRIPT.parent))
SPEC = importlib.util.spec_from_file_location("generate_sbom", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
generate_sbom = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(generate_sbom)
sys.path.pop(0)


class NpmSbomTests(unittest.TestCase):
    def test_merge_unions_components_and_dependency_edges(self):
        workspace_bom = {
            "components": [{"name": "workspace-package", "bom-ref": "workspace@1"}],
            "dependencies": [{"ref": "root@1", "dependsOn": ["workspace@1"]}],
            "metadata": {"component": {"name": "temporary-worktree-name"}},
        }
        root_bom = {
            "components": [{"name": "root-only-package", "bom-ref": "root-only@1"}],
            "dependencies": [{"ref": "root@1", "dependsOn": ["root-only@1"]}],
            "metadata": {"component": {"name": "temporary-worktree-name"}},
        }

        merged = generate_sbom._merge_npm_boms(
            workspace_bom, root_bom, "canonical-project-name",
        )

        self.assertEqual(
            {component["bom-ref"] for component in merged["components"]},
            {"workspace@1", "root-only@1"},
        )
        self.assertEqual(
            merged["dependencies"],
            [{"ref": "root@1", "dependsOn": ["root-only@1", "workspace@1"]}],
        )
        self.assertEqual(
            merged["metadata"]["component"]["name"], "canonical-project-name",
        )

    def test_every_declared_root_dependency_must_be_included(self):
        bom = {
            "components": [
                {"name": "@playwright/test", "bom-ref": "@playwright/test@1"},
                {"name": "@types/node", "bom-ref": "@types/node@1"},
            ],
            "dependencies": [],
        }
        package_lock = {
            "packages": {
                "": {
                    "devDependencies": {
                        "@playwright/test": "^1.0.0",
                        "@stryker-mutator/core": "^1.0.0",
                    },
                    "dependencies": {"@types/node": "^1.0.0"},
                },
            },
        }

        missing = generate_sbom._missing_root_dependencies(bom, package_lock)

        self.assertEqual(missing, ["@stryker-mutator/core"])

    def test_complete_root_dependencies_produce_no_missing_names(self):
        bom = {
            "components": [
                {"name": "@playwright/test", "bom-ref": "@playwright/test@1"},
                {"name": "@stryker-mutator/core", "bom-ref": "@stryker-mutator/core@1"},
            ],
            "dependencies": [],
        }
        package_lock = {
            "packages": {
                "": {
                    "devDependencies": {
                        "@playwright/test": "^1.0.0",
                        "@stryker-mutator/core": "^1.0.0",
                    },
                },
            },
        }

        missing = generate_sbom._missing_root_dependencies(bom, package_lock)

        self.assertEqual(missing, [])

    def test_generated_npm_sbom_covers_locked_root_dependencies(self):
        root = SCRIPT.parents[1]
        bom = json.loads((root / "artifacts/sbom/npm.cdx.json").read_text(encoding="utf-8"))
        package_lock = json.loads((root / "package-lock.json").read_text(encoding="utf-8"))

        missing = generate_sbom._missing_root_dependencies(bom, package_lock)

        self.assertEqual(missing, [])

    def test_generated_python_sbom_has_trailing_newline(self):
        output = SCRIPT.parents[1] / "artifacts/sbom/python-tooling.cdx.json"

        self.assertTrue(output.read_text(encoding="utf-8").endswith("\n"))

    def test_npm_root_metadata_uses_manifest_name(self):
        root = SCRIPT.parents[1]
        bom = json.loads((root / "artifacts/sbom/npm.cdx.json").read_text(encoding="utf-8"))
        package_manifest = json.loads((root / "package.json").read_text(encoding="utf-8"))

        self.assertEqual(bom["metadata"]["component"]["name"], package_manifest["name"])


if __name__ == "__main__":
    unittest.main()
