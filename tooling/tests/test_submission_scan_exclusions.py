"""Keep submission-only scan exclusions narrow and explicit."""
from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class SubmissionScanExclusionTests(unittest.TestCase):
    def test_trufflehog_excludes_only_the_root_submission_tree(self):
        self.assertEqual(
            (ROOT / ".trufflehog-exclude-paths").read_text(encoding="utf-8"),
            "^submission/\n",
        )
        workflow = (ROOT / ".github/workflows/trufflehog.yml").read_text(encoding="utf-8")
        self.assertIn(
            "extra_args: --no-verification --exclude-paths .trufflehog-exclude-paths",
            workflow,
        )

    def test_detect_secrets_keeps_non_submission_paths_in_scope(self):
        config = (ROOT / ".pre-commit-config.yaml").read_text(encoding="utf-8")
        self.assertIn(
            "exclude: ^(artifacts/sbom/(npm|python-tooling)\\.cdx\\.json$|submission/)",
            config,
        )


if __name__ == "__main__":
    unittest.main()
