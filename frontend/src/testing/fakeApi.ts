// Test helpers for screens that call the API (Vitest). See docs/frontend-guide.md.
//
// stubApi replaces fetch with fake answers keyed by "METHOD /path". The
// session and notification endpoints that the shared header calls are
// answered for you, so screens rendered inside App work without extra setup.
//
//   const calls = stubApi({
//     'GET /api/events?assigned=1': { body: { events: [] } },            // query params must match
//     'POST /api/events?reassign=1': (url, init) => ({ status: 201, body: { ok: true } }),
//   }, { role: 'event_coordinator' });
//   ...
//   expect(calls.find(c => c.method === 'POST')?.body).toEqual({ toCoordinatorId: 'c-b' });
//
// Unmatched requests get 404 { error: 'No fake for GET /api/...' } so a
// missing stub fails loudly. Call vi.unstubAllGlobals() in afterEach.
import { vi } from 'vitest';

export type FakeReply = { status?: number; body?: unknown };
export type FakeHandler = FakeReply | ((url: URL, init?: RequestInit) => FakeReply | Promise<FakeReply>);
export type FakeCall = { method: string; url: URL; body: unknown };

export function stubApi(handlers: Record<string, FakeHandler>, options: { role?: string | null } = {}) {
  const calls: FakeCall[] = [];
  const role = options.role === undefined ? 'event_organiser' : options.role;
  const routes = Object.entries(handlers).map(([key, handler]) => {
    const [method, target] = key.split(' ');
    const pattern = new URL(target, 'http://localhost');
    return { method: method.toUpperCase(), pattern, handler };
  });

  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost');
    const method = (init?.method ?? 'GET').toUpperCase();
    let body: unknown = init?.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { /* leave as text */ } }
    calls.push({ method, url, body });
    if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const route = routes.find(candidate => candidate.method === method
      && candidate.pattern.pathname === url.pathname
      && [...candidate.pattern.searchParams].every(([name, value]) => url.searchParams.get(name) === value));

    let reply: FakeReply;
    if (route) reply = typeof route.handler === 'function' ? await route.handler(url, init) : route.handler;
    else if (url.pathname === '/api/auth/session' && method === 'GET') {
      reply = role
        ? { body: { user: { id: 'test-user', email: 'test@example.com', role, clientOrgId: role === 'event_organiser' ? 'client-a' : null } } }
        : { status: 401, body: { error: 'Sign in to continue.' } };
    } else if (url.pathname === '/api/notifications' && method === 'GET') reply = { body: { notifications: [] } };
    else reply = { status: 404, body: { error: `No fake for ${method} ${url.pathname}${url.search}` } };

    const status = reply.status ?? 200;
    return { ok: status >= 200 && status < 300, status, json: async () => reply.body ?? {} } as Response;
  }));

  return calls;
}

// A promise you settle yourself: hold one response back to test that a late
// answer for the previous route never replaces the current one.
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
