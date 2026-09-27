"""Ruleset migration safety with in-memory GitHub replies, never live mutations.

Regression coverage for PR #124: retain classic protection until the requested
replacement is verified, including permissions/check sources and error handling.
"""

import copy
import importlib.util
import io
import json
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("configure_github_under_test", ROOT / "scripts/configure_github.py")
MODULE = importlib.util.module_from_spec(SPEC)
with patch("subprocess.run", return_value=SimpleNamespace(returncode=0, stdout="example/repo", stderr="")):
    SPEC.loader.exec_module(MODULE)


class RulesetMigrationTests(unittest.TestCase):
    def setUp(self):
        self.expected = json.loads((ROOT / ".github/settings/main-ruleset.json").read_text())
        self.settings = json.loads((ROOT / ".github/settings/repository.json").read_text())

    def run_apply(self, observed):
        self.calls = []

        def fake_api(endpoint, *, method="GET", **kwargs):
            self.calls.append((endpoint, method))
            if endpoint == "":
                return {**self.settings, "permissions": {"admin": True}}
            if endpoint == "/branches/main":
                return {"commit": {"sha": "reviewed-head"}}
            if "/check-runs" in endpoint:
                return {"check_runs": [{"name": c["context"], "conclusion": "success"}
                        for r in self.expected["rules"] if r["type"] == "required_status_checks"
                        for c in r["parameters"]["required_status_checks"]]}
            if endpoint == "/rulesets":
                return [] if method == "GET" else {"id": 42}
            if endpoint == "/rulesets/42":
                return observed
            if endpoint == "/branches/main/protection" and method == "DELETE":
                return None
            raise AssertionError((endpoint, method, kwargs))

        with patch.object(MODULE, "api", side_effect=fake_api), patch("sys.argv", ["configure", "--apply"]), patch("sys.stdout", new_callable=io.StringIO):
            return MODULE.main()

    def test_removes_classic_protection_only_after_successful_readback(self):
        self.assertEqual(self.run_apply(copy.deepcopy(self.expected)), 0)
        self.assertLess(self.calls.index(("/rulesets/42", "GET")),
                        self.calls.index(("/branches/main/protection", "DELETE")))

    def test_failed_readback_preserves_classic_protection(self):
        # Each weakening must stop before DELETE, even when POST returned 201.
        for field in ("approval", "last_push", "stale_reviews", "strict", "checks", "source", "bypass", "target", "enforcement"):
            with self.subTest(field=field):
                observed = copy.deepcopy(self.expected)
                rules = {r["type"]: r for r in observed["rules"]}
                pr = rules["pull_request"]["parameters"]
                checks = rules["required_status_checks"]["parameters"]
                if field == "approval":
                    pr["required_approving_review_count"] = 0
                elif field == "last_push":
                    pr["require_last_push_approval"] = False
                elif field == "stale_reviews":
                    pr["dismiss_stale_reviews_on_push"] = False
                elif field == "strict":
                    checks["strict_required_status_checks_policy"] = False
                elif field == "checks":
                    checks["required_status_checks"].pop()
                elif field == "source":
                    checks["required_status_checks"][0]["integration_id"] = None
                elif field == "bypass":
                    observed["bypass_actors"] = [{"actor_id": 1, "actor_type": "Team"}]
                elif field == "target":
                    observed["conditions"]["ref_name"]["include"] = ["refs/heads/unrelated"]
                else:
                    observed["enforcement"] = "disabled"
                with self.assertRaises(RuntimeError):
                    self.run_apply(observed)
                self.assertNotIn(("/branches/main/protection", "DELETE"), self.calls)

    def test_readback_accepts_reordered_checks(self):
        observed = copy.deepcopy(self.expected)
        for rule in observed["rules"]:
            if rule["type"] == "required_status_checks":
                rule["parameters"]["required_status_checks"].reverse()
        MODULE.verify_ruleset(observed, self.expected)

    def test_only_explicit_absent_protection_is_idempotent(self):
        for message, status, expected_ok in (("Branch not protected", 404, True),
                                             ("Not Found", 404, False),
                                             ("Branch not protected", 403, False)):
            with self.subTest(message=message, status=status):
                result = SimpleNamespace(returncode=1, stdout=json.dumps({"message": message}),
                                         stderr=f"gh: {message} (HTTP {status})")
                with patch.object(MODULE.subprocess, "run", return_value=result):
                    if expected_ok:
                        self.assertIsNone(MODULE.api("/branches/main/protection", method="DELETE", not_found_ok=True))
                    else:
                        with self.assertRaises(RuntimeError):
                            MODULE.api("/branches/main/protection", method="DELETE", not_found_ok=True)
