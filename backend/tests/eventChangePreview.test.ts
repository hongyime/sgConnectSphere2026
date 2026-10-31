// Unit tests for the E10-S02 (SCRUM-71) change preview and over-subscription
// warning. The preview runs the real edit (updateEventInformation) against a
// scripted client double: the double answers each statement by its SQL and
// switches the Event and Session to their edited values once the edit's
// UPDATE runs, so the test sees what the database would. That the savepoint
// really discards the edit is checked against PostgreSQL in the integration
// suite; here we check the statements are issued in the right order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool, PoolClient } from 'pg';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import {
  applyArrangementImpact, ArrangementsChangedError, assessOverSubscription, changeRevision, loadOverSubscription, previewEventChange, previewEventChangeWith,
} from '../src/modules/changeManagement/eventChange.js';
import { updateEventInformationWithNotifications } from '../src/modules/eventNotifications/informationChange.js';
import type { EventCapacity } from '../src/modules/attendeeRegistration/capacity.js';
import { RejectedRequestError } from '../src/modules/eventLifecycle/decision.js';
import { AccessError } from '../src/modules/eventVisibility/service.js';

const coordinator: AuthenticatedUser = { id: 'coordinator-1', email: 'coordinator_1@connectsphere.com', role: 'event_coordinator', isActive: true, failedLoginCount: 0 };

const capacityOf = (sessions: [string, number, number][]): EventCapacity => ({
  capacity: sessions.reduce((sum, [, capacity]) => sum + capacity, 0),
  registered: Math.max(0, ...sessions.map(([, , registered]) => registered)),
  sessions: sessions.map(([sessionId, capacity, registered]) => ({ sessionId, capacity, registered })),
});

test('TC_E10S02_04: registrations above capacity warn per Session and for the Event, and nobody is removed', () => {
  assert.deepEqual(assessOverSubscription(capacityOf([['session-a', 80, 100]])), [
    { scope: 'session', sessionId: 'session-a', registered: 100, capacity: 80 },
    { scope: 'event', sessionId: null, registered: 100, capacity: 80 },
  ]);
});

test('exactly full is not over-subscribed; one above is (boundary)', () => {
  assert.deepEqual(assessOverSubscription(capacityOf([['session-a', 80, 80]])), []);
  assert.deepEqual(assessOverSubscription(capacityOf([['session-a', 80, 81]])).map(over => over.registered), [81, 81]);
});

test('a full Session warns even when the combined Event capacity still holds everyone', () => {
  const capacity: EventCapacity = { capacity: 120, registered: 90, sessions: [
    { sessionId: 'session-a', capacity: 80, registered: 80 },
    { sessionId: 'session-b', capacity: 40, registered: 41 },
  ] };
  assert.deepEqual(assessOverSubscription(capacity), [{ scope: 'session', sessionId: 'session-b', registered: 41, capacity: 40 }],
    'session A holds 80 of 80; the combined 120 holds all 90');
});

test('no Confirmed booking means no capacity to compare yet', () => {
  assert.deepEqual(assessOverSubscription(capacityOf([['session-a', 0, 500]])), [], 'a new event does not warn "500 of 0"');
  const partly: EventCapacity = { capacity: 50, registered: 60, sessions: [
    { sessionId: 'session-a', capacity: 50, registered: 40 },
    { sessionId: 'session-b', capacity: 0, registered: 30 },
  ] };
  assert.deepEqual(assessOverSubscription(partly), [{ scope: 'event', sessionId: null, registered: 60, capacity: 50 }],
    'the unbooked Session is skipped; the Event total still counts the booked one');
});

test('loadOverSubscription reads E09-S02 capacity: only Registered places count', async () => {
  const calls: string[] = [];
  const answers = [[{ session_id: 'session-a', session_capacity: 80, registered: 100 }], [{ registered: 100 }]];
  const over = await loadOverSubscription(async sql => { calls.push(sql); return { rows: answers.shift() as never[] }; }, 'event-1');
  assert.deepEqual(over.map(item => [item.scope, item.registered, item.capacity]), [['session', 100, 80], ['event', 100, 80]]);
  assert.ok(calls.every(sql => sql.includes("status = 'registered'")), 'Pending registrations hold no seat (T-85)');
});

test('applyArrangementImpact flags each affected arrangement and logs why, once each', async () => {
  const calls: { sql: string; values?: unknown[] }[] = [];
  await applyArrangementImpact(async (sql, values) => { calls.push({ sql, values }); return { rows: [] }; }, 'coordinator-1', 'event-1', {
    affected: true,
    bookings: [{ id: 'booking-a', sessionId: 'session-a', venueId: 'hall', venueName: 'Riverside Hall', reasons: ['time', 'capacity'], governingHeadcount: 250, capacity: 200 }],
    reservations: [{ id: 'reservation-a', sessionId: 'session-a', equipmentId: 'projector', equipmentName: 'Projector', reasons: ['time'] }],
    supports: [{ id: 'support-a', description: 'Sound desk', startsAt: '2027-03-12T00:00:00.000Z', endsAt: '2027-03-12T03:00:00.000Z', reasons: ['time'], shiftMs: 86400000 }],
  });
  assert.deepEqual(calls.slice(0, 3).map(call => [call.sql.split(' SET')[0], call.values]), [
    ['UPDATE venue_bookings', [['booking-a']]],
    ['UPDATE equipment_reservations', [['reservation-a']]],
    ['UPDATE tech_support_requests r', [['support-a'], [86400000]]],
  ]);
  assert.match(calls[2]!.sql, /THEN r\.reconfirm_range ELSE r\.support_range END/, 'moved again while flagged, it moves on from the kept time');
  assert.deepEqual(calls.slice(3).map(call => call.values), [
    ['coordinator-1', 'venue_booking', 'booking-a', 'event-1', 'Reconfirmation required: date or time changed, attendance above capacity'],
    ['coordinator-1', 'equipment_reservation', 'reservation-a', 'event-1', 'Reconfirmation required: date or time changed'],
    ['coordinator-1', 'tech_support_request', 'support-a', 'event-1', 'Reconfirmation required: date or time changed'],
  ]);
});

test('applyArrangementImpact writes nothing when nothing is affected', async () => {
  const calls: string[] = [];
  await applyArrangementImpact(async sql => { calls.push(sql); return { rows: [] }; }, 'coordinator-1', 'event-1', { affected: false, bookings: [], reservations: [], supports: [] });
  assert.deepEqual(calls, []);
});

// `supportOnly`: the Event has a staffed support request and no equipment (T-103).
type Script = { event?: boolean; rejected?: boolean; registered?: number; status?: string; staff?: boolean; supportOnly?: boolean };
function scriptedClient(script: Script = {}) {
  const sql: string[] = [];
  const notices: unknown[][] = [];
  let edited = false;
  let attendance = 80;
  const range = () => edited
    ? { starts_at: new Date('2026-11-20T01:00:00Z'), ends_at: new Date('2026-11-20T09:00:00Z') }
    : { starts_at: new Date('2026-11-15T01:00:00Z'), ends_at: new Date('2026-11-15T09:00:00Z') };
  const answer = (text: string, values: unknown[] = []): unknown[] => {
    // The session row follows the Event edit, as the 0014 sync trigger does.
    if (text.startsWith('UPDATE events') && text.includes('expected_attendance')) attendance = values[0] as number;
    if (text.startsWith('INSERT INTO notifications')) { notices.push(values); return []; }
    if (text.includes('FROM tech_staff_assignments a')) return script.staff ? [{ staff_id: 'tech-1' }, ...(script.supportOnly ? [{ staff_id: 'tech-2' }] : [])] : [];
    // tech-gone is assigned but no longer an active technician.
    if (text.includes('FROM tech_staff_assignments WHERE request_id')) return [{ staff_id: 'tech-2' }, { staff_id: 'tech-gone' }];
    if (text.includes('FROM tech_support_requests')) return script.supportOnly ? [{ id: 'support-a', description: 'Sound desk', ...range() }] : [];
    if (text.startsWith('SELECT id FROM users WHERE id=ANY')) return (values[0] as string[]).map(id => ({ id }));
    if (text.includes('FOR UPDATE')) return script.event === false ? [] : [{ id: 'event-1' }];
    if (text.includes('AND organiser_id = $2')) return script.rejected ? [{ status: 'rejected' }] : [];
    if (text.includes('SELECT id, status, organiser_id')) return [{ id: 'event-1', status: 'planning', organiser_id: 'organiser-1', coordinator_id: coordinator.id, client_org_id: 'org-1' }];
    if (text.includes('AS start_at')) return [{ start_at: range().starts_at, end_at: range().ends_at }];
    if (text.startsWith('UPDATE events')) { edited ||= text.includes('event_range'); return []; }
    if (text.includes('FROM events WHERE id = $1')) return [range()];
    // E09-S02 eventCapacity(): the one Session holds the 200-seat booking, and
    // every registration selects it (T-85), so both counts are the same.
    if (text.includes('AS session_capacity')) return [{ session_id: 'session-a', session_capacity: 200, registered: script.registered ?? 0 }];
    if (text.includes('AS registered FROM event_registrations')) return [{ registered: script.registered ?? 0 }];
    if (text.includes('FROM sessions')) return [{ id: 'session-a', ...range(), expected_attendance: attendance }];
    if (text.includes('FROM venue_bookings')) return [{ id: 'booking-a', session_id: 'session-a', venue_id: 'hall', venue_name: 'Riverside Hall', headcount: null, capacity: 200 }];
    if (text.includes('FROM equipment_reservations')) return script.supportOnly ? [] : [{ id: 'reservation-a', session_id: 'session-a', equipment_id: 'projector', equipment_name: 'Projector' }];
    // captureEventAudience: no linked people, so no notification rows follow.
    if (text.includes('AS public_name')) return [{ id: 'event-1', title: 'Tech Conference 2026', public_name: null, status: script.status ?? 'planning', ...range(), organiser_id: null, coordinator_id: null }];
    if (text.includes('transaction_timestamp()')) return [{ now: new Date('2026-10-22T10:00:00Z') }];
    return [];
  };
  const client = {
    query: async (text: string, values?: unknown[]) => { sql.push(text); return { rows: answer(text, values) }; },
    release: () => undefined,
  } as unknown as PoolClient;
  // Venue Staff come from the trusted resolver; record which venues it is asked about.
  const resolved: string[][] = [];
  const options = { resolveVenueStaff: async (_client: PoolClient, venueIds: readonly string[]) => { resolved.push([...venueIds]); return script.staff ? ['venue-1'] : []; } };
  return { client, sql, notices, resolved, options };
}

test('TC_E10S02_03: a date change previews the affected booking and equipment, then rolls back', async () => {
  const { client, sql } = scriptedClient({ registered: 250 });
  const preview = await previewEventChangeWith(client, coordinator, 'EVT-1', { startAt: '2026-11-20T01:00:00Z', endAt: '2026-11-20T09:00:00Z' });
  assert.deepEqual(preview.impact.bookings.map(b => [b.venueName, b.reasons]), [['Riverside Hall', ['time']]]);
  assert.deepEqual(preview.impact.reservations.map(r => [r.equipmentName, r.reasons]), [['Projector', ['time']]]);
  assert.deepEqual(preview.overSubscription, [
    { scope: 'session', sessionId: 'session-a', registered: 250, capacity: 200 },
    { scope: 'event', sessionId: null, registered: 250, capacity: 200 },
  ]);
  const savepoint = sql.indexOf('SAVEPOINT event_change_preview');
  const update = sql.findIndex(text => text.startsWith('UPDATE events'));
  assert.ok(savepoint >= 0 && savepoint < update, 'the edit runs only inside the savepoint');
  assert.equal(sql.at(-1), 'ROLLBACK TO SAVEPOINT event_change_preview', 'the edit is discarded last');
});

test('TC_E10S02_02: a description-only preview affects nothing', async () => {
  const { client } = scriptedClient();
  const preview = await previewEventChangeWith(client, coordinator, 'EVT-1', { description: 'New wording' });
  const check = { impact: { affected: false, bookings: [], reservations: [], supports: [] }, overSubscription: [] };
  assert.deepEqual(preview, { ...check, revision: changeRevision(check) });
});

test('a refused edit is refused in preview too, and the savepoint is still rolled back', async () => {
  const { client, sql } = scriptedClient();
  await assert.rejects(previewEventChangeWith(client, coordinator, 'EVT-1', { notAField: 1 }), (error: AccessError) => error.status === 400);
  assert.equal(sql.at(-1), 'ROLLBACK TO SAVEPOINT event_change_preview');
});

test('an unknown Event or a rejected request is refused before any savepoint', async () => {
  const missing = scriptedClient({ event: false });
  await assert.rejects(previewEventChangeWith(missing.client, coordinator, 'nope', { description: 'x' }), (error: AccessError) => error.status === 403);
  const rejected = scriptedClient({ rejected: true });
  await assert.rejects(previewEventChangeWith(rejected.client, coordinator, 'EVT-1', { description: 'x' }), RejectedRequestError);
  assert.ok(![...missing.sql, ...rejected.sql].includes('SAVEPOINT event_change_preview'));
});

test('previewEventChange wraps the preview in its own transaction', async () => {
  const { client, sql } = scriptedClient();
  const pool = { connect: async () => client } as unknown as Pool;
  await previewEventChange(pool, coordinator, 'EVT-1', { description: 'New wording' });
  assert.equal(sql[0], 'BEGIN');
  assert.equal(sql.at(-1), 'COMMIT', 'the savepoint already discarded the edit, so committing saves nothing');
});

const poolFor = (client: PoolClient) => ({ connect: async () => client }) as unknown as Pool;

test('TC_E10S02_05: saving a date change flags the booking and equipment in the same transaction', async () => {
  const { client, sql } = scriptedClient({ registered: 250 });
  const result = await updateEventInformationWithNotifications(poolFor(client), coordinator, 'EVT-1', { startAt: '2026-11-20T01:00:00Z', endAt: '2026-11-20T09:00:00Z' });
  assert.equal(result.updated, true);
  assert.deepEqual(result.impact.bookings.map(b => b.id), ['booking-a']);
  assert.deepEqual(result.impact.reservations.map(r => r.id), ['reservation-a']);
  assert.deepEqual(result.overSubscription, [
    { scope: 'session', sessionId: 'session-a', registered: 250, capacity: 200 },
    { scope: 'event', sessionId: null, registered: 250, capacity: 200 },
  ]);
  const update = sql.findIndex(text => text.startsWith('UPDATE events'));
  const flagBooking = sql.findIndex(text => text.startsWith('UPDATE venue_bookings SET requires_reconfirmation'));
  const flagReservation = sql.findIndex(text => text.startsWith('UPDATE equipment_reservations SET requires_reconfirmation'));
  assert.ok(update < flagBooking && flagBooking < flagReservation, 'flags follow the edit');
  assert.ok(sql.includes('SELECT transaction_timestamp() AS now'), 'the existing date-change notice still runs');
  assert.equal(sql.at(-1), 'COMMIT');
  assert.ok(!sql.includes('SAVEPOINT event_change_preview'), 'saving is not a preview');
});

test('TC_E10S02_02: saving a description-only edit flags nothing and sends no date notice', async () => {
  const { client, sql } = scriptedClient();
  const result = await updateEventInformationWithNotifications(poolFor(client), coordinator, 'EVT-1', { description: 'New wording' });
  assert.equal(result.impact.affected, false);
  assert.ok(!sql.some(text => text.includes('requires_reconfirmation = true')));
  assert.ok(!sql.includes('SELECT transaction_timestamp() AS now'));
});

test('a draft date change sends no generic date notice; an unknown Event is refused', async () => {
  const draft = scriptedClient({ status: 'draft', staff: true });
  await updateEventInformationWithNotifications(poolFor(draft.client), coordinator, 'EVT-1', { startAt: '2026-11-20T01:00:00Z', endAt: '2026-11-20T09:00:00Z' }, draft.options);
  assert.ok(!draft.notices.some(values => String(values[3]).includes('Event date, time changed')));
  const missing = scriptedClient({ event: false });
  await assert.rejects(updateEventInformationWithNotifications(poolFor(missing.client), coordinator, 'nope', { description: 'x' }), (error: AccessError) => error.status === 403);
  assert.equal(missing.sql.at(-1), 'ROLLBACK');
});

const byRecipient = (notices: unknown[][]) => {
  const seen = new Map<string, { ids: Set<unknown>; first: string }>();
  for (const values of notices) {
    const user = String(values[0]);
    const entry = seen.get(user) ?? { ids: new Set(), first: String(values[3]) };
    entry.ids.add(values[4]);
    seen.set(user, entry);
  }
  return seen;
};

test('TC_E10S02_06: a date change tells the affected Venue Staff and the assigned Technical Support Staff to reconfirm', async () => {
  const { client, notices, resolved, options } = scriptedClient({ staff: true });
  await updateEventInformationWithNotifications(poolFor(client), coordinator, 'EVT-1', { startAt: '2026-11-20T01:00:00Z', endAt: '2026-11-20T09:00:00Z' }, options);
  assert.deepEqual(resolved[1], ['hall'], 'Venue Staff are looked up for the flagged venue only');
  const recipients = byRecipient(notices);
  assert.deepEqual([...recipients.keys()].sort(), ['tech-1', 'venue-1']);
  for (const [user, { ids, first }] of recipients) {
    assert.match(first, /date or time\) means venue bookings, equipment reservations or Technical Support requests need reconfirmation/, user);
    assert.equal(ids.size, 1, `${user}: the generic date notice reuses the same notification id, so it is not sent twice`);
  }
});

test('TC_E10S02_06: with no equipment flagged, only the technicians on a flagged support request are told to reconfirm (T-103)', async () => {
  const { client, notices, options } = scriptedClient({ staff: true, supportOnly: true });
  const result = await updateEventInformationWithNotifications(poolFor(client), coordinator, 'EVT-1', { startAt: '2026-11-20T01:00:00Z', endAt: '2026-11-20T09:00:00Z' }, options);
  assert.deepEqual(result.impact.supports.map(support => [support.id, support.reasons]), [['support-a', ['time']]]);
  assert.deepEqual(result.impact.reservations, []);
  const recipients = byRecipient(notices);
  for (const user of ['venue-1', 'tech-2']) assert.match(recipients.get(user)!.first, /need reconfirmation/, user);
  assert.ok(!recipients.get('tech-1')!.first.includes('need reconfirmation'), 'tech-1 is on no flagged request: the date notice only');
  assert.ok(!recipients.has('tech-gone'), 'an inactive technician is not told');
});

test('a capacity-only change notifies the Venue Staff alone, with no date notice', async () => {
  const { client, notices, options } = scriptedClient({ staff: true });
  const result = await updateEventInformationWithNotifications(poolFor(client), coordinator, 'EVT-1', { expectedAttendance: 250 }, options);
  assert.deepEqual(result.impact.bookings.map(booking => booking.reasons), [['capacity']]);
  assert.deepEqual(result.impact.reservations, []);
  const recipients = byRecipient(notices);
  assert.deepEqual([...recipients.keys()], ['venue-1'], 'no equipment is affected, so Technical Support is not told');
  assert.match(recipients.get('venue-1')!.first, /attendance above capacity/);
  assert.ok(!notices.some(values => String(values[3]).includes('Event date, time changed')));
});

// #380 review: the preview's revision binds the save to what was shown.
test('the revision is the same for the same arrangements and changes with any of them', () => {
  const booking = { id: 'booking-a', sessionId: 'session-a', venueId: 'hall', venueName: 'Hall A', reasons: ['time' as const], governingHeadcount: 80, capacity: 200 };
  const check = { impact: { affected: true, bookings: [booking], reservations: [] }, overSubscription: [] };
  assert.equal(changeRevision(check), changeRevision(structuredClone(check)));
  assert.match(changeRevision(check), /^[0-9a-f]{32}$/);
  const variants = [
    { ...check, impact: { ...check.impact, bookings: [booking, { ...booking, id: 'booking-b', venueName: 'Hall B' }] } },
    { ...check, impact: { ...check.impact, bookings: [{ ...booking, reasons: ['time' as const, 'capacity' as const] }] } },
    { ...check, impact: { ...check.impact, bookings: [{ ...booking, capacity: 150 }] } },
    { ...check, impact: { ...check.impact, reservations: [{ id: 'reservation-a', sessionId: 'session-a', equipmentId: 'projector', equipmentName: 'Projector', reasons: ['time' as const] }] } },
    { ...check, overSubscription: [{ scope: 'event' as const, sessionId: null, registered: 201, capacity: 200 }] },
  ];
  for (const variant of variants) assert.notEqual(changeRevision(variant), changeRevision(check), JSON.stringify(variant));
});

test('TC_E10S02_03: the preview carries the revision of what it lists', async () => {
  const { client } = scriptedClient({ registered: 250 });
  const preview = await previewEventChangeWith(client, coordinator, 'EVT-1', { startAt: '2026-11-20T01:00:00Z', endAt: '2026-11-20T09:00:00Z' });
  assert.equal(preview.revision, changeRevision({ impact: preview.impact, overSubscription: preview.overSubscription }));
});

test('a save with the preview revision goes through and returns the same revision', async () => {
  const move = { startAt: '2026-11-20T01:00:00Z', endAt: '2026-11-20T09:00:00Z' };
  const preview = await previewEventChangeWith(scriptedClient({ registered: 250 }).client, coordinator, 'EVT-1', move);
  const { client, sql } = scriptedClient({ registered: 250 });
  const result = await updateEventInformationWithNotifications(poolFor(client), coordinator, 'EVT-1', move, { reviewed: preview.revision });
  assert.equal(result.revision, preview.revision);
  assert.ok(sql.some(text => text.startsWith('UPDATE venue_bookings SET requires_reconfirmation')));
  assert.equal(sql.at(-1), 'COMMIT');
});

test('a save with a stale revision is refused with the fresh list, before anything is flagged or sent', async () => {
  const { client, sql, notices, options } = scriptedClient({ registered: 250, staff: true });
  const refused = await updateEventInformationWithNotifications(poolFor(client), coordinator, 'EVT-1',
    { startAt: '2026-11-20T01:00:00Z', endAt: '2026-11-20T09:00:00Z' }, { ...options, reviewed: 'revision-shown-earlier' })
    .then(() => null, (error: unknown) => error);
  assert.ok(refused instanceof ArrangementsChangedError);
  assert.equal(refused.status, 409);
  assert.equal(refused.message, 'arrangements_changed');
  assert.deepEqual(refused.preview.impact.bookings.map(booking => booking.id), ['booking-a']);
  assert.equal(refused.preview.revision, changeRevision({ impact: refused.preview.impact, overSubscription: refused.preview.overSubscription }));
  assert.ok(!sql.some(text => text.includes('requires_reconfirmation = true')), 'nothing flagged');
  assert.ok(!sql.some(text => text.startsWith('INSERT INTO audit_logs') && text.includes('requires_reconfirmation')), 'nothing logged for arrangements');
  assert.deepEqual(notices, [], 'nobody notified');
  assert.equal(sql.at(-1), 'ROLLBACK', 'the edit itself rolls back');
});
