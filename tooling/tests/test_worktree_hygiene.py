"""Unit tests for worktree hygiene script."""

import unittest
from unittest.mock import patch

from scripts.check_worktrees import clean_worktrees, main, parse_worktree_output


class WorktreeHygieneTests(unittest.TestCase):
    def test_parse_empty_output(self):
        self.assertEqual(parse_worktree_output(""), [])

    def test_parse_single_worktree(self):
        sample = (
            "worktree /path/to/repo\n"
            "HEAD 1234567\n"
            "branch refs/heads/main\n"
        )
        parsed = parse_worktree_output(sample)
        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]["worktree"], "/path/to/repo")
        self.assertEqual(parsed[0]["branch"], "refs/heads/main")

    def test_parse_multiple_worktrees(self):
        sample = (
            "worktree /path/to/repo\n"
            "HEAD 1234567\n"
            "branch refs/heads/main\n\n"
            "worktree /path/to/repo-pr231\n"
            "HEAD 89abcdef\n"
            "branch refs/heads/feature/test\n"
        )
        parsed = parse_worktree_output(sample)
        self.assertEqual(len(parsed), 2)
        self.assertEqual(parsed[0]["worktree"], "/path/to/repo")
        self.assertEqual(parsed[1]["worktree"], "/path/to/repo-pr231")
        self.assertEqual(parsed[1]["branch"], "refs/heads/feature/test")

    @patch("scripts.check_worktrees.list_worktrees")
    def test_main_passes_with_single_worktree(self, mock_list):
        mock_list.return_value = [{"worktree": "/repo", "branch": "refs/heads/main"}]
        self.assertEqual(main([]), 0)

    @patch("scripts.check_worktrees.list_worktrees")
    def test_main_fails_with_secondary_worktrees(self, mock_list):
        mock_list.return_value = [
            {"worktree": "/repo", "branch": "refs/heads/main"},
            {"worktree": "/repo-stale", "branch": "refs/heads/stale"},
        ]
        self.assertEqual(main([]), 1)

    @patch("scripts.check_worktrees.list_worktrees")
    @patch("scripts.check_worktrees.clean_worktrees")
    def test_main_cleans_when_flag_provided(self, mock_clean, mock_list):
        mock_list.return_value = [
            {"worktree": "/repo", "branch": "refs/heads/main"},
            {"worktree": "/repo-stale", "branch": "refs/heads/stale"},
        ]
        mock_clean.return_value = 0
        self.assertEqual(main(["--clean"]), 0)
        mock_clean.assert_called_once()

    def test_clean_worktrees_noop_when_single(self):
        self.assertEqual(clean_worktrees([{"worktree": "/repo"}]), 0)


if __name__ == "__main__":
    unittest.main()
