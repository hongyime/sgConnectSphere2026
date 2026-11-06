# Sequence: transactional outbox to email

PostgreSQL is authoritative; Redis carries only delivery IDs. Relay and worker are separate invocations of handler modes, with flags and internal-secret checks. Send leases deduplicate work; ambiguous outcomes are retained as uncertain rather than blindly resent. This diagram specifies built code, not a claim of continuous production scheduling.

## Read the diagram

Notation: UML sequence; asynchronous phases and provider outcome branch.

[Editable Mermaid source](13-sequence-notifications.mmd). The submission pack supplies SVG, high-resolution PNG and PDF renders with the same basename.

## Evidence

Week 5 PDF p. 15; notificationDispatcher/dispatch.ts; postgres.ts; providers/durableRedis.ts; api/cron/outbox-relay.ts. Lecture references use PDF page numbers, not necessarily printed slide numbers.

As-built snapshot: main `0773a721`, 5 November 2026. Read the [scope and discrepancy inventory](README.md) before interpreting delivery completeness.
