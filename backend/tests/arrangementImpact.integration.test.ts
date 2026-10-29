// Real-database tests for E10-S02 (SCRUM-71, backend subtask SCRUM-236):
// which Session arrangements a change affects, the preview before saving,
// the reconfirmation flags and audit rows, the staff notices, and the
// over-subscription warning. Each test owns a fresh schema in a loopback
// PostgreSQL database (loginDatabase), with every migration applied.
//
// Traceability (docs/testing/README.md): story E10-S02 / SCRUM-71; cases
// TC_E10S02_01 to TC_E10S02_09 in docs/testing/cases/E10.md; code in
// backend/src/modules/changeManagement/ (arrangementImpact.ts, eventChange.ts)
// and eventNotifications/informationChange.ts, branch
// feature/SCRUM-71-arrangement-impact-changes.
//
// No app action edits one Session of a multi-Session Event yet (E04-S02,
// SCRUM-39). The two-Session cases therefore change that Session in SQL and
// run the same impact functions the Coordinator's save runs; the Event-level
// cases go through the real save and preview.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import { assessArrangementImpact, loadArrangementSnapshot } from '../src/modules/changeManagement/arrangementImpact.js';
import { applyArrangementImpact, loadOverSubscription, previewEventChange } from '../src/modules/changeManagement/eventChange.js';
import { eventCapacity } from '../src/modules/attendeeRegistration/capacity.js';
import { updateEventInformationWithNotifications } from '../src/modules/eventNotifications/informationChange.js';

type SessionSpec = { range: string; attendance: number; capacity: number; headcount?: number };

async function fixture(sessions: SessionSpec[]) {
  const db = await loginDatabase();
  const q = (sql: string, values: unknown[] = []) => db.pool.query(sql, values);
  try {
    const org = randomUUID();
    await q("INSERT INTO client_organisations(id,name) VALUES($1,'E10-S02 test')", [org]);
    const user = async (role: string): Promise<AuthenticatedUser> => {
      const id = randomUUID();
      await q("INSERT INTO users(id,email,password_hash,full_name,role,client_org_id) VALUES($1,$2,'synthetic','E10-S02 user',$3,$4)",
        [id, `${id}@example.test`, role, org]);
      return { id, email: `${id}@example.test`, role: role as AuthenticatedUser['role'], clientOrgId: org, isActive: true, failedLoginCount: 0 };
    };
    const organiser = await user('event_organiser');
    const coordinator = await user('event_coordinator');
    const tech = await user('technical_support_staff');
    const otherVenueStaff = await user('venue_staff');
    const event = randomUUID();
    // The Event envelope spans every Session; inserting it creates Session A (0014).
    await q(`INSERT INTO events(id,event_code,title,description,organiser_id,coordinator_id,client_org_id,status,event_range,expected_attendance)
      VALUES($1,'EVT-E10S02','Tech Conference 2026','Original description',$2,$3,$4,'planning','[2027-03-12 00:00Z,2027-03-14 00:00Z)',$5)`,
    [event, organiser.id, coordinator.id, org, sessions[0].attendance]);
    const sessionA = (await q('SELECT id FROM sessions WHERE event_id=$1', [event])).rows[0].id as string;
    const equipment = randomUUID();
    await q("INSERT INTO equipment(id,name,category,total_quantity) VALUES($1,'Projector','Test',10)", [equipment]);
    const support = randomUUID();
    await q("INSERT INTO tech_support_requests(id,event_id,support_range,requested_by) VALUES($1,$2,'[2027-03-12 00:00Z,2027-03-14 00:00Z)',$3)", [support, event, coordinator.id]);
    await q("INSERT INTO tech_staff_assignments(request_id,event_id,staff_id,assignment_range) VALUES($1,$2,$3,'[2027-03-12 00:00Z,2027-03-14 00:00Z)')", [support, event, tech.id]);
    const made = [];
    for (const [index, spec] of sessions.entries()) {
      let session = sessionA;
      if (index === 0) await q('UPDATE sessions SET session_range=$2, expected_attendance=$3 WHERE id=$1', [session, spec.range, spec.attendance]);
      else {
        session = randomUUID();
        await q("INSERT INTO sessions(id,event_id,title,session_range,expected_attendance) VALUES($1,$2,'Session',$3,$4)", [session, event, spec.range, spec.attendance]);
      }
      const venue = randomUUID();
      const staff = await user('venue_staff');
      await q("INSERT INTO venues(id,name,location,max_capacity,opens_at,closes_at) VALUES($1,$2,'Test',$3,'00:00','23:59')", [venue, `Hall ${index + 1} ${venue}`, spec.capacity]);
      await q('INSERT INTO venue_staff_assignments(venue_id,staff_id) VALUES($1,$2)', [venue, staff.id]);
      const booking = (await q("INSERT INTO venue_bookings(event_id,session_id,venue_id,booking_range,status,headcount) VALUES($1,$2,$3,$4,'confirmed',$5) RETURNING id",
        [event, session, venue, spec.range, spec.headcount ?? null])).rows[0].id as string;
      const request = randomUUID();
      await q('INSERT INTO equipment_requests(id,event_id,session_id,equipment_id,quantity_requested,requested_by) VALUES($1,$2,$3,$4,2,$5)', [request, event, session, equipment, coordinator.id]);
      const reservation = (await q('INSERT INTO equipment_reservations(request_id,event_id,session_id,equipment_id,quantity_reserved,reservation_range,reserved_by) VALUES($1,$2,$3,$4,2,$5,$6) RETURNING id',
        [request, event, session, equipment, spec.range, tech.id])).rows[0].id as string;
      made.push({ session, venue, staff, booking, reservation });
    }
    const flags = async () => ({
      bookings: Object.fromEntries((await q('SELECT id, requires_reconfirmation FROM venue_bookings WHERE event_id=$1', [event])).rows.map(row => [row.id, row.requires_reconfirmation])),
      reservations: Object.fromEntries((await q('SELECT id, requires_reconfirmation FROM equipment_reservations WHERE event_id=$1', [event])).rows.map(row => [row.id, row.requires_reconfirmation])),
    });
    const audit = async () => (await q(`SELECT entity_type, entity_id, action FROM audit_logs
      WHERE event_id=$1 AND entity_type IN ('venue_booking','equipment_reservation') ORDER BY entity_type, entity_id`, [event])).rows;
    // Staff reconfirmation notices only; the Organiser's generic date notice is E11's.
    const notices = async () => (await q("SELECT user_id, message FROM notifications WHERE event_id=$1 AND message LIKE '%need reconfirmation%' ORDER BY user_id", [event])).rows as { user_id: string; message: string }[];
    // A Session-only change, made in SQL, assessed and flagged as the save would.
    const changeSession = async (session: string, set: string, values: unknown[]) => {
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        const query = (sql: string, params?: unknown[]) => client.query(sql, params);
        const before = await loadArrangementSnapshot(query, event);
        await client.query(`UPDATE sessions SET ${set} WHERE id=$1`, [session, ...values]);
        const impact = assessArrangementImpact(before, await loadArrangementSnapshot(query, event));
        await applyArrangementImpact(query, coordinator.id, event, impact);
        await client.query('COMMIT');
        return impact;
      } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    };
    return { db, q, event, organiser, coordinator, tech, otherVenueStaff, sessions: made, flags, audit, notices, changeSession };
  } catch (error) { await db.close(); throw error; }
}

const register = async (f: Awaited<ReturnType<typeof fixture>>, count: number, session: string) => {
  // Synthetic attendees, each Registered for the Event and the chosen Session (T-85).
  await f.q(`WITH people AS (
      INSERT INTO users(email,password_hash,full_name,role)
      SELECT 'attendee-' || gen_random_uuid() || '@example.test', 'synthetic', 'Attendee', 'attendee' FROM generate_series(1,$1) RETURNING id),
    registrations AS (
      INSERT INTO event_registrations(event_id,attendee_id,status) SELECT $2, id, 'registered' FROM people RETURNING id)
    INSERT INTO event_registration_sessions(registration_id,event_id,session_id) SELECT id, $2, $3 FROM registrations`, [count, f.event, session]);
};

const day = (date: string, from: string, to: string) => `[${date} ${from}Z,${date} ${to}Z)`;

test('TC_E10S02_01: Session A attendance above its capacity flags only Session A\'s booking (SQL Session change)', async () => {
  const f = await fixture([{ range: day('2027-03-12', '01:00', '03:00'), attendance: 80, capacity: 80 }, { range: day('2027-03-12', '05:00', '09:00'), attendance: 100, capacity: 120 }]);
  try {
    const [a, b] = f.sessions;
    const exactlyFull = await f.changeSession(b.session, 'expected_attendance=$2', [120]);
    assert.deepEqual(exactlyFull.bookings, [], 'Session B at exactly its 120 capacity is still sufficient (E05-S01 boundary)');
    const impact = await f.changeSession(a.session, 'expected_attendance=$2', [81]);
    assert.deepEqual(impact.bookings.map(booking => [booking.id, booking.reasons, booking.governingHeadcount, booking.capacity]), [[a.booking, ['capacity'], 81, 80]]);
    assert.deepEqual(impact.reservations, [], 'attendance does not affect equipment');
    assert.deepEqual(await f.flags(), { bookings: { [a.booking]: true, [b.booking]: false }, reservations: { [a.reservation]: false, [b.reservation]: false } });
    assert.deepEqual(await f.audit(), [{ entity_type: 'venue_booking', entity_id: a.booking, action: 'Reconfirmation required: attendance above capacity' }]);
  } finally { await f.db.close(); }
});

test('TC_E10S02_01: raising the Event attendance above the venue capacity flags the booking and notifies its Venue Staff (real save)', async () => {
  const f = await fixture([{ range: '[2027-03-12 00:00Z,2027-03-14 00:00Z)', attendance: 200, capacity: 200 }]);
  try {
    const [a] = f.sessions;
    const result = await updateEventInformationWithNotifications(f.db.pool, f.coordinator, f.event, { expectedAttendance: 250 });
    assert.deepEqual(result.impact.bookings.map(booking => [booking.id, booking.reasons]), [[a.booking, ['capacity']]]);
    assert.equal((await f.flags()).bookings[a.booking], true);
    const notices = await f.notices();
    assert.deepEqual(notices.map(notice => notice.user_id), [a.staff.id], 'only the Venue Staff of the flagged venue');
    assert.match(notices[0].message, /attendance above capacity\) means venue bookings or equipment reservations need reconfirmation/);
  } finally { await f.db.close(); }
});

test('TC_E10S02_07: a booking headcount governs over Session attendance; only the Session-governed booking is flagged (SQL Session change)', async () => {
  const f = await fixture([{ range: day('2027-03-12', '01:00', '03:00'), attendance: 70, capacity: 80, headcount: 60 }, { range: day('2027-03-12', '05:00', '09:00'), attendance: 70, capacity: 80 }]);
  try {
    const [a, b] = f.sessions;
    const first = await f.changeSession(a.session, 'expected_attendance=$2', [100]);
    assert.deepEqual(first.bookings, [], 'booking A keeps its 60 headcount, within 80');
    const second = await f.changeSession(b.session, 'expected_attendance=$2', [81]);
    assert.deepEqual(second.bookings.map(booking => [booking.id, booking.governingHeadcount]), [[b.booking, 81]]);
    assert.deepEqual((await f.flags()).bookings, { [a.booking]: false, [b.booking]: true });
  } finally { await f.db.close(); }
});

test('TC_E10S02_02: a description-only save flags nothing, logs nothing for arrangements and tells no staff', async () => {
  const f = await fixture([{ range: '[2027-03-12 00:00Z,2027-03-14 00:00Z)', attendance: 80, capacity: 200 }]);
  try {
    const result = await updateEventInformationWithNotifications(f.db.pool, f.coordinator, f.event, { description: 'New wording only' });
    assert.equal(result.impact.affected, false);
    assert.equal((await f.q('SELECT description FROM events WHERE id=$1', [f.event])).rows[0].description, 'New wording only');
    assert.deepEqual(Object.values((await f.flags()).bookings), [false]);
    assert.deepEqual(Object.values((await f.flags()).reservations), [false]);
    assert.deepEqual(await f.audit(), []);
    assert.deepEqual(await f.notices(), []);
  } finally { await f.db.close(); }
});

test('TC_E10S02_09: a description-only save on a two-Session Event flags no Session arrangement', async () => {
  const f = await fixture([{ range: day('2027-03-12', '01:00', '03:00'), attendance: 80, capacity: 80 }, { range: day('2027-03-13', '01:00', '03:00'), attendance: 80, capacity: 120 }]);
  try {
    const result = await updateEventInformationWithNotifications(f.db.pool, f.coordinator, f.event, { description: 'New wording only' });
    assert.equal(result.impact.affected, false);
    const flags = await f.flags();
    assert.deepEqual([...Object.values(flags.bookings), ...Object.values(flags.reservations)], [false, false, false, false]);
    assert.deepEqual(await f.audit(), []);
  } finally { await f.db.close(); }
});

test('TC_E10S02_03: the preview lists the affected booking and equipment, and saves, flags, logs and notifies nothing', async () => {
  const f = await fixture([{ range: '[2027-03-12 00:00Z,2027-03-14 00:00Z)', attendance: 80, capacity: 200 }]);
  try {
    const [a] = f.sessions;
    const state = async () => ({
      event: (await f.q('SELECT event_range::text, description FROM events WHERE id=$1', [f.event])).rows[0],
      session: (await f.q('SELECT session_range::text FROM sessions WHERE id=$1', [a.session])).rows[0],
      flags: await f.flags(),
      audit: (await f.q('SELECT count(*)::int AS n FROM audit_logs')).rows[0].n,
      notices: (await f.q('SELECT count(*)::int AS n FROM notifications')).rows[0].n,
    });
    const before = await state();
    const preview = await previewEventChange(f.db.pool, f.coordinator, 'EVT-E10S02', { startAt: '2027-03-19T00:00:00Z', endAt: '2027-03-21T00:00:00Z' });
    assert.deepEqual(preview.impact.bookings.map(booking => [booking.id, booking.reasons]), [[a.booking, ['time']]]);
    assert.deepEqual(preview.impact.reservations.map(reservation => [reservation.id, reservation.equipmentName, reservation.reasons]), [[a.reservation, 'Projector', ['time']]]);
    assert.deepEqual(await state(), before, 'the savepoint discarded the edit and everything it would have caused');
  } finally { await f.db.close(); }
});

test('TC_E10S02_04: capacity falling below the registrations warns, and every Attendee stays Registered', async () => {
  const f = await fixture([{ range: '[2027-03-12 00:00Z,2027-03-14 00:00Z)', attendance: 100, capacity: 120 }]);
  try {
    const [a] = f.sessions;
    await register(f, 100, a.session);
    assert.deepEqual(await loadOverSubscription(f.q, f.event), [], '100 of 120 fits');
    // The capacity drop: the venue's Theatre layout seats 80. No Coordinator
    // edit sets a layout yet (an approved change request will), so set it here;
    // the 0014 trigger copies it to the sole Session.
    const layout = (await f.q("INSERT INTO room_layouts(code,label) VALUES('theatre-e10s02','Theatre') RETURNING id")).rows[0].id;
    await f.q('INSERT INTO venue_supported_layouts(venue_id,layout_id,capacity) VALUES($1,$2,80)', [a.venue, layout]);
    await f.q('UPDATE events SET layout_id=$2 WHERE id=$1', [f.event, layout]);
    const result = await updateEventInformationWithNotifications(f.db.pool, f.coordinator, f.event, { description: 'Saved after the layout change' });
    assert.deepEqual(result.overSubscription, [
      { scope: 'session', sessionId: a.session, registered: 100, capacity: 80 },
      { scope: 'event', sessionId: null, registered: 100, capacity: 80 },
    ]);
    const statuses = (await f.q('SELECT status, count(*)::int AS n FROM event_registrations WHERE event_id=$1 GROUP BY status', [f.event])).rows;
    assert.deepEqual(statuses, [{ status: 'registered', n: 100 }], 'no Attendee is removed or waitlisted (C-05)');
  } finally { await f.db.close(); }
});

test('the Event capacity E09-S02 reports is the sum of every Confirmed booking, Session by Session', async () => {
  const f = await fixture([{ range: day('2027-03-12', '01:00', '03:00'), attendance: 80, capacity: 80 }, { range: day('2027-03-13', '01:00', '03:00'), attendance: 80, capacity: 120 }]);
  try {
    const [a, b] = f.sessions;
    await register(f, 85, a.session);
    const capacity = await eventCapacity(f.q, f.event);
    const snapshot = await loadArrangementSnapshot(f.q, f.event);
    assert.equal(capacity.capacity, snapshot.bookings.reduce((sum, booking) => sum + booking.capacity, 0));
    assert.equal(capacity.capacity, 200);
    assert.deepEqual(await loadOverSubscription(f.q, f.event), [{ scope: 'session', sessionId: a.session, registered: 85, capacity: 80 }],
      'Session A is over; Session B is empty and the Event total of 200 holds all 85');
    assert.ok(b.session);
  } finally { await f.db.close(); }
});

test('TC_E10S02_05: changing only Session A\'s date flags its booking and equipment; Session B stays confirmed (SQL Session change)', async () => {
  const f = await fixture([{ range: day('2027-03-12', '09:00', '11:00'), attendance: 50, capacity: 80 }, { range: day('2027-03-12', '13:00', '15:00'), attendance: 50, capacity: 80 }]);
  try {
    const [a, b] = f.sessions;
    const impact = await f.changeSession(a.session, 'session_range=$2', [day('2027-03-13', '09:00', '11:00')]);
    assert.deepEqual(impact.bookings.map(booking => [booking.id, booking.reasons]), [[a.booking, ['time']]]);
    assert.deepEqual(impact.reservations.map(reservation => reservation.id), [a.reservation]);
    assert.deepEqual(await f.flags(), { bookings: { [a.booking]: true, [b.booking]: false }, reservations: { [a.reservation]: true, [b.reservation]: false } });
    assert.deepEqual((await f.audit()).map(row => row.action), ['Reconfirmation required: date or time changed', 'Reconfirmation required: date or time changed']);
    assert.equal((await f.q('SELECT status FROM venue_bookings WHERE id=$1', [b.booking])).rows[0].status, 'confirmed');
  } finally { await f.db.close(); }
});

test('TC_E10S02_05 and TC_E10S02_06: an Event date change flags the booking and equipment, and tells its Venue Staff and Technical Support once each', async () => {
  const f = await fixture([{ range: '[2027-03-12 00:00Z,2027-03-14 00:00Z)', attendance: 80, capacity: 200 }]);
  try {
    const [a] = f.sessions;
    const result = await updateEventInformationWithNotifications(f.db.pool, f.coordinator, f.event, { startAt: '2027-03-19T00:00:00Z', endAt: '2027-03-21T00:00:00Z' });
    assert.deepEqual(result.impact.bookings.map(booking => booking.id), [a.booking]);
    assert.deepEqual(await f.flags(), { bookings: { [a.booking]: true }, reservations: { [a.reservation]: true } });
    const notices = await f.notices();
    const recipients = notices.map(notice => notice.user_id);
    assert.deepEqual([...recipients].sort(), [a.staff.id, f.tech.id].sort(), 'one notice each; Venue Staff of other venues are not told');
    assert.ok(!recipients.includes(f.otherVenueStaff.id));
    for (const notice of notices) assert.match(notice.message, /date or time\) means venue bookings or equipment reservations need reconfirmation/);
    const organiserNotice = (await f.q("SELECT count(*)::int AS n FROM notifications WHERE event_id=$1 AND message LIKE '%Event date, time changed%'", [f.event])).rows[0].n;
    assert.equal(organiserNotice, 1, 'the Organiser still gets the generic date notice, not the staff one');
  } finally { await f.db.close(); }
});

test('TC_E10S02_08: an Event-wide date change flags every Session\'s booking and equipment (real save)', async () => {
  const f = await fixture([{ range: day('2027-03-12', '01:00', '03:00'), attendance: 50, capacity: 80 }, { range: day('2027-03-13', '01:00', '03:00'), attendance: 50, capacity: 80 }]);
  try {
    const [a, b] = f.sessions;
    const result = await updateEventInformationWithNotifications(f.db.pool, f.coordinator, f.event, { startAt: '2027-03-11T00:00:00Z', endAt: '2027-03-14T00:00:00Z' });
    assert.deepEqual(result.impact.bookings.map(booking => booking.id).sort(), [a.booking, b.booking].sort());
    assert.deepEqual(await f.flags(), { bookings: { [a.booking]: true, [b.booking]: true }, reservations: { [a.reservation]: true, [b.reservation]: true } });
    assert.deepEqual((await f.notices()).map(notice => notice.user_id).sort(), [a.staff.id, b.staff.id, f.tech.id].sort());
  } finally { await f.db.close(); }
});
