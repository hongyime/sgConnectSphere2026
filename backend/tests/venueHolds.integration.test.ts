// E06-S05 (SCRUM-49) against PostgreSQL: a hold on a free venue, the clash
// refusals, the calendar and venue search treating a live hold as taken and an
// expired one as free, converting, releasing and extending, the expiry job and
// its single notice, maintenance blocks and venue retirement seeing holds, and
// simultaneous holds on one venue. Needs TEST_DATABASE_URL pointing at a
// disposable local database (see tests/helpers/loginDatabase.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import {
  convertHold, expireHolds, extendHold, listEventHolds, listLiveHolds, placeHold, releaseHold,
} from '../src/modules/venueBooking/holds.js';
import { getVenueCalendar } from '../src/modules/venueBooking/calendar.js';
import { venueSearch } from '../src/modules/venueBooking/search.js';
import { createVenueBlock } from '../src/modules/venueBooking/blocks.js';
import { retireVenue } from '../src/modules/venueBooking/catalogue.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import type { Query } from '../src/modules/eventVisibility/service.js';

const HOUR = 60 * 60 * 1000;

async function fixture() {
  const f = await loginDatabase();
  const q: Query = (sql, values) => f.pool.query(sql, values);
  const ids = { org: randomUUID(), organiser: randomUUID(), staff: randomUUID(), coordA: randomUUID(), coordB: randomUUID(), hall: randomUUID(), studio: randomUUID() };
  await q(`INSERT INTO client_organisations (id, name) VALUES ($1, 'Synthetic organisation')`, [ids.org]);
  for (const [id, role, name] of [
    [ids.organiser, 'event_organiser', 'Organiser'], [ids.staff, 'venue_staff', 'Venue Staff'],
    [ids.coordA, 'event_coordinator', 'Coord A'], [ids.coordB, 'event_coordinator', 'Coord B'],
  ] as const) {
    await q(`INSERT INTO users (id, client_org_id, email, password_hash, full_name, role) VALUES ($1, $2, $3, 'unused', $4, $5)`,
      [id, role === 'event_organiser' ? ids.org : null, `${id}@example.test`, name, role]);
  }
  for (const [id, name] of [[ids.hall, 'Riverside Hall'], [ids.studio, 'Riverside Studio']]) {
    await q(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at) VALUES ($1, $2, 'Test wing', 300, '08:00', '22:00')`, [id, name]);
  }
  const as = (id: string, role: AuthenticatedUser['role']): AuthenticatedUser =>
    ({ id, email: `${id}@example.test`, role, isActive: true, failedLoginCount: 0 });
  async function event(code: string, title: string, coordinator: string, range: string, status = 'planning') {
    const id = randomUUID();
    await q(`INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::tstzrange, 100)`, [id, code, ids.organiser, coordinator, ids.org, title, status, range]);
    return id;
  }
  async function available(day: string) {
    const params = new URLSearchParams({ search: '1', start: `${day}T09:00:00+08:00`, end: `${day}T17:00:00+08:00`, attendance: '50', q: 'Riverside Hall' });
    const result = await venueSearch(q, as(ids.coordA, 'event_coordinator'), params) as { venues?: Array<{ id: string; available: boolean }> };
    assert.ok(result.venues, `venue search failed: ${JSON.stringify(result)}`);
    return result.venues.find(venue => venue.id === ids.hall)?.available;
  }
  const row = async (id: string) => (await q<{ status: string; expires_at: Date | null }>(
    `SELECT status::text, expires_at FROM venue_bookings WHERE id = $1`, [id])).rows[0]!;
  return {
    ...f, q, ids, event, available, row,
    coordA: as(ids.coordA, 'event_coordinator'), coordB: as(ids.coordB, 'event_coordinator'), staff: as(ids.staff, 'venue_staff'),
  };
}
const holdId = (result: { body: unknown }) => (result.body as { hold: { id: string } }).hold.id;

test('TC_E06S05_01 TC_E06S05_03 TC_E06S05_04 TC_E06S05_07 holds, clashes, convert, release and extend against PostgreSQL', async () => {
  const f = await fixture();
  try {
    const conference = await f.event('EVT-TC', 'Tech Conference 2027', f.ids.coordA, '[2027-03-10 09:00+08,2027-03-10 17:00+08)');
    const charity = await f.event('EVT-CR', 'Charity Run', f.ids.coordB, '[2027-03-10 13:00+08,2027-03-10 20:00+08)');
    const gala = await f.event('EVT-GA', 'Gala', f.ids.coordB, '[2027-03-11 09:00+08,2027-03-11 17:00+08)');

    // TC_E06S05_03: a free venue is held for the event's period, expiring in 48 hours.
    assert.equal(await f.available('2027-03-10'), true);
    const before = Date.now();
    const placed = await placeHold(f.pool, f.coordA, { event: 'EVT-TC', venue: f.ids.hall });
    assert.equal(placed.status, 201);
    const hold = holdId(placed);
    const saved = await f.row(hold);
    assert.equal(saved.status, 'tentative');
    assert.ok(Math.abs(saved.expires_at!.getTime() - (before + 48 * HOUR)) < 60_000);
    assert.equal(await f.available('2027-03-10'), false);
    const calendar = await getVenueCalendar(f.q, f.coordA, f.ids.hall, '2027-03-10', '2027-03-10');
    const held = calendar.entries.find(entry => entry.kind === 'booking') as { state: string; event?: { code: string } };
    assert.deepEqual([held.state, held.event?.code], ['tentative', 'EVT-TC']);

    // TC_E06S05_01: another Coordinator's overlapping hold is refused and names the hold in the way.
    const refused = await placeHold(f.pool, f.coordB, { event: 'EVT-CR', venue: f.ids.hall });
    assert.equal(refused.status, 409);
    assert.equal((refused.body as { error: string }).error,
      'This venue already has a tentative hold for EVT-TC Tech Conference 2027 from 10 Mar 2027, 9:00 am to 10 Mar 2027, 5:00 pm.');
    // A pending request or a maintenance block is in the way too.
    await f.q(`INSERT INTO venue_bookings (venue_id, event_id, booking_range, status) VALUES ($1, $2, '[2027-03-11 08:00+08,2027-03-11 10:00+08)', 'pending')`, [f.ids.studio, charity]);
    const onRequest = await placeHold(f.pool, f.coordB, { event: 'EVT-GA', venue: f.ids.studio, startsAt: '2027-03-11T09:00:00+08:00', endsAt: '2027-03-11T12:00:00+08:00' });
    assert.match((onRequest.body as { error: string }).error, /^This venue already has a pending booking request for EVT-CR Charity Run/);
    await f.q(`INSERT INTO venue_blocks (venue_id, block_range, reason) VALUES ($1, '[2027-03-11 12:00+08,2027-03-12 00:00+08)', 'Floor polishing')`, [f.ids.studio]);
    const onBlock = await placeHold(f.pool, f.coordB, { event: 'EVT-GA', venue: f.ids.studio, startsAt: '2027-03-11T13:00:00+08:00', endsAt: '2027-03-11T15:00:00+08:00' });
    assert.deepEqual(onBlock, { status: 409, body: { error: 'This venue is blocked for that period (Floor polishing).' } });
    // A different venue, or the same venue after the hold ends, is fine.
    const studioOk = await placeHold(f.pool, f.coordB, { event: 'EVT-CR', venue: f.ids.studio });
    assert.equal(studioOk.status, 201);
    const charityAfter = await placeHold(f.pool, f.coordB, { event: 'EVT-CR', venue: f.ids.hall, startsAt: '2027-03-10T17:00:00+08:00', endsAt: '2027-03-10T20:00:00+08:00' });
    assert.equal(charityAfter.status, 201);

    // Coord B can't touch Coord A's hold.
    await assert.rejects(releaseHold(f.pool, f.coordB, { event: 'EVT-TC', hold }), { status: 403 });

    // TC_E06S05_07: Venue Staff extend it; the change is logged with old and new values and who made it.
    const oldExpiry = (await f.row(hold)).expires_at!;
    const newExpiry = new Date(oldExpiry.getTime() + 24 * HOUR).toISOString();
    assert.deepEqual(await extendHold(f.pool, f.staff, { hold, expiresAt: newExpiry }), { status: 200, body: { hold: { id: hold, expiresAt: newExpiry } } });
    const log = (await f.q<{ actor_id: string; old_value: string; new_value: string }>(`SELECT actor_id, old_value, new_value FROM audit_logs
      WHERE event_id = $1 AND action = 'Tentative hold on Riverside Hall extended'`, [conference])).rows;
    assert.deepEqual(log, [{ actor_id: f.ids.staff, old_value: oldExpiry.toISOString(), new_value: newExpiry }]);
    assert.deepEqual((await listLiveHolds(f.q, f.staff)).holds.map(h => [h.eventCode, h.venueName]),
      [['EVT-CR', 'Riverside Studio'], ['EVT-CR', 'Riverside Hall'], ['EVT-TC', 'Riverside Hall']]);

    // TC_E06S05_04: submitting the booking request makes it pending with no expiry.
    assert.equal((await convertHold(f.pool, f.coordA, { event: 'EVT-TC', hold })).status, 200);
    assert.deepEqual(await f.row(hold), { status: 'pending', expires_at: null });
    assert.equal(await f.available('2027-03-10'), false);
    assert.equal((await listEventHolds(f.q, f.coordA, 'EVT-TC')).holds.length, 0);

    // Scenario 4: releasing a hold frees the period.
    const charityHold = holdId(charityAfter);
    assert.deepEqual(await releaseHold(f.pool, f.coordB, { event: 'EVT-CR', hold: charityHold }), { status: 200, body: { released: true } });
    assert.equal((await f.row(charityHold)).status, 'released');
    const replaced = await placeHold(f.pool, f.coordB, { event: 'EVT-GA', venue: f.ids.hall, startsAt: '2027-03-10T17:00:00+08:00', endsAt: '2027-03-10T20:00:00+08:00' });
    assert.equal(replaced.status, 201);
    void gala;
  } finally {
    await f.close();
  }
});

test('TC_E06S05_05 TC_E06S05_06 an expired hold frees the venue at once; the job marks it expired and notifies the Coordinator once', async () => {
  const f = await fixture();
  try {
    const conference = await f.event('EVT-TC', 'Tech Conference 2027', f.ids.coordA, '[2027-04-10 09:00+08,2027-04-10 17:00+08)');
    await f.event('EVT-CR', 'Charity Run', f.ids.coordB, '[2027-04-10 13:00+08,2027-04-10 20:00+08)');
    // A chosen expiry outside 1 hour to 14 days is refused (O-31).
    const tooLong = await placeHold(f.pool, f.coordA, { event: 'EVT-TC', venue: f.ids.hall, expiresAt: new Date(Date.now() + 15 * 24 * HOUR).toISOString() });
    assert.equal(tooLong.status, 400);
    const hold = holdId(await placeHold(f.pool, f.coordA, { event: 'EVT-TC', venue: f.ids.hall, expiresAt: new Date(Date.now() + 2 * HOUR).toISOString() }));
    assert.equal(await f.available('2027-04-10'), false);

    // The expiry passes. Before the job runs, the hold no longer holds the venue anywhere.
    await f.q(`UPDATE venue_bookings SET expires_at = now() - interval '1 minute' WHERE id = $1`, [hold]);
    assert.equal(await f.available('2027-04-10'), true);
    const calendar = await getVenueCalendar(f.q, f.coordA, f.ids.hall, '2027-04-10', '2027-04-10');
    assert.equal(calendar.entries.some(entry => entry.kind === 'booking'), false);
    assert.deepEqual((await listEventHolds(f.q, f.coordA, 'EVT-TC')).holds.map(h => h.status), ['expired']);
    await assert.rejects(convertHold(f.pool, f.coordA, { event: 'EVT-TC', hold }), { status: 409 });
    await assert.rejects(extendHold(f.pool, f.staff, { hold, expiresAt: new Date(Date.now() + 24 * HOUR).toISOString() }), { status: 409 });
    // Another Coordinator can now hold it.
    assert.equal((await placeHold(f.pool, f.coordB, { event: 'EVT-CR', venue: f.ids.hall })).status, 201);

    // TC_E06S05_06: the job marks it expired and sends one in-app notice with an email delivery.
    assert.deepEqual(await expireHolds(f.pool), { holdsExpired: 1, notified: 1 });
    assert.equal((await f.row(hold)).status, 'expired');
    const notices = (await f.q<{ id: string; title: string; message: string }>(`SELECT id, title, message FROM notifications WHERE user_id = $1`, [f.ids.coordA])).rows;
    assert.equal(notices.length, 1);
    assert.equal(notices[0]!.title, 'Tentative hold expired');
    assert.match(notices[0]!.message, /^Your tentative hold on Riverside Hall for EVT-TC Tech Conference 2027 expired at .+\. The venue is free for other requests\.$/);
    assert.equal((await f.q(`SELECT 1 FROM notification_deliveries WHERE notification_id = $1 AND channel = 'email'`, [notices[0]!.id])).rowCount, 1);
    assert.equal((await f.q(`SELECT 1 FROM audit_logs WHERE event_id = $1 AND action = 'Tentative hold on Riverside Hall expired' AND actor_id IS NULL`, [conference])).rowCount, 1);
    // Running again finds nothing and sends nothing more.
    assert.deepEqual(await expireHolds(f.pool), { holdsExpired: 0, notified: 0 });
    assert.equal((await f.q(`SELECT 1 FROM notifications WHERE user_id = $1`, [f.ids.coordA])).rowCount, 1);

    // Scenario 9: a job one second before the expiry leaves the hold; a job exactly at it expires the hold.
    const edge = holdId(await placeHold(f.pool, f.coordB, { event: 'EVT-CR', venue: f.ids.studio, expiresAt: new Date(Date.now() + 3 * HOUR).toISOString() }));
    const expiry = (await f.row(edge)).expires_at!;
    assert.deepEqual(await expireHolds(f.pool, new Date(expiry.getTime() - 1000)), { holdsExpired: 0, notified: 0 });
    assert.equal((await f.row(edge)).status, 'tentative');
    assert.deepEqual(await expireHolds(f.pool, expiry), { holdsExpired: 1, notified: 1 });
    assert.equal((await f.row(edge)).status, 'expired');
  } finally {
    await f.close();
  }
});

test('maintenance blocks notify a live hold\'s Coordinator; a venue with a live hold cannot be retired', async () => {
  const f = await fixture();
  try {
    const conference = await f.event('EVT-TC', 'Tech Conference 2027', f.ids.coordA, '[2027-05-10 09:00+08,2027-05-10 17:00+08)');
    const hold = holdId(await placeHold(f.pool, f.coordA, { event: 'EVT-TC', venue: f.ids.hall }));
    const retire = await retireVenue(f.pool, f.staff, f.ids.hall);
    assert.equal(retire.status, 409);
    const blocked = await createVenueBlock(f.pool, f.staff, f.ids.hall, { from: '2027-05-10', to: '2027-05-10', reason: 'Roof repair' });
    assert.deepEqual([blocked.status, (blocked.body as { notifiedEventCount: number }).notifiedEventCount], [201, 1]);
    assert.equal((await f.q(`SELECT 1 FROM notifications WHERE user_id = $1 AND event_id = $2`, [f.ids.coordA, conference])).rowCount, 1);
    // An expired hold neither blocks retirement nor gets a block notice.
    await f.q(`UPDATE venue_bookings SET expires_at = now() - interval '1 minute' WHERE id = $1`, [hold]);
    const later = await createVenueBlock(f.pool, f.staff, f.ids.hall, { from: '2027-05-11', to: '2027-05-11', reason: 'Painting' });
    assert.equal((later.body as { notifiedEventCount: number }).notifiedEventCount, 0);
    assert.equal((await retireVenue(f.pool, f.staff, f.ids.hall)).status, 200);
  } finally {
    await f.close();
  }
});

test('two simultaneous holds on one venue and period: exactly one succeeds', async () => {
  const f = await fixture();
  try {
    for (let round = 0; round < 15; round++) {
      const day = String(round + 1).padStart(2, '0');
      await f.event(`EVT-A${day}`, `Event A ${day}`, f.ids.coordA, `[2027-06-${day} 09:00+08,2027-06-${day} 12:00+08)`);
      await f.event(`EVT-B${day}`, `Event B ${day}`, f.ids.coordB, `[2027-06-${day} 10:00+08,2027-06-${day} 13:00+08)`);
      const results = await Promise.all([
        placeHold(f.pool, f.coordA, { event: `EVT-A${day}`, venue: f.ids.hall }),
        placeHold(f.pool, f.coordB, { event: `EVT-B${day}`, venue: f.ids.hall }),
      ]);
      assert.deepEqual(results.map(r => r.status).sort(), [201, 409], `round ${round + 1}`);
    }
    assert.equal((await f.q<{ n: number }>(`SELECT count(*)::int AS n FROM venue_bookings WHERE status = 'tentative'`)).rows[0]!.n, 15);
  } finally {
    await f.close();
  }
});
