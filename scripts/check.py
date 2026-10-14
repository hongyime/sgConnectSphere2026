"""Run repository hygiene and tooling checks, independently of application checks."""

import subprocess
from pathlib import Path

from tooling_env import python_path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    tool_python = python_path()
    if not tool_python.is_file():
        print("Missing repository tooling. Run: python scripts/setup.py")
        return 1
    commands = [
        [str(tool_python), "-m", "pre_commit", "validate-config"],
        [str(tool_python), "scripts/check_test_run_records.py"],
        [str(tool_python), "-m", "pre_commit", "run", "--all-files", "--show-diff-on-failure"],
        # .env.template must match what scripts/generate_env_template.py would
        # produce from the code. This mirrors the tc-coverage.md drift gate in
        # .github/workflows/ci.yml and prevents the class of bug where a
        # teammate's clone silently misses DATABASE_URL / Supabase / Upstash
        # keys because the hand-maintained template drifted from reality.
        [str(tool_python), "scripts/generate_env_template.py", "--check"],
        [str(tool_python), "-m", "unittest", "discover", "-s", "tooling/tests", "-v"],
    ]
    for command in commands:
        result = subprocess.run(command, cwd=ROOT, check=False)
        if result.returncode:
            return result.returncode
    print("PASS: repository hygiene and tooling tests.")
    print("Run application checks separately: npm run build and npm run test:runtime.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
