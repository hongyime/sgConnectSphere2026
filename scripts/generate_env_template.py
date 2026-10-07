"""Generate ``.env.template`` from the environment variables the code reads.

Run from the repository root:

    .venv-tools\\Scripts\\python.exe scripts\\generate_env_template.py

The generator scans ``api/``, ``backend/``, ``frontend/``, ``scripts/``,
``tooling/`` and ``tests/`` for every reference to a runtime environment
variable and rewrites ``.env.template`` so that documentation cannot silently
drift from the code again. See ``docs/CONTRIBUTING`` (Derived-doc
regeneration) and ``AGENTS.md`` for the wider pattern.

Five reference patterns are detected. Missing any one of them silently loses
live configuration:

  1. ``process.env.NAME`` and ``process.env['NAME']`` / ``process.env["NAME"]``
  2. ``import.meta.env.NAME`` (Vite frontend)
  3. ``read('NAME')`` -- dynamic helper in ``backend/src/config.ts`` that
     resolves to ``process.env[name]``. Miss this and DATABASE_URL,
     CRON_SECRET, BREVO_API_KEY, and the whole Upstash Redis block disappear.
  4. ``requireEnv(value, 'NAME')`` -- the string literal is the variable name.
  5. Python: ``os.environ['NAME']`` / ``os.environ.get('NAME', ...)``.

Doctor mode (``--check-env <path>``) reports which variables the code reads
that are absent from a given ``.env`` file, by NAME only. This is the check
that catches a broken clone in one second.

Exit codes:
  0  Wrote (or would write) a template that matches the code.
  1  ``--check`` mode and the on-disk template is stale.
  2  ``--check-env`` mode and required variables are missing from the file.
"""
from __future__ import annotations

import argparse
import re
import sys
from collections import OrderedDict
from pathlib import Path
from typing import Iterable

REPO_ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_PATH = REPO_ROOT / ".env.template"

# Roots that contain live application, tooling or test code. Anything outside
# these roots is either vendored, generated, or documentation and does not
# count as "the code reads this variable".
SCAN_ROOTS = ("api", "backend", "frontend", "scripts", "tooling", "tests")

# Directory names to skip anywhere inside the scanned roots. These are either
# vendored, generated or cached and would otherwise leak stale references.
SKIP_DIRS = frozenset({
    "node_modules", ".venv-tools", ".stryker-tmp", "dist", ".vite",
    "coverage", "__pycache__", ".next", "build", ".turbo",
})

# Explicit path fragments (POSIX-style) to skip. The frontend verification
# scaffold is a vendored copy of an external tool and its code must not
# influence what live developers need to configure.
SKIP_PATH_FRAGMENTS = (
    "docs/testing/frontend-verification-scaffold-v5/",
    # The generator and its own test file contain literal example strings
    # like ``read('NAME')`` and ``process.env.EXAMPLE`` in docstrings/tests
    # that would otherwise be mis-detected as real configuration.
    "scripts/generate_env_template.py",
    "tooling/tests/test_generate_env_template.py",
)

# Files whose extension we scan for environment variable references.
CODE_EXTENSIONS = frozenset({
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py",
})

# ---------------------------------------------------------------------------
# Platform / OS / CI allowlist.
#
# These variables ARE read by the code, but the developer must never write
# them into their own ``.env``. They come from Node itself, the operating
# system, the CI runner or Vercel. Emitting them into ``.env.template`` would
# invite a teammate to hard-code an incorrect value and silently break the
# runtime.
#
# Every entry below has a one-line justification. When adding to this list,
# say why the variable is platform-provided.
# ---------------------------------------------------------------------------
PLATFORM_ALLOWLIST: dict[str, str] = {
    # Node's own environment. Set by ``node`` / the hosting runtime, never by
    # a developer's ``.env``.
    "NODE_ENV": "Set by Node/Vercel; hard-coding in .env breaks test vs prod.",
    # Set by Vercel/Node HTTP servers. A developer setting this in ``.env``
    # collides with whatever the host allocates.
    "PORT": "Set by the hosting runtime (Vercel, node http.listen).",
    # Windows user profile path exposed by the OS. Used by ``tooling_env.py``
    # to locate the isolated tooling virtualenv.
    "LOCALAPPDATA": "Windows OS-provided user profile path.",
    # Path to the GitHub Actions event payload. Injected by the runner.
    "GITHUB_EVENT_PATH": "Injected by GitHub Actions into workflow runs.",
    # ``owner/repo`` slug set by GitHub Actions.
    "GITHUB_REPOSITORY": "Injected by GitHub Actions into workflow runs.",
    # Newline-separated list of files a pull request changes, written to
    # GITHUB_ENV by the pr-conventions job for scripts/check_metadata.py.
    "PR_CHANGED_FILES": "Set by the pr-conventions workflow step; never developer config.",
    # Injected by Vercel for OIDC-authenticated deployments; never a
    # developer secret.
    "VERCEL_OIDC_TOKEN": "Injected by Vercel at deploy time; never developer config.",
    # Deployment hostnames injected by Vercel; read by the CSRF origin allowlist.
    "VERCEL_URL": "Injected by Vercel at deploy time; never developer config.",
    "VERCEL_PROJECT_PRODUCTION_URL": "Injected by Vercel at deploy time; never developer config.",
    "VERCEL_BRANCH_URL": "Injected by Vercel at deploy time; never developer config.",
}

# Section layout preserves the shape of the previous hand-maintained template
# so that reviewers see a small readable diff, not a total rewrite. The
# generator emits sections in this exact order; any variable that does not
# match a section prefix lands in the trailing "Other" section so we notice
# it during review.
#
# Each entry is ``(header, one_line_comment, ordered predicates)`` where each
# predicate is either an exact variable name or a callable that takes the
# variable name and returns True.
SECTIONS: list[tuple[str, str, list]] = [
    (
        "App runtime",
        "Public URLs, environment flag, cron authentication.",
        ["APP_ENV", "APP_URL", "PUBLIC_SITE_URL", "CRON_SECRET"],
    ),
    (
        "PostgreSQL",
        "Primary database plus optional pooler and disposable test database.",
        ["DATABASE_URL", "DATABASE_POOLER_URL", "TEST_DATABASE_URL",
         "ALLOW_DATABASE_RESET"],
    ),
    (
        "Redis (Upstash) queue",
        "Async notification transport. Delivery stays paused until both flags flip.",
        ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN",
         "UPSTASH_REDIS_QUEUE_NOTIFICATIONS", "TEST_REDIS_URL",
         "NOTIFICATION_RELAY_ENABLED", "NOTIFICATION_DELIVERY_ENABLED"],
    ),
    (
        "Email provider",
        "Brevo transactional email plus sender identity.",
        ["EMAIL_PROVIDER", "EMAIL_FROM", "EMAIL_REPLY_TO", "BREVO_API_KEY"],
    ),
    (
        "Jira local agent",
        "Local reconciliation of PRs against Jira issues. Optional per developer.",
        ["JIRA_SITE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN", "JIRA_PROJECT_KEY"],
    ),
    (
        "Local development",
        "Dev proxy target, Playwright seed mode, extra CSRF origins (comma-separated).",
        ["API_PROXY_TARGET", "CONNECTSPHERE_E2E_SEED", "ADDITIONAL_ALLOWED_ORIGINS"],
    ),
]


# ---------------------------------------------------------------------------
# Regex patterns for the five reference shapes.
# ---------------------------------------------------------------------------
# Node/JS: process.env.NAME  and  process.env['NAME'] / process.env["NAME"]
PROCESS_ENV_DOT = re.compile(r"process\.env\.([A-Z][A-Z0-9_]*)")
PROCESS_ENV_BRACKET = re.compile(r"process\.env\[\s*['\"]([A-Z][A-Z0-9_]*)['\"]\s*\]")
# Vite frontend: import.meta.env.NAME and import.meta.env['NAME']
IMPORT_META_DOT = re.compile(r"import\.meta\.env\.([A-Z][A-Z0-9_]*)")
IMPORT_META_BRACKET = re.compile(r"import\.meta\.env\[\s*['\"]([A-Z][A-Z0-9_]*)['\"]\s*\]")
# Backend indirection: read('NAME')  (defined in backend/src/config.ts as
# ``const read = (name: string) => process.env[name]?.trim() || undefined``).
READ_HELPER = re.compile(r"\bread\(\s*['\"]([A-Z][A-Z0-9_]*)['\"]\s*\)")
# requireEnv(anything, 'NAME') -- the second argument is the variable name.
REQUIRE_ENV = re.compile(
    r"\brequireEnv\([^)]*?,\s*['\"]([A-Z][A-Z0-9_]*)['\"]\s*,?\s*\)",
    re.DOTALL,
)
# Python: os.environ['NAME'] / os.environ.get('NAME', ...) / os.environ.get("NAME")
OS_ENVIRON_ITEM = re.compile(r"os\.environ\[\s*['\"]([A-Z][A-Z0-9_]*)['\"]\s*\]")
OS_ENVIRON_GET = re.compile(r"os\.environ\.get\(\s*['\"]([A-Z][A-Z0-9_]*)['\"]")

ALL_PATTERNS = (
    PROCESS_ENV_DOT,
    PROCESS_ENV_BRACKET,
    IMPORT_META_DOT,
    IMPORT_META_BRACKET,
    READ_HELPER,
    REQUIRE_ENV,
    OS_ENVIRON_ITEM,
    OS_ENVIRON_GET,
)


def iter_code_files(repo_root: Path = REPO_ROOT) -> Iterable[Path]:
    """Yield every file under SCAN_ROOTS whose extension is scannable."""
    for root_name in SCAN_ROOTS:
        root = repo_root / root_name
        if not root.is_dir():
            continue
        for path in sorted(root.rglob("*")):
            if not path.is_file():
                continue
            if path.suffix not in CODE_EXTENSIONS:
                continue
            if any(part in SKIP_DIRS for part in path.parts):
                continue
            rel = path.relative_to(repo_root).as_posix()
            if any(fragment in rel for fragment in SKIP_PATH_FRAGMENTS):
                continue
            yield path


def scan_env_vars(repo_root: Path = REPO_ROOT) -> set[str]:
    """Return the set of environment variable NAMES read anywhere in the code."""
    found: set[str] = set()
    for path in iter_code_files(repo_root):
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            text = path.read_text(encoding="utf-8", errors="replace")
        for pattern in ALL_PATTERNS:
            for match in pattern.finditer(text):
                found.add(match.group(1))
    return found


def developer_configurable(names: Iterable[str]) -> list[str]:
    """Filter platform-provided names out of the given set."""
    return sorted(name for name in names if name not in PLATFORM_ALLOWLIST)


def _classify(name: str) -> int:
    """Return the section index this variable belongs to, or len(SECTIONS)."""
    for index, (_header, _comment, predicates) in enumerate(SECTIONS):
        for predicate in predicates:
            if isinstance(predicate, str):
                if predicate == name:
                    return index
            elif predicate(name):
                return index
    return len(SECTIONS)


def render_template(names: Iterable[str]) -> str:
    """Render the ``.env.template`` body for the given variable names.

    Grouping is stable: variables within each section keep the order given
    in ``SECTIONS`` when they match an exact name predicate, then any extras
    that matched a callable predicate are appended alphabetically. Unknown
    variables land in an alphabetically-sorted trailing "Other" section so
    the review picks them up.
    """
    developer = set(developer_configurable(names))
    lines: list[str] = [
        "# SG ConnectSphere environment template.",
        "# Copy this file to .env for local app runtime, or copy the relevant values into",
        "# provider dashboards (Supabase, Vercel, Brevo, Upstash, Jira).",
        "# Do not commit real URLs, tokens, passwords, cloud IDs, account IDs, or secrets.",
        "#",
        "# THIS FILE IS GENERATED. Do not hand-edit.",
        "# Regenerator: .venv-tools\\Scripts\\python.exe scripts\\generate_env_template.py",
        "# CI fails when this file drifts from what the generator would produce.",
        "",
    ]

    grouped: dict[int, list[str]] = {i: [] for i in range(len(SECTIONS) + 1)}
    consumed: set[str] = set()
    # First pass: honour the exact order inside each section for known names.
    for index, (_header, _comment, predicates) in enumerate(SECTIONS):
        for predicate in predicates:
            if isinstance(predicate, str) and predicate in developer:
                grouped[index].append(predicate)
                consumed.add(predicate)
    # Second pass: any remaining developer variables get classified. Since
    # every predicate above is a string this simply routes unknowns to the
    # trailing "Other" bucket, but keeping the callable path leaves room for
    # future prefix rules without breaking behaviour.
    for name in sorted(developer - consumed):
        grouped[_classify(name)].append(name)

    for index, (header, comment, _predicates) in enumerate(SECTIONS):
        entries = grouped[index]
        if not entries:
            continue
        lines.append("# " + "-" * 75)
        lines.append(f"# {header}")
        lines.append("# " + "-" * 75)
        if comment:
            lines.append(f"# {comment}")
        lines.append("")
        for name in entries:
            lines.append(f"{name}=")
        lines.append("")

    # Trailing "Other" section catches anything a future patch introduces
    # that the section table has not yet learned about. It is intentionally
    # visible so the review notices.
    extras = grouped[len(SECTIONS)]
    if extras:
        lines.append("# " + "-" * 75)
        lines.append("# Other")
        lines.append("# " + "-" * 75)
        lines.append(
            "# Detected by the generator but not classified. Add a section rule"
        )
        lines.append("# in scripts/generate_env_template.py if this variable is a")
        lines.append("# permanent part of the configuration surface.")
        lines.append("")
        for name in sorted(extras):
            lines.append(f"{name}=")
        lines.append("")

    return "\n".join(line.rstrip() for line in lines).rstrip() + "\n"


def parse_env_names(text: str) -> set[str]:
    """Parse an ``.env``-shaped file, returning the set of key names.

    Handles comments (``#``), blank lines, ``export`` prefixes and quoted
    values. Only KEY names are returned; no values are ever inspected,
    stored, printed or logged.
    """
    names: set[str] = set()
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export "):].lstrip()
        if "=" not in line:
            continue
        key = line.split("=", 1)[0].strip()
        if not key:
            continue
        # Reject anything that is obviously not an env var name so we do not
        # trip on stray text lines.
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
            continue
        names.add(key)
    return names


def check_env_file(env_path: Path, required: Iterable[str]) -> list[str]:
    """Return the list of required variable NAMES missing from ``env_path``.

    Values are never read or reported. This is the doctor-mode helper that
    would have caught the broken second-clone silent-DATABASE_URL bug.
    """
    if not env_path.is_file():
        return sorted(required)
    text = env_path.read_text(encoding="utf-8")
    present = parse_env_names(text)
    return sorted(set(required) - present)


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--check",
        action="store_true",
        help="Do not write; exit 1 if .env.template differs from the generated output.",
    )
    parser.add_argument(
        "--check-env",
        metavar="PATH",
        help=("Doctor mode. Report which developer-settable variables the code "
              "reads are missing from PATH (a developer's .env). Values are "
              "never read or printed."),
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="Print the sorted set of variable names the code reads and exit.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_arg_parser()
    args = parser.parse_args(argv)
    detected = scan_env_vars()
    developer = developer_configurable(detected)

    if args.list:
        for name in developer:
            print(name)
        return 0

    if args.check_env:
        env_path = Path(args.check_env)
        missing = check_env_file(env_path, developer)
        if missing:
            print(f"Missing {len(missing)} required variable(s) in {env_path}:")
            for name in missing:
                print(f"  {name}")
            print(
                "\nAdd empty entries for each name above, then fill them in "
                "from your team's shared credentials."
            )
            return 2
        print(f"OK: {env_path} declares every variable the code reads.")
        return 0

    generated = render_template(developer)

    if args.check:
        current = TEMPLATE_PATH.read_text(encoding="utf-8") if TEMPLATE_PATH.exists() else ""
        if current != generated:
            print(
                "ERROR: .env.template is stale. Re-run "
                "scripts/generate_env_template.py and commit the result.",
                file=sys.stderr,
            )
            return 1
        print("PASS: .env.template matches what the generator would produce.")
        return 0

    TEMPLATE_PATH.write_text(generated, encoding="utf-8")
    print(
        f"Wrote {TEMPLATE_PATH.relative_to(REPO_ROOT)} "
        f"({len(developer)} developer-settable variables)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
