# Contribution guides for ConnectSphere

Short how-to guides so agents and teammates follow the same conventions when
they add work to this repository. Every guide is meant to be short enough to
read in five minutes and specific enough that an agent can execute it
without follow-up questions.

Read `docs/source-of-truth.md` first for the file-authority rules that
underpin all of these.

## Guides

- [Writing a user story](./writing-a-user-story.md) — add or amend a story
  in `docs/backlog/`.
- [Writing an acceptance test case](./writing-a-test-case.md) — add or
  amend a `TC_XX` in `docs/testing/cases/`.
- [Recording a backlog decision (BDR entry)](./writing-a-backlog-decision.md)
  — add a C-XX, T-XX, O-XX, or B-XX entry to `docs/bdr/`.
- [Recording an architecture decision (ADR)](./writing-an-architecture-decision.md)
  — add a new ADR under `docs/adr/`.
- [Writing tests](./writing-tests.md) — Playwright, Vitest, and backend
  unit test conventions including the comment discipline every test file
  must follow.
- [Converting a source file](./converting-a-source-file.md) — when to run
  the one-shot conversion scripts and when to stop.
- [Creating a postplan](./creating-a-postplan.md) — the per-PR HTML
  review that gets uploaded to `postplan.dev` and linked in the PR.
- [Generating an SBOM](./generating-sbom.md) — run `npm run sbom` to produce
  CycloneDX SBOMs for the npm workspace tree and Python tooling.

## Shared conventions

Every guide assumes:

1. Every edit ships on a **short-lived branch** named `feature/SCRUM-XX-slug`,
   `docs/short-slug`, `fix/short-slug`, `chore/short-slug`, `test/short-slug`,
   `ci/short-slug`, or `refactor/short-slug` per `CONTRIBUTING.md`.
2. Every commit follows **Conventional Commits** (`type(scope): summary`,
   ≤100 chars).
3. Every PR runs `python scripts/check.py` locally and includes the exact
   result in the PR body.
4. If a change touches a `CAA DDMMYYYY` file, follow the **copy-forward
   rule** in `docs/source-of-truth.md`: never overwrite older dated copies.
5. If a change affects the product backlog, also update the affected
   derivatives (C4 diagrams, user flows, test cases, Jira) in the same PR
   or note in the PR body which derivatives were checked and why no
   update was needed.

## Style rules for agent-generated Markdown

Applies to every guide, decision record, and story block an agent writes:

- Use `---` as the horizontal rule if you need one; do not use `***`.
- Lists start with `- ` (dash-space); do not use `*` for bullets.
- Metadata blocks at the top of a story or test case use the definition-
  style bullet list `- **Field**: value`.
- Multi-line acceptance criteria use level-four headings
  (`#### Scenario N — <label>`) rather than bold-only headings.
- Inline references to other stories or BDR entries are plain text tokens
  (`see T-52`, `blocks E06-S06`), not Markdown links, so files stay
  readable if the URL scheme changes later.
- Trailing whitespace is removed; every file ends with exactly one newline.
  The pre-commit hooks enforce both.

## When a guide is missing

If you find yourself doing something these guides do not cover, write a
new guide before you commit the work. A one-file how-to that names the
convention is worth more than any amount of prose in a PR body.
