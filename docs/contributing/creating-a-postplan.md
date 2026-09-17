# Creating a postplan for every PR

Every pull request against `main` gets a **postplan**: a small standalone
HTML review, uploaded to a public `postplan.dev` draft, then linked as a
top-level comment on the PR. Reviewers can skim the shape of the change
and the evidence before deciding whether to dive into the diff.

Read `docs/source-of-truth.md` first for the file-authority rules that
apply to every derivative artefact. The postplan HTML is derivative: it
summarises the PR, it does not amend backlog, decision, or test-case
sources.

## Why we do this

- Teammates review faster when they can see the shape of a change first.
- Reviewers who only care about scope, risk, or evidence never have to
  read the diff.
- A postplan URL is a stable public link the whole team, and the marker,
  can view without a GitHub login.
- A shared dark theme with one accent colour keeps every postplan looking
  the same; only the subject changes.

## When to make one

- **Every PR** against `main` that adds a feature, changes behaviour,
  documents a decision, or renumbers files.
- **Every review PR** that responds to a teammate's PR with fixes.
- **Sprint wrap-ups** and other milestone summaries.

Skip a postplan only for a purely trivial single-line fix (typo, obvious
constant rename). If a reviewer needs any context beyond the diff, write
a postplan.

## Setup

The workflow uses two tools:

1. **A text editor** to author standalone HTML. Any editor works. Do
   not use a scaffolder that adds external dependencies (CDN scripts,
   remote fonts, iframes); the file must be single-page standalone.
2. **The `postplan` CLI** to upload the finished HTML to a public URL.
   Runs via `npx` on demand; nothing to install globally.

The repository ships one helper script:

- `scripts/check_postplan_html.py` — a structural check that flags
  missing sections, duplicate ids, external network dependencies, and
  unrendered Mermaid containers.

No accounts or paid services are required. Postplan drafts are free.

## Author the HTML

Start from an existing postplan file in the repository history
(look under any recent PR's diff for `artifacts/*.html`) and replace
the subject, or write a fresh standalone HTML file.

Required document structure, three top-level `<section>` anchors in
this order:

- `id="overview"` — one visual (usually a diagram or a comparison
  figure) and one sentence answering the question the PR poses.
- `id="details"` — the substantive evidence: tables, metrics, review
  findings, CI status. This is where the reader spends most of their
  time.
- `id="next-steps"` — a short numbered list of what happens next. For
  a feature PR that is usually "merge, then update Jira". For a review
  PR it is usually a merge path.

Design conventions the check does not enforce but every postplan
follows:

- Dark background, one accent colour, sans-serif system font stack.
- One inline SVG diagram, drawn or rendered locally. No CDN scripts,
  no remote fonts, no runtime `fetch` calls.
- Every diagram carries a `<title>` and `<desc>` for screenreaders and
  a plain-language caption for sighted readers.

## Verify the structure

From the repository root, run:

```pwsh
# Windows PowerShell
py -3 scripts/check_postplan_html.py artifacts/<slug>.html
```

```bash
# macOS or Linux
python3 scripts/check_postplan_html.py artifacts/<slug>.html
```

The check exits `0` on pass and prints the number of inline SVGs it
found. Visually inspect the HTML in a browser after the check passes;
the check does not verify layout or readability.

Common check failures:

- `Missing document section: <id>` — add the required section anchor.
- `External script dependency` or `External stylesheet/preload
  dependency` — replace the CDN reference with inline CSS or SVG.
- `Unrendered Mermaid container` — render the Mermaid source to SVG
  locally and paste the SVG inline. Keep the Mermaid source in a
  `<details>` element beside the SVG for future editing.

## Naming and location

- Save the HTML at `artifacts/<slug>.html` inside this repo. The
  `artifacts/` directory is gitignored on purpose: the hosted postplan
  URL is the durable artefact, not the local file.
- Use a `<slug>` that identifies the PR or milestone. For example:
  - `pr-56-review.html`
  - `sprint1-wrapup.html`
  - `scrum-93-verification-flow.html`

## Upload and post

Upload the file to postplan:

```pwsh
npx --yes postplan upload artifacts/<slug>.html --description "<one-line summary>"
```

The command prints a public URL. Post it as a **top-level comment** on
the PR (not as a review comment) using this template:

```md
**Review — <PR title>**

Full postplan: **<url>**

## TL;DR

- <one-sentence verdict>
- <one-sentence risk or blocker>
- <one-sentence recommendation>

<optional: short bullet list of findings or scope notes>
```

Do not paste the full HTML into the comment. The URL is the delivery.

## Comment discipline

Postplans, like the code they review, must be **readable without
context**. Every table row explains what happened, what the root cause
is, and what the fix is. Every diagram carries a caption that names the
relationship it shows. Never leave a diagram without a caption.

Every claim in a postplan should cite a source: a file path, a commit
sha, a Jira ID, a specific test case. If you cannot cite it, do not
claim it.

## Reusing postplans

- Historical postplan URLs stay live. Reference them from ADR/BDR
  entries when a past decision is relevant.
- If a PR changes materially (new commits after review), upload a new
  version of the postplan rather than editing the old one. Postplan
  drafts are immutable; a new upload creates a new URL.

## Related guides

- `docs/contributing/writing-tests.md` — the test-file comment
  discipline the postplan Details section usually cites.
- `docs/contributing/writing-a-backlog-decision.md` — when a review
  finding calls for a new BDR entry, not just a code fix.
- `docs/contributing/writing-an-architecture-decision.md` — when the
  postplan surfaces an architecture-level decision that needs an ADR.
