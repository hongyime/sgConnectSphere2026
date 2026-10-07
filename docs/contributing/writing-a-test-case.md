# Writing an acceptance test case

Adds or amends a `TC_XX` entry in the ConnectSphere test-case catalogue
under `docs/testing/cases/`. Follow this guide so the round-trip export
via `scripts/export_testcases_xlsx.py` preserves every field, and so the
TC_ID audit at `docs/testing/tc-coverage.md` picks up your case correctly.

## Where a test case lives

- Story-attached test cases go in `docs/testing/cases/E<xx>.md`.
- Cross-cutting test cases (performance, Definition-of-Done checks, etc.)
  go in `docs/testing/cases/EXX.md`.

## Format

Every test case is a Markdown block under a story heading in this form:

```markdown
## E01-S12

### TC_E01S12_01 — Verify that a reset link is sent to the registered address

- **Sprint**: 2
- **AC reference**: E01-S12 - Scenario 1 (Reset link issued to the registered address)
- **Type**: 2 - Happy Path

#### Pre-conditions

Registered account exists: organiser_a@clienta.com

#### Test steps

1. Enter "organiser_a@clienta.com" in the "Forgot password" form
2. Click "Send reset link"

#### Test data

Email: organiser_a@clienta.com

#### Expected result

A reset link is delivered to the registered address; no other address receives it.
```

## Rules

1. **Every case has a TC_ID.** Format: `TC_<EpicStoryCode>_<NN>`. The
   `EpicStoryCode` follows the story it verifies (e.g. `E01S12`). `NN`
   starts at `01` per story and increments. Do not skip numbers.
2. **The Story ID above the block matches.** Cases belonging to `E01-S12`
   sit under a `## E01-S12` heading in the same file.
3. **AC reference is the workbook scenario text**, not a paraphrase. If
   the story does not have a numbered scenario yet, write the scenario
   first in `docs/backlog/`.
4. **Type is one of** `1 - Positive`, `2 - Happy Path`,
   `3 - Cross-cutting`, `4 - Negative`, `5 - Boundary`. Use `4 - Negative`
   for refusal / rejection cases and `5 - Boundary` for cases at limits.
5. **Test steps are numbered.** Each step is a single action the tester
   or the automated flow takes. Do not combine two actions into one step.
6. **Test data is the exact input**, not a description of it. Real
   passwords are synthetic; put an inline
   `<!-- pragma: allowlist secret -->` at end of line so `detect-secrets`
   does not fire.
7. **Expected result names the observable outcome.** It answers "how
   does the tester know this worked" not "what does the system do
   internally".

## Numbering across sprints and epics

The workbook sheet is sorted by Story ID then Test Case ID. Preserve that
order when adding a new case: put it in the numeric position, not at the
bottom of the file.

## Retiring a test case

Prefix the case scenario with `[RETIRED — <reason>]`. Leave the block in
place. Do not delete retired cases.

## Automating a test case

When you write the automated test that covers a TC_XX, put the TC_ID
**literally** in the test title. That is the signal
`scripts/tc_coverage_audit.py` uses to move the case from Scaffold to
Automated:

```typescript
test('TC_E01S12_01 — reset link only goes to the registered address', async ({ page }) => {
  // ...
});
```

One test can cover more than one TC_ID; separate them with a space in
the title:

```typescript
test('TC_E01S12_01 TC_E01S12_02 — reset happy path and expired-link refusal', async ({ page }) => {
  // ...
});
```

See [writing-tests.md](./writing-tests.md) for the full test-file
conventions.

## Regenerate the xlsx export before opening the PR

```
.venv-tools\Scripts\python.exe scripts\export_testcases_xlsx.py
```

This produces `docs/testing/PROJECT TEST CASES CAA <DDMMYYYY>.xlsx` from
the Markdown. Older dated copies stay on disk per copy-forward.

## Rerun the coverage audit

```
.venv-tools\Scripts\python.exe scripts\tc_coverage_audit.py
```

If your new case has an automated test with a matching TC_ID, it should
show up in the Automated column of `docs/testing/tc-coverage.md`. If it
does not, either the TC_ID is missing from the test title or the test
sits in `test.fixme()`.
