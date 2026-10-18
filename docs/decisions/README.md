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
