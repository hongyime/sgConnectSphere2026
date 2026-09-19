"""Tests for scripts/reconcile_jira.py. Network calls are stubbed at the
_jira_call boundary; tests cover key-extraction rules and the reconcile
control flow (skip, dry-run, apply)."""

from __future__ import annotations

import importlib.util
import io
import json
import sys
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


if __name__ == "__main__":
    unittest.main()
