"""Tests for scripts/jira_hygiene_sweep.py. Network calls are stubbed."""
from __future__ import annotations

import importlib.util
import io
import sys
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "jira_hygiene_sweep.py"
SPEC = importlib.util.spec_from_file_location("jira_hygiene_sweep", SCRIPT)
module = importlib.util.module_from_spec(SPEC)
sys.modules["jira_hygiene_sweep"] = module
SPEC.loader.exec_module(module)

SweepIssue = module.SweepIssue
TEAM_FIELD = module.TEAM_FIELD
TEAM_ID = module.IS212_TEAM_ID

CONFIG = {
    "site_url": "https://example.atlassian.net",
    "email": "a@b.test",
    "api_token": "synthetic-token",  # pragma: allowlist secret - test fixture only
    "project_key": "SCRUM",
}


def _issue(**overrides) -> SweepIssue:
    defaults = dict(
        key="SCRUM-10",
        issue_type="Story",
        team_id=None,
        assignee_account_id=None,
        reporter_account_id="reporter-1",
    )
    defaults.update(overrides)
    return SweepIssue(**defaults)


def _raw(**overrides) -> dict:
    fields = {
        "issuetype": {"name": "Story"},
        "assignee": None,
        "reporter": {"accountId": "reporter-1"},
        TEAM_FIELD: None,
    }
    fields.update(overrides.pop("fields", {}))
    raw = {"key": "SCRUM-10", "fields": fields}
    raw.update(overrides)
    return raw


class PlanUpdateTests(unittest.TestCase):
    def test_missing_team_and_assignee_are_both_filled(self):
        payload = module.plan_update(_issue())
        self.assertEqual(payload["fields"][TEAM_FIELD], TEAM_ID)
        self.assertEqual(payload["fields"]["assignee"], {"accountId": "reporter-1"})

    def test_existing_team_is_not_overwritten(self):
        payload = module.plan_update(_issue(team_id="other-team"))
        self.assertNotIn(TEAM_FIELD, payload["fields"])
        self.assertIn("assignee", payload["fields"])

    def test_assigned_issue_with_team_needs_nothing(self):
        issue = _issue(team_id=TEAM_ID, assignee_account_id="already")
        self.assertIsNone(module.plan_update(issue))

    def test_subtask_never_receives_a_team_write(self):
        for name in ("Subtask", "Sub-task", "subtask"):
            payload = module.plan_update(_issue(issue_type=name))
            self.assertNotIn(TEAM_FIELD, payload["fields"], name)
            self.assertIn("assignee", payload["fields"], name)

    def test_subtask_with_an_assignee_is_left_alone(self):
        issue = _issue(issue_type="Subtask", assignee_account_id="already")
        self.assertIsNone(module.plan_update(issue))

    def test_unassigned_issue_without_a_reporter_is_not_written(self):
        issue = _issue(team_id=TEAM_ID, reporter_account_id=None)
        self.assertIsNone(module.plan_update(issue))


class ParseIssueTests(unittest.TestCase):
    def test_team_object_and_string_both_count_as_set(self):
        as_object = module.parse_issue(_raw(fields={TEAM_FIELD: {"id": "team-1", "name": "IS212"}}))
        as_string = module.parse_issue(_raw(fields={TEAM_FIELD: "team-1"}))
        self.assertEqual(as_object.team_id, "team-1")
        self.assertEqual(as_string.team_id, "team-1")

    def test_blank_team_and_missing_people_stay_empty(self):
        parsed = module.parse_issue(_raw(fields={
            TEAM_FIELD: "  ",
            "assignee": {},
            "reporter": None,
            "issuetype": {"name": "Task"},
        }))
        self.assertIsNone(parsed.team_id)
        self.assertIsNone(parsed.assignee_account_id)
        self.assertIsNone(parsed.reporter_account_id)
        self.assertEqual(parsed.issue_type, "Task")


class SearchTests(unittest.TestCase):
    def test_pages_until_last(self):
        pages = [
            {"issues": [_raw(key="SCRUM-1")], "isLast": False, "nextPageToken": "page-2"},
            {"issues": [_raw(key="SCRUM-2")], "isLast": True},
        ]

        seen: list[str] = []

        def fake_get(_config, path):
            seen.append(path)
            self.assertIn("project+%3D+SCRUM", path)
            return pages.pop(0)

        with patch.object(module, "jira_get", side_effect=fake_get):
            issues = module.search_issues(CONFIG)
        self.assertEqual([issue.key for issue in issues], ["SCRUM-1", "SCRUM-2"])
        self.assertEqual(len(seen), 2)
        self.assertNotIn("nextPageToken", seen[0])
        self.assertIn("nextPageToken=page-2", seen[1])


class SweepTests(unittest.TestCase):
    def test_dry_run_prints_the_plan_and_does_not_write(self):
        stream = io.StringIO()
        with patch.object(module, "jira_put") as put:
            code = module.sweep([_issue()], CONFIG, apply=False, stream=stream)
        self.assertEqual(code, 0)
        put.assert_not_called()
        self.assertIn("SCRUM-10: would set team, assignee", stream.getvalue())

    def test_apply_writes_one_payload(self):
        stream = io.StringIO()
        with patch.object(module, "jira_put", return_value={}) as put:
            code = module.sweep([_issue(key="SCRUM-20")], CONFIG, apply=True, stream=stream)
        self.assertEqual(code, 0)
        put.assert_called_once()
        path = put.call_args.args[1]
        payload = put.call_args.args[2]
        self.assertEqual(path, "/rest/api/3/issue/SCRUM-20")
        self.assertEqual(payload["fields"][TEAM_FIELD], TEAM_ID)
        self.assertIn("SCRUM-20: set team, assignee.", stream.getvalue())

    def test_a_failed_write_is_reported_and_the_sweep_continues(self):
        stream = io.StringIO()
        error = urllib.error.HTTPError(
            url="https://example.test", code=400, msg="bad", hdrs=None, fp=None,
        )

        def fake_put(_config, path, _payload):
            if path.endswith("SCRUM-1"):
                raise error
            return {}

        issues = [_issue(key="SCRUM-1"), _issue(key="SCRUM-2")]
        with patch.object(module, "jira_put", side_effect=fake_put):
            code = module.sweep(issues, CONFIG, apply=True, stream=stream)
        text = stream.getvalue()
        self.assertEqual(code, 1)
        self.assertIn("SCRUM-1: update failed (400)", text)
        self.assertIn("SCRUM-2: set team, assignee.", text)

    def test_missing_reporter_is_called_out_without_failing_the_run(self):
        stream = io.StringIO()
        issue = _issue(team_id=TEAM_ID, reporter_account_id=None)
        with patch.object(module, "jira_put") as put:
            code = module.sweep([issue], CONFIG, apply=True, stream=stream)
        self.assertEqual(code, 0)
        put.assert_not_called()
        self.assertIn("reporter has no account id", stream.getvalue())
