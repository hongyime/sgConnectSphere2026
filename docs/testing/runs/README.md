# Test execution records

This directory holds one Markdown file per test run session. A run session is
one person running one scope of tests in one sitting.

These files are the execution log the team can hand to the marker; at project
end they export to an "Execution Records" sheet in the course deliverable
workbook.

## What needs recording

Record a run when it is **used as evidence**: cited in a pull request, offered
as proof that a story meets its Definition of Done, or shown in a demo. This
obligation is team decision **T-65** in `docs/bdr/B-team-decisions.md`; this
document defines only the format that satisfies it.

You do not need a record for exploratory runs while developing -- the `npm test`
you run twenty times while writing a function is not evidence of anything.
Neither is a CI run by default: those already have an immutable Actions log with
a URL. Record a CI run only when citing it as evidence, with `environment: ci`
and the run URL in `Remarks`.

The test is whether someone later needs to see that this ran, on this commit,
with this outcome, and who ran it.

## Why one file per session

A per-test file would produce hundreds of files and create merge conflicts
whenever two people run overlapping suites. A per-session file stays skimmable,
merges cleanly because each file is new, and mirrors the precedent already set
by `docs/testing/pr-56-review.md`. No two people ever edit the same session
file, so conflict-free parallel work is guaranteed.

## Filename convention

```
YYYYMMDD-HHMMSS-<github-username>-<scope>.md
```

Example: `20260930-143022-Bl0oper-backend-db.md`

The timestamp plus username makes collisions effectively impossible. Use the
local time of the machine that ran the tests, in Asia/Singapore (UTC+8).
`scope` must be one of the fixed values listed below; use hyphens in the
filename where the scope value contains a forward slash
(for example `backend/db` becomes `backend-db`).

## Frontmatter schema

Every record file begins with a YAML frontmatter block. All fields are
required unless marked optional.

```yaml
---
date: 2026-09-30T14:30:22+08:00   # ISO 8601 with timezone offset
runner: Bl0oper                    # GitHub username, not display name
scope: backend/db                  # fixed enum; see below
environment: local                 # local | ci
run_type: manual                   # manual | automated | regression
test_case_version: 270926          # DDMMYY suffix of the test-case workbook in force
commit: 839592e                    # 7-character SHA of HEAD when the run happened
pr: 161                            # optional; omit if not tied to a PR
---
```

### `scope` values (fixed enum)

| Value | What it covers |
| --- | --- |
| `backend/unit` | Backend unit tests (`npm test --workspace backend`, unit suite only) |
| `backend/db` | Backend database integration tests (`npm run test:db --workspace backend`) |
| `backend/api` | Backend API-layer tests |
| `backend/notifications` | Notification and queue integration tests (`npm run test:notifications`, `npm run test:redis`) |
| `frontend/vitest` | Frontend component tests (`npx vitest run`) |
| `frontend/e2e` | Playwright end-to-end tests (`npm run test:e2e:auth` or full `npx playwright test`) |
| `tooling` | Repository tooling tests (`python scripts/check.py`) |
| `runtime` | Runtime smoke tests (`npm run test:runtime`) |
| `full-regression` | All suites run together in one sitting |

Adding a new scope value requires amending this table in the same PR that first
uses it. Do not invent ad-hoc values; the fixed enum exists so that the future
exporter can group and filter records reliably.

### `environment` values

`local` for a developer's machine. `ci` for a GitHub Actions run.

### `run_type` values

`manual` for tests driven interactively. `automated` for tests triggered by a
script or CI pipeline without human intervention. `regression` for a deliberate
full re-run of a suite to confirm no regressions after a merge or release.

### `test_case_version`

The `DDMMYY` suffix of the `PROJECT TEST CASES CAA <DDMMYY>.xlsx` workbook
that was the canonical test-case source at the time of the run. For example, if
the workbook in force was `PROJECT TEST CASES CAA 270926.xlsx`, the value is
`270926`. This field ties each execution record to a specific snapshot of the
test catalogue so that later catalogue revisions do not make old records
ambiguous.

## Results table

After the frontmatter, include a Markdown table with these columns in this
order:

```markdown
| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
```

`TC_ID` is the identifier from `docs/testing/cases/`, for example
`TC_E01S01_01`. `Test Name` is the short description from the workbook or the
test title in code. `Outcome` must be one of the four values below.

### `Outcome` values

| Value | Meaning |
| --- | --- |
| `PASS` | The test ran to completion and all assertions passed |
| `FAIL` | At least one assertion failed or the test threw an unexpected error |
| `SKIP` | The test was deliberately not run (for example a known broken dependency) |
| `N/A` | The test case does not apply in the current environment or configuration |

There is no `BACKFILL` outcome. Historic runs reconstructed from PR evidence use
the normal `PASS` or `FAIL` values with the correct backdated `date` of the
original run. If the source of that evidence needs citing, put a link in
`Remarks`. Do not invent a composite value such as `BACKFILL-PASS`.

### `MULTIPLE` rows

When the only available evidence is an aggregate count rather than per-test
detail (for example "23 unit tests passed" from a CI log), record a single row
with `TC_ID` set to `MULTIPLE`, the count and a source URL in `Remarks`, and
the appropriate `Outcome`. This is common for historic backfill and for
automated runs where the test runner does not emit TC_IDs.

Example:

```markdown
| MULTIPLE | Backend unit suite | PASS | 23/23 passed — https://github.com/hongyime/sgConnectSphere2026/actions/runs/12345 |
```

## Design decisions

### Records are immutable once merged

A session file records what happened at a specific point in time. Once a file
is merged into `main`, do not edit it. If a test was later renamed, retired, or
renumbered in the catalogue, old records stay as they are. They are a historical
log, not a live index. Never rewrite history to match a later catalogue revision.

### Tests change mid-project

The `test_case_version` field captures which catalogue was in force. If a TC_ID
is retired or renumbered in a later workbook, any session files that reference
the old ID remain valid history. A reviewer who needs to understand an old record
should look at the workbook version named in `test_case_version`, not the current
one.

### Regression runs

Set `run_type: regression` and `scope: full-regression` (or the specific scope
being re-validated). A regression run of 80 tests is one session file with 80
rows. No special format is needed beyond that.

### New tests added to the catalogue

New TC_IDs simply appear in later session files. No migration of existing records
is needed.

## Human procedure

1. Run your test command. Wait for it to finish.
2. Note the current HEAD commit: `git rev-parse --short HEAD`.
3. Note the current time in Singapore (UTC+8).
4. Create a file in `docs/testing/runs/` using the filename convention above.
5. Copy the frontmatter template from `TEMPLATE.md` and fill in every required
   field. Set `pr` only if this run is tied to an open PR; otherwise omit it.
6. Add one row to the results table for each test case you ran. Use `MULTIPLE`
   if only aggregate counts are available.
7. Save the file. Run `python scripts/check.py`. Commit the record in the same
   PR as the code it covers, or as a standalone commit if it is a standalone
   verification run.

## Agent instruction block

After running any test command, create exactly one session record file in
`docs/testing/runs/`.

- Derive `runner` from the GitHub username associated with `git config user.name`
  or the authenticated GitHub login for this repository. Use the correct login
  for the person on whose behalf the tests are being run. Contributor logins are
  listed in `.github/CODEOWNERS`.
- Derive `commit` from `git rev-parse --short HEAD` at the moment the run
  finishes.
- Derive `date` from the actual clock time (UTC+8) at the moment the run
  finishes. Never fabricate a date.
- Set `test_case_version` to the `DDMMYY` suffix of the most recently dated
  `docs/testing/PROJECT TEST CASES CAA <DDMMYY>.xlsx` file present in the
  repository at the time of the run.
- Record `Outcome` only from observed test output. Never fabricate an outcome
  you did not observe. If a run was aborted, record what actually executed up to
  the point of abort and note "run aborted" plus the reason in `Remarks` for any
  test that did not complete.
- Use `MULTIPLE` for any suite where the runner does not emit per-test TC_IDs.
- Do not edit existing session files.

## Relationship to the per-story implementation logs

Some stories keep their own status document, for example
`docs/plans/scrum-33-implementation-status.md`. Those are **not** replaced by
this directory, and neither replaces the other. They answer different questions:

| | Per-story status document | Session record |
| --- | --- | --- |
| Answers | why the rules are what they are, and which test proves which acceptance criterion | what ran, when, by whom, on which commit, and with what outcome |
| Shape | narrative plus a traceability matrix | flat rows, one per test case |
| Scope | one story | the whole project |
| Lifetime | edited as the story evolves | immutable once merged |
| Consumed by | a reviewer reading that story | the Excel export, and the marker |

The traceability matrix is required separately by the Traceability Standard in
`docs/testing/README.md`. Keep it.

**Avoid double entry.** Where a per-story document logs a run, cite the session
record instead of restating the command and result:

```markdown
| 2026-09-30 | `npm run test:db` | 29/29 | `20260930-143022-Bl0oper-backend-db.md` |
```

Most of the apparent overlap dissolves once "used as evidence" is applied. The
gate runs someone repeats while building a story are exploratory and need no
session record; only the run that is finally cited as proof does. So a story
document may log a dozen iterations while this directory holds one or two files
for that story.

## Excel export path

A future `scripts/export_test_runs_xlsx.py` will read every `.md` file in this
directory, parse the frontmatter and results table, and write an "Execution
Records" sheet to the course deliverable workbook. The column order for that
sheet is frozen by this schema:

`date`, `runner`, `scope`, `environment`, `run_type`, `test_case_version`,
`commit`, `pr`, `TC_ID`, `Test Name`, `Outcome`, `Remarks`

Do not reorder these columns or rename the frontmatter fields without also
updating the exporter. The analogous script for the test-case catalogue is
`scripts/export_testcases_xlsx.py`; the runs exporter will follow the same
pattern.

## Worked example

The file below is illustrative only. The commit SHA and outcomes are fictional.
Do not copy this file; use `TEMPLATE.md` instead.

```
---
date: 2026-09-30T14:30:22+08:00
runner: Bl0oper
scope: backend/db
environment: local
run_type: manual
test_case_version: 270926
commit: a1b2c3d
pr: 161
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E01S01_01 | Valid credentials accepted, user reaches role dashboard | PASS | |
| TC_E01S01_02 | Wrong password keeps user signed out, generic message shown | PASS | |
| TC_E01S01_03 | Account locked after fifth consecutive wrong password | FAIL | Lock timer not persisted across server restart; see PR comment |
| TC_E03S01_01 | Submitting a request assigns exactly one Coordinator and moves status to Under Review | PASS | |
| TC_E03S01_02 | System assigns Coordinator with fewest active events | PASS | |
```
