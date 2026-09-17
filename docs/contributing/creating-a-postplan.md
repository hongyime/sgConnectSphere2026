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
- The visual explainer's dark/cyan design keeps every postplan looking
  the same; only the subject changes.

## When to make one

- **Every PR** against `main` that adds a feature, changes behaviour,
  documents a decision, or renumbers files.
- **Every review PR** that responds to a teammate's PR with fixes.
- **Sprint wrap-ups** and other milestone summaries.

Skip a postplan only for a purely trivial single-line fix (typo, obvious
constant rename). If a reviewer needs any context beyond the diff, write
a postplan.

## What goes in the HTML

Follow the visual-explainer skill in
`C:/Users/bryan/OneDrive/01 SKILLS/.agents/skills/visual-explainer/` if you
are running Kiro or Claude Code. Otherwise copy an existing postplan HTML
from a prior PR and replace the subject.

Required sections, in this order, each with a stable `id`:

- `id="overview"` — one visual (usually a diagram or a comparison figure)
  and one sentence answering the question the PR poses.
- `id="details"` — the substantive evidence: tables, metrics, review
  findings, CI status. This is where the reader spends most of their
  time.
- `id="next-steps"` — a short numbered list of what happens next. For a
  feature PR that is usually "merge, then update Jira". For a review PR
  it is usually a merge path.

Design tokens the skill enforces (do not invent new ones):

- Background `#101418`, surface `#171D23`, accent `#67D4E8`.
- `Segoe UI, system-ui, sans-serif` font stack.
- One inline SVG diagram, drawn or rendered locally. Never a CDN script
  or remote font.

Verify structure with:

```pwsh
py -3 "C:\Users\bryan\OneDrive\01 SKILLS\.agents\skills\visual-explainer\scripts\check_html.py" artifacts/<slug>.html
```

The check flags missing sections, duplicate ids, external network
dependencies, and unrendered Mermaid containers.

## Naming and location

- Save the HTML at `artifacts/<slug>.html` inside this repo. The
  `artifacts/` directory is gitignored on purpose: the hosted postplan
  URL is the durable artefact, not the local file.
- Use a `<slug>` that identifies the PR or milestone. For example:
  - `pr-56-review.html`
  - `sprint1-wrapup.html`
  - `scrum-93-verification-flow.html`

## Uploading and posting

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
