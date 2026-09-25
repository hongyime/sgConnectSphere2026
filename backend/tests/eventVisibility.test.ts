import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessClientOrganisation, scopeClientOrganisationFilter } from '../src/modules/accessControl/service';
import { AccessError, createEventComment, getEvent, listEvents, listNotifications, permittedDelivery, requireOrganiser, updateEventInformation, type Query } from '../src/modules/eventVisibility/service';
import type { AuthenticatedUser } from '../src/modules/accessControl/types';

const user: AuthenticatedUser = { id: 'organiser-a', email: 'organiser@example.test', role: 'event_organiser', clientOrgId: 'client-a', isActive: true, failedLoginCount: 0 };
// requireOrganiser's 403 branch legitimately writes one audit_logs row (E14-S02
// Scenario 2) before rejecting, so this fixture still fails closed on any real
// business-data read while letting that specific, expected write through.
const denyQuery: Query = async sql => {
  if (sql.includes('INSERT INTO audit_logs')) return { rows: [] };
  throw new Error('Unauthorised database read');
};

test('missing membership and missing event organisation fail closed', () => {
  assert.equal(canAccessClientOrganisation(user, undefined).allowed, false);
  assert.equal(canAccessClientOrganisation({ ...user, clientOrgId: undefined }, undefined).allowed, false);
  assert.throws(() => scopeClientOrganisationFilter({ ...user, clientOrgId: undefined }));
  assert.equal(canAccessClientOrganisation(user, 'client-a').allowed, true);
  assert.equal(canAccessClientOrganisation(user, 'client-b').allowed, false);
});

test('unauthenticated, unlinked, inactive, locked and other roles cannot query organiser data', async () => {
  await assert.rejects(requireOrganiser(denyQuery, undefined, 'events'), { status: 401 });
  for (const changes of [{ clientOrgId: undefined }, { isActive: false }, { failedLoginCount: 5 }, { lockedUntil: new Date(Date.now() + 60000) }, { role: 'attendee' as const }]) {
    const blocked = { ...user, ...changes };
    await assert.rejects(listEvents(denyQuery, blocked), AccessError);
    await assert.rejects(listNotifications(denyQuery, blocked), AccessError);
    await assert.rejects(getEvent(denyQuery, blocked, 'EVT-B01'), AccessError);
  }
});

test('a role/organisation denial is audited against the screen, not a specific event', async () => {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const query: Query = async (sql, values) => { calls.push({ sql, values }); return { rows: [] }; };
  await assert.rejects(requireOrganiser(query, { ...user, role: 'attendee' }, 'notifications'), { status: 403 });
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /INSERT INTO audit_logs/);
  assert.deepEqual(calls[0].values, [user.id, 'notifications']);
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

test('organiser event detail includes current status date and status history', async () => {
  const query: Query = async (sql) => {
    if (sql.includes('SELECT e.id')) return { rows: [{
      id: 'event-a', status: 'planning', status_changed_at: '2026-09-10T00:00:00.000Z',
    }] };
    if (sql.includes('FROM event_threads')) return { rows: [] };
    if (sql.includes("action = 'status_changed'")) return { rows: [
      { occurred_at: '2026-09-01T00:00:00.000Z', old_value: 'submitted', new_value: 'under_review' },
      { occurred_at: '2026-09-10T00:00:00.000Z', old_value: 'under_review', new_value: 'planning' },
    ] };
    throw new Error(`Unexpected query: ${sql}`);
  };

  const event = await getEvent(query, user, 'EVT-A01');
  assert.equal(event.status, 'planning');
  assert.equal(event.status_changed_at, '2026-09-10T00:00:00.000Z');
  assert.deepEqual(event.statusHistory, [
    { occurred_at: '2026-09-01T00:00:00.000Z', old_value: 'submitted', new_value: 'under_review' },
    { occurred_at: '2026-09-10T00:00:00.000Z', old_value: 'under_review', new_value: 'planning' },
  ]);
});

test('audit failure never returns event information or a false logged success', async () => {
  const query: Query = async sql => {
    if (sql.includes('INSERT')) throw new Error('Audit unavailable');
    return { rows: [] };
  };
  await assert.rejects(getEvent(query, user, 'EVT-B01'), /Audit unavailable/);
});

test('an organiser can post an accessible event comment and notify its coordinator', async () => {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const query: Query = async (sql, values) => {
    calls.push({ sql, values });
    if (sql.includes('SELECT e.id, e.coordinator_id')) return { rows: [{ id: 'event-a', coordinator_id: 'coord-a' }] };
    if (sql.includes('INSERT INTO event_threads')) return { rows: [{ id: 'comment-a', body: 'Please confirm AV.', created_at: '2026-09-09T09:00:00.000Z' }] };
    if (sql.includes('SELECT full_name')) return { rows: [{ full_name: 'Organiser A' }] };
    return { rows: [] };
  };
  const comment = await createEventComment(query, user, 'EVT-A01', ' Please confirm AV. ');
  assert.deepEqual(comment, {
    id: 'comment-a', body: 'Please confirm AV.', created_at: '2026-09-09T09:00:00.000Z',
    author_name: 'Organiser A', author_email: user.email,
  });
  assert.match(calls.find(call => call.sql.includes('INSERT INTO notifications'))!.sql, /INSERT INTO notifications/);
});

test('comment posting refuses an event outside the organiser organisation', async () => {
  const query: Query = async sql => sql.includes('SELECT e.id, e.coordinator_id') ? { rows: [] } : { rows: [] };
  await assert.rejects(createEventComment(query, user, 'EVT-B01', 'Not allowed'), { status: 403 });
});

test('organiser can update a pre-approval field and the change is audited', async () => {
  const calls: string[] = [];
  const query: Query = async sql => {
    calls.push(sql);
    if (sql.includes('SELECT id, status')) return { rows: [{ id: 'event-a', status: 'under_review', organiser_id: user.id, coordinator_id: 'coord-a', client_org_id: 'client-a' }] };
    return { rows: [] };
  };
  const result = await updateEventInformation(query, user, 'EVT-A01', { expectedAttendance: 250 });
  assert.deepEqual(result.fields, ['expectedAttendance']);
  assert.ok(calls.some(sql => sql.startsWith('UPDATE events SET')));
  assert.ok(calls.some(sql => sql.includes('INSERT INTO audit_logs')));
});

test('organiser post-approval restricted edits return the change-request hand-off', async () => {
  const query: Query = async sql => sql.includes('SELECT id, status')
    ? { rows: [{ id: 'event-a', status: 'approved', organiser_id: user.id, coordinator_id: 'coord-a', client_org_id: 'client-a' }] }
    : { rows: [] };
  await assert.rejects(updateEventInformation(query, user, 'EVT-A01', { expectedAttendance: 250 }), { status: 409 });
});

test('only the assigned coordinator can edit an approved event', async () => {
  const query: Query = async sql => sql.includes('SELECT id, status')
    ? { rows: [{ id: 'event-a', status: 'approved', organiser_id: 'organiser-a', coordinator_id: 'coord-a', client_org_id: 'client-a' }] }
    : { rows: [] };
  await assert.rejects(updateEventInformation(query, { ...user, id: 'coord-b', role: 'event_coordinator', clientOrgId: undefined }, 'EVT-A01', { purpose: 'Updated' }), { status: 403 });
});

test('assigned coordinator can edit approved event fields and every change is audited', async () => {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const coordinator = { ...user, id: 'coord-a', role: 'event_coordinator' as const, clientOrgId: undefined };
  const query: Query = async (sql, values) => {
    calls.push({ sql, values });
    if (sql.includes('SELECT id, status')) return { rows: [{ id: 'event-a', status: 'approved', organiser_id: 'organiser-a', coordinator_id: 'coord-a', client_org_id: 'client-a' }] };
    return { rows: [] };
  };
  const result = await updateEventInformation(query, coordinator, 'EVT-A01', { venueRequirements: 'Theatre seating', purpose: 'Team planning' });
  assert.deepEqual(result.fields, ['venueRequirements', 'purpose']);
  assert.equal(calls.filter(call => call.sql.includes('INSERT INTO audit_logs')).length, 2);
});

test('organiser can update registration dates before approval', async () => {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const query: Query = async (sql, values) => {
    calls.push({ sql, values });
    if (sql.includes('SELECT id, status')) return { rows: [{ id: 'event-a', status: 'under_review', organiser_id: user.id, coordinator_id: 'coord-a', client_org_id: 'client-a' }] };
    return { rows: [] };
  };
  await updateEventInformation(query, user, 'EVT-A01', { registrationDates: { opensAt: '2026-09-01T00:00:00Z', closesAt: '2026-09-09T00:00:00Z' } });
  assert.match(calls.find(call => call.sql.startsWith('UPDATE events SET'))!.sql, /registration_opens_at/);
});

test('organiser post-approval unrestricted edits are audited', async () => {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const query: Query = async (sql, values) => {
    calls.push({ sql, values });
    if (sql.includes('SELECT id, status')) return { rows: [{ id: 'event-a', status: 'approved', organiser_id: user.id, coordinator_id: 'coord-a', client_org_id: 'client-a' }] };
    return { rows: [] };
  };
  await updateEventInformation(query, user, 'EVT-A01', { purpose: 'Updated purpose' });
  assert.equal(calls.filter(call => call.sql.includes('INSERT INTO audit_logs')).length, 1);
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
