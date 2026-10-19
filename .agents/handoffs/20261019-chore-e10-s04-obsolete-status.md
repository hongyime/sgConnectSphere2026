# Obsolete change-request status prerequisite

Add the backwards-compatible Obsolete enum state required by SCRUM-73 / E10-S04 Scenario 5. Migration 0021 is reserved by PR #308; 0022 only adds a value and leaves existing statuses/data unchanged.

Release: reviewed migration-only merge first; authorized deploy owner reviews ledger and file order, applies the exact file in an approved release window, verifies enum/ledger and commits sanitized evidence. Dependent application code must stay unmerged until verification. No production database operation performed or authorized here.

Tests and human acceptance belong to the stacked cancellation implementation. No story Done claim; no Jira fields changed.
