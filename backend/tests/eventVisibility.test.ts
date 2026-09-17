import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessClientOrganisation, scopeClientOrganisationFilter } from '../src/modules/accessControl/service';
import { AccessError, getEvent, listEvents, listNotifications, permittedDelivery, requireOrganiser, type Query } from '../src/modules/eventVisibility/service';
import type { AuthenticatedUser } from '../src/modules/accessControl/types';

const user: AuthenticatedUser = { id: 'organiser-a', email: 'organiser@example.test', role: 'event_organiser', clientOrgId: 'client-a', isActive: true, failedLoginCount: 0 };
const denyQuery: Query = async () => { throw new Error('Unauthorised database read'); };

test('missing membership and missing event organisation fail closed', () => {
  assert.equal(canAccessClientOrganisation(user, undefined).allowed, false);
  assert.equal(canAccessClientOrganisation({ ...user, clientOrgId: undefined }, undefined).allowed, false);
  assert.throws(() => scopeClientOrganisationFilter({ ...user, clientOrgId: undefined }));
  assert.equal(canAccessClientOrganisation(user, 'client-a').allowed, true);
  assert.equal(canAccessClientOrganisation(user, 'client-b').allowed, false);
});

test('unauthenticated, unlinked, inactive, locked and other roles cannot query organiser data', async () => {
  assert.throws(() => requireOrganiser(undefined), { status: 401 });
  for (const changes of [{ clientOrgId: undefined }, { isActive: false }, { failedLoginCount: 5 }, { lockedUntil: new Date(Date.now() + 60000) }, { role: 'attendee' as const }]) {
    const blocked = { ...user, ...changes };
    await assert.rejects(listEvents(denyQuery, blocked), AccessError);
    await assert.rejects(listNotifications(denyQuery, blocked), AccessError);
    await assert.rejects(getEvent(denyQuery, blocked, 'EVT-B01'), AccessError);
  }
});

test('direct denied access commits actor and attempted event before returning denial', async () => {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const query: Query = async (sql, values) => { calls.push({ sql, values }); return { rows: [] }; };
  await assert.rejects(getEvent(query, user, 'EVT-B01'), { status: 403 });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].values, ['client-a', 'EVT-B01', 'organiser-a']);
  assert.match(calls[1].sql, /INSERT INTO audit_logs/);
  assert.deepEqual(calls[1].values, ['organiser-a', 'EVT-B01']);
});

test('audit failure never returns event information or a false logged success', async () => {
  const query: Query = async sql => {
    if (sql.includes('INSERT')) throw new Error('Audit unavailable');
    return { rows: [] };
  };
  await assert.rejects(getEvent(query, user, 'EVT-B01'), /Audit unavailable/);
});

test('list and notification reads use trusted organisation and recipient parameters', async () => {
  const calls: unknown[][] = [];
  const query: Query = async (_sql, values) => { calls.push(values || []); return { rows: [] }; };
  await listEvents(query, user, "%' OR true --");
  await listNotifications(query, user);
  assert.deepEqual(calls, [['client-a', 'organiser-a', "%' OR true --"], ['organiser-a', 'client-a']]);
});

test('notifications without an authorised database record cannot be delivered', async () => {
  assert.equal(await permittedDelivery(denyQuery, undefined, user.email), null);
  assert.equal(await permittedDelivery(async () => ({ rows: [] }), 'foreign-event-notification', user.email), null);
});
