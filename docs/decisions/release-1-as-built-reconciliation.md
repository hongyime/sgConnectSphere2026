# Release 1 as-built reconciliation

## Status

Accepted as a reconciliation note for the Release 1 submission. This record does
not rewrite or supersede any historical ADR or BDR entry; it records where the
canonical target design in `docs/` differs from what the code on `main` actually
implements, so the submitted System Design pack (`docs/design/`, rendered under
`submission/3. SYSTEM DESIGNS/`) and the repository `README.md` can describe the
system honestly.

Source snapshot: `main` at the commit named on each diagram page and in
`docs/design/README.md`. Code and Jira status are separate from final story
acceptance (see the [source of truth](../source-of-truth.md) authority order and
the [Definition of Done](../../CONTRIBUTING.md#definition-of-done)).

## Why this record exists

The canonical architecture views (`docs/db_schema.md`, `docs/c4-diagrams.md`,
`docs/modular-monolith-architecture.md`, `docs/dynamic-user-flows.md`,
`docs/class-diagram.md`, `docs/api-changes-week7.md`) are **target** designs:
they record the accepted requirements and the schema/API the team is building
towards. Some Week 7 and Week 9 targets are not yet fully reflected in the code
on `main`. The as-built submission pack draws only what the executable code does,
and resolves each contradiction here rather than silently editing the historical
target documents, which are outside this deliverable's owned paths.

## As-built conclusions

Each row states the older or target claim, the as-built conclusion, and where the
evidence lives in the code. These mirror the "Contradictions resolved against
code" table in [`docs/design/README.md`](../design/README.md); this record is the
decision-register home the README and the repository `README.md` link to.

| Target or older claim | As-built conclusion and evidence |
| --- | --- |
| Many-to-many roles already built (ADR-019 / `USER_ROLES`) | Accepted **target** only. The runtime still reads one `users.role`; `currentUser` and `canActAsRole` are single-role. `USER_ROLES` is not drawn as physical storage in the as-built ERD. T-86 keeps seed data at one role per account. |
| Separate `SAFETY_CHECKS` / `SAFETY_CHECK_FACTORS` tables | Not shipped as physical tables. Safety decisions and factors are recorded through audit entries in `backend/src/modules/eventLifecycle/submission.ts`. The ERD/class-diagram tables remain the target schema. |
| Fully automatic initial Safety Review (C-132 / T-82) | Partial. `submission.ts` exposes a Coordinator-triggered initial "submit for safety check"; `autoSafetyReview.ts` performs automatic **re-entry** only for an Event that was Confirmed before and returned to Planning. The wider T-82 initial-entry target is not fully reflected in code. |
| Six containers / two always-running background daemons | One Vercel project serves the static SPA and the API functions. The relay and worker run as handler modes of the same deployment, not standalone daemons. PostgreSQL, Redis and email are external managed services, identified separately. |
| Email via SMTP | `backend/src/providers/brevo.ts` uses the Brevo HTTPS transactional-email API; Upstash uses an HTTPS REST transport. No SMTP client is used. |
| Supabase Auth | Custom password hashing and opaque cookie tokens; only token digests are stored in `auth_sessions`. Supabase supplies PostgreSQL, not authentication. |
| Tailwind CSS and an ORM | `frontend/src/styles.css` plus shared components (plain CSS); `pg` with parameterized SQL and an `inTransaction` helper. No Tailwind or ORM dependency in the manifests. |
| Next.js / SSR (repository topics, old proposals) | React/Vite SPA with `react-router-dom`. `vercel.json` framework is `vite`; there is no Next dependency or route tree. Repository topics are metadata, not implementation authority. |
| Continuous / frequent email worker scheduling | `vercel.json` declares a daily relay schedule and hold/completion maintenance, not a frequent worker cron. Handler existence and a provider smoke test do not prove a continuous delivery cadence or full E11 acceptance. |
| Event-only equipment | New multi-Session paths carry Session links (T-79); legacy nullable Event-level rows remain. Technical-support staffing stays Event-level. |

## Consequences

- The submitted diagrams and the repository `README.md` describe the running
  system, with target-only elements labelled as such.
- Historical ADR-004, ADR-005 and ADR-012 stay retired or superseded in their
  own records; this note does not alter them.
- When a target becomes fully implemented, update the owning canonical document
  and remove the corresponding row here in the same change, so the reconciliation
  shrinks as the gap closes rather than drifting.
