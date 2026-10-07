# Writing a user story

Adds or amends a story in the ConnectSphere backlog under `docs/backlog/`.
Follow this guide exactly so the round-trip export to `.xlsx` (via
`scripts/export_backlog_xlsx.py`) preserves every field.

## Where a story lives

- Release 1 stories live in `docs/backlog/release-1/E<xx>-<slug>.md`.
- Product backlog stories (future / not-in-release-1) live in
  `docs/backlog/product/E<xx>-<slug>.md`.

A story appears in exactly one of the two, never both. Move a story
between files if its release status changes; do not duplicate it.

## Format

Every story is a Markdown block starting with a level-two heading in this
exact form:

```markdown
## E01-S12 — Reset a forgotten password

- **Sprint**: Sprint 2
- **Points**: 3
- **BDR references**: C-30, T-52, O-02
- **Owner**: ji ning

### User story

As an Event Organiser, I want to reset my password when I forget it so that
I can regain access without contacting the administrator.

### Acceptance criteria

#### Scenario 1 — Reset link issued to the registered address

Given my account exists When I request a password reset Then a reset link is
sent only to the email on record.

#### Scenario 2 — Expired link refused

Given a reset link is older than one hour When I open it Then the link is
rejected and I am shown how to request a new one.

### Checklist

- Request a reset from the sign-in screen
- Receive the reset link at the registered address only
- Be blocked when the link is expired
- Have the reset recorded in the activity log (E14-S02)
```

## Rules

1. **Every story has a Story ID and title.** Story ID matches
   `E<XX>-S<YY>` and increments within its epic. Do not skip numbers.
2. **Every story has a `User story` section** in the As-a / I-want / So-that
   form. If the workbook row was blank on user story, write
   `_No user story recorded._` explicitly rather than leaving a gap.
3. **Every story lists acceptance criteria as numbered Scenario sub-
   headings.** Multi-line scenarios in Gherkin form (Given / When / Then)
   stay as Gherkin. Scenarios that read as prose in the workbook stay as
   prose.
4. **Every story ends with a Checklist.** If none is recorded, the section
   is present but empty (`_No checklist recorded._`).
5. **Metadata is a definition-style bullet list at the top of the story.**
   Missing values are represented as an empty string, not omitted, so the
   `.xlsx` export can round-trip cleanly.
6. **Cross-references are inline text**, not Markdown links. Write
   `see T-52` rather than `[T-52](../bdr/B-team-decisions.md)`.

## Story-splitting rules of thumb

When a story grows past five Scenarios or its acceptance criteria mention
two clearly separate operations (create + confirm, submit + review), split
it. Follow the OPERATIONS pattern already recorded in BDR T-03 for E08-S03.
Keep each split story reviewable in a single sprint.

## Adding a brand-new epic

Do not invent an epic just to place a story. Reuse the closest existing
one. Adding an epic to the backlog needs a team decision recorded as a
T-XX in the BDR before any story files change.

## Retiring a story

Prefix the story title with `[RETIRED — <reason>]` and leave the block in
place. Do not delete retired stories. See ADR-004 and ADR-005 for how a
retired decision is written; the same pattern applies to backlog stories.

## Do the derivative updates in the same PR

If the story you are adding or amending:

- introduces a new user flow → update `docs/dynamic-user-flows.md`.
- introduces a new module → update `docs/c4-diagrams.md`.
- has acceptance criteria that will be tested → add the matching test
  cases in `docs/testing/cases/E<xx>.md` following
  [writing-a-test-case.md](./writing-a-test-case.md).
- has an accepted BDR reference → make sure the reference exists in
  `docs/bdr/` following
  [writing-a-backlog-decision.md](./writing-a-backlog-decision.md).

## Regenerate the xlsx export before opening the PR

```
.venv-tools\Scripts\python.exe scripts\export_backlog_xlsx.py
```

This produces `docs/CONNECTSPHERE BACKLOGS CAA <DDMMYYYY>.xlsx` from the
Markdown. Older dated copies stay on disk per copy-forward.
