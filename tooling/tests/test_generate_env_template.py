"""Verify the env-template generator detects every reference pattern and
correctly excludes platform-provided variables. Regression coverage for the
dangerous case: a variable read only via ``read('NAME')`` must be picked up,
because that is exactly how DATABASE_URL / CRON_SECRET / the Upstash keys
would silently disappear from the template if the scanner ever regressed.

Run directly (no pytest in this repo's tooling env):

    .venv-tools\\Scripts\\python.exe tooling\\tests\\test_generate_env_template.py
"""
from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "generate_env_template.py"
SPEC = importlib.util.spec_from_file_location("generate_env_template", SCRIPT)
generator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(generator)


def _write(root: Path, relpath: str, content: str) -> Path:
    """Write a fixture file under a synthetic scan root."""
    target = root / relpath
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return target


class ReferencePatternTests(unittest.TestCase):
    """Every one of the five reference shapes must be detected."""

    def _scan(self, files: dict[str, str]) -> set[str]:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for relpath, content in files.items():
                _write(root, relpath, content)
            return generator.scan_env_vars(root)

    def test_process_env_dot(self):
        detected = self._scan({
            "backend/x.ts": "const v = process.env.PATTERN_A;",
        })
        self.assertIn("PATTERN_A", detected)

    def test_process_env_bracket_single_and_double_quoted(self):
        detected = self._scan({
            "backend/x.ts": (
                "const a = process.env['PATTERN_B'];\n"
                "const b = process.env[\"PATTERN_C\"];\n"
            ),
        })
        self.assertIn("PATTERN_B", detected)
        self.assertIn("PATTERN_C", detected)

    def test_import_meta_env(self):
        detected = self._scan({
            "frontend/x.ts": (
                "console.log(import.meta.env.PATTERN_D);\n"
                "console.log(import.meta.env['PATTERN_E']);\n"
            ),
        })
        self.assertIn("PATTERN_D", detected)
        self.assertIn("PATTERN_E", detected)

    def test_read_helper_regression_for_dangerous_case(self):
        # The exact indirection that hid DATABASE_URL from the old hand-
        # maintained template. If this test ever regresses, the generator
        # is about to silently delete live configuration keys.
        detected = self._scan({
            "backend/src/config.ts": (
                "const read = (name: string) => process.env[name];\n"
                "export const cfg = {\n"
                "  databaseUrl: read('DATABASE_URL'),\n"
                "  cronSecret: read('CRON_SECRET'),\n"
                "};\n"
            ),
        })
        self.assertIn("DATABASE_URL", detected)
        self.assertIn("CRON_SECRET", detected)

    def test_require_env_second_argument(self):
        detected = self._scan({
            "backend/x.ts": (
                "const url = requireEnv(runtimeConfig.appUrl, 'PATTERN_F');\n"
                # Also multi-line, as appears in some backend call sites.
                "const key = requireEnv(\n"
                "  runtimeConfig.brevoApiKey,\n"
                "  'PATTERN_G',\n"
                ");\n"
            ),
        })
        self.assertIn("PATTERN_F", detected)
        self.assertIn("PATTERN_G", detected)

    def test_python_os_environ(self):
        detected = self._scan({
            "scripts/x.py": (
                "import os\n"
                "a = os.environ['PATTERN_H']\n"
                "b = os.environ.get('PATTERN_I', '')\n"
                "c = os.environ.get(\"PATTERN_J\")\n"
            ),
        })
        self.assertIn("PATTERN_H", detected)
        self.assertIn("PATTERN_I", detected)
        self.assertIn("PATTERN_J", detected)


class AllowlistTests(unittest.TestCase):
    def test_platform_vars_excluded_from_developer_set(self):
        # NODE_ENV, PORT, LOCALAPPDATA, GITHUB_EVENT_PATH, GITHUB_REPOSITORY,
        # VERCEL_OIDC_TOKEN are OS/CI/host-provided. Emitting them into
        # .env.template invites a broken hard-coded value.
        raw = {
            "NODE_ENV", "PORT", "LOCALAPPDATA", "GITHUB_EVENT_PATH",
            "GITHUB_REPOSITORY", "VERCEL_OIDC_TOKEN",
            # A real developer-facing variable to prove the filter isn't
            # accidentally dropping everything.
            "DATABASE_URL",
        }
        result = generator.developer_configurable(raw)
        self.assertEqual(result, ["DATABASE_URL"])

    def test_generator_output_never_contains_platform_vars(self):
        raw = {"NODE_ENV", "PORT", "DATABASE_URL", "APP_URL"}
        rendered = generator.render_template(
            generator.developer_configurable(raw)
        )
        self.assertNotIn("NODE_ENV=", rendered)
        self.assertNotIn("PORT=", rendered)
        self.assertIn("DATABASE_URL=", rendered)
        self.assertIn("APP_URL=", rendered)


class SkipRootsTests(unittest.TestCase):
    def test_node_modules_and_dist_are_skipped(self):
        # If node_modules leaks through, a dev's local package cache poisons
        # the template.
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write(root, "backend/node_modules/pkg/index.js",
                   "process.env.LEAKED_FROM_NODE_MODULES;")
            _write(root, "frontend/dist/bundle.js",
                   "process.env.LEAKED_FROM_DIST;")
            _write(root, "backend/live.ts",
                   "process.env.REAL_LIVE_VAR;")
            detected = generator.scan_env_vars(root)
        self.assertIn("REAL_LIVE_VAR", detected)
        self.assertNotIn("LEAKED_FROM_NODE_MODULES", detected)
        self.assertNotIn("LEAKED_FROM_DIST", detected)


class RenderTemplateTests(unittest.TestCase):
    def test_output_ends_with_single_trailing_newline(self):
        rendered = generator.render_template(["APP_URL"])
        self.assertTrue(rendered.endswith("\n"))
        self.assertFalse(rendered.endswith("\n\n"))

    def test_output_has_generated_banner(self):
        rendered = generator.render_template(["APP_URL"])
        self.assertIn("THIS FILE IS GENERATED", rendered)
        self.assertIn("scripts\\generate_env_template.py", rendered)

    def test_values_are_always_empty(self):
        # No value MUST ever leak into the template. Every KEY= line must
        # be followed only by end-of-line, not by data.
        rendered = generator.render_template(["APP_URL", "DATABASE_URL"])
        for line in rendered.splitlines():
            if "=" in line and not line.startswith("#"):
                key, _sep, value = line.partition("=")
                self.assertEqual(
                    value, "",
                    msg=f"Non-empty value on generated line: {line!r}",
                )

    def test_unknown_variable_lands_in_other_section(self):
        rendered = generator.render_template(["NEWLY_ADDED_UNCLASSIFIED_VAR"])
        self.assertIn("# Other", rendered)
        self.assertIn("NEWLY_ADDED_UNCLASSIFIED_VAR=", rendered)


class DoctorModeTests(unittest.TestCase):
    def test_missing_key_is_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            env_path = Path(tmp) / ".env"
            env_path.write_text(
                "# a developer's .env, missing DATABASE_URL\n"
                "APP_URL=https://example.test\n"
                "CRON_SECRET=redacted\n",
                encoding="utf-8",
            )
            missing = generator.check_env_file(
                env_path, ["APP_URL", "CRON_SECRET", "DATABASE_URL"]
            )
        self.assertEqual(missing, ["DATABASE_URL"])

    def test_all_present_returns_empty(self):
        with tempfile.TemporaryDirectory() as tmp:
            env_path = Path(tmp) / ".env"
            env_path.write_text(
                "APP_URL=x\nCRON_SECRET=y\nDATABASE_URL=z\n",
                encoding="utf-8",
            )
            missing = generator.check_env_file(
                env_path, ["APP_URL", "CRON_SECRET", "DATABASE_URL"]
            )
        self.assertEqual(missing, [])

    def test_absent_file_reports_everything_missing(self):
        missing = generator.check_env_file(
            Path("does-not-exist.env"), ["A", "B"]
        )
        self.assertEqual(missing, ["A", "B"])

    def test_doctor_mode_never_reads_or_returns_values(self):
        # Guard: the doctor path parses NAMES from the .env file. A real
        # ``.env`` in this repo contains live secrets, so accidentally
        # returning any value would be a leak. Parse a file with a token
        # value and prove the value never appears in the returned data.
        with tempfile.TemporaryDirectory() as tmp:
            env_path = Path(tmp) / ".env"
            env_path.write_text(
                "APP_URL=https://example.test\n"
                # pragma: allowlist secret -- synthetic fixture, not a real token.
                "BREVO_API_KEY=xkeys-super-secret-value-should-never-leak\n",  # pragma: allowlist secret
                encoding="utf-8",
            )
            names = generator.parse_env_names(env_path.read_text(encoding="utf-8"))
        self.assertEqual(names, {"APP_URL", "BREVO_API_KEY"})
        for name in names:
            self.assertNotIn("super-secret-value", name)


class EndToEndAgainstRealRepoTests(unittest.TestCase):
    """A tiny sanity check against the live repository state so that if the
    generator gets a scanner-shaped bug it fails loudly here rather than in
    CI."""

    def test_authoritative_developer_vars_are_detected(self):
        detected = generator.scan_env_vars(generator.REPO_ROOT)
        developer = set(generator.developer_configurable(detected))
        # A stable minimum. These are the keys we KNOW the code reads and
        # cannot afford to lose from the template. This is a floor, not a
        # ceiling: the scanner may legitimately find more.
        required = {
            "APP_ENV", "APP_URL", "PUBLIC_SITE_URL", "CRON_SECRET",
            "DATABASE_URL", "DATABASE_POOLER_URL", "TEST_DATABASE_URL",
            "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN",
            "UPSTASH_REDIS_QUEUE_NOTIFICATIONS",
            "EMAIL_PROVIDER", "EMAIL_FROM", "EMAIL_REPLY_TO", "BREVO_API_KEY",
            "JIRA_SITE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN", "JIRA_PROJECT_KEY",
        }
        missing = required - developer
        self.assertEqual(
            missing, set(),
            msg=f"Scanner regressed and lost required keys: {sorted(missing)}",
        )


if __name__ == "__main__":
    unittest.main()
