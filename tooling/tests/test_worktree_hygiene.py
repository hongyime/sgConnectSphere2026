"""Unit tests for safe worktree reporting and cleanup."""

import contextlib
import io
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import call, patch

from scripts.check_worktrees import (
    DEPENDENCY_LINK_PATHS,
    clean_worktrees,
    is_link_or_junction,
    list_worktrees,
    main,
    parse_worktree_output,
    unlink_directory_links,
    worktree_is_safe_to_remove,
)


def result(stdout="", returncode=0, stderr=""):
    return SimpleNamespace(stdout=stdout, returncode=returncode, stderr=stderr)


class WorktreeHygieneTests(unittest.TestCase):
    def test_parse_empty_output(self):
        self.assertEqual(parse_worktree_output(""), [])

    def test_parse_single_worktree(self):
        parsed = parse_worktree_output(
            "worktree /path/to/repo\nHEAD 1234567\nbranch refs/heads/main\n"
        )
        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]["worktree"], "/path/to/repo")
        self.assertEqual(parsed[0]["branch"], "refs/heads/main")

    def test_parse_multiple_worktrees(self):
        sample = (
            "worktree /path/to/repo\nHEAD 1234567\nbranch refs/heads/main\n\n\n"
            "worktree /path/to/repo-pr231\nHEAD 89abcdef\n"
            "branch refs/heads/feature/test\n"
        )
        parsed = parse_worktree_output(sample)
        self.assertEqual(len(parsed), 2)
        self.assertEqual(parsed[1]["worktree"], "/path/to/repo-pr231")
        self.assertEqual(parsed[1]["branch"], "refs/heads/feature/test")

    @patch("scripts.check_worktrees.subprocess.run", return_value=result("worktree /repo\n"))
    def test_list_worktrees(self, _run):
        self.assertEqual(list_worktrees(), [{"worktree": "/repo"}])

    @patch("scripts.check_worktrees.subprocess.run", side_effect=OSError("git unavailable"))
    def test_list_worktrees_failure_is_unknown(self, _run):
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertIsNone(list_worktrees())

    @patch("scripts.check_worktrees.subprocess.run", return_value=result(" M file.py\n"))
    def test_dirty_worktree_is_not_safe(self, run):
        safe, reason = worktree_is_safe_to_remove(Path("/repo/wt"))
        self.assertFalse(safe)
        self.assertIn("uncommitted", reason)
        run.assert_called_once()

    @patch("scripts.check_worktrees.subprocess.run", return_value=result(returncode=1))
    def test_status_error_is_not_safe(self, _run):
        self.assertEqual(
            worktree_is_safe_to_remove(Path("/repo/wt")),
            (False, "could not read worktree status"),
        )

    @patch(
        "scripts.check_worktrees.subprocess.run",
        side_effect=[result(), result(returncode=1, stderr="no upstream")],
    )
    def test_worktree_without_upstream_is_not_safe(self, _run):
        safe, reason = worktree_is_safe_to_remove(Path("/repo/wt"))
        self.assertFalse(safe)
        self.assertIn("no upstream", reason)

    @patch("scripts.check_worktrees.subprocess.run", side_effect=[result(), OSError("rev-parse failed")])
    def test_upstream_error_is_not_safe(self, _run):
        self.assertEqual(
            worktree_is_safe_to_remove(Path("/repo/wt")),
            (False, "could not resolve worktree upstream"),
        )

    @patch(
        "scripts.check_worktrees.subprocess.run",
        side_effect=[result(), result("origin/feature\n"), result("2\n")],
    )
    def test_worktree_with_unpushed_commits_is_not_safe(self, _run):
        safe, reason = worktree_is_safe_to_remove(Path("/repo/wt"))
        self.assertFalse(safe)
        self.assertIn("2 commit", reason)

    @patch(
        "scripts.check_worktrees.subprocess.run",
        side_effect=[result(), result("origin/feature\n"), OSError("rev-list failed")],
    )
    def test_ahead_check_error_is_not_safe(self, _run):
        self.assertEqual(
            worktree_is_safe_to_remove(Path("/repo/wt")),
            (False, "could not compare branch with its upstream"),
        )

    @patch(
        "scripts.check_worktrees.subprocess.run",
        side_effect=[result(), result("origin/feature\n"), result(returncode=1)],
    )
    def test_ahead_command_failure_is_not_safe(self, _run):
        self.assertEqual(
            worktree_is_safe_to_remove(Path("/repo/wt")),
            (False, "could not compare branch with its upstream"),
        )

    @patch(
        "scripts.check_worktrees.subprocess.run",
        side_effect=[result(), result("origin/feature\n"), result("0\n"), result()],
    )
    def test_clean_fully_pushed_worktree_is_safe(self, _run):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual(
                worktree_is_safe_to_remove(Path(tmp)),
                (True, "clean and fully pushed"),
            )

    @patch(
        "scripts.check_worktrees.subprocess.run",
        side_effect=[
            result(),
            result("origin/feature\n"),
            result("0\n"),
            result("ignored-cache/keep.txt\0"),
        ],
    )
    def test_ignored_directory_data_is_not_safe_to_remove(self, _run):
        with tempfile.TemporaryDirectory() as tmp:
            worktree = Path(tmp)
            (worktree / "ignored-cache").mkdir()
            (worktree / "ignored-cache/keep.txt").write_text("keep")
            safe, reason = worktree_is_safe_to_remove(worktree)
        self.assertFalse(safe)
        self.assertIn("ignored files", reason)

    @patch(
        "scripts.check_worktrees.subprocess.run",
        side_effect=[
            result(),
            result("origin/feature\n"),
            result("0\n"),
            result("ignored.bin\0"),
        ],
    )
    def test_ignored_regular_top_level_file_is_not_safe_to_remove(self, _run):
        with tempfile.TemporaryDirectory() as tmp:
            worktree = Path(tmp)
            (worktree / "ignored.bin").write_text("keep")
            safe, reason = worktree_is_safe_to_remove(worktree)
        self.assertFalse(safe)
        self.assertIn("ignored files", reason)

    def test_ignored_dependency_symlink_is_safe_to_unlink(self):
        for relative in DEPENDENCY_LINK_PATHS:
            with self.subTest(relative=relative.as_posix()), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                worktree = root / "worktree"
                worktree.mkdir()
                target = root / "shared-node-modules"
                target.mkdir()
                link = worktree / relative
                link.parent.mkdir(parents=True, exist_ok=True)
                link.symlink_to(target, target_is_directory=True)
                with patch(
                    "scripts.check_worktrees.subprocess.run",
                    side_effect=[
                        result(),
                        result("origin/feature\n"),
                        result("0\n"),
                        result(relative.as_posix() + "\0"),
                    ],
                ):
                    self.assertEqual(
                        worktree_is_safe_to_remove(worktree),
                        (True, "clean and fully pushed"),
                    )

    @patch(
        "scripts.check_worktrees.subprocess.run",
        side_effect=[
            result(),
            result("origin/feature\n"),
            result("0\n"),
            result("user-data-link\0"),
        ],
    )
    def test_ignored_arbitrary_symlink_is_not_safe_to_remove(self, _run):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            worktree = root / "worktree"
            worktree.mkdir()
            target = root / "user-data"
            target.mkdir()
            (worktree / "user-data-link").symlink_to(target, target_is_directory=True)
            safe, reason = worktree_is_safe_to_remove(worktree)
        self.assertFalse(safe)
        self.assertIn("ignored files", reason)

    @patch(
        "scripts.check_worktrees.subprocess.run",
        side_effect=[result(), result("origin/feature\n"), result("0\n"), OSError("git failed")],
    )
    def test_ignored_file_inspection_error_is_not_safe(self, _run):
        with tempfile.TemporaryDirectory() as tmp:
            safe, reason = worktree_is_safe_to_remove(Path(tmp))
        self.assertFalse(safe)
        self.assertIn("could not inspect ignored", reason)

    @patch(
        "scripts.check_worktrees.subprocess.run",
        side_effect=[result(), result("origin/feature\n"), result("0\n"), result(returncode=1)],
    )
    def test_ignored_file_inspection_failure_is_not_safe(self, _run):
        with tempfile.TemporaryDirectory() as tmp:
            safe, reason = worktree_is_safe_to_remove(Path(tmp))
        self.assertFalse(safe)
        self.assertIn("could not inspect ignored", reason)

    @patch(
        "scripts.check_worktrees.subprocess.run",
        side_effect=[result(), result("origin/feature\n"), result("0\n"), result()],
    )
    def test_unreadable_worktree_directory_is_not_safe(self, _run):
        with tempfile.TemporaryDirectory() as tmp:
            with patch.object(Path, "iterdir", side_effect=OSError("permission denied")):
                safe, reason = worktree_is_safe_to_remove(Path(tmp))
        self.assertFalse(safe)
        self.assertIn("could not inspect ignored", reason)

    @patch("scripts.check_worktrees.subprocess.run", side_effect=OSError("missing path"))
    def test_missing_worktree_is_not_safe_to_remove(self, _run):
        safe, reason = worktree_is_safe_to_remove(Path("/missing/worktree"))
        self.assertFalse(safe)
        self.assertIn("could not read", reason)

    def test_is_link_or_junction_for_symlink_and_regular_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = root / "target"
            target.mkdir()
            link = root / "link"
            link.symlink_to(target, target_is_directory=True)
            self.assertTrue(is_link_or_junction(link))
            self.assertFalse(is_link_or_junction(target))

    @patch("scripts.check_worktrees.os.path.isjunction", return_value=True, create=True)
    def test_is_link_or_junction_for_windows_junction(self, _isjunction):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertTrue(is_link_or_junction(Path(tmp) / "junction"))

    def test_unlink_directory_links_missing_path(self):
        with patch.object(Path, "iterdir", side_effect=OSError("missing")):
            ok, messages = unlink_directory_links(Path("/missing/worktree"))
        self.assertFalse(ok)
        self.assertIn("could not inspect", messages[0])

    @patch("scripts.check_worktrees.subprocess.run", return_value=result())
    def test_unlink_only_recognized_dependency_links(self, _run):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            worktree = root / "worktree"
            worktree.mkdir()
            target = root / "shared-node-modules"
            target.mkdir()
            marker = target / "keep.txt"
            marker.write_text("target remains")
            dependency_link = worktree / "node_modules"
            dependency_link.symlink_to(target, target_is_directory=True)
            user_link = worktree / "user-data-link"
            user_link.symlink_to(target, target_is_directory=True)

            ok, messages = unlink_directory_links(worktree)

            self.assertTrue(ok)
            self.assertEqual(messages, [str(dependency_link)])
            self.assertFalse(dependency_link.exists())
            self.assertTrue(user_link.is_symlink())
            self.assertEqual(marker.read_text(), "target remains")

    @patch("scripts.check_worktrees.subprocess.run", return_value=result())
    def test_force_unlinks_symlink_without_following_target(self, _run):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            worktree = root / "worktree"
            worktree.mkdir()
            target = root / "shared"
            target.mkdir()
            marker = target / "keep.txt"
            marker.write_text("safe")
            link = worktree / "node_modules"
            link.symlink_to(target, target_is_directory=True)
            ok, messages = unlink_directory_links(worktree, force=True)
            self.assertTrue(ok)
            self.assertEqual(len(messages), 1)
            self.assertFalse(link.exists())
            self.assertEqual(marker.read_text(), "safe")

    def test_unlink_error_is_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            worktree = Path(tmp)
            candidate = worktree / "node_modules"
            candidate.symlink_to(worktree, target_is_directory=True)
            with (
                patch("scripts.check_worktrees.is_link_or_junction", side_effect=lambda path: path == candidate),
                patch.object(Path, "unlink", side_effect=OSError("access denied")),
            ):
                ok, messages = unlink_directory_links(worktree, force=True)
        self.assertFalse(ok)
        self.assertIn("access denied", messages[0])

    @patch("scripts.check_worktrees.subprocess.run", return_value=result())
    def test_unlink_junction_preserves_target(self, _run):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            worktree = root / "worktree"
            worktree.mkdir()
            target = root / "shared-node-modules"
            target.mkdir()
            marker = target / "keep.txt"
            marker.write_text("target remains")
            link = worktree / "node_modules"
            link.symlink_to(target, target_is_directory=True)

            with (
                patch("scripts.check_worktrees.os.name", "nt"),
                patch("scripts.check_worktrees.os.rmdir", side_effect=lambda _path: link.unlink()) as rmdir,
            ):
                ok, messages = unlink_directory_links(worktree)

            self.assertTrue(ok)
            self.assertEqual(len(messages), 1)
            rmdir.assert_called_once_with(link)
            self.assertFalse(link.exists())
            self.assertEqual(marker.read_text(), "target remains")

    @patch("scripts.check_worktrees.subprocess.run", return_value=result(returncode=1))
    def test_unignored_symlink_is_left_for_git_to_remove(self, _run):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            worktree = root / "worktree"
            worktree.mkdir()
            target = root / "target"
            target.mkdir()
            link = worktree / "node_modules"
            link.symlink_to(target, target_is_directory=True)

            ok, messages = unlink_directory_links(worktree)

            self.assertTrue(ok)
            self.assertEqual(messages, [])
            self.assertTrue(link.is_symlink())
            self.assertTrue(target.is_dir())

    @patch("scripts.check_worktrees.worktree_is_safe_to_remove", return_value=(False, "has uncommitted work"))
    @patch("scripts.check_worktrees.subprocess.run", return_value=result())
    def test_clean_skips_dirty_worktree_without_force(self, run, _safety):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "worktree"
            path.mkdir()
            sentinel = path / "unsaved.txt"
            sentinel.write_text("keep")
            rc = clean_worktrees([{"worktree": "/repo"}, {"worktree": str(path)}])
            self.assertEqual(rc, 1)
            self.assertTrue(sentinel.exists())
            self.assertFalse(any(call.args[0][:3] == ["git", "worktree", "remove"] for call in run.call_args_list))

    def test_clean_no_secondary_worktrees_is_noop(self):
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(clean_worktrees([{"worktree": "/repo"}]), 0)

    @patch("scripts.check_worktrees.subprocess.run", return_value=result())
    def test_clean_reports_entry_without_path(self, run):
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(clean_worktrees([{"worktree": "/repo"}, {}]), 1)
        run.assert_called_once_with(["git", "worktree", "prune"], cwd=None, check=False)

    @patch("scripts.check_worktrees.unlink_directory_links", return_value=(True, []))
    @patch("scripts.check_worktrees.worktree_is_safe_to_remove", return_value=(True, "clean and fully pushed"))
    @patch("scripts.check_worktrees.subprocess.run", return_value=result())
    def test_clean_removes_safe_worktree(self, run, _safety, _unlink):
        rc = clean_worktrees([{"worktree": "/repo"}, {"worktree": "/repo/scratch"}], cwd=Path("/repo"))
        self.assertEqual(rc, 0)
        self.assertEqual(run.call_args_list[0].args[0], ["git", "worktree", "remove", "/repo/scratch"])

    @patch("scripts.check_worktrees.unlink_directory_links", return_value=(True, []))
    @patch("scripts.check_worktrees.worktree_is_safe_to_remove")
    @patch("scripts.check_worktrees.subprocess.run", return_value=result())
    def test_force_explicitly_removes_worktree(self, run, safety, _unlink):
        rc = clean_worktrees([{"worktree": "/repo"}, {"worktree": "/repo/scratch"}], force=True)
        self.assertEqual(rc, 0)
        safety.assert_not_called()
        self.assertEqual(run.call_args_list[0].args[0], ["git", "worktree", "remove", "--force", "/repo/scratch"])

    @patch("scripts.check_worktrees.unlink_directory_links", return_value=(False, ["link could not be removed"]))
    @patch("scripts.check_worktrees.worktree_is_safe_to_remove", return_value=(True, "clean and fully pushed"))
    @patch("scripts.check_worktrees.subprocess.run", return_value=result())
    def test_clean_stops_when_link_cannot_be_unlinked(self, run, _safety, _unlink):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            rc = clean_worktrees([{"worktree": "/repo"}, {"worktree": "/repo/scratch"}])
        self.assertEqual(rc, 1)
        self.assertIn("link could not be removed", output.getvalue())
        self.assertEqual(run.call_args_list, [call(["git", "worktree", "prune"], cwd=None, check=False)])

    @patch("scripts.check_worktrees.unlink_directory_links", return_value=(True, []))
    @patch("scripts.check_worktrees.worktree_is_safe_to_remove", return_value=(True, "clean and fully pushed"))
    @patch(
        "scripts.check_worktrees.subprocess.run",
        side_effect=[result(returncode=1, stderr="cannot remove"), result()],
    )
    def test_clean_reports_git_remove_failure(self, run, _safety, _unlink):
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(clean_worktrees([{"worktree": "/repo"}, {"worktree": "/repo/scratch"}]), 1)
        self.assertEqual(run.call_args_list[0].args[0], ["git", "worktree", "remove", "/repo/scratch"])
        self.assertEqual(run.call_args_list[0].kwargs["check"], False)

    @patch("scripts.check_worktrees.list_worktrees", return_value=[{"worktree": "/repo"}])
    def test_main_passes_with_single_worktree(self, _list):
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(main([]), 0)

    @patch(
        "scripts.check_worktrees.list_worktrees",
        return_value=[{"worktree": "/repo"}, {"worktree": "/repo-review", "branch": "refs/heads/review"}],
    )
    def test_main_warns_but_does_not_block_for_secondary_worktree(self, _list):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertEqual(main([]), 0)
        self.assertIn("WARN", output.getvalue())
        self.assertIn("/repo-review", output.getvalue())

    @patch("scripts.check_worktrees.list_worktrees", return_value=None)
    def test_main_passes_with_worktree_inspection_warning(self, _list):
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(main([]), 0)

    @patch("scripts.check_worktrees.list_worktrees", return_value=[{"worktree": "/repo"}, {"worktree": "/repo/scratch"}])
    @patch("scripts.check_worktrees.clean_worktrees", return_value=0)
    def test_main_routes_clean_options(self, clean, _list):
        self.assertEqual(main(["--clean", "--force"]), 0)
        clean.assert_called_once_with([{"worktree": "/repo"}, {"worktree": "/repo/scratch"}], force=True)

    def test_force_requires_clean_flag(self):
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            main(["--force"])


if __name__ == "__main__":
    unittest.main()
