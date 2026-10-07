# Group D plan — Lane B backlog and test-case migration to Markdown

Session plan for SCRUM-100: convert the two Excel source workbooks
(`docs/CONNECTSPHERE BACKLOGS CAA 140926.xlsx` and
`docs/testing/PROJECT TEST CASES.xlsx`) into per-epic Markdown files
that agents and humans can diff, review, and edit in pull requests.
The two Word decision documents (Architecture Decision Records and
Backlog Decision Review) stay in Word and continue to follow ADR-015
copy-forward. This is Lane B of the source-of-truth plan.

## Why this exists

- Binary `.xlsx` files cannot be 3-way merged. Two concurrent PRs
  become a merge conflict resolved by whoever opens the file second.
- The reviewer of a `.xlsx` change sees `Bin 88198 -> 91204 bytes`
  and has to open Excel to check the diff. Meaningful review is
  effectively blocked.
- Agents cannot precisely edit one story without touching the whole
  file. Any agent-generated backlog change is bigger than it needs to
  be, which makes reviewers less confident.

Markdown fixes all three: text 3-way merges, GitHub renders a real
diff, and an agent can rewrite one story's acceptance criteria without
touching the twelve stories around it.

## What does NOT change

- The four `.docx` decision documents (`ARCHITECTURE DECISION RECORDS`
  and `BACKLOG DECISION REVIEW`) stay in Word. They change rarely, are
  read as prose rather than filtered as data, and the copy-forward
  rule in ADR-015 handles their concurrency.
- The `CAA DDMMYYYY` naming convention stays. It applies to whichever
  file is still binary at any given time.
- Jira remains a derivative of the backlog. Jira reconciliation
  happens in a follow-up PR after a backlog PR merges, per the rule
  in `docs/source-of-truth.md`.

## Sub-PRs, in order

Land in the exact order below. Every sub-PR opens against the previous
sub-PR's merge commit; do not try to run them in parallel.

### D1 — Design the canonical Markdown format

Branch: `docs/SCRUM-100-backlog-markdown-format`

Deliverable: `docs/backlog/README.md` alone. No stories converted yet.
The file specifies:

1. File layout. Recommended: one file per epic under `docs/backlog/`,
   named `E01-access-and-account.md`, `E02-event-organiser.md`, etc.
2. Front matter or a heading structure. Recommended: no YAML front
   matter; each story is a level-two heading `## E01-S01 — Log in to
   the system`, followed by a level-three heading `### Story`,
   `### Acceptance criteria`, `### BDR references`, `### Sprint /
   Points / Priority`.
3. How multi-line acceptance criteria are written. Recommended: a
   Markdown bulleted list under `### Acceptance criteria`, each bullet
   a single scenario. Scenarios that already read as Gherkin in the
   workbook keep their Given/When/Then structure.
4. How links to other stories and BDR entries are written. Recommended:
   inline text tokens like `see T-52` or `blocks E06-S06`, not
   Markdown links, so the file stays readable if the URL scheme
   changes later.

Rationale for choices lives in the same README so future contributors
understand why the format is what it is.

Do NOT write any story files in this PR. The whole point is to review
the format in isolation.

### D2 — Convert the backlog workbook to Markdown

Branch: `feature/SCRUM-100-backlog-xlsx-to-markdown`

Deliverable:

1. `scripts/one_shot/backlog_xlsx_to_md.py` — one-shot Python script
   that reads `docs/CONNECTSPHERE BACKLOGS CAA 140926.xlsx` and writes
   per-epic Markdown files following the D1 format. Uses
   `openpyxl` from `tooling/requirements.txt` (already pinned); adds
   nothing new to tooling. Gitignore the script under
   `scripts/one_shot/` — this is not a repeatable command, this is a
   one-time migration.
2. Every epic sheet in the workbook becomes one file under
   `docs/backlog/`. Every row becomes one story block. Points,
   priority, sprint, BDR references, acceptance criteria all preserved.
3. Manual review pass: at least three stories per epic are diffed
   line-by-line against the workbook to confirm no acceptance criteria
   or scenarios were dropped. Record the sample in the PR body.
4. The `.xlsx` stays on disk unchanged. Do NOT delete it. It remains
   authoritative until D4 merges.

Acceptance signals:

- Every non-empty row in every epic sheet has a corresponding
  `## E<xx>-S<yy>` heading in the Markdown.
- Total story count matches the workbook. Cite the count in the PR body.
- `python scripts/check.py` passes. The added Markdown files have
  trailing newlines and no trailing whitespace, which pre-commit will
  enforce.

### D3 — Add the Markdown-to-xlsx export script

Branch: `feature/SCRUM-100-backlog-export-script`

Deliverable:

1. `scripts/export_backlog_xlsx.py` — a repeatable Python script that
   reads `docs/backlog/*.md` and writes
   `docs/CONNECTSPHERE BACKLOGS CAA {DDMMYYYY}.xlsx`. Idempotent.
2. A test under `tooling/tests/` that runs the export script against
   a fixture Markdown tree, opens the resulting `.xlsx` with
   `openpyxl`, and asserts the sheet count and one story's fields
   round-trip correctly.
3. `docs/source-of-truth.md` gains a "How to regenerate the .xlsx
   export" section pointing at the script.
4. The generated `.xlsx` is committed only when a human explicitly
   decides to run the export (e.g. to import to Jira via CSV). It is
   NOT written automatically by CI.

Acceptance signals:

- The tooling test passes on a clean check.
- The generated file opens in Excel and matches the D2 Markdown for
  the same date-stamp.

### D4 — Declare Markdown authoritative

Branch: `docs/SCRUM-100-markdown-authoritative`

Deliverable:

1. `docs/source-of-truth.md`:
   - Update the "Current primary source files" table so the
     "Product backlog" row points at `docs/backlog/` (the directory)
     rather than the `.xlsx`.
   - Update the authority order section to state that Markdown under
     `docs/backlog/` is authoritative for backlog content; the
     `.xlsx` under `docs/` is a generated export only.
   - Update the copy-forward rules: rule 5 (sequential merges) now
     applies only to `.docx` files, since backlog and test-case
     Markdown supports 3-way merges.
2. `docs/jira-agent-workflow.md`: update the "primary files" list to
   reference `docs/backlog/` and remove the `.xlsx` path.
3. Delete the old `.xlsx`. Rationale: keeping both invites drift.
   Someone edits the `.xlsx` thinking it is authoritative, no one
   regenerates from Markdown, sources diverge. The workbook is
   recoverable at any point by running the export script from D3.
4. Add a new ADR-017 in the next `docs/decisions/` slot recording
   the change of authority. Follow the pattern of `0002` and `0003`.

Acceptance signals:

- Every reference to `CONNECTSPHERE BACKLOGS CAA 140926.xlsx` in
  Markdown docs is removed or points at Markdown instead.
- `python scripts/check.py` passes.
- No downstream doc quotes the workbook filename as authoritative.

### D5 — Convert the test-cases workbook to Markdown

Branch: `feature/SCRUM-100-testcases-xlsx-to-markdown`

Deliverable:

1. Repeat the D2 pattern for
   `docs/testing/PROJECT TEST CASES.xlsx` -> `docs/testing/cases/*.md`.
   One file per epic, one test case block per case.
2. Repeat the D3 pattern with `scripts/export_testcases_xlsx.py`.
3. Repeat the D4 update in `docs/source-of-truth.md` and
   `docs/testing/README.md` to make the Markdown authoritative and
   delete the `.xlsx`.

D5 can piggyback on D3's tooling test scaffolding.

## Merge and rollback plan

- Do not merge D2 until a teammate has reviewed the format decisions in
  D1. Format churn after D2 lands means re-running the conversion.
- Between D2 and D4, `.xlsx` and Markdown both live on disk. Treat
  Markdown as authoritative during that window; if the two disagree,
  Markdown wins (D2's PR body should say this explicitly).
- If D4 turns out to be premature (agents cannot yet do useful edits,
  or the format needs a major rework), revert D4 only. D2 and D3 can
  stay: they merely add files.

## Not in Group D scope

- Migrating Jira issues. Jira reconciliation is a follow-up PR after
  each backlog change, not a one-time migration.
- Migrating the two `.docx` decision documents. They stay in Word.
- Migrating diagrams and other Markdown docs. They already are text.
- Adopting a project-tracking format like GitHub Issues or GitHub
  Projects instead of Jira. Out of scope; Jira remains authoritative
  for progress tracking per `docs/jira-agent-workflow.md`.
