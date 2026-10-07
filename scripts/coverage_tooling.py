"""Run coverage.py over the repository tooling tests, using the same
interpreter-resolution convention as scripts/check.py so this works
identically for every clone and in CI -- no reliance on a globally
installed pytest.
"""
import subprocess
from pathlib import Path

from tooling_env import python_path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    tool_python = python_path()
    if not tool_python.is_file():
        print("Missing repository tooling. Run: python scripts/setup.py")
        return 1
    run = subprocess.run(
        [str(tool_python), "-m", "coverage", "run", "-m", "unittest",
         "discover", "-s", "tooling/tests", "-v"],
        cwd=ROOT, check=False,
    )
    if run.returncode:
        return run.returncode
    return subprocess.run(
        [str(tool_python), "-m", "coverage", "report"],
        cwd=ROOT, check=False,
    ).returncode


if __name__ == "__main__":
    raise SystemExit(main())
