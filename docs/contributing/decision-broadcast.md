# Decision broadcast convention

When a team decision changes the backlog, architecture, or workflow, the change
must be visible to every teammate the same day it lands — not discovered later
when code contradicts an assumption.

## Rule

Any PR that adds, amends, or retires a BDR entry (`docs/bdr/`) or an ADR
(`docs/adr/`) must be accompanied by a **one-line summary posted to the team
group chat** on the same calendar day the PR is opened.

## Format

> **[BDR T-XX / ADR-XXX]** one-sentence summary of the decision and what it
> affects. PR #NN.

Examples:

> **[BDR T-61]** Organisation editing removed from E01-S04 scope — profile
> shows org read-only in Release 1. PR #101.

> **[ADR-017]** Notification worker scheduled every 5 minutes via Vercel cron.
> PR #105.

## Why

Sprint 1 showed that decisions made inside AI agent sessions or solo PRs did
not always reach teammates who needed to act on them. The retrospective
(`docs/plans/sprint-1-retrospective.md`) flagged stale documentation and silo
working as root causes. This convention makes broadcast a habit rather than a
reminder.

## Enforcement

This is a team convention, not a CI gate. Reviewers should check whether the PR
touches `docs/bdr/` or `docs/adr/` and ask "did you post the summary?" before
approving. If the answer is no, the author posts it before merge.
