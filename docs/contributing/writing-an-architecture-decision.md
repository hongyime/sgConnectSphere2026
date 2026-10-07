# Recording an architecture decision (ADR)

Adds a new ADR under `docs/adr/`.

## When to write an ADR

Write an ADR when the team makes a choice about **how the system is built**
that a future contributor will need to justify or revisit. Concrete signals:

- Choosing between two technologies (PostgreSQL vs MySQL, React vs Vue).
- Introducing a constraint the team must live with (exclusion constraints,
  session cookie flags, tenancy scoping rule).
- Deferring or retiring a previously-accepted decision (see ADR-004 and
  ADR-005 for the retire pattern).

Do NOT write an ADR for:

- A story-level implementation choice that only affects one file. That is
  a code review concern.
- A team decision about backlog scope. That is a BDR `T-XX` entry.

## Where and how to file it

- File: `docs/adr/ADR-<NNN>-<slug>.md`. Increment `NNN` from the last
  existing ADR; never reuse a number.
- Update `docs/adr/README.md` index in the same commit.
- Update `docs/decisions/` with a numbered ADR-style summary if the
  choice also affects repository-tooling boundaries.

## Structure

Follow the existing ADR files exactly. The template is:

```markdown
# ADR-<NNN> — <one-line title>

- **Status:** Accepted | Proposed | RETIRED (see ADR-XXX)
- **Related BDR:** <comma-separated C-/T-/O-/B- codes, or —>

### Context

<Two or three paragraphs on the forces at play. Cite the requirements,
stories, or acceptance criteria that make the decision necessary. Name
the tradeoff you are about to accept.>

### Decision

<One paragraph naming what you are choosing. Concrete. If it involves
schema, include the schema fragment. If it involves an API, name the
routes.>

### Alternatives considered

- <Alternative>. Rejected because <specific technical reason>.
- <Alternative>. Rejected because <specific technical reason>.

### What this buys us

- <One benefit per bullet. Concrete. "Correctness under concurrency is
  guaranteed by construction" beats "improves reliability".>

### What it costs

- <One cost per bullet. Honest. Every non-trivial ADR has costs; if you
  cannot name one, revisit whether you understand the tradeoff.>
```

## Retiring an ADR

Do not delete the file. Change the status to `RETIRED` with a pointer to
the ADR or BDR entry that superseded it. Retain the original Context and
Decision — see ADR-004 and ADR-005 for the pattern.

## Cross-references

Cite BDR entries inline as `C-30`, `T-52`, `O-02`, `B-01`. Cite other
ADRs inline as `ADR-006`. Do not use Markdown links for these; the
plain-text codes are the convention.

## Same-PR requirements

An ADR PR should also:

1. If the ADR is Accepted and changes a runtime contract, update the
   affected code (or open a follow-up PR that does, referenced in the
   ADR's Related BDR field).
2. If the ADR retires an older one, edit the older file's Status line
   in the same commit.
3. Update `docs/adr/README.md` index.

## Never sneak scope

An ADR is a decision, not a design document. If you find yourself writing
a section called "Implementation plan", stop and put that plan in the
Jira issue or a `docs/plans/` file instead. Every section of an ADR
should serve the four questions: what forces applied, what did we choose,
what did we reject, what did it cost.
