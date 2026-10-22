"""Tests for scripts/reconcile_jira.py. Network calls are stubbed at the
_jira_call boundary; tests cover key-extraction rules and the reconcile
control flow (skip, dry-run, apply)."""

from __future__ import annotations

import importlib.util
import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "reconcile_jira.py"
SPEC = importlib.util.spec_from_file_location("reconcile_jira", SCRIPT)
module = importlib.util.module_from_spec(SPEC)
# @dataclass resolves cls.__module__ via sys.modules; register before exec.
sys.modules["reconcile_jira"] = module
SPEC.loader.exec_module(module)

PullRequest = module.PullRequest
JiraConfig = module.JiraConfig
IssueInfo = module.IssueInfo


def _issue(**overrides) -> IssueInfo:
    defaults = dict(
        key="SCRUM-123",
        status="In Review",
        assignee_account_id="acct-abc",
        assignee_display="student",
        is_subtask=True,
    )
    defaults.update(overrides)
    return IssueInfo(**defaults)


def _pr(**overrides) -> PullRequest:
    defaults = dict(
        number=42,
        title="feat(backend): a change (SCRUM-123)",
        body="body",
        head_ref="feature/SCRUM-123-a-change",
        merged=True,
        author_login="student",
        author_is_bot=False,
    )
    defaults.update(overrides)
    return PullRequest(**defaults)


CONFIG = JiraConfig(
    site_url="https://example.atlassian.net",
    email="a@b.test",
    api_token="synthetic-token",  # pragma: allowlist secret - test fixture only
    project_key="SCRUM",
)


class PullRequestLookupTests(unittest.TestCase):
    def test_explicit_repository_is_passed_to_gh(self):
        with patch.object(module.subprocess, "run") as run:
            run.return_value.returncode = 0
            run.return_value.stdout = json.dumps({"number": 42, "mergedAt": "2026-09-19"})
            pr = module.load_pr_from_gh(42, "example/other-repo")
        command = run.call_args.args[0]
        self.assertEqual(command[command.index("--repo") + 1], "example/other-repo")
        self.assertEqual(pr.number, 42)
        self.assertTrue(pr.merged)

    def test_cli_routes_repository_to_pr_lookup(self):
        with patch.object(module, "load_jira_config", return_value=CONFIG), \
             patch.object(module, "load_pr_from_gh", return_value=_pr()) as lookup, \
             patch.object(module, "reconcile", return_value=0):
            self.assertEqual(module.main(["--pr", "42", "--repo", "example/other-repo"]), 0)
        lookup.assert_called_once_with(42, "example/other-repo")


class ExtractKeysTests(unittest.TestCase):
    def test_branch_and_title_are_deduplicated(self):
        pr = _pr(head_ref="feature/SCRUM-123-x", title="feat: fix (SCRUM-123)")
        self.assertEqual(module.extract_keys(pr, "SCRUM"), ["SCRUM-123"])

    def test_body_only_mention_is_ignored(self):
        pr = _pr(
            head_ref="fix/pr-56-follow-up",
            title="fix: address review",
            body="Follow-up to SCRUM-42; see SCRUM-99 for related work.",
        )
        self.assertEqual(module.extract_keys(pr, "SCRUM"), [])

    def test_multiple_keys_preserved_in_order(self):
        pr = _pr(
            head_ref="feature/SCRUM-91-cookie-auth",
            title="feat(auth): consolidate (SCRUM-91, ADR-015)",
        )
        # ADR-015 matches the raw pattern but is not the SCRUM project.
        # SCRUM-91 appears twice, once in branch and once in title.
        self.assertEqual(module.extract_keys(pr, "SCRUM"), ["SCRUM-91"])

    def test_only_project_key_matches(self):
        pr = _pr(head_ref="feature/OTHER-1-x", title="feat: (OTHER-1)")
        self.assertEqual(module.extract_keys(pr, "SCRUM"), [])

    def test_body_closes_keyword_is_trusted(self):
        pr = _pr(
            head_ref="feature/e14-s02-activity-log",
            title="feat(audit): record status changes (E14-S02)",
            body="E14-S02 (BDR T-04, SCRUM-86): significant actions...\nCloses SCRUM-86.",
        )
        self.assertEqual(module.extract_keys(pr, "SCRUM"), ["SCRUM-86"])

    def test_body_closes_keyword_is_case_insensitive(self):
        for verb in ("closes", "Closes", "FIXES", "Resolved", "resolves"):
            with self.subTest(verb=verb):
                pr = _pr(head_ref="fix/foo", title="fix: foo",
                         body=f"{verb} SCRUM-100.")
                self.assertEqual(module.extract_keys(pr, "SCRUM"), ["SCRUM-100"])

    def test_bare_body_mention_still_ignored(self):
        pr = _pr(head_ref="fix/foo", title="fix: foo",
                 body="Follow-up to SCRUM-42; related work in SCRUM-99.")
        self.assertEqual(module.extract_keys(pr, "SCRUM"), [])


class ScopeAwareBodyScanTests(unittest.TestCase):
    """Regression tests for the scope-aware body scanner added after PR #97
    falsely transitioned SCRUM-42 because an example ``Closes SCRUM-42`` in
    the PR body was treated as a real closing clause."""

    def test_closes_inside_code_fence_is_ignored(self):
        """Reproduces the PR #97 false positive: a Closes clause inside a
        triple-backtick code fence should not be treated as a real closing."""
        pr = _pr(
            head_ref="feature/jira-status-sync",
            title="feat(ci): reconcile Jira status on PR merge",
            body=(
                "## What and why\n"
                "Ships scripts/reconcile_jira.py.\n\n"
                "## Usage example\n\n"
                "```\n"
                "# Example: this would close the venue calendar story\n"
                "python scripts/reconcile_jira.py --pr 42  # Closes SCRUM-42\n"
                "```\n\n"
                "No issue affected."
            ),
        )
        self.assertEqual(module.extract_keys(pr, "SCRUM"), [])

    def test_closes_inside_blockquote_is_ignored(self):
        pr = _pr(
            head_ref="docs/retro",
            title="docs: sprint 1 retrospective",
            body=(
                "## What and why\n"
                "> From the original PR body: Closes SCRUM-42.\n"
                "This is a documentation-only change."
            ),
        )
        self.assertEqual(module.extract_keys(pr, "SCRUM"), [])

    def test_closes_inside_html_comment_is_ignored(self):
        pr = _pr(
            head_ref="fix/foo",
            title="fix: foo",
            body=(
                "## What and why\n"
                "<!-- Closes SCRUM-42 -- do not auto-close -->\n"
                "Unrelated fix."
            ),
        )
        self.assertEqual(module.extract_keys(pr, "SCRUM"), [])

    def test_closes_on_example_line_is_ignored(self):
        pr = _pr(
            head_ref="docs/guide",
            title="docs: jira reconciliation guide",
            body=(
                "## How to use\n"
                "For example, running `--pr 42` with Closes SCRUM-42 in the body.\n"
                "This is a guide, not a real close."
            ),
        )
        self.assertEqual(module.extract_keys(pr, "SCRUM"), [])

    def test_closes_outside_fenced_context_still_matches(self):
        """A legitimate Closes clause in plain prose must still work."""
        pr = _pr(
            head_ref="feature/activity-log",
            title="feat: record status changes",
            body=(
                "## What and why\n"
                "Implements audit logging.\n\n"
                "```\n"
                "# this example should be ignored\n"
                "Closes SCRUM-99\n"
                "```\n\n"
                "Closes SCRUM-86."
            ),
        )
        # SCRUM-86 from the prose line; SCRUM-99 inside fence is ignored.
        self.assertEqual(module.extract_keys(pr, "SCRUM"), ["SCRUM-86"])

    def test_multiline_html_comment_is_stripped(self):
        pr = _pr(
            head_ref="fix/bar",
            title="fix: bar",
            body=(
                "## What\n"
                "<!--\n"
                "Closes SCRUM-50\n"
                "-->\n"
                "Closes SCRUM-51."
            ),
        )
        self.assertEqual(module.extract_keys(pr, "SCRUM"), ["SCRUM-51"])

    def test_misleading_branch_key_still_extracted(self):
        """PR #78 had SCRUM-42 in the branch name for unrelated route work.
        Branch keys are always trusted — the scope filter only applies to body."""
        pr = _pr(
            head_ref="fix/SCRUM-42-events-routing-collision",
            title="fix: resolve events route collision",
            body="Fixes the routing collision from PR #56.",
        )
        self.assertEqual(module.extract_keys(pr, "SCRUM"), ["SCRUM-42"])

class ReconcileControlFlowTests(unittest.TestCase):
    def test_unmerged_pr_is_skipped(self):
        stream = io.StringIO()
        code = module.reconcile([_pr(merged=False)], CONFIG, apply=True, repo="a/b", stream=stream)
        self.assertEqual(code, 0)
        self.assertIn("not merged", stream.getvalue())

    def test_bot_pr_is_skipped(self):
        stream = io.StringIO()
        code = module.reconcile([_pr(author_is_bot=True)], CONFIG, apply=True, repo="a/b",
                                stream=stream)
        self.assertEqual(code, 0)
        self.assertIn("bot author", stream.getvalue())

    def test_pr_without_keys_is_skipped(self):
        stream = io.StringIO()
        code = module.reconcile(
            [_pr(head_ref="chore/setup-ci", title="chore: setup CI")], CONFIG,
            apply=True, repo="a/b", stream=stream,
        )
        self.assertEqual(code, 0)
        self.assertIn("no SCRUM key", stream.getvalue())

    def test_already_done_status_short_circuits(self):
        stream = io.StringIO()
        with patch.object(module, "get_issue", return_value=_issue(status="Done")):
            code = module.reconcile([_pr()], CONFIG, apply=True, repo="a/b", stream=stream)
        self.assertEqual(code, 0)
        self.assertIn("already Done", stream.getvalue())

    def test_dry_run_does_not_transition(self):
        stream = io.StringIO()
        with patch.object(module, "get_issue", return_value=_issue()) as get_issue, \
             patch.object(module, "find_done_transition") as find_done, \
             patch.object(module, "transition_to_done") as transition, \
             patch.object(module, "post_reconciliation_comment") as comment:
            code = module.reconcile([_pr()], CONFIG, apply=False, repo="a/b", stream=stream)
        self.assertEqual(code, 0)
        self.assertIn("would transition", stream.getvalue())
        get_issue.assert_called_once_with(CONFIG, "SCRUM-123")
        find_done.assert_not_called()
        transition.assert_not_called()
        comment.assert_not_called()

    def test_apply_transitions_and_comments(self):
        stream = io.StringIO()
        with patch.object(module, "get_issue", return_value=_issue()), \
             patch.object(module, "find_done_transition", return_value="41"), \
             patch.object(module, "transition_to_done") as transition, \
             patch.object(module, "post_reconciliation_comment") as comment:
            code = module.reconcile([_pr()], CONFIG, apply=True, repo="a/b", stream=stream)
        self.assertEqual(code, 0)
        self.assertIn("transitioned In Review -> Done", stream.getvalue())
        transition.assert_called_once_with(CONFIG, "SCRUM-123", "41")
        comment.assert_called_once_with(
            CONFIG, "SCRUM-123", 42, "a/b", assignee_account_id="acct-abc",
        )

    def test_apply_reports_when_no_done_transition_exists(self):
        stream = io.StringIO()
        with patch.object(module, "get_issue", return_value=_issue(status="Blocked")), \
             patch.object(module, "find_done_transition", return_value=None), \
             patch.object(module, "transition_to_done") as transition:
            code = module.reconcile([_pr()], CONFIG, apply=True, repo="a/b", stream=stream)
        self.assertEqual(code, 1)
        self.assertIn("no Done transition", stream.getvalue())
        transition.assert_not_called()

    def test_unassigned_ticket_is_flagged(self):
        stream = io.StringIO()
        with patch.object(module, "get_issue", return_value=_issue(
                assignee_account_id=None, assignee_display=None)), \
             patch.object(module, "find_done_transition", return_value="41"), \
             patch.object(module, "transition_to_done"), \
             patch.object(module, "post_reconciliation_comment") as comment:
            code = module.reconcile([_pr()], CONFIG, apply=True, repo="a/b", stream=stream)
        self.assertEqual(code, 0)
        self.assertIn("no assignee", stream.getvalue())
        comment.assert_called_once_with(
            CONFIG, "SCRUM-123", 42, "a/b", assignee_account_id=None,
        )

    def test_assignee_pr_author_mismatch_is_flagged(self):
        stream = io.StringIO()
        with patch.object(module, "get_issue", return_value=_issue(
                assignee_display="someone-else")), \
             patch.object(module, "find_done_transition", return_value="41"), \
             patch.object(module, "transition_to_done"), \
             patch.object(module, "post_reconciliation_comment"):
            code = module.reconcile([_pr(author_login="student")], CONFIG, apply=True,
                                    repo="a/b", stream=stream)
        self.assertEqual(code, 0)
        self.assertIn("does not match PR author", stream.getvalue())


class RecordingJira:
    """Accumulate fake HTTP calls; reject every POST unless explicitly allowed."""

    def __init__(self, fields, *, allow_posts=False):
        self.fields = fields
        self.allow_posts = allow_posts
        self.calls = []

    def __call__(self, config, method, path, payload=None):
        self.calls.append((method, path, payload))
        if method == "POST":
            if not self.allow_posts:
                raise AssertionError(f"Forbidden POST: {path}")
            if path.endswith("/transitions"):
                assert payload == {"transition": {"id": "41"}}
            elif not path.endswith("/comment"):
                raise AssertionError(f"Unexpected POST: {path}")
            return {}
        if path.endswith("/transitions"):
            return {"transitions": [{"id": "41", "to": {"name": "Done"}}]}
        return {"fields": self.fields}


class IssueTypeSafetyTests(unittest.TestCase):
    """Recovery task 6: merge evidence must not accept SCRUM-73 or E00 Stories."""

    def test_report_only_when_issue_type_is_absent(self):
        fake = RecordingJira({"status": {"name": "In Review"},
                              "parent": {"key": "SCRUM-11"}})
        with patch.object(module, "_jira_call", side_effect=fake):
            code = module.reconcile([_pr()], CONFIG, apply=True,
                                    repo="a/b", stream=io.StringIO())
        self.assertEqual(code, 0)
        self.assertEqual([call[0] for call in fake.calls], ["GET"])

    def test_report_only_when_issue_snapshot_uses_default_classification(self):
        issue = IssueInfo("SCRUM-123", "In Review", None, None)
        fake = RecordingJira({})
        with patch.object(module, "get_issue", return_value=issue), \
             patch.object(module, "_jira_call", side_effect=fake):
            code = module.reconcile([_pr()], CONFIG, apply=True,
                                    repo="a/b", stream=io.StringIO())
        self.assertEqual(code, 0)
        self.assertEqual(fake.calls, [])

    def test_report_only_when_issue_is_not_explicitly_a_subtask(self):
        classifications = (
            {"name": "Story", "subtask": False},
            {"name": "Task", "subtask": False},
            {"name": "Subtask", "subtask": False},
            {"name": "Subtask"}, {}, None, "Subtask", True,
            *({"name": "Subtask", "subtask": value}
              for value in (None, "true", "false", 1, 0, [], {})),
        )
        for identity in classifications:
            for apply in (False, True):
                for summary in ("E10-S04 cancellation", "E00 technical enabler"):
                    with self.subTest(identity=identity, apply=apply, summary=summary):
                        fields = {"status": {"name": "In Review"}, "issuetype": identity,
                                  "summary": summary, "parent": {"key": "SCRUM-11"},
                                  "subtasks": [{"key": "SCRUM-320",
                                                "fields": {"status": {"name": "To Do"}}}]}
                        fake = RecordingJira(fields)
                        stream = io.StringIO()
                        pr = _pr(head_ref="fix/partial", title="fix: migration only",
                                 body="Partial delivery. Closes SCRUM-73.")
                        with patch.object(module, "_jira_call", side_effect=fake):
                            code = module.reconcile([pr], CONFIG, apply=apply,
                                                    repo="a/b", stream=stream)
                        self.assertEqual(code, 0)
                        self.assertEqual([call[0] for call in fake.calls], ["GET"])
                        self.assertIn("report-only", stream.getvalue())
                        self.assertNotIn("would transition", stream.getvalue())

    def test_terminal_statuses_remain_noop_when_classification_missing(self):
        for status in module.TERMINAL_STATUSES:
            with self.subTest(status=status):
                fake = RecordingJira({"status": {"name": status}})
                stream = io.StringIO()
                with patch.object(module, "_jira_call", side_effect=fake):
                    code = module.reconcile([_pr()], CONFIG, apply=True,
                                            repo="a/b", stream=stream)
                self.assertEqual(code, 0)
                self.assertEqual([call[0] for call in fake.calls], ["GET"])
                self.assertIn(f"already {status}", stream.getvalue())

    def test_cli_event_yes_writes_only_when_subtask_identity_is_true(self):
        event = {"pull_request": {"number": 319, "merged": True,
                 "title": "fix: scoped change (SCRUM-73)", "body": "Partial delivery",
                 "head": {"ref": "fix/SCRUM-73-partial"},
                 "user": {"login": "student", "type": "User"}}}
        for subtask in (False, True):
            with self.subTest(subtask=subtask), tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "event.json"
                path.write_text(json.dumps(event), encoding="utf-8")
                fake = RecordingJira({"status": {"name": "In Review"},
                                      "issuetype": {"name": "Custom type", "subtask": subtask},
                                      "parent": {"key": "SCRUM-11"}}, allow_posts=subtask)
                with patch.dict(os.environ, {"JIRA_SITE_URL": CONFIG.site_url,
                                "JIRA_EMAIL": CONFIG.email, "JIRA_API_TOKEN": CONFIG.api_token,
                                "JIRA_PROJECT_KEY": CONFIG.project_key}), \
                     patch.object(module, "_jira_call", side_effect=fake):
                    code = module.main(["--event-path", str(path), "--yes", "--repo", "a/b"])
                self.assertEqual(code, 0)
                posts = [call[1] for call in fake.calls if call[0] == "POST"]
                self.assertEqual(posts, ["/rest/api/3/issue/SCRUM-73/transitions",
                                         "/rest/api/3/issue/SCRUM-73/comment"] if subtask else [])
                self.assertTrue(all("/SCRUM-11" not in call[1] for call in fake.calls))
                requested = fake.calls[0][1].partition("?fields=")[2].split(",")
                self.assertIn("issuetype", requested)


if __name__ == "__main__":
    unittest.main()
