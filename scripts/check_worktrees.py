"""Report secondary git worktrees and safely clean disposable ones."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


def parse_worktree_output(stdout: str) -> list[dict[str, str]]:
    """Parse output from ``git worktree list --porcelain``."""
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
        current[parts[0]] = parts[1] if len(parts) > 1 else ""
    if current:
        worktrees.append(current)
    return worktrees


def list_worktrees(cwd: Path | None = None) -> list[dict[str, str]] | None:
    """List all worktrees, or return ``None`` if Git could not inspect them."""
    try:
        proc = subprocess.run(
            ["git", "worktree", "list", "--porcelain"],
            cwd=cwd,
            capture_output=True,
            text=True,
            check=True,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        print(f"WARN: Could not list git worktrees: {exc}", file=sys.stderr)
        return None
    return parse_worktree_output(proc.stdout)


def worktree_is_safe_to_remove(path: Path) -> tuple[bool, str]:
    """Require a clean worktree with an upstream and no commits ahead of it."""
    try:
        status = subprocess.run(
            ["git", "status", "--porcelain", "--untracked-files=all"],
            cwd=path,
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError:
        return False, "could not read worktree status"
    if status.returncode != 0:
        return False, "could not read worktree status"
    if status.stdout.strip():
        return False, "has uncommitted or untracked work"

    try:
        upstream = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"],
            cwd=path,
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError:
        return False, "could not resolve worktree upstream"
    if upstream.returncode != 0 or not upstream.stdout.strip():
        return False, "has no upstream; local commits cannot be ruled out"

    try:
        ahead = subprocess.run(
            ["git", "rev-list", "--count", f"{upstream.stdout.strip()}..HEAD"],
            cwd=path,
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError:
        return False, "could not compare branch with its upstream"
    if ahead.returncode != 0:
        return False, "could not compare branch with its upstream"
    if ahead.stdout.strip() != "0":
        return False, f"has {ahead.stdout.strip()} commit(s) ahead of its upstream"
    return True, "clean and fully pushed"


def is_link_or_junction(path: Path) -> bool:
    """Recognize POSIX symlinks and Windows directory junctions."""
    if path.is_symlink():
        return True
    isjunction = getattr(os.path, "isjunction", None)
    return bool(isjunction and isjunction(path))


def unlink_directory_links(worktree: Path, *, force: bool = False) -> tuple[bool, list[str]]:
    """Unlink dependency links themselves without traversing their targets."""
    try:
        candidates = list(worktree.iterdir())
    except OSError as exc:
        return False, [f"could not inspect {worktree}: {exc}"]
    candidates.extend(
        worktree / relative
        for relative in ("backend/node_modules", "frontend/node_modules")
    )
    removed: list[str] = []
    seen: set[Path] = set()
    for path in candidates:
        if path in seen:
            continue
        seen.add(path)
        if not is_link_or_junction(path):
            continue
        if not force:
            relative = path.relative_to(worktree)
            ignored = subprocess.run(
                ["git", "check-ignore", "--quiet", "--", str(relative)],
                cwd=worktree,
                capture_output=True,
                check=False,
            )
            if ignored.returncode != 0:
                continue
        try:
            # On Windows, os.rmdir removes a directory symlink or junction
            # itself. On POSIX, unlink removes the link without following it.
            if os.name == "nt" and path.is_dir():
                os.rmdir(path)
            else:
                path.unlink()
            removed.append(str(path))
        except OSError as exc:
            return False, [*removed, f"could not unlink {path}: {exc}"]
    return True, removed


def clean_worktrees(
    worktrees: list[dict[str, str]],
    cwd: Path | None = None,
    *,
    force: bool = False,
) -> int:
    """Remove clean, pushed secondary worktrees; ``force`` is destructive."""
    secondary = worktrees[1:]
    if not secondary:
        print("No secondary worktrees to clean.")
        return 0

    plan: list[tuple[Path, str, bool]] = []
    for worktree in secondary:
        raw_path = worktree.get("worktree")
        if not raw_path:
            print("SKIP: worktree entry has no path.")
            plan.append((Path("."), "worktree entry has no path", False))
            continue
        path = Path(raw_path)
        branch = worktree.get("branch", "detached")
        if force:
            safe, reason = True, "--force explicitly requested"
        else:
            safe, reason = worktree_is_safe_to_remove(path)
        plan.append((path, reason, safe))
        action = "REMOVE" if safe else "SKIP"
        print(f"{action}: {path} ({branch}) — {reason}")

    failed = any(not safe for _, _, safe in plan)
    for path, _reason, safe in plan:
        if not safe or path == Path("."):
            continue
        links_ok, link_results = unlink_directory_links(path, force=force)
        for result in link_results:
            print(f"  {result}")
        if not links_ok:
            failed = True
            continue

        args = ["git", "worktree", "remove"]
        if force:
            args.append("--force")
        args.append(str(path))
        result = subprocess.run(
            args,
            cwd=cwd,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode == 0:
            print(f"  Removed {path}")
        else:
            print(f"  Could not remove {path}: {result.stderr.strip()}")
            failed = True

    subprocess.run(["git", "worktree", "prune"], cwd=cwd, check=False)
    return 1 if failed else 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Report and clean secondary git worktrees.")
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Remove secondary worktrees only when clean and fully pushed.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="With --clean, remove worktrees even if they contain unpushed or uncommitted work.",
    )
    args = parser.parse_args(argv)
    if args.force and not args.clean:
        parser.error("--force requires --clean")

    worktrees = list_worktrees()
    if worktrees is None:
        return 0
    secondary = worktrees[1:]
    if not secondary:
        print("PASS: No secondary git worktrees detected.")
        return 0

    if args.clean:
        return clean_worktrees(worktrees, force=args.force)

    print("WARN: Secondary worktrees are present; check they are intentional:")
    for worktree in secondary:
        path = worktree.get("worktree", "<unknown>")
        branch = worktree.get("branch", "detached")
        print(f"  - {path} ({branch})")
    print("Use `python scripts/check_worktrees.py --clean` to remove only clean, fully pushed worktrees.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
