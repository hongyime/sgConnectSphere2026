#!/usr/bin/env python3
"""Repository check for Vercel /api/ serverless function conventions.

Vercel maps every file under ``api/`` to one serverless function whose URL path
is derived from the file path. Two failure modes are silent in the Vercel build
but break production:

1. **Route collision.** ``api/foo.ts`` and ``api/foo/index.ts`` both map to the
   URL ``/api/foo``. Vercel builds both lambdas; only one wins the route
   (empirically the parent file), so the other becomes an unreachable lambda
   that still counts against the Hobby plan's twelve-function cap. This is how
   the SCRUM-42 organiser browse-events endpoint silently broke after PR #56
   shipped. See ADR-014 and BDR T-56.

2. **Function-count overrun.** The Hobby plan permits at most twelve
   functions per deployment; a thirteenth file under ``api/`` fails the
   build with ``No more than 12 Serverless Functions can be added to a
   Deployment on the Hobby plan``. Every new file under ``api/`` risks
   pushing us past the cap. This check keeps a soft headroom of one slot
   so a story never lands cap-blocked; consolidate an existing file
   before adding a new one.

Exit codes:
- ``0`` on pass.
- ``1`` on any collision or on function count above the soft limit.

Run standalone or via ``python scripts/check.py`` (pre-commit hook).
"""

from __future__ import annotations

import sys
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
API_DIR = REPO_ROOT / 'api'

# Vercel Node.js runtime file extensions. `.d.ts` are type declarations
# and are not built as functions; excluded via the suffix check below.
FUNCTION_SUFFIXES = {'.ts', '.js', '.mjs', '.tsx', '.jsx'}

# Hobby plan hard cap is 12; leave 1 slot of headroom for the next feature.
FUNCTION_COUNT_SOFT_LIMIT = 11


def route_for(file_path: Path) -> str:
    """Return the URL path Vercel derives from a file under ``api/``.

    - ``api/foo.ts``            → ``/api/foo``
    - ``api/foo/bar.ts``        → ``/api/foo/bar``
    - ``api/foo/index.ts``      → ``/api/foo``  (index collapses to parent)
    """
    relative = file_path.relative_to(API_DIR).with_suffix('')
    parts = list(relative.parts)
    if parts and parts[-1] == 'index':
        parts.pop()
    return '/' + '/'.join(('api', *parts))


def gather_functions() -> list[Path]:
    """List every source file under ``api/`` that Vercel would build."""
    if not API_DIR.is_dir():
        return []
    return sorted(
        path
        for path in API_DIR.rglob('*')
        if path.is_file()
        and path.suffix in FUNCTION_SUFFIXES
        and not path.name.endswith('.d.ts')
        and not path.name.endswith('.test.ts')
        and not path.name.endswith('.test.tsx')
        and not path.name.endswith('.spec.ts')
        and not path.name.endswith('.spec.tsx')
    )


def main() -> int:
    files = gather_functions()
    errors: list[str] = []

    # Collision check. Two source files pointing at the same URL path is
    # the failure mode that broke SCRUM-42 in production.
    by_route: dict[str, list[Path]] = defaultdict(list)
    for file_path in files:
        by_route[route_for(file_path)].append(file_path)

    for route, colliding in sorted(by_route.items()):
        if len(colliding) > 1:
            listing = ', '.join(
                str(path.relative_to(REPO_ROOT)).replace('\\', '/')
                for path in colliding
            )
            errors.append(
                f'Route collision at {route}: {listing}. '
                'One will silently override the others in Vercel. '
                'Consolidate the handlers into one file (method-dispatch) '
                'or rename to distinct paths. See ADR-014 and BDR T-56.'
            )

    # Function-count check. Twelve is the Hobby-plan hard cap; we hold
    # eleven as a soft limit so the next feature never lands cap-blocked.
    if len(files) > FUNCTION_COUNT_SOFT_LIMIT:
        errors.append(
            f'{len(files)} files under api/, above the soft limit of '
            f'{FUNCTION_COUNT_SOFT_LIMIT} (Hobby-plan hard cap is 12). '
            'Consolidate an existing endpoint before adding a new file, '
            'or move a task-parameter dispatch pattern into vercel.json '
            'rewrites (see docs/deploying-and-debugging.md).'
        )

    if errors:
        for error in errors:
            print(f'ERROR: {error}')
        print()
        print(f'Files scanned: {len(files)} under api/')
        return 1

    print(
        f'PASS: {len(files)} files under api/ ({len(by_route)} distinct routes, '
        f'{FUNCTION_COUNT_SOFT_LIMIT} soft limit).'
    )
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
