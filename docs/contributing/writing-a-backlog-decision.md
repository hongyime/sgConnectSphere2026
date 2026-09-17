# Recording a backlog decision (BDR entry)

Adds an entry to the Backlog Decision Review under `docs/bdr/`.

## Which file

| Kind of entry | ID prefix | File |
| --- | --- | --- |
| Customer clarification | `C-XX` | `docs/bdr/A-customer-clarifications.md` |
| Team decision | `T-XX` | `docs/bdr/B-team-decisions.md` |
| Open question or standing assumption | `O-XX` | `docs/bdr/C-open-questions.md` |
| Story boundary ruling | `B-XX` | `docs/bdr/D-boundary-rulings.md` |

Numbers increment within their prefix. Never renumber existing entries.

## What kind of entry to write

- **`C-XX`** — the customer said something and the team is recording it. Do
  not paraphrase; use the customer's own wording where possible. Include
  who asked and where they said it.
- **`T-XX`** — the team decided something that is not directly answerable
  from customer clarifications. Always record the rationale and what it
  affects. This is the entry that says "we chose this; here is why".
- **`O-XX`** — an assumption the team is running with, or a question that
  has not yet been answered. When it closes, add a status note pointing
  at the closing `C-XX` or `T-XX` — do not delete the row.
- **`B-XX`** — a boundary between two stories that repeatedly gets
  ambiguous (E01-S02 and E01-S03 is the canonical example). Record the
  ruling with the reasoning so the ambiguity does not resurface.

## Row format

Every section file is a Markdown table. Add a new row at the correct
numeric position (do NOT append to the end if that breaks the number
sequence). Cells that contain multi-paragraph text use `<br>` for line
breaks.

### A. Customer clarifications

```
| C-65 | Charles | G2 | <the question the team asked> | <what the customer said> | Settled | <what it settled for us> |
```

Columns: `ID | Who | Sec | Question asked | Customer answer | Status | What it settled for us`.

### B. Team decisions

```
| T-52 | <one-line decision> | <rationale, cite forces + tradeoffs> | <which stories or docs this affects> | <the C- or O- entry this follows from, or - if none> |
```

Columns: `ID | Decision | Rationale | Affects | Follows from`.

### C. Open questions and standing assumptions

```
| O-20 | <topic> | <current status; if closed, cite what closed it> | <cross-refs> | <priority> |
```

Columns: `ID | Topic | Where it stands | Refs | Priority`.

### D. Story boundary rulings

```
| B-12 | <the two stories> | <the ruling> | <reasoning> |
```

Columns: `ID | Stories | Ruling | Reasoning`.

## Same-PR requirements

An entry in `docs/bdr/` is not self-sufficient. The PR that adds it must
also:

1. Update every affected backlog story in `docs/backlog/**` so the
   `BDR references` line at the top of the story cites the new code.
2. Update affected test cases in `docs/testing/cases/` so their
   `AC reference` field reflects the amended scenario, if any.
3. If a T-XX changes a decision recorded in an ADR, update the affected
   `docs/adr/ADR-XXX-*.md` file's Status or metadata block.

## Deprecating or superseding an entry

Do not delete rows. Prefix the closing/settling cell with
`SUPERSEDED — see T-XX` (for a team decision that replaced it) or
`CLOSED — see C-XX` (for a customer clarification that closed an open
question). Retaining the row is how future readers understand why the
current decision exists.

## Never invented content

Every entry cites its source: a customer session, a workbook page, a
git commit, a PR number. An entry with no source is a code review
finding, not a BDR entry. Move it back to a `TODO` in the PR that
introduced it.
