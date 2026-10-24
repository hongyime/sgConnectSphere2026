# Prospective proposal: Definition of Done and source-of-truth rules

**Status:** The Product Owner confirmed adoption on 21 October 2026. This short proposal reflects the decisions settled in the 18 October discussion and awaits independent team review; it becomes repository policy only if the reviewed PR is approved and merged. It applies prospectively and does not change any existing Sprint 3 story, acceptance criterion, estimate, date, status, or execution record. The exact-quote audit is in [the supporting audit](sprint-3-dod-source-of-truth-audit-20261018.md).

## Decisions reflected in this proposal

- The canonical Definition of Done stays in `CONTRIBUTING.md`; Jira links to it instead of copying the full checklist.
- A named story owner or delegate coordinates and records manual acceptance. Manual acceptance is due before Sprint Review/Done for ordinary stories, not automatically before every PR merge. An explicit story or dependency gate can still block a particular merge.
- Record one T-65 file per test session, including exploratory and CI sessions. List each command and its actual outcome in that session record; link the Actions run for CI. This broadens the current evidence-only rule prospectively.
- A reviewer checks changed-code coverage at 100%, or reviews the stated reason for a gap.
- Any team member can reconcile Jira acceptance wording to canonical Markdown before PR approval. The PO resolves product-scope disagreements.
- Incomplete work remains not Done while active and follows normal sprint-close/backlog carryover, preserving the original sprint, estimate, and date history.
- A completed story stays Done; post-Done work becomes a new linked story. Correcting a false Done transition for work that never met DoD is recovery of incomplete work, with the Jira history preserved.

## Proposed wording

### Authority and reconciliation

The latest merged Markdown under `docs/backlog/`, accepted decisions in `docs/bdr/` and `docs/adr/`, and `docs/testing/cases/` govern product scope, accepted decisions, and acceptance cases. `CONTRIBUTING.md` is the canonical repository-wide Definition of Done. Jira holds the story's links, owner, status, sprint, estimate, and tracking evidence; link to the Definition of Done rather than copying its full text.

PR descriptions and Jira are views of the canonical requirements and recorded execution evidence. They do not independently change scope or DoD. Any team member may identify and reconcile drift against the latest merged Markdown before PR approval. The Product Owner resolves a product-scope disagreement in the canonical source before derivative wording is changed. A draft PR may cite completed evidence while clearly listing open acceptance work; draft status or green CI does not mean the story is Done.

### Completion and test evidence

A story is Done only when its canonical acceptance criteria and applicable Definition of Done conditions are satisfied: relevant automated checks pass; changed-code unit coverage is 100% or a reviewer accepts a stated reason for the gap; a different developer reviews the code and test cases; required documentation is current; and the reviewed work is merged through the normal PR process.

The named story owner or delegate arranges and records manual acceptance before Sprint Review/Done. The person exercising a role-specific case must use the appropriate role. Manual acceptance is not a general PR-merge gate; a documented story-specific or dependency gate may require it before merge. T-65 records one immutable session file for every test session, including exploratory and CI sessions. A session record lists the commands and outcomes observed in that session. CI records use `environment: ci` and link the Actions run. Manual evidence follows T-93 and includes the tester's hand-taken screenshots named by TC_ID.

PR checklists distinguish merge gates from story-completion evidence. Required checks, peer review, and an explicit story-specific gate must be satisfied before merge. Other applicable DoD items, including ordinary manual acceptance, may remain unchecked after a PR merges, but the PR must identify the open item and its owner; the story remains not Done until it is satisfied. A closed PR or checked box is not evidence by itself. Preserve closed PR checklists as history; reconcile an outstanding gap in the active story or a linked corrective story without rewriting the old PR.

### Incomplete work and Done-story history

An item with an unmet DoD condition remains not Done. Keep it active while work continues; at sprint close, carry it through normal backlog planning without rewriting its original sprint, estimate, or dates. “Returns to the Product Backlog” describes incomplete work and does not require erasing its Sprint 3 history.

A story that met DoD and was accepted as Done stays Done. Later findings or new behavior become a new story linked to the original. If an automation or clerical error marked work Done before its original criteria and DoD were met, correct the current status to the appropriate not-Done state and preserve the Jira transition history; this recovers incomplete work and does not reopen a completed story. Keep the existing T-74 decision text as history; any adopted clarification is a new, prospective decision.

## What changes if adopted

The rule would make manual acceptance timing explicit, broaden T-65 to every test session, keep Jira linked to one canonical DoD, and clarify carryover and status correction. Adoption should update `CONTRIBUTING.md`, `docs/source-of-truth.md`, `docs/jira-agent-workflow.md`, the T-65/T-74 decision guidance, and `docs/testing/runs/README.md` together in a reviewed policy change. Do not edit historical T-65/T-74 records or apply the new rule retroactively.

## Human review

Reviewers should confirm that the wording accurately captures the agreed decisions and the course floor without changing existing requirements. The Product Owner confirms adoption. Until the adoption changes are reviewed and merged, the existing repository wording remains in force.
