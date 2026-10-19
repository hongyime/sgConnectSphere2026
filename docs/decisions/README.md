# ConnectSphere decision register

Start here to find the project's accepted decisions and the customer statements
they follow. This register is an index, not another copy of the records: the
linked Markdown files remain authoritative, so a decision has one maintained
home.

## Find a decision

| Record | What it contains | Index |
| --- | --- | --- |
| Backlog Decision Review (BDR) | Customer clarifications (`C-`), team backlog/product decisions (`T-`), open questions and assumptions (`O-`), boundary rulings (`B-`), and their history | [BDR index](../bdr/README.md) |
| Architecture Decision Records (ADR) | Technical architecture choices, alternatives, consequences, and retired or superseded decisions | [ADR index](../adr/README.md) |
| Repository decisions | Engineering and repository workflow decisions | [Repository decisions below](#repository-decisions) |

For a story or criterion, start with its Backlog Decision Reference and follow
the `C-`, `T-`, `O-` or `B-` code into the linked BDR section. Read a referenced
ADR when it concerns system design. Read the repository decision when it
concerns contribution or tooling practice. The BDR preserves customer wording
and team interpretation separately; an ADR records a technical choice, not a
new customer requirement.

## Authority and change history

The Markdown records linked here are authoritative. Jira, generated Word and
spreadsheet exports, Figma boards and PostPlans are views or proposals derived
from them. When a decision is superseded, keep its original record and follow
the explicit superseding link; do not erase its history. See
[source of truth](../source-of-truth.md) for the full authority order and the
downstream update process.

## Trace a client answer through the team's decision

Use the existing BDR and ADR records as one trace, rather than copying the
decision into a second log:

1. **Client wording and answer:** find the `C-` row in
   [customer clarifications](../bdr/A-customer-clarifications.md). The archived
   source workbook or briefing is linked from
   [customer source archive](../bdr/customer-sources/README.md).
2. **Team response:** follow the `T-` reference in
   [team decisions](../bdr/B-team-decisions.md). It records the team's choice
   and rationale separately from what the client said.
3. **Unresolved question:** follow its `O-` reference in
   [open questions](../bdr/C-open-questions.md). A team default remains a team
   assumption until the question is answered and the BDR records the outcome.
4. **Affected work:** use the dated entries in
   [BDR change log](../bdr/G-change-log.md) to find downstream backlog,
   test-case, and design/schema updates. The story's Backlog Decision Reference
   links its criteria back to the applicable `C-`, `T-`, `O-` or `B-` entries.
5. **Technical choice:** follow the Related BDR references from the relevant
   [ADR index](../adr/README.md) to the architecture record. An ADR explains
   implementation structure; it does not replace the customer answer or team
   product decision.

For Week 9, the 66 client answers are C-71 to C-136 in the customer-clarification
table, and the team's impact-review decisions are T-79 to T-91 in the team
decisions table. The later team defaults T-98 and T-99 close O-50 and O-51.
For example, C-107 led to T-79/T-85 and ADR-018; the earlier C-62 remains in
history and is explicitly superseded for the current Release 1 model. This is
an index to the maintained records, not another copy of their text.

## Repository decisions

| ID | Decision |
| --- | --- |
| 0001 | [Repository foundation](0001-repository-foundation.md) |
| 0002 | [Attendee registration](0002-attendee-registration.md) |
| 0003 | [Profile editing](0003-profile-editing.md) |
| 0004 | [Backlog Markdown authority](0004-backlog-markdown-authority.md) |
| 0005 | [ADR/BDR Markdown authority](0005-adr-bdr-markdown-authority.md) |
| 0006 | [Jira status sync](0006-jira-status-sync.md) |
| 0007 | [Application checks skip workflow](0007-application-checks-skip-workflow.md) |
| 0008 | [Migrate to rulesets](0008-migrate-to-rulesets.md) |
| 0009 | [Security scanners](0009-security-scanners.md) |
| 0010 | [Single Vercel deploy path](0010-single-vercel-deploy-path.md) |
| 0011 | [Load Inter from Google Fonts](0011-load-inter-from-google-fonts.md) |
| 0012 | [Merge queue](0012-merge-queue.md) |
| 0013 | [Per-task handoff files](0013-per-task-handoff-files.md) |
| 0014 | [Pull requests do not edit STATE.md or JOURNAL.md](0014-pull-requests-do-not-edit-state-or-journal.md) |
| 0015 | [One-at-a-time production migrations](0015-one-at-a-time-production-migrations.md) |
| 0016 | [Story-level design ownership and cross-story coordination](0016-story-level-design-ownership.md) |
