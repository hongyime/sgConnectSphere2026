"""Enforce repository worktree hygiene policy.

No secondary git worktrees may be left behind on disk.
When invoked with `--clean`, safely tears down all secondary worktrees.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path


def parse_worktree_output(stdout: str) -> list[dict[str, str]]:
    """Parse output from `git worktree list --porcelain`."""
    worktrees: list[dict[str, str]] = []
    current: dict[str, str] = {}
    for line in stdout.splitlines():
        line = line.strip()
        if not line:
            if current:
                worktrees.append(current)
                current = {}
            continue
        parts = line.split(" ", 1)
        key = parts[0]
        val = parts[1] if len(parts) > 1 else ""
        current[key] = val
    if current:
        worktrees.append(current)
    return worktrees


def list_worktrees(cwd: Path | None = None) -> list[dict[str, str]]:
    """List all git worktrees from `git worktree list --porcelain`."""
    try:
        proc = subprocess.run(
            ["git", "worktree", "list", "--porcelain"],
            cwd=cwd,
            capture_output=True,
            text=True,
            check=True,
        )
    except Exception as exc:
        print(f"Error running git worktree list: {exc}", file=sys.stderr)
        return []
    return parse_worktree_output(proc.stdout)


def clean_worktrees(worktrees: list[dict[str, str]], cwd: Path | None = None) -> int:
    """Safely tear down all secondary worktrees."""
    if len(worktrees) <= 1:
        print("No secondary worktrees to clean.")
        return 0

    secondary = worktrees[1:]
    exit_code = 0
    for wt in secondary:
        path_str = wt.get("worktree")
        if not path_str:
            continue
        wt_path = Path(path_str)
        branch = wt.get("branch", "detached")
        print(f"Removing secondary worktree: {wt_path} (branch: {branch})")

        # 1. Unlink directory junctions if present (Windows specific, e.g. .venv-tools)
        venv_tools = wt_path / ".venv-tools"
        if venv_tools.exists() or venv_tools.is_symlink():
            try:
                if os.name == "nt":
                    subprocess.run(
                        f'cmd /c rmdir "{venv_tools}"',
                        shell=True,
                        check=False,
                        capture_output=True,
                    )
                else:
                    if venv_tools.is_symlink():
                        venv_tools.unlink(missing_ok=True)
                    else:
                        shutil.rmtree(venv_tools, ignore_errors=True)
            except Exception as err:
                print(f"  Warning unlinking junction {venv_tools}: {err}")

        # 2. Run git worktree remove --force
        res = subprocess.run(
            ["git", "worktree", "remove", "--force", str(wt_path)],
            cwd=cwd,
            capture_output=True,
            text=True,
        )
        if res.returncode == 0:
            print(f"  git worktree remove --force succeeded for {wt_path}")
        else:
            print(f"  git worktree remove failed: {res.stderr.strip()}")

        # 3. Clean up any leftover directory
        if wt_path.exists():
            try:
                shutil.rmtree(wt_path, ignore_errors=True)
                if not wt_path.exists():
                    print(f"  Removed directory: {wt_path}")
            except Exception as err:
                print(f"  Failed removing directory {wt_path}: {err}")
                exit_code = 1

    # Prune metadata
    subprocess.run(["git", "worktree", "prune"], cwd=cwd, check=False)
    return exit_code


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Audit and clean secondary git worktrees.")
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Automatically remove all secondary worktrees and prune git metadata.",
    )
    args = parser.parse_args(argv)

    worktrees = list_worktrees()
    if not worktrees:
        return 0

    secondary = worktrees[1:]
    if not secondary:
        print("PASS: No secondary git worktrees detected.")
        return 0

    if args.clean:
        return clean_worktrees(worktrees)

    print("FAIL: Secondary git worktree(s) detected:")
    for wt in secondary:
        path = wt.get("worktree", "<unknown>")
        branch = wt.get("branch", "detached")
        print(f"  - {path} ({branch})")
    print(
        "\nRepository policy forbids leaving temporary worktrees on disk.\n"
        "To clean them automatically, run: python scripts/check_worktrees.py --clean"
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
