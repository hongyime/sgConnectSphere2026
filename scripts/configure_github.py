"""Preview or verify the proposed GitHub settings; an administrator can apply with --apply."""

import argparse
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def current_repository() -> str:
    result = subprocess.run(
        ["gh", "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"],
        capture_output=True, text=True, check=False,
    )
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or "Could not determine the current GitHub repository")
    return result.stdout.strip()


REPOSITORY = current_repository()


def api(endpoint: str, *, method: str = "GET", payload: dict | None = None, not_found_ok: bool = False):
    command = ["gh", "api", f"repos/{REPOSITORY}{endpoint}", "--method", method]
    if payload is not None:
        command.extend(["--input", "-"])
    result = subprocess.run(
        command, input=json.dumps(payload) if payload is not None else None,
        capture_output=True, text=True, check=False,
    )
    if result.returncode:
        combined = (result.stderr + result.stdout).lower()
        if not_found_ok and ("not protected" in combined or "404" in combined):
            return None
        raise RuntimeError(result.stderr.strip() or "GitHub request failed")
    return json.loads(result.stdout) if result.stdout.strip() else None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Apply after reviewing the preview")
    args = parser.parse_args()
    settings = json.loads((ROOT / ".github/settings/repository.json").read_text())
    ruleset = json.loads((ROOT / ".github/settings/main-ruleset.json").read_text())
    print(f"Target repository: {REPOSITORY}")
    print("Repository settings:\n" + json.dumps(settings, indent=2))
    print("Main ruleset:\n" + json.dumps(ruleset, indent=2))
    repo = api("")
    admin = repo.get("permissions", {}).get("admin", False)
    print(f"Authenticated account has admin permission: {admin}")
    if not args.apply:
        print("Preview only. No GitHub settings changed.")
        return 0
    if not admin:
        print("BLOCKED: a repository administrator must run this command. No settings changed.")
        return 1

    branch = api("/branches/main")
    checks = api(f"/commits/{branch['commit']['sha']}/check-runs?per_page=100")
    successful = {check["name"] for check in checks["check_runs"] if check["conclusion"] == "success"}
    expected = {
        check["context"]
        for rule in ruleset.get("rules", [])
        if rule.get("type") == "required_status_checks"
        for check in rule["parameters"]["required_status_checks"]
    }
    if not expected.issubset(successful):
        print("Wait for all required CI checks to succeed on the current main commit first.")
        return 1

    api("", method="PATCH", payload=settings)
    print("Repository merge settings applied.")

    # Create the ruleset if it does not exist; update it if the name already matches.
    existing = api("/rulesets") or []
    matched = next((r for r in existing if r["name"] == ruleset["name"]), None)
    if matched is None:
        created = api("/rulesets", method="POST", payload=ruleset)
        ruleset_id = created["id"]
        print(f"Ruleset '{ruleset['name']}' created (id={ruleset_id}).")
    else:
        ruleset_id = matched["id"]
        api(f"/rulesets/{ruleset_id}", method="PUT", payload=ruleset)
        print(f"Ruleset '{ruleset['name']}' updated (id={ruleset_id}).")

    # Remove classic branch protection to complete the one-time migration.
    # not_found_ok=True treats a 404 as success: protection was already absent.
    api("/branches/main/protection", method="DELETE", not_found_ok=True)
    print("Classic branch protection removed (or was already absent).")

    observed_repo = api("")
    observed_ruleset = api(f"/rulesets/{ruleset_id}")
    if any(observed_repo.get(key) != value for key, value in settings.items()):
        raise RuntimeError("Repository settings read-back differs from the requested values.")
    if observed_ruleset["enforcement"] != "active":
        raise RuntimeError("Ruleset enforcement read-back is not active.")
    observed_types = {r["type"] for r in observed_ruleset.get("rules", [])}
    for required_type in ("deletion", "non_fast_forward", "required_linear_history",
                          "pull_request", "required_status_checks"):
        if required_type not in observed_types:
            raise RuntimeError(f"Ruleset read-back missing expected rule type: {required_type}.")
    print("PASS: GitHub merge settings and main ruleset applied and read back.")
    print("Verify enforcement with a failing PR and a PR awaiting another person's approval.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as error:
        raise SystemExit(str(error)) from error
