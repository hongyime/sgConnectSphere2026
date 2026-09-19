"""Exercise policy boundaries, including forged bot branch names and PR title edits."""

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "check_metadata.py"
SPEC = importlib.util.spec_from_file_location("metadata", SCRIPT)
metadata = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(metadata)


class MetadataTests(unittest.TestCase):
    def test_conventional_titles_and_breaking_changes(self):
        for title in ("feat(frontend): add form", "fix(backend)!: require a date", "ci: add checks"):
            with self.subTest(title=title):
                self.assertTrue(metadata.check_title(title))

    def test_malformed_and_multiline_titles_fail(self):
        for title in ("update", "feat:", "feat: ", "feat: one\nfix: two", "chore: " + "a" * 100):
            with self.subTest(title=title):
                self.assertFalse(metadata.check_title(title))

    def test_branch_boundaries(self):
        for branch in (
            "feature/42-user-profile",
            "feature/SCRUM-26-submit-event-request",
            "fix/SCRUM-41-layout-capacity",
            "docs/SCRUM-86-update-backlog-source",
            "chore/setup-ci",
        ):
            self.assertTrue(metadata.check_branch(branch))
        for branch in (
            "main",
            "feature/",
            "feature/Fix",
            "feature/SCRUM-submit-event-request",
            "feature/SCRUM-26-Submit-event-request",
            "feature/a--b",
            "bryan-work",
        ):
            self.assertFalse(metadata.check_branch(branch))

    def test_dependabot_exception_requires_bot_identity(self):
        self.assertFalse(metadata.check_branch("dependabot/pip/tooling/update"))
        self.assertTrue(metadata.check_branch("dependabot/pip/tooling/update", automated=True))

    def test_pr_event_validation_uses_author_identity(self):
        event = {"pull_request": {
            "title": "chore(deps): update tooling",
            "head": {"ref": "dependabot/pip/tooling/update"},
            "user": {"login": "student", "type": "User"},
        }}
        with tempfile.TemporaryDirectory() as temporary:
            event_file = Path(temporary) / "event.json"
            event_file.write_text(json.dumps(event), encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "pr", str(event_file)], capture_output=True
            )
            self.assertEqual(result.returncode, 1)
            event["pull_request"]["user"] = {"login": "dependabot[bot]", "type": "Bot"}
            event_file.write_text(json.dumps(event), encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "pr", str(event_file)], capture_output=True
            )
            self.assertEqual(result.returncode, 0)

    def test_invalid_commit_message_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            message = Path(temporary) / "COMMIT_EDITMSG"
            message.write_text("just stuff\n", encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "commit-msg", str(message)], capture_output=True
            )
            self.assertEqual(result.returncode, 1)

    def test_body_accepts_complete_template(self):
        body = (
            "## What and why\n\nBackground.\n\n"
            "## Verification\n\nRan tests.\n\n"
            "## Checklist\n\n- [x] Something\n\n"
            "## Follow-ups\n\nNone."
        )
        ok, missing = metadata.check_body(body)
        self.assertTrue(ok, msg=f"missing={missing}")

    def test_body_rejects_stub_and_lists_missing_sections(self):
        stub = "e01-s11 deactivate my account\n\nE09 dependency: ..."
        ok, missing = metadata.check_body(stub)
        self.assertFalse(ok)
        self.assertEqual(
            missing,
            [
                "## What and why",
                "## Verification",
                "## Checklist",
                "## Follow-ups",
            ],
        )

    def test_body_rejects_empty(self):
        ok, missing = metadata.check_body("")
        self.assertFalse(ok)
        self.assertEqual(len(missing), 4)

    def test_body_rejects_partial_template(self):
        body = "## What and why\n\nSome context.\n\n## Verification\n\nRan tests."
        ok, missing = metadata.check_body(body)
        self.assertFalse(ok)
        self.assertEqual(missing, ["## Checklist", "## Follow-ups"])

    def test_body_ignores_headers_that_are_only_substrings(self):
        # "### What and why" is a subsection, not a top-level header.
        body = "### What and why\n\nsub."
        ok, missing = metadata.check_body(body)
        self.assertFalse(ok)
        self.assertIn("## What and why", missing)

    def test_body_bot_exemption(self):
        ok, missing = metadata.check_body("", automated=True)
        self.assertTrue(ok)
        self.assertEqual(missing, [])

    def test_pr_event_body_gate(self):
        good_body = (
            "## What and why\n\nX.\n\n## Verification\n\nY.\n\n"
            "## Checklist\n\n- [x] a\n\n## Follow-ups\n\nnone."
        )
        base_event = {"pull_request": {
            "title": "feat(backend): a real change",
            "head": {"ref": "feature/SCRUM-99-a-real-change"},
            "user": {"login": "student", "type": "User"},
            "body": good_body,
        }}
        with tempfile.TemporaryDirectory() as temporary:
            event_file = Path(temporary) / "event.json"
            event_file.write_text(json.dumps(base_event), encoding="utf-8")
            good = subprocess.run(
                [sys.executable, str(SCRIPT), "pr", str(event_file)], capture_output=True
            )
            self.assertEqual(good.returncode, 0, msg=good.stdout + good.stderr)

            stub_event = json.loads(json.dumps(base_event))
            stub_event["pull_request"]["body"] = "one-liner"
            event_file.write_text(json.dumps(stub_event), encoding="utf-8")
            bad = subprocess.run(
                [sys.executable, str(SCRIPT), "pr", str(event_file)], capture_output=True
            )
            self.assertEqual(bad.returncode, 1)
            self.assertIn(b"repository template", bad.stdout)


if __name__ == "__main__":
    unittest.main()
