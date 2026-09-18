# ADR-014 — One file per Vercel serverless API route

- **Status:** Accepted
- **Related BDR:** T-56

### Context

Every file under `api/` builds as one serverless function on Vercel. The URL a function serves is derived from its path: `api/foo.ts` serves `/api/foo`, and `api/foo/index.ts` also serves `/api/foo`. When both files exist the build succeeds without warning, both lambdas ship, and one silently wins the route while the other becomes unreachable. Empirically on the current builder the parent-level file wins, but Vercel does not document the tie-breaker, so the outcome is undefined by contract.

This is not hypothetical. PR #56 (SCRUM-26 submit event request) added `api/events.ts` for the POST create path. `api/events/index.ts` already existed from PR #42 (SCRUM-18 hide internal planning info) serving the organiser browse-events GET listing. From the moment PR #56 shipped, `GET /api/events` in production returned `405 method_not_allowed` with `Allow: POST` — the organiser browse screen backed by `frontend/src/features/organiser/ClientEvents.tsx` was silently broken. Nobody noticed at review because the routing collision does not manifest in the build log, only at request time on the deployed URL, and the failing screen is behind SSO on the Vercel preview alias where teammates without dashboard access could not reach it.

The Hobby plan compounds the failure mode. It caps a deployment at twelve serverless functions. Two colliding files consume two slots but only serve one route, so the collision costs a slot that a future story needs. On the deployment where this bug was discovered the project sat at exactly 12/12 functions with one of them dead, leaving zero headroom for the next feature.

### Decision

Under `api/` every URL path is served by exactly one file. A multi-verb endpoint dispatches on `request.method` inside a single handler. A new endpoint either lives at a distinct file path or reuses an existing file via method dispatch. `api/foo/index.ts` is never allowed to coexist with `api/foo.ts`; either the folder holds only nested routes or the parent file is deleted.

The file count under `api/` is kept at eleven or fewer as a soft limit. Twelve is the Hobby-plan hard cap; holding one slot in reserve means the next story never lands cap-blocked. Consolidating an existing endpoint into another file via method dispatch, or into `vercel.json` `rewrites` via a `?task=` parameter, is preferred over adding a new file.

Both rules are enforced by `scripts/check_api_routes.py`, wired into `.pre-commit-config.yaml` as a local pre-commit hook so a PR cannot reintroduce a collision or push the count past eleven without the check going red. The check also runs standalone.

### Alternatives considered

- Trust Vercel to fail the build on collision. Rejected: the current builder emits both functions with no error, and the failing route is only visible at request time on the deployed URL. The team has no way to force this behaviour and no signal that it will change.
- Rename every colliding file to a distinct URL (for example `api/events/index.ts` becomes `api/events/list.ts` serving `/api/events/list`). Rejected: it fragments a single logical resource across two URLs, requires every caller and every route mock in the E2E suite to be updated, and does not address the twelve-function cap. It also concedes the URL contract to a routing quirk rather than the resource model.
- Move all multi-verb dispatch into `vercel.json` `rewrites` (the pattern already used for `/api/auth/verify` and `/api/cron/notification-worker`). Rejected as the default: adding a `rewrites` entry per endpoint balloons the config and hides routing behaviour in a file separate from the handler. Rewrites remain the right tool when the same handler serves several logical task names (as with the cron dispatcher); method dispatch inside one file is the right tool when the URL is the same and only the verb changes.
- Split the backend out of Vercel serverless entirely and run it on a single long-lived container (Fly, Railway, or a small Node process on Supabase edge). Rejected for release 1: the free-tier deploy story on Vercel plus Supabase is deliberately what the team chose, and the cost of the collision was one dead endpoint that a hook can prevent, not a systemic runtime problem.

### What this buys us

- The failure mode that broke E01-S03 (SCRUM-18) for the whole of Sprint 1 becomes a red pre-commit hook rather than a silent production regression.
- Consolidating `api/events.ts` and `api/events/index.ts` into one file returned one lambda slot, so SCRUM-27 draft persistence has room to land without a function-count fight.
- One rule to remember when adding an API route: one URL, one file. No routing quirks in the reader's head.
- The eleven-file soft limit makes the twelve-function cap visible at authoring time instead of at deploy time, where only Bryan can read the log.

### What it costs

- A file serving multiple verbs carries more than one concern. Method dispatch is unambiguous but a handler with three method branches and a growing set of query-parameter branches will eventually want a proper router. That refactor is a future PR, not this one; the immediate rule is one file per URL, kept small by delegating to modules under `backend/src/`.
- The soft limit can require refactoring an existing file before a new endpoint can land, which is friction the twelve-function cap creates whether or not this ADR exists. The alternative is discovering the cap at deploy time when a story is already in review.
- `scripts/check_api_routes.py` is one more thing to keep in step with Vercel builder changes. If Vercel ever adds a supported way to serve `api/foo.ts` and `api/foo/index.ts` as different verbs, this ADR retires; until then, prevention is cheaper than debugging the next silent 405.
