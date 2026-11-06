# Release 1 decision and implementation reconciliation

- Date: 5 November 2026
- Status: documentation of observed implementation; not a new product decision
- Baseline: main `0773a721`
- Authority: `docs/source-of-truth.md`; original ADR/BDR history remains intact

The [current design catalogue](../design/README.md) is the submission's as-built
view. This page separates an accepted design from proof it has been implemented.
No acceptance criterion, Jira status or architecture decision is changed here.

| Record | Consistent current interpretation |
| --- | --- |
| 0001 repository foundation | Its stack-independent context is historical. React/Vite and Node/TypeScript now exist; hygiene checks still do not establish application correctness. |
| ADR-001 modular monolith | In-process modules behind `api/` adapters, not domain microservices. |
| ADR-002 PostgreSQL | Supabase-hosted PostgreSQL through `pg`; no ORM or Supabase Auth. |
| ADR-003 booking constraints | SQL range/exclusion/trigger guards and transaction locks enforce contested resource writes; application checks complement them. |
| ADR-004/005 retired; ADR-018 Sessions | Physical Sessions restored by 0014; registrations select Sessions via 0024. Event lifecycle and support staffing remain Event-level. |
| ADR-006 outbox | Atomic SQL business/audit/notice writes implemented. Relay/worker are function handler modes using Upstash/Brevo HTTPS. Historical daemon/SMTP and fast-poll language is target design, not proof of deployed topology/cadence. |
| ADR-007 SPA; ADR-017 shared skeleton | One React SPA for seven roles, route guards and shared blocks. Plain CSS implements `design.md`; not Tailwind or Next.js. |
| ADR-009 audit | Append-only audit records include lifecycle and safety-decision payloads; no invented safety_checks table. |
| ADR-012 superseded; ADR-019 multi-role | ADR-019 is accepted target design. Migrations and runtime still expose/check one users.role. Many-to-many grants and role switching must be labelled future until implemented and verified. |
| ADR-014 Vercel routes; 0010 deploy path | Multiple route adapters share backend modules; rewrites consolidate logical endpoints into function files. Actions is the sole deploy path; direct Vercel Git deployment is disabled. |
| ADR-015 cookie sessions | Custom opaque HttpOnly cookie, digest in PostgreSQL, Origin checks; not a Supabase Auth JWT architecture. |
| ADR-016 lockout | Five failures lock sign-in for thirty minutes. `accessControl/sessions.ts` resets an expired window before evaluating the next attempt (lines 35-43); password reset can restore access sooner. The pure helper in `service.ts` is not proof that the database-backed login requires a reset. |
| T-82 safety automation | Initial Coordinator submission remains; eligible re-entry is automatic. This is a code-versus-target gap requiring team reconciliation, not permission to redraw the code as fully automatic. |

[Lecture-backed notation and exact code evidence](../design/README.md) accompany
the diagrams. Human review should confirm the identified implementation gaps;
this documentation pass neither resolves them through code nor changes scope.
