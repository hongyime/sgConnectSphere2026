import { afterEach, expect, test, vi } from 'vitest';
import { deferred, stubApi } from './fakeApi';

afterEach(() => { vi.unstubAllGlobals(); });

test('answers by method, path and the query params the key names', async () => {
  stubApi({ 'GET /api/events?assigned=1': { body: { events: ['mine'] } }, 'GET /api/events': { body: { events: ['org'] } } });
  expect(await (await fetch('/api/events?assigned=1&status=approved')).json()).toEqual({ events: ['mine'] });
  expect(await (await fetch('/api/events?q=summit')).json()).toEqual({ events: ['org'] });
});

test('records each call with its parsed JSON body', async () => {
  const calls = stubApi({ 'POST /api/events?reassign=1': { status: 201, body: { ok: true } } });
  const response = await fetch('/api/events?reassign=1&id=e-1', { method: 'POST', body: JSON.stringify({ toCoordinatorId: 'c-b' }) });
  expect(response.status).toBe(201);
  expect(calls[0]).toMatchObject({ method: 'POST', body: { toCoordinatorId: 'c-b' } });
});

test('answers the header session call for the chosen role, or 401 when signed out', async () => {
  stubApi({}, { role: 'venue_staff' });
  expect(await (await fetch('/api/auth/session')).json()).toMatchObject({ user: { role: 'venue_staff' } });
  stubApi({}, { role: null });
  expect((await fetch('/api/auth/session')).status).toBe(401);
});

test('an unstubbed request fails loudly with 404', async () => {
  stubApi({});
  const response = await fetch('/api/venues?q=hall');
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: 'No fake for GET /api/venues?q=hall' });
});

test('handlers can be functions, and deferred holds a reply back', async () => {
  const held = deferred<{ body: unknown }>();
  stubApi({ 'GET /api/slow': () => held.promise });
  const pending = fetch('/api/slow').then(response => response.json());
  held.resolve({ body: { late: true } });
  expect(await pending).toEqual({ late: true });
});
