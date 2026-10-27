# Source of truth and derivative documentation

GitHub Markdown is authoritative for ConnectSphere's backlog, architecture
decisions, backlog decisions, and acceptance test cases. Jira, spreadsheets,
Word exports, Figma notes, and PostPlans follow those sources.

## Current authoritative sources

| Domain | Authority | Export / history |
| --- | --- | --- |
| Release 1 requirements, estimates and planned sprint | `docs/backlog/release-1/` | `docs/CONNECTSPHERE BACKLOGS CAA 261026.xlsx` |
| Wider product backlog | `docs/backlog/product/` | Same backlog workbook |
| Backlog decisions and clarifications | `docs/bdr/` | `docs/BACKLOG DECISION REVIEW CAA 261026.docx` (BDR refreshed 2026-10-26; older dated exports remain history) |
| Architecture decisions | `docs/adr/` and accepted repository decisions in `docs/decisions/` | `docs/ARCHITECTURE DECISION RECORDS CAA 141026.docx` |
| Frontend design language | `design.md` (SCRUM-117, implemented by the shared skeleton per ADR-017) | Rendered at `/ui-kit` in the running frontend |
| Acceptance test cases | `docs/testing/cases/` | `docs/testing/PROJECT TEST CASES CAA 261026.xlsx` |
| Decision index | `docs/decisions/README.md` | Links to the authoritative records above; does not duplicate their text |
| Architecture views (ERD, C4, modules, user flows, class diagram, API changes) | `docs/db_schema.md`, `docs/c4-diagrams.md`, `docs/modular-monolith-architecture.md`, `docs/dynamic-user-flows.md`, `docs/class-diagram.md`, `docs/api-changes-week7.md` | Markdown only; amended ADRs cross-reference them |
| Shared venue booking interface | `docs/contracts/venue-bookings.md` | Shared schema, API, lifecycle and migration ownership for E06-S03/S04/S05/S06 |
| Sprint 1 delivery and contribution evidence | [Sprint 1 delivery ledger](backlog/sprint-1-delivery.md) | [Sprint review and retrospective](plans/sprint-1-retrospective.md) |

The Markdown authority for ADR/BDR was accepted in
[repository decision 0005](decisions/0005-adr-bdr-markdown-authority.md).
Earlier wording naming Word files as primary is superseded by that decision.
`ADR-015` now means **cookie sessions**, not the historical copy-forward rule.

Original materials supplied to the project and used for BDR evidence are archived in
`docs/bdr/customer-sources/`. These files support provenance; current
interpretations and accepted decisions remain in the canonical Markdown.

The product directory contains the full imported product view, including stories
also selected for Release 1. It is not an additional set of release stories.
For a selected story, use `release-1/` for its release requirements and planning
metadata; reconcile its product view when those requirements change. Count each
story ID once. At the 20 September 2026 audit there are 71 distinct product
stories, of which 47 are in Release 1.

## Authority order

The [canonical shared DoD](../CONTRIBUTING.md#definition-of-done) records the
PO-approved clarification and the instructor floor. PR #312 is retained only as
proposal provenance, not as an independent policy source.
The team confirmed on 26 October 2026 that the PO/delegate acceptance receipt
is a team-wide Definition of Done gate, not a PR-specific preference.
The instructor floor takes precedence over its proposed false-Done reopening
exception; T-65's evidence-only recording scope is unchanged.

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
The 2026-09-27 E11 routing update refreshed that compatibility input from the
regenerated dated workbook so TC_E11S01_10 through TC_E11S01_16 are included.
The activity-log scope update (T-75/T-76, approved 2 October, merged after the
Week 7 PRs) is folded into the `CAA 031026` workbooks under the rule above and
refreshes the compatibility input. It retains TC_E14S02_03/_06/_07 as retired
history and adds TC_E06S04_05/_06/_07. The coverage generator still counts
retired catalogue rows as scaffold/skip; its row total is a strict inventory,
not a count of current acceptance obligations.

The 15 October E06-S03 withdrawal clarification (T-94 to T-96, renumbered on
16 October to reserve #279's earlier T-93) adds TC_E06S03_09 to _13 and
refines _08. Its regenerated CAA 161026 testcase workbook also refreshes the
legacy compatibility input, so the generated inventory includes these unexecuted
cases. This records requirements and traceability, not passing test evidence.

The 22 October venue claim rule B decision (T-100) updates only E06-S06 in the
release and product backlogs, its seven existing acceptance cases and the shared
venue-bookings contract. See
[`venue-claim-rule-b-20261022.md`](plans/venue-claim-rule-b-20261022.md) for
the PO choice and remaining adoption and implementation gates. The CAA 221026
exports reflect these canonical sources; the legacy testcase workbook is
refreshed from the generated testcase export before the coverage audit. Older
dated exports and every existing T-65 session record remain unchanged.

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
- Don't weaken acceptance criteria to hide partial scope or missing review
  or verification. The earlier reopening instruction is superseded
  prospectively by the no-reopening rule in the canonical DoD: keep incomplete
  work open before Done; once marked Done, retain the flag and document any
  missing scope, review or verification in a new linked, appropriately
  classified follow-up with cause and prevention. Don't rewrite historical
  transitions, closed PR checklists or run records.
- Use the actual Agile API sprint timestamps. A sprint whose end date has passed
  may still be active until the team completes it in Jira. Do not backdate a
  present-day correction to make a historical burndown look better.
- Do not infer completion from an issue key in an example, an unrelated branch
  name, or a body saying that only partial scope was delivered.

See [the Jira workflow](jira-agent-workflow.md) and
[Sprint 1's reconciliation record](backlog/sprint-1-delivery.md).

Story acceptance belongs to the Product Owner or a documented delegate, not an
agent or the PR approver by inference. Record the AC-to-evidence checklist,
exact tested tree, real integration/manual acceptance evidence and independent
human code and test review receipt in the current issue or linked PR. Manual
acceptance precedes Done and is due no later than Review. Partial PR merge,
story acceptance and pre-Review regression are different checkpoints; a generic
partial-merge allowance never substitutes for current acceptance evidence and
human review. Jira links to the canonical DoD; it doesn't define a competing
completion policy.

## Design and access practices

`design.md` at the repository root is the design-language authority for the
frontend: tokens, building blocks, states, wording and accessibility rules.
The shared skeleton in `frontend/src/shared/` implements it; where the two
disagree, the difference is raised in `design.md` and resolved in review
(ADR-017). Figma boards are proposals derived from these sources. Link them to
stories, batch related screens, preserve existing boards, and pair
desktop/mobile variants where appropriate. Keep role-specific flows
identifiable. Each story owner owns the design and implementation for that
story, including selecting and linking its Figma frames. Amareet Kaur Madas
coordinates cross-story Figma organization and consistency; this does not make
her the sole designer for every story (repository decision 0016).

Each teammate uses their own Jira account or token. Keep real credentials,
personal configuration, raw private API responses and machine-specific paths out
of committed files and public PostPlans. Preserve historical source documents;
flag contradictions with a source reference rather than silently deleting them.

The E07-S09 stock/withdrawal follow-up regenerates the CAA 141026 backlog and test-case exports and refreshes the legacy coverage input from that generated test-case workbook. Completed E07-S01/SCRUM-51 is retained; Jira creation and planning for the new canonical follow-up happen after merge.

The E03-S11 backlog entry (SCRUM-176, 16 October 2026) regenerates the CAA 161026 backlog, test-case and BDR exports and refreshes the legacy coverage input from the generated test-case workbook. The ADR export is unchanged.

The 18 October 2026 T-98/T-99 decision update regenerated the CAA 181026 backlog and test-case workbooks and the ADR/BDR Word exports. No test-case IDs changed, so the legacy coverage input and generated coverage inventory did not need refreshing.
The E05-S06 and E10-S05 venue-loss alignment (SCRUM-152, SCRUM-74, 23–24 October 2026) updates both stories and their test cases in place to the existing decisions T-80, T-81 and T-91 (C-111, C-120, C-121, C-122), adds TC_E05S06_07 and TC_E05S06_08, and aligns the booking contract's Conflicting transition with C-111. It regenerates the CAA 241026 backlog, test-case and BDR exports (the test-case export also carries main's CAA 211026 E08 changes) and refreshes the legacy coverage input from that test-case workbook. The alignment is logged in `docs/bdr/G-change-log.md`; no decision changes and the ADR export is unchanged.

The 16 October Product Owner approvals in T-97 update the canonical BDR and
`docs/ops/demo-account-provisioning.md`. Regenerate only the BDR Word export for
the new decision; the architecture sources did not change, so the dated ADR
export remains unchanged. No backlog, test-case, or coverage derivative changes
are part of this decision record.
