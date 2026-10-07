# ADR-015 — Cookie sessions everywhere; no Supabase Auth in Release 1

- **Status:** Accepted
- **Related BDR:** T-58
- **Supersedes:** none; consolidates two existing implementations
- **Related tickets:** SCRUM-91 (implementation), SCRUM-90 (superseded won't-do)

### Context

Two authentication mechanisms shipped in parallel during Sprint 1 and never
interoperated:

- **Cookie sessions.** `POST /api/auth/session` validates email and password,
  issues a random 32-byte token, and sets it as `cs_access` (HttpOnly,
  SameSite=Strict, 1 hour). Stored as a sha256 hash in `auth_sessions`.
  Includes lockout at 5 failed attempts (SCRUM-94), full E14-S02 audit trail,
  and the E01-EXT email verification token flow (SCRUM-93). Implemented in
  `backend/src/modules/accessControl/sessions.ts` and consumed via
  `currentUser(request)` in `backend/src/modules/eventVisibility/runtime.ts`.
- **Supabase Auth bearer tokens.** `backend/src/auth/supabase.ts` used
  `@supabase/supabase-js` to validate an inbound JWT and look the user up in
  the local `users` table. Consumed only in `api/events.ts` for POST/PATCH/
  DELETE/GET-mine.

The two paths did not interoperate. A user who logged in through
`/api/auth/session` had a cookie but no Supabase JWT; a request to `POST
/api/events` returned 401 because the events endpoint had no idea what the
cookie meant. `App.tsx` papered over this by hard-coding
`getAccessToken = async () => 'mock-token'` on the organiser routes, which
turned the whole submit-event-request path into a static demo.

SCRUM-90 as originally written was to "integrate Supabase Auth for login
session handling", i.e. to make the Supabase Auth path the real one. That
duplicated the cookie work already shipped (SCRUM-16 login, SCRUM-93
verification, SCRUM-94 lockout), would have discarded the audit-log and
lockout state machines built on top of the cookie session table, and would
have added a JWT verification layer that a single-tenant SPA does not need.

### Decision

Release 1 uses one authentication mechanism: **cookie sessions**. Every
authenticated request goes through the `currentUser(request)` lookup that
validates the `cs_access` cookie against the `auth_sessions` table. Every
endpoint that today calls `getAuthenticatedAppUser(bearerToken)` moves to
`currentUser(request)` plus a role check.

Frontend consequences:

- No component takes a `getAccessToken` callback prop any more.
- Every `fetch()` to a same-origin `/api/*` endpoint sends the session
  cookie automatically because the request is same-origin; no
  `credentials: 'include'` is required. For belt-and-braces we set
  `credentials: 'same-origin'` explicitly.
- Prototype and offline-simulation modes (the `/prototype` route)
  distinguish themselves with an explicit `prototype` prop rather than by
  passing a null access token.

Backend consequences:

- `backend/src/auth/supabase.ts` is deleted.
- The server-side `@supabase/supabase-js` dependency is removed if no
  server code reads it. The frontend Vite build continues to consume the
  browser-side Supabase client for Supabase Storage or realtime if those
  features arrive later; that is a different concern from auth.
- The Vercel env vars `SUPABASE_ANON_KEY` (server) can be removed if the
  server no longer reads it. `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY`
  and their `VITE_*` mirrors stay for the frontend.

### Alternatives considered

- **Migrate everything to Supabase Auth**, i.e. what SCRUM-90 originally
  named. Rejected. Loses SCRUM-94 lockout on the cookie session table,
  discards the E14-S02 audit-log integration already wired to cookie
  session lifecycle, and re-implements SCRUM-93 email verification through
  Supabase's separate confirm-email flow. Costs the whole Sprint 1
  access-identity vertical to gain a JWT layer this app does not need.
- **Run both auth systems** and expose the difference as two API paths
  (cookie for old, JWT for new). Rejected: this is the state Sprint 1
  ended in and the reason the SCRUM-42 route collision was so hard to
  notice. Two auth systems means every future story asks which one to use.
- **Introduce a session-to-JWT bridge**, i.e. after cookie login the server
  mints a Supabase JWT the frontend can send back. Rejected as
  over-engineering: it reintroduces the JWT surface area we don't need
  and forces the same audit-log and lockout work to duplicate across two
  representations.

### What this buys us

- One code path for auth. Every reviewer knows which lookup to expect.
- Existing SCRUM-01 login, SCRUM-93 verification, SCRUM-94 lockout, and
  the E14-S02 audit-log integration all remain the canonical wiring.
- Removes the `mock-token` scaffolding from `App.tsx`, so the organiser
  request flow can be exercised for real against a running server.
- Deletes one server-side dependency (`@supabase/supabase-js` on the
  backend) and simplifies the runtime.

### What it costs

- Any future feature that wants third-party OAuth (Google sign-in, SSO)
  will need Supabase Auth or an equivalent JWT layer added back. This ADR
  is scoped to Release 1; a future ADR can reintroduce Supabase Auth on
  top of the cookie session, not in place of it.
- Cookies are HttpOnly, so a JavaScript context cannot read them. This
  is a feature (XSS-resistant); no code today needs to read the raw
  token from JS. If a future feature needs a token in-browser (SSE with
  a header, third-party embed), a bounded exposure will need a separate
  ADR.
