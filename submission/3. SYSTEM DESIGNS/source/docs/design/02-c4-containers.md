# C4 containers and deployment

The browser SPA and serverless API deploy through one Vercel project. Relay and worker are logical handler modes in the same API deployment, not two always-running daemons. Daily Vercel schedules cover relay and hold/completion maintenance; a frequent worker scheduler is not declared in vercel.json.

## Read the diagram

Notation: C4 C2; container means runtime application or data store, not Docker.

[Editable Mermaid source](02-c4-containers.mmd). The submission pack supplies SVG, high-resolution PNG and PDF renders with the same basename.

## Evidence

Week 4 PDF p. 61; vercel.json; frontend/package.json; backend/src/providers/; api/cron/outbox-relay.ts. Lecture references use PDF page numbers, not necessarily printed slide numbers.

As-built snapshot: main `0773a721`, 5 November 2026. Read the [scope and discrepancy inventory](README.md) before interpreting delivery completeness.
