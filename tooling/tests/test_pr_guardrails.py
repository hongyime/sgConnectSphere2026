import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[2] / "scripts" / "check_pr_guardrails.py"
SPEC = importlib.util.spec_from_file_location("check_pr_guardrails", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class ReferenceArtifactTests(unittest.TestCase):
    def test_new_reference_file_is_allowed(self):
        changes = [("A", ["docs/bdr/customer-sources/Week 10.xlsx"])]
        self.assertEqual(MODULE.reference_artifact_errors(changes), [])

    def test_modified_reference_file_is_rejected(self):
        changes = [("M", ["docs/BACKLOG DECISION REVIEW CAA 261026.docx"])]
        errors = MODULE.reference_artifact_errors(changes)
        self.assertEqual(len(errors), 1)
        self.assertIn("read-only", errors[0])

    def test_renamed_reference_file_is_rejected(self):
        changes = [
            (
                "R100",
                [
                    "docs/old.xlsx",
                    "docs/new.xlsx",
                ],
            )
        ]
        self.assertEqual(len(MODULE.reference_artifact_errors(changes)), 1)

    def test_markdown_is_not_a_reference_binary(self):
        changes = [("M", ["docs/bdr/B-team-decisions.md"])]
        self.assertEqual(MODULE.reference_artifact_errors(changes), [])


class PullRequestPolicyTests(unittest.TestCase):
    POLICY = {
        "effective_after": "2026-10-27T00:00:00Z",
        "max_open_prs": 10,
        "max_open_prs_per_author": 2,
        "max_changed_files": 40,
        "max_additions": 1500,
        "max_deletions": 1000,
    }

    def test_old_pr_is_grandfathered(self):
        current = {
            "number": 1,
            "createdAt": "2026-10-26T12:00:00Z",
            "author": {"login": "agent-user"},
        }
        open_prs = [current] * 20
        self.assertEqual(MODULE.pr_limit_errors(current=current, open_prs=open_prs, policy=self.POLICY), [])

    def test_new_pr_hits_open_pr_limit(self):
        current = {
            "number": 11,
            "createdAt": "2026-10-27T12:00:00Z",
            "author": {"login": "agent-user"},
        }
        open_prs = [current] * 11
        errors = MODULE.pr_limit_errors(current=current, open_prs=open_prs, policy=self.POLICY)
        self.assertTrue(any("open PRs" in error for error in errors))

    def test_new_pr_hits_size_limit(self):
        current = {
            "number": 12,
            "createdAt": "2026-10-27T12:00:00Z",
            "author": {"login": "agent-user"},
            "changedFiles": 41,
            "additions": 1501,
            "deletions": 1001,
        }
        errors = MODULE.pr_size_errors(current, self.POLICY)
        self.assertEqual(len(errors), 3)


if __name__ == "__main__":
    unittest.main()
