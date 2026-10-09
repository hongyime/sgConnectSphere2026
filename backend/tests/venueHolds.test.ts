// E06-S05 (SCRUM-49) tentative holds against a scripted fake database: who
// may hold, convert, release and extend, the input rules (48-hour default,
// 1 hour to 14 days), the clash sentence, expiry, and the HTTP handler. The
// real-PostgreSQL run is venueHolds.integration.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool, PoolClient } from 'pg';
import {
  convertHold, expireHolds, extendHold, formatSgt, holdsVenue, listEventHolds, listLiveHolds,
  placeHold, releaseHold, validateHoldInput,
} from '../src/modules/venueBooking/holds.js';
import { createHoldsHandler, HOLD_ACTIONS } from '../src/modules/venueBooking/holdsHandler.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import type { Query } from '../src/modules/eventVisibility/service.js';
import type { VercelResponse } from '../src/vercel.js';

const coordinator: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-0000000000c1', email: 'coord_a@example.test', role: 'event_coordinator',
  isActive: true, failedLoginCount: 0,
};
const staff: AuthenticatedUser = { ...coordinator, id: '00000000-0000-4000-8000-0000000000d1', role: 'venue_staff' };
const organiser: AuthenticatedUser = { ...coordinator, id: '00000000-0000-4000-8000-0000000000e1', role: 'event_organiser' };
const VENUE = '11111111-1111-4111-8111-111111111111';
const HOLD = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-11-01T00:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const at = (hours: number) => new Date(NOW.getTime() + hours * HOUR);
const event = {
  id: 'evt-1', eventCode: 'EVT-TC', title: 'Tech Conference 2026', status: 'planning', coordinatorId: coordinator.id,
  startsAt: new Date('2026-11-12T01:00:00.000Z'), endsAt: new Date('2026-11-12T04:00:00.000Z'),
};
const venue = { id: VENUE, name: 'Main Hall' };
const hold = {
  id: HOLD, eventId: event.id, venueId: VENUE, venueName: 'Main Hall', status: 'tentative', expiresAt: at(48),
  startsAt: event.startsAt, endsAt: event.endsAt,
};

type Reply = { rows: unknown[]; rowCount?: number } | Error;
function fakeDatabase(rules: Array<[RegExp, Reply | ((values?: unknown[]) => Reply)]>) {
  const calls: Array<{ sql: string; values?: unknown[] }> = [];
  const answer = async (sql: string, values?: unknown[]) => {
    calls.push({ sql, values });
    const rule = rules.find(([pattern]) => pattern.test(sql));
    const reply = rule ? (typeof rule[1] === 'function' ? rule[1](values) : rule[1]) : { rows: [] };
    if (reply instanceof Error) throw reply;
    return { rowCount: reply.rows.length, ...reply };
  };
  const client = { query: answer, release: () => undefined } as unknown as PoolClient;
  const pool = { query: answer, connect: async () => client } as unknown as Pool;
  return { pool, query: answer as Query, calls };
}
const sqlCalls = (calls: Array<{ sql: string }>, pattern: RegExp) => calls.filter(call => pattern.test(call.sql));
const EVENT_ROW = /FROM events WHERE id::text = \$1 OR event_code = \$1/;
const VENUE_ROW = /FROM venues WHERE id = \$1 AND is_active FOR NO KEY UPDATE/;
const CLASH = /ORDER BY lower\(vb.booking_range\) LIMIT 1/;
const HOLD_ROW = /FOR UPDATE OF vb/;
const denials = (calls: Array<{ sql: string }>) => sqlCalls(calls, /'screen'.*'Access Denied'/s).length;
const writes = (calls: Array<{ sql: string }>) => sqlCalls(calls, /INSERT INTO venue_bookings|UPDATE venue_bookings/).length;

test('a hold holds the venue until it expires; pending and confirmed bookings always do', () => {
  assert.equal(holdsVenue('vb', '$4'),
    "(vb.status IN ('pending', 'confirmed') OR (vb.status::text = 'tentative' AND vb.expires_at > $4))");
  assert.equal(formatSgt(new Date('2026-11-12T01:00:00.000Z')), '12 Nov 2026, 9:00 am');
});

test('every operation refuses signed-out users and the wrong role, and audits the refusal', async () => {
  const db = fakeDatabase([]);
  await assert.rejects(placeHold(db.pool, undefined, {}), { status: 401 });
  await assert.rejects(placeHold(db.pool, organiser, {}), { status: 403, message: 'Access denied. Only the assigned Coordinator can hold a venue for this event.' });
  await assert.rejects(convertHold(db.pool, staff, {}), { status: 403 });
  await assert.rejects(releaseHold(db.pool, { ...coordinator, isActive: false }, {}), { status: 403 });
  await assert.rejects(extendHold(db.pool, coordinator, {}), { status: 403, message: 'Access denied. Only Venue Staff can change when a hold expires.' });
  await assert.rejects(listEventHolds(db.query, staff, 'EVT-TC'), { status: 403 });
  await assert.rejects(listLiveHolds(db.query, coordinator), { status: 403 });
  assert.equal(denials(db.calls), 6);
  assert.equal(sqlCalls(db.calls, /venue_bookings/).length, 0);
});

test('ids are checked before any lookup', async () => {
  const db = fakeDatabase([]);
  await assert.rejects(placeHold(db.pool, coordinator, null), { status: 400, message: 'An event id or code is required.' });
  await assert.rejects(placeHold(db.pool, coordinator, { event: 'x'.repeat(161), venue: VENUE }), { status: 400 });
  await assert.rejects(placeHold(db.pool, coordinator, { event: 'EVT-TC', venue: 'not-a-uuid' }), { status: 400, message: 'A venue id is required.' });
  await assert.rejects(convertHold(db.pool, coordinator, undefined), { status: 400 });
  await assert.rejects(convertHold(db.pool, coordinator, { event: 'EVT-TC', hold: 7 }), { status: 400, message: 'A hold id is required.' });
  await assert.rejects(releaseHold(db.pool, coordinator, 'text'), { status: 400 });
  await assert.rejects(extendHold(db.pool, staff, null), { status: 400, message: 'A hold id is required.' });
  await assert.rejects(listEventHolds(db.query, coordinator, ' '), { status: 400 });
  assert.equal(sqlCalls(db.calls, /events|venue_bookings/).length, 0);
});

test('validateHoldInput defaults to the event period and a 48-hour expiry', () => {
  assert.deepEqual(validateHoldInput({}, event, NOW), { input: { startsAt: event.startsAt, endsAt: event.endsAt, expiresAt: at(48) } });
  const chosen = validateHoldInput({ startsAt: '2026-11-12T00:00:00Z', endsAt: '2026-11-12T06:00:00Z', expiresAt: at(1).toISOString() }, event, NOW);
  assert.deepEqual(chosen.input, { startsAt: new Date('2026-11-12T00:00:00Z'), endsAt: new Date('2026-11-12T06:00:00Z'), expiresAt: at(1) });
  assert.ok(validateHoldInput({ expiresAt: at(14 * 24).toISOString() }, event, NOW).input);
});

test('validateHoldInput reports each bad field, including an expiry outside 1 hour to 14 days', () => {
  assert.deepEqual(validateHoldInput({ startsAt: 'soon', endsAt: '', expiresAt: 'later' }, event, NOW).errors, {
    startsAt: ['Enter when the hold starts.'], endsAt: ['Enter when the hold ends.'], expiresAt: ['Enter when the hold expires.'],
  });
  assert.deepEqual(validateHoldInput({ startsAt: 5, endsAt: '2026-11-12T00:00:00Z' }, event, NOW).errors, { startsAt: ['Enter when the hold starts.'] });
  assert.deepEqual(validateHoldInput({ endsAt: '2026-11-12T01:00:00Z' }, event, NOW).errors, { endsAt: ['The hold must end after it starts.'] });
  assert.deepEqual(validateHoldInput({ expiresAt: new Date(at(1).getTime() - 1).toISOString() }, event, NOW).errors,
    { expiresAt: ['A hold must last at least 1 hour from now.'] });
  assert.deepEqual(validateHoldInput({ expiresAt: new Date(at(14 * 24).getTime() + 1).toISOString() }, event, NOW).errors,
    { expiresAt: ['A hold can last at most 14 days from now.'] });
});

test('TC_E06S05_03: the assigned Coordinator holds a free venue; it is saved tentative with a 48-hour expiry and audited', async () => {
  const db = fakeDatabase([[EVENT_ROW, { rows: [event] }], [VENUE_ROW, { rows: [venue] }]]);
  const result = await placeHold(db.pool, coordinator, { event: ' EVT-TC ', venue: VENUE }, NOW);
  assert.equal(result.status, 201);
  const body = result.body as { hold: { id: string; status: string; expiresAt: string; venueName: string } };
  assert.deepEqual({ ...body.hold, id: undefined }, { id: undefined, venueId: VENUE, venueName: 'Main Hall', status: 'tentative', expiresAt: at(48).toISOString() });
  const insert = sqlCalls(db.calls, /INSERT INTO venue_bookings/)[0]!;
  assert.match(insert.sql, /'tentative'/);
  assert.deepEqual(insert.values?.slice(1), [VENUE, event.id, event.startsAt, event.endsAt, at(48)]);
  const clash = sqlCalls(db.calls, CLASH)[0]!;
  assert.match(clash.sql, /vb.status::text = 'tentative' AND vb.expires_at > \$4/);
  assert.deepEqual(clash.values, [VENUE, event.startsAt, event.endsAt, NOW, null]);
  const entry = sqlCalls(db.calls, /INSERT INTO audit_logs/)[0]!;
  assert.deepEqual(entry.values, [coordinator.id, event.id, 'Tentative hold placed on Main Hall', null, at(48).toISOString()]);
  assert.equal(EVENT_ROW.test(sqlCalls(db.calls, /FOR NO KEY UPDATE/)[0]!.sql), true);
});

test('TC_E06S05_01: an overlapping hold, request, booking or block is refused and named', async () => {
  const clashWith = (status: string) => fakeDatabase([
    [EVENT_ROW, { rows: [event] }], [VENUE_ROW, { rows: [venue] }],
    [CLASH, { rows: [{ status, eventCode: 'EVT-CR', title: status === 'confirmed' ? 'EVT-CR Charity Run' : 'Charity Run',
      startsAt: new Date('2026-11-12T02:00:00Z'), endsAt: new Date('2026-11-12T05:00:00Z') }] }],
  ]);
  const cases: Array<[string, string]> = [
    ['tentative', 'This venue already has a tentative hold for EVT-CR Charity Run from 12 Nov 2026, 10:00 am to 12 Nov 2026, 1:00 pm.'],
    ['pending', 'This venue already has a pending booking request for EVT-CR Charity Run from 12 Nov 2026, 10:00 am to 12 Nov 2026, 1:00 pm.'],
    ['confirmed', 'This venue already has a confirmed booking for EVT-CR Charity Run from 12 Nov 2026, 10:00 am to 12 Nov 2026, 1:00 pm.'],
  ];
  for (const [status, message] of cases) {
    const db = clashWith(status);
    assert.deepEqual(await placeHold(db.pool, coordinator, { event: 'EVT-TC', venue: VENUE }, NOW), { status: 409, body: { error: message } });
    assert.equal(writes(db.calls), 0);
  }
  const noCode = fakeDatabase([[EVENT_ROW, { rows: [event] }], [VENUE_ROW, { rows: [venue] }],
    [CLASH, { rows: [{ status: 'pending', eventCode: null, title: 'Open Day', startsAt: event.startsAt, endsAt: event.endsAt }] }]]);
  assert.match(String((await placeHold(noCode.pool, coordinator, { event: 'EVT-TC', venue: VENUE }, NOW)).body.error), /request for Open Day from/);
  const blocked = fakeDatabase([[EVENT_ROW, { rows: [event] }], [VENUE_ROW, { rows: [venue] }], [/FROM venue_blocks/, { rows: [{ reason: 'Aircon repair' }] }]]);
  assert.deepEqual(await placeHold(blocked.pool, coordinator, { event: 'EVT-TC', venue: VENUE }, NOW),
    { status: 409, body: { error: 'This venue is blocked for that period (Aircon repair).' } });
  assert.equal(writes(blocked.calls), 0);
});

test('a hold is refused for another Coordinator\'s event, an unplanned event, a bad period or a retired venue', async () => {
  const other = fakeDatabase([[EVENT_ROW, { rows: [{ ...event, coordinatorId: 'someone-else' }] }]]);
  await assert.rejects(placeHold(other.pool, coordinator, { event: 'EVT-TC', venue: VENUE }, NOW), { status: 403, message: 'Access denied. This event is not assigned to you.' });
  assert.equal(denials(other.calls), 1);
  const missing = fakeDatabase([]);
  await assert.rejects(placeHold(missing.pool, coordinator, { event: 'EVT-NONE', venue: VENUE }, NOW), { status: 403 });
  const pendingEvent = fakeDatabase([[EVENT_ROW, { rows: [{ ...event, status: 'pending_approval' }] }]]);
  await assert.rejects(placeHold(pendingEvent.pool, coordinator, { event: 'EVT-TC', venue: VENUE }, NOW),
    { status: 409, message: 'Venues can only be held while an approved event is being planned.' });
  assert.equal(denials(pendingEvent.calls), 0);
  const invalid = fakeDatabase([[EVENT_ROW, { rows: [event] }]]);
  assert.deepEqual(await placeHold(invalid.pool, coordinator, { event: 'EVT-TC', venue: VENUE, expiresAt: at(0.5).toISOString() }, NOW),
    { status: 400, body: { error: 'validation_failed', errors: { expiresAt: ['A hold must last at least 1 hour from now.'] } } });
  const retired = fakeDatabase([[EVENT_ROW, { rows: [event] }]]);
  await assert.rejects(placeHold(retired.pool, coordinator, { event: 'EVT-TC', venue: VENUE }, NOW),
    { status: 404, message: 'That venue was not found or is no longer in use.' });
  assert.equal(writes(retired.calls), 0);
});

test('TC_E06S05_04: submitting the booking request turns a live hold into a pending request and stops its expiry', async () => {
  const db = fakeDatabase([[EVENT_ROW, { rows: [event] }], [HOLD_ROW, { rows: [hold] }]]);
  assert.deepEqual(await convertHold(db.pool, coordinator, { event: 'EVT-TC', hold: HOLD }, NOW), { status: 200, body: { booking: { id: HOLD, status: 'pending' } } });
  assert.match(sqlCalls(db.calls, /UPDATE venue_bookings/)[0]!.sql, /status = 'pending', expires_at = NULL/);
  assert.deepEqual(sqlCalls(db.calls, HOLD_ROW)[0]!.values, [HOLD, event.id]);
  assert.equal(sqlCalls(db.calls, /INSERT INTO audit_logs/)[0]!.values?.[2], 'Tentative hold on Main Hall submitted as a booking request');
});

test('an expired, missing or already-converted hold cannot be converted; nor one on an unplanned event', async () => {
  const expired = fakeDatabase([[EVENT_ROW, { rows: [event] }], [HOLD_ROW, { rows: [{ ...hold, expiresAt: NOW }] }]]);
  await assert.rejects(convertHold(expired.pool, coordinator, { event: 'EVT-TC', hold: HOLD }, NOW),
    { status: 409, message: "This hold has expired, so it can't be changed. Place a new hold if the venue is still needed." });
  const cleared = fakeDatabase([[EVENT_ROW, { rows: [event] }], [HOLD_ROW, { rows: [{ ...hold, expiresAt: null }] }]]);
  await assert.rejects(convertHold(cleared.pool, coordinator, { event: 'EVT-TC', hold: HOLD }, NOW), { status: 409 });
  const converted = fakeDatabase([[EVENT_ROW, { rows: [event] }], [HOLD_ROW, { rows: [{ ...hold, status: 'pending' }] }]]);
  await assert.rejects(convertHold(converted.pool, coordinator, { event: 'EVT-TC', hold: HOLD }, NOW), { status: 404, message: 'That tentative hold was not found.' });
  const missing = fakeDatabase([[EVENT_ROW, { rows: [event] }]]);
  await assert.rejects(convertHold(missing.pool, coordinator, { event: 'EVT-TC', hold: HOLD }, NOW), { status: 404 });
  const cancelled = fakeDatabase([[EVENT_ROW, { rows: [{ ...event, status: 'cancelled' }] }]]);
  await assert.rejects(convertHold(cancelled.pool, coordinator, { event: 'EVT-TC', hold: HOLD }, NOW), { status: 409 });
  for (const db of [expired, cleared, converted, missing, cancelled]) assert.equal(sqlCalls(db.calls, /UPDATE venue_bookings/).length, 0);
});

test('Scenario 4: the Coordinator releases a hold and the period is Free again', async () => {
  const db = fakeDatabase([[EVENT_ROW, { rows: [{ ...event, status: 'cancelled' }] }], [HOLD_ROW, { rows: [{ ...hold, expiresAt: NOW }] }]]);
  assert.deepEqual(await releaseHold(db.pool, coordinator, { event: 'EVT-TC', hold: HOLD }), { status: 200, body: { released: true } });
  assert.match(sqlCalls(db.calls, /UPDATE venue_bookings/)[0]!.sql, /status = 'released', expires_at = NULL/);
  assert.equal(sqlCalls(db.calls, /INSERT INTO audit_logs/)[0]!.values?.[2], 'Tentative hold on Main Hall released');
});

test('TC_E06S05_07: Venue Staff extend a live hold; the old and new expiry are logged with who changed it', async () => {
  const db = fakeDatabase([[HOLD_ROW, { rows: [hold] }]]);
  const later = at(72).toISOString();
  assert.deepEqual(await extendHold(db.pool, staff, { hold: HOLD, expiresAt: later }, NOW), { status: 200, body: { hold: { id: HOLD, expiresAt: later } } });
  assert.deepEqual(sqlCalls(db.calls, /UPDATE venue_bookings/)[0]!.values, [HOLD, new Date(later)]);
  assert.deepEqual(sqlCalls(db.calls, HOLD_ROW)[0]!.values, [HOLD, null]);
  assert.deepEqual(sqlCalls(db.calls, /INSERT INTO audit_logs/)[0]!.values,
    [staff.id, event.id, 'Tentative hold on Main Hall extended', at(48).toISOString(), later]);
});

test('an extension must be later than now-plus-1-hour, the current expiry and no more than 14 days; an expired hold cannot be extended', async () => {
  const live = () => fakeDatabase([[HOLD_ROW, { rows: [hold] }]]);
  const expect = async (expiresAt: unknown, message: string) => {
    const db = live();
    assert.deepEqual(await extendHold(db.pool, staff, { hold: HOLD, expiresAt }, NOW),
      { status: 400, body: { error: 'validation_failed', errors: { expiresAt: [message] } } });
    assert.equal(sqlCalls(db.calls, /UPDATE venue_bookings/).length, 0);
  };
  await expect(undefined, 'Enter when the hold expires.');
  await expect(at(24).toISOString(), 'Choose a later expiry than the current one.');
  await expect(at(48).toISOString(), 'Choose a later expiry than the current one.');
  await expect(at(15 * 24).toISOString(), 'A hold can last at most 14 days from now.');
  const expired = fakeDatabase([[HOLD_ROW, { rows: [{ ...hold, expiresAt: at(-1) }] }]]);
  await assert.rejects(extendHold(expired.pool, staff, { hold: HOLD, expiresAt: at(72).toISOString() }, NOW), { status: 409 });
  assert.equal(denials(expired.calls), 0);
});

test('TC_E06S05_05 TC_E06S05_06: the expiry job marks passed holds expired, audits each and tells the Coordinator once', async () => {
  const rows = [
    { id: HOLD, eventId: event.id, eventCode: 'EVT-TC', title: 'Tech Conference 2026', coordinatorId: coordinator.id, venueName: 'Main Hall', expiresAt: NOW },
    { id: 'h2', eventId: 'evt-2', eventCode: null, title: 'Open Day', coordinatorId: null, venueName: 'Studio', expiresAt: NOW },
    { id: 'h3', eventId: 'evt-3', eventCode: 'EVT-X', title: 'Expo', coordinatorId: 'gone', venueName: 'Annex', expiresAt: NOW },
  ];
  const db = fakeDatabase([
    [/SET status = 'expired'/, { rows }],
    [/INSERT INTO notifications/, values => ({ rows: values?.[0] === 'gone' ? [] : [{ id: 'n1' }] })],
    [/INSERT INTO notification_deliveries/, { rows: [{ id: '33333333-3333-4333-8333-333333333333' }] }],
    [/FROM notification_deliveries d JOIN notifications n/, { rows: [{ delivery_status: 'sent', dispatch_state: 'done', recipient_email: 'coord_a@example.test' }] }],
  ]);
  assert.deepEqual(await expireHolds(db.pool, NOW), { holdsExpired: 3, notified: 1 });
  const update = sqlCalls(db.calls, /SET status = 'expired'/)[0]!;
  assert.match(update.sql, /vb.status = 'tentative' AND vb.expires_at <= \$1/);
  assert.deepEqual(update.values, [NOW]);
  assert.deepEqual(sqlCalls(db.calls, /INSERT INTO audit_logs/).map(call => [call.values?.[0], call.values?.[2]]), [
    [null, 'Tentative hold on Main Hall expired'], [null, 'Tentative hold on Studio expired'], [null, 'Tentative hold on Annex expired'],
  ]);
  const notices = sqlCalls(db.calls, /INSERT INTO notifications/);
  assert.equal(notices.length, 2);
  assert.deepEqual(notices[0]!.values?.slice(0, 4), [coordinator.id, event.id, 'Tentative hold expired',
    'Your tentative hold on Main Hall for EVT-TC Tech Conference 2026 expired at 1 Nov 2026, 8:00 am. The venue is free for other requests.']);
  assert.equal(notices[0]!.values?.[5], NOW);
  assert.equal(sqlCalls(db.calls, /INSERT INTO notification_deliveries/).length, 1);
});

test('the expiry job with nothing due changes nothing', async () => {
  const db = fakeDatabase([]);
  assert.deepEqual(await expireHolds(db.pool), { holdsExpired: 0, notified: 0 });
  assert.equal(sqlCalls(db.calls, /audit_logs|notifications/).length, 0);
});

test('the Coordinator lists the event\'s live and expired holds; a passed hold reads as expired before the job runs', async () => {
  const db = fakeDatabase([[EVENT_ROW, { rows: [event] }], [/JOIN events e ON e.id = vb.event_id WHERE vb.event_id/, { rows: [{ id: HOLD }] }]]);
  assert.deepEqual(await listEventHolds(db.query, coordinator, 'EVT-TC', NOW), {
    event: { id: event.id, eventCode: 'EVT-TC', title: 'Tech Conference 2026', status: 'planning', startsAt: event.startsAt, endsAt: event.endsAt },
    holds: [{ id: HOLD }], canHold: true,
  });
  const list = sqlCalls(db.calls, /WHERE vb.event_id = \$1/)[0]!;
  assert.match(list.sql, /WHEN vb.status = 'tentative' AND vb.expires_at <= \$2 THEN 'expired'/);
  assert.deepEqual(list.values, [event.id, NOW]);
  const done = fakeDatabase([[EVENT_ROW, { rows: [{ ...event, status: 'completed' }] }]]);
  assert.equal((await listEventHolds(done.query, coordinator, 'EVT-TC', NOW)).canHold, false);
  const other = fakeDatabase([[EVENT_ROW, { rows: [{ ...event, coordinatorId: 'someone-else' }] }]]);
  await assert.rejects(listEventHolds(other.query, coordinator, 'EVT-TC'), { status: 403 });
  assert.equal(denials(other.calls), 1);
});

test('Venue Staff list every live hold, soonest expiry first', async () => {
  const db = fakeDatabase([[/WHERE vb.status = 'tentative' AND vb.expires_at > \$1/, { rows: [{ id: HOLD }] }]]);
  assert.deepEqual(await listLiveHolds(db.query, staff, NOW), { holds: [{ id: HOLD }] });
  const call = sqlCalls(db.calls, /vb.expires_at > \$1/)[0]!;
  assert.match(call.sql, /ORDER BY vb.expires_at, v.name/);
  assert.deepEqual(call.values, [NOW]);
  assert.deepEqual((await listLiveHolds(fakeDatabase([]).query, staff)).holds, []);
});

function fakeResponse() {
  const captured: { status: number; body: unknown; headers: Record<string, unknown> } = { status: 0, body: undefined, headers: {} };
  const response: VercelResponse = {
    setHeader: (key, value) => { captured.headers[key] = value; },
    status: code => { captured.status = code; return { json: value => { captured.body = value; } }; },
    json: value => { captured.body = value; },
  };
  return { response, captured };
}

test('handler: methods, origin and actions', async () => {
  const handler = createHoldsHandler({
    authenticate: async () => coordinator, query: async () => { throw new Error('unexpected'); },
    pool: () => { throw new Error('unexpected'); }, allowedOrigin: origin => origin === 'https://app.example.test',
  });
  const { response, captured } = fakeResponse();
  await handler({ headers: {} } as never, response);
  assert.deepEqual([captured.status, captured.headers.Allow], [405, 'GET, POST']);
  await handler({ method: 'POST', url: '/api/venues', headers: { origin: 'https://evil.example.test' }, body: { action: 'hold' } }, response);
  assert.deepEqual([captured.status, captured.body], [403, { error: 'Request origin not allowed.' }]);
  await handler({ method: 'POST', url: '/api/venues?task=holds', headers: { origin: 'https://app.example.test' }, body: { action: 'delete' } }, response);
  assert.deepEqual([captured.status, captured.body], [400, { error: 'Choose hold, convert_hold, release or extend_hold.' }]);
  assert.deepEqual(HOLD_ACTIONS, ['hold', 'convert_hold', 'release', 'extend_hold']);
});

test('handler: GET routes to the event or staff list; POST to hold, convert, release or extend', async () => {
  const db = fakeDatabase([[EVENT_ROW, { rows: [event] }], [VENUE_ROW, { rows: [venue] }], [HOLD_ROW, { rows: [{ ...hold, expiresAt: new Date(Date.now() + 48 * HOUR) }] }]]);
  let user = coordinator;
  const handler = createHoldsHandler({ authenticate: async () => user, query: db.query, pool: () => db.pool, allowedOrigin: () => true });
  const { response, captured } = fakeResponse();
  await handler({ method: 'GET', url: '/api/venues?task=holds&event=EVT-TC', headers: {} }, response);
  assert.deepEqual([captured.status, (captured.body as { canHold: boolean }).canHold], [200, true]);
  await handler({ method: 'POST', headers: {}, body: { action: 'hold', event: 'EVT-TC', venue: VENUE } }, response);
  assert.equal(captured.status, 201);
  await handler({ method: 'POST', headers: {}, body: { action: 'convert_hold', event: 'EVT-TC', hold: HOLD } }, response);
  assert.deepEqual([captured.status, captured.body], [200, { booking: { id: HOLD, status: 'pending' } }]);
  await handler({ method: 'POST', headers: {}, body: { action: 'release', event: 'EVT-TC', hold: HOLD } }, response);
  assert.deepEqual([captured.status, captured.body], [200, { released: true }]);
  user = staff;
  await handler({ method: 'GET', headers: {} }, response);
  assert.deepEqual([captured.status, captured.body], [200, { holds: [] }]);
  await handler({ method: 'POST', headers: {}, body: { action: 'extend_hold', hold: HOLD, expiresAt: new Date(Date.now() + 72 * HOUR).toISOString() } }, response);
  assert.equal(captured.status, 200);
});
