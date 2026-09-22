# Source of truth and derivative documentation

GitHub Markdown is authoritative for ConnectSphere's backlog, architecture
decisions, backlog decisions, and acceptance test cases. Jira, spreadsheets,
Word exports, Figma notes, and PostPlans follow those sources.

## Current authoritative sources

| Domain | Authority | Export / history |
| --- | --- | --- |
| Release 1 requirements, estimates and planned sprint | `docs/backlog/release-1/` | `docs/CONNECTSPHERE BACKLOGS CAA 220926.xlsx` |
| Wider product backlog | `docs/backlog/product/` | Same backlog workbook |
| Backlog decisions and clarifications | `docs/bdr/` | `docs/BACKLOG DECISION REVIEW CAA 170926.docx` |
| Architecture decisions | `docs/adr/` and accepted repository decisions in `docs/decisions/` | `docs/ARCHITECTURE DECISION RECORDS CAA 170926.docx` |
| Acceptance test cases | `docs/testing/cases/` | `docs/testing/PROJECT TEST CASES CAA 220926.xlsx` |
| Sprint 1 delivery and contribution evidence | [Sprint 1 delivery ledger](backlog/sprint-1-delivery.md) | [Sprint review and retrospective](plans/sprint-1-retrospective.md) |

The Markdown authority for ADR/BDR was accepted in
[repository decision 0005](decisions/0005-adr-bdr-markdown-authority.md).
Earlier wording naming Word files as primary is superseded by that decision.
`ADR-015` now means **cookie sessions**, not the historical copy-forward rule.

The product directory contains the full imported product view, including stories
also selected for Release 1. It is not an additional set of release stories.
For a selected story, use `release-1/` for its release requirements and planning
metadata; reconcile its product view when those requirements change. Count each
story ID once. At the 20 September 2026 audit there are 71 distinct product
stories, of which 47 are in Release 1.

## Authority order

1. Canonical Markdown requirements and accepted decisions above.
2. Merged code, tests, PR review records and recorded verification establish
   delivery against those requirements. A merged PR alone does not satisfy the
   [Definition of Done](../CONTRIBUTING.md#definition-of-done).
3. Jira, generated exports, planning summaries, Figma and PostPlans are views of
   that evidence. A Jira Done flag does not override missing acceptance criteria.

Keep scope, implementation progress and verification distinct. Fixture-backed UI
can complete an explicitly scoped prototype task while its business story remains
open. A strict TC_ID inventory is not a test execution report or a proof that every
acceptance criterion is satisfied.

## Generated exports and historical snapshots

Generate exports from Markdown:

```text
python scripts/export_backlog_xlsx.py
python scripts/export_testcases_xlsx.py
python scripts/export_adr_bdr_docx.py
```

Use the repository tooling environment when the system Python lacks the pinned
document libraries. Do not hand-edit exported workbooks or Word files. Retain
older dated copies as history. A new export uses today's `CAA DDMMYY` suffix;
same-day regeneration replaces that day's export. Update the table above in the
same PR when publishing a new dated export. A newer export date does not make a
binary file higher authority than its Markdown source.

The legacy `docs/testing/PROJECT TEST CASES.xlsx` remains the current input of
`scripts/tc_coverage_audit.py`. This is a tooling dependency, not a reversal of
Markdown authority. Regenerate `docs/testing/tc-coverage.md` whenever active,
skipped or fixme test declarations change. Reconcile catalogue changes with that
legacy audit input before claiming the generated inventory covers a new case set.

## Requirement changes flow downstream

1. Amend canonical backlog Markdown and record scope decisions in `docs/bdr/`.
2. Update affected architecture, C4 diagrams, user flows and Figma notes.
3. Update canonical acceptance cases and relevant runnable tests.
4. Regenerate affected exports and coverage inventory with their generators.
5. After the backlog change merges, reconcile Jira descriptions, estimates,
   priorities and sprint assignments. Record changed issue keys in a follow-up
   PR, or explicitly record that no Jira changes were needed.

Do not introduce a scope change simultaneously in Jira and an unmerged backlog
PR. Progress corrections based on **already merged** requirements, decisions,
reviews and code can be applied during an evidence audit; record the reason,
before/after state and actual correction date.

## Jira and contribution evidence

- Preserve original sprint commitments and estimates when reporting delivery.
  Historical re-estimates and later additions must be labelled; do not present
  their sum as comparable sprint velocity or individual productivity.
- Attribute implementation using commits and PR descriptions as well as the
  opener. A teammate may open or integrate someone else's PR. Assignee is the
  accountable owner, not a complete contributor list.
- Duplicates and superseded items retain their history but are excluded from
  delivered-scope counts, even if the workflow represents closure as Done.
- Reopen partial scope or missing review/verification rather than silently
  weakening acceptance criteria. Add source links and a concise explanation.
- Use the actual Agile API sprint timestamps. A sprint whose end date has passed
  may still be active until the team completes it in Jira. Do not backdate a
  present-day correction to make a historical burndown look better.
- Do not infer completion from an issue key in an example, an unrelated branch
  name, or a body saying that only partial scope was delivered.

See [the Jira workflow](jira-agent-workflow.md) and
[Sprint 1's reconciliation record](backlog/sprint-1-delivery.md).

## Design and access practices

Figma boards are proposals derived from these sources. Link them to stories,
batch related screens, preserve existing boards, and pair desktop/mobile variants
where appropriate. Keep role-specific flows identifiable.

Each teammate uses their own Jira account or token. Keep real credentials,
personal configuration, raw private API responses and machine-specific paths out
of committed files and public PostPlans. Preserve historical source documents;
flag contradictions with a source reference rather than silently deleting them.
