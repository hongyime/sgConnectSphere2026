// E07-S05 (SCRUM-55) on a real PostgreSQL database: withdrawals, the shared
// availability calculation, flags, notices, audit entries and locking.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import {
  listUnavailability,
  markUnavailable,
  returnToService,
} from '../src/modules/equipmentSupport/unavailability.js';
import { checkEquipmentAvailability } from '../src/modules/equipmentSupport/availability.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

type Role = AuthenticatedUser['role'];
const person = (id: string, role: Role, isActive = true): AuthenticatedUser => ({
  id,
  email: `${id}@example.test`,
  role,
  isActive,
  failedLoginCount: 0,
});
// The test cases' 1 to 5 December, in a year far enough ahead that "the end
// date must be today or later" never makes these tests expire.
const PERIOD = { from: '2030-12-01', to: '2030-12-05' };
// 3 Dec 2030 9:00 am to 5:00 pm Singapore time, inside the period; and 10 Dec,
// outside it.
const INSIDE = ['2030-12-03T01:00:00.000Z', '2030-12-03T09:00:00.000Z'] as const;
const OUTSIDE = ['2030-12-10T01:00:00.000Z', '2030-12-10T09:00:00.000Z'] as const;

async function setup() {
  const db = await loginDatabase();
  const q = db.pool.query.bind(db.pool);
  const org = randomUUID();
  const ids = {
    tech: randomUUID(),
    coord: randomUUID(),
    otherCoord: randomUUID(),
    organiser: randomUUID(),
  };
  await q("INSERT INTO client_organisations(id,name) VALUES ($1,'Unavailability test')", [org]);
  for (const [id, role, name] of [
    [ids.tech, 'technical_support_staff', 'Tech A'],
    [ids.coord, 'event_coordinator', 'Coordinator A'],
    [ids.otherCoord, 'event_coordinator', 'Coordinator B'],
    [ids.organiser, 'event_organiser', 'Organiser A'],
  ] as const)
    await q(
      `INSERT INTO users(id,email,password_hash,full_name,role,is_active,client_org_id) VALUES($1,$2,'unused',$3,$4,true,$5)`,
      [id, `${id}@example.test`, name, role, org],
    );
  const event = async (code: string, range: readonly [string, string] = INSIDE, coordinator: string | null = ids.coord) => {
    const id = randomUUID();
    await q(
      `INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,event_range,expected_attendance,status)
      VALUES($1,$2,$3,$4,$5,$6,tstzrange($7,$8,'[)'),10,'planning')`,
      [id, code, ids.organiser, coordinator, org, `${code} Tech Conference 2026`, range[0], range[1]],
    );
    return id;
  };
  const equipment = async (name: string, stock: number, status = 'available', active = true) => {
    const id = randomUUID();
    await q(
      `INSERT INTO equipment(id,name,category,description,total_quantity,home_location,operational_status,is_active)
      VALUES($1,$2,'Video','Synthetic',$3,'Store',$4,$5)`,
      [id, name, stock, status, active],
    );
    return id;
  };
  // Reservations written directly, as #229's and SCRUM-54's tests do.
  const reserved = async (eventId: string, equipmentId: string, quantity: number, range: readonly [string, string] = INSIDE, status = 'reserved') => {
    const requestId = (
      await q(
        `INSERT INTO equipment_requests(event_id,equipment_id,quantity_requested,requested_by) VALUES($1,$2,$3,$4) RETURNING id`,
        [eventId, equipmentId, quantity, ids.coord],
      )
    ).rows[0].id as string;
    return (
      await q(
        `INSERT INTO equipment_reservations(request_id,event_id,equipment_id,quantity_reserved,reservation_range,status)
        VALUES($1,$2,$3,$4,tstzrange($5,$6,'[)'),$7) RETURNING id`,
        [requestId, eventId, equipmentId, quantity, range[0], range[1], status],
      )
    ).rows[0].id as string;
  };
  const tech = person(ids.tech, 'technical_support_staff');
  const free = async (equipmentId: string, range: readonly [string, string] = INSIDE) => {
    const result = await checkEquipmentAvailability(
      q,
      tech,
      new URLSearchParams({ start: range[0], end: range[1], id: equipmentId }),
    );
    return result.equipment[0]!.freeQuantity;
  };
  const flagged = async (reservationId: string) =>
    (await q('SELECT requires_reconfirmation FROM equipment_reservations WHERE id=$1', [reservationId])).rows[0]
      .requires_reconfirmation as boolean;
  const notices = async (userId: string) =>
    (
      await q(
        `SELECT n.title,n.message,(SELECT count(*)::int FROM notification_deliveries d WHERE d.notification_id=n.id) AS deliveries
        FROM notifications n WHERE n.user_id=$1 ORDER BY n.created_at,n.id`,
        [userId],
      )
    ).rows as { title: string; message: string; deliveries: number }[];
  const audits = async (entityId: string) =>
    (
      await q(
        `SELECT actor_id,action,old_value,new_value FROM audit_logs
        WHERE entity_type='equipment_unavailability' AND entity_id=$1 ORDER BY occurred_at,id`,
        [entityId],
      )
    ).rows as { actor_id: string; action: string; old_value: string | null; new_value: string | null }[];
  const mark = (equipmentId: string, quantity: number, extra: Record<string, unknown> = {}, user: AuthenticatedUser = tech) =>
    markUnavailable(db.pool, user, equipmentId, { ...PERIOD, quantity, reason: 'Sensor repair', ...extra });
  return { db, q, ids, tech, event, equipment, reserved, free, flagged, notices, audits, mark };
}

test('TC_E07S05_01 marking an item with no reservations unavailable for a period with a reason excludes it from availability for that period', async () => {
  const t = await setup();
  try {
    const camera = await t.equipment('HD Camera', 4);
    const result = await t.mark(camera, 4);
    assert.equal(result.status, 201);
    const body = result.body as { unavailability: { id: string; from: string; to: string; quantity: number; reason: string }; affectedReservations: unknown[]; notified: number };
    assert.deepEqual(
      { from: body.unavailability.from, to: body.unavailability.to, quantity: body.unavailability.quantity, reason: body.unavailability.reason },
      { from: '2030-12-01', to: '2030-12-05', quantity: 4, reason: 'Sensor repair' },
    );
    assert.deepEqual(body.affectedReservations, []);
    assert.equal(body.notified, 0);
    // Whole Singapore days: 1 Dec 00:00 to 6 Dec 00:00, +08:00.
    const stored = (
      await t.q(
        `SELECT lower(unavailable_range) AS starts_at,upper(unavailable_range) AS ends_at FROM equipment_unavailability WHERE id=$1`,
        [body.unavailability.id],
      )
    ).rows[0];
    assert.equal(stored.starts_at.toISOString(), '2030-11-30T16:00:00.000Z');
    assert.equal(stored.ends_at.toISOString(), '2030-12-05T16:00:00.000Z');
    // Excluded for any time inside the period, and only there.
    assert.equal(await t.free(camera), 0);
    assert.equal(await t.free(camera, ['2030-11-30T16:00:00.000Z', '2030-11-30T17:00:00.000Z']), 0, 'first hour of 1 Dec');
    assert.equal(await t.free(camera, ['2030-12-05T15:00:00.000Z', '2030-12-05T16:00:00.000Z']), 0, 'last hour of 5 Dec');
    assert.equal(await t.free(camera, ['2030-12-05T16:00:00.000Z', '2030-12-05T17:00:00.000Z']), 4, 'first hour of 6 Dec');
    assert.equal(await t.free(camera, OUTSIDE), 4);
    // Listed on the item, and audited with who did it (D52).
    assert.deepEqual((await listUnavailability(t.q, camera)).map((p) => [p.id, p.from, p.to, p.quantity]), [
      [body.unavailability.id, '2030-12-01', '2030-12-05', 4],
    ]);
    assert.deepEqual(await t.audits(body.unavailability.id), [
      {
        actor_id: t.ids.tech,
        action: 'Equipment marked unavailable',
        old_value: null,
        new_value: 'HD Camera × 4, 2030-12-01 to 2030-12-05: Sensor repair',
      },
    ]);
  } finally {
    await t.db.close();
  }
});

test('TC_E07S05_02 marking a reserved item unavailable flags the affected event and notifies its Coordinator once', async () => {
  const t = await setup();
  try {
    const camera = await t.equipment('HD Camera', 4);
    const conference = await t.event('EVT-U1');
    const later = await t.event('EVT-U2', OUTSIDE, t.ids.otherCoord);
    const affected = await t.reserved(conference, camera, 2);
    const unaffected = await t.reserved(later, camera, 4, OUTSIDE);
    const result = await t.mark(camera, 3);
    assert.equal(result.status, 201);
    const body = result.body as { unavailability: { id: string }; affectedReservations: { id: string; eventCode: string; title: string; quantity: number }[]; notified: number };
    assert.deepEqual(
      body.affectedReservations.map((r) => [r.id, r.eventCode, r.title, r.quantity]),
      [[affected, 'EVT-U1', 'EVT-U1 Tech Conference 2026', 2]],
    );
    assert.equal(body.notified, 1);
    assert.equal(await t.flagged(affected), true);
    assert.equal(await t.flagged(unaffected), false, 'a reservation outside the period is not flagged');
    assert.deepEqual(await t.notices(t.ids.coord), [
      {
        title: 'Equipment reservation needs review',
        message:
          'EVT-U1 Tech Conference 2026, 3 Dec 2030, 9:00 am – 5:00 pm: HD Camera is unavailable from 1 Dec 2030 to 5 Dec 2030 (Sensor repair), 3 units out of service. The reservation of 2 needs review.',
        deliveries: 1,
      },
    ]);
    assert.deepEqual(await t.notices(t.ids.otherCoord), []);
    assert.deepEqual(await t.notices(t.ids.tech), [], 'the actor is never notified');
    // The withdrawal itself is never blocked by reservations (Scenario 2).
    assert.equal(await t.free(camera), 0);
  } finally {
    await t.db.close();
  }
});

test('TC_E07S05_03 returning an item to service deletes the period restores availability and is audited', async () => {
  const t = await setup();
  try {
    const camera = await t.equipment('HD Camera', 4);
    const marked = await t.mark(camera, 4);
    const id = (marked.body as { unavailability: { id: string } }).unavailability.id;
    assert.equal(await t.free(camera), 0);
    const result = await returnToService(t.db.pool, t.tech, { unavailabilityId: id });
    assert.equal(result.status, 200);
    assert.deepEqual((result.body as { equipment: { name: string } }).equipment.name, 'HD Camera');
    assert.equal(await t.free(camera), 4);
    assert.deepEqual(await listUnavailability(t.q, camera), []);
    assert.equal((await t.q('SELECT count(*)::int AS n FROM equipment_unavailability WHERE id=$1', [id])).rows[0].n, 0);
    assert.deepEqual(
      (await t.audits(id)).map((a) => [a.action, a.old_value, a.new_value, a.actor_id]),
      [
        ['Equipment marked unavailable', null, 'HD Camera × 4, 2030-12-01 to 2030-12-05: Sensor repair', t.ids.tech],
        ['Equipment returned to service', 'HD Camera × 4, 2030-12-01 to 2030-12-05: Sensor repair', null, t.ids.tech],
      ],
    );
    // A second return finds nothing.
    await assert.rejects(returnToService(t.db.pool, t.tech, { unavailabilityId: id }), {
      status: 404,
      message: 'This unavailable period was not found. It may already have been returned to service.',
    });
  } finally {
    await t.db.close();
  }
});

test('E07-S05 D54 only reservations that no longer fit are flagged, and a partial reservation counts', async () => {
  const t = await setup();
  try {
    const camera = await t.equipment('HD Camera', 10);
    const event = await t.event('EVT-U3');
    const fits = await t.reserved(event, camera, 2);
    // 1 of 10 out: 9 in service, 2 reserved still fits.
    const one = await t.mark(camera, 1);
    assert.deepEqual((one.body as { affectedReservations: unknown[] }).affectedReservations, []);
    assert.equal(await t.flagged(fits), false);
    assert.deepEqual(await t.notices(t.ids.coord), []);
    // Two events share the item: 2 + 5 reserved, 7 more out leaves 2 for both.
    const other = await t.event('EVT-U4');
    const partial = await t.reserved(other, camera, 5, INSIDE, 'partial');
    const seven = await t.mark(camera, 7);
    assert.deepEqual(
      (seven.body as { affectedReservations: { id: string }[] }).affectedReservations.map((r) => r.id).sort(),
      [fits, partial].sort(),
    );
    assert.equal((seven.body as { notified: number }).notified, 2, 'one notice per affected event');
    assert.equal((await t.notices(t.ids.coord)).length, 2);
  } finally {
    await t.db.close();
  }
});

test('E07-S05 D53 returning to service clears no flags and sends no notice', async () => {
  const t = await setup();
  try {
    const camera = await t.equipment('HD Camera', 4);
    const event = await t.event('EVT-U5');
    const reservation = await t.reserved(event, camera, 2);
    const marked = await t.mark(camera, 4);
    assert.equal(await t.flagged(reservation), true);
    const before = (await t.notices(t.ids.coord)).length;
    await returnToService(t.db.pool, t.tech, { unavailabilityId: (marked.body as { unavailability: { id: string } }).unavailability.id });
    assert.equal(await t.flagged(reservation), true);
    assert.equal((await t.notices(t.ids.coord)).length, before);
  } finally {
    await t.db.close();
  }
});

test('E07-S05 D51 overlapping withdrawals add up but never past the stock, exactly the units in service is accepted', async () => {
  const t = await setup();
  try {
    const camera = await t.equipment('HD Camera', 4);
    assert.equal((await t.mark(camera, 1)).status, 201);
    // Overlapping 4 to 8 December: 3 still in service.
    const tooMany = await t.mark(camera, 4, { from: '2030-12-04', to: '2030-12-08' });
    assert.deepEqual(tooMany, {
      status: 409,
      body: {
        error: 'not_enough_in_service',
        message: 'Only 3 units are in service for these dates.',
        errors: { quantity: ['Only 3 units are in service for these dates.'] },
        inService: 3,
      },
    });
    assert.equal((await t.mark(camera, 3, { from: '2030-12-04', to: '2030-12-08' })).status, 201);
    const none = await t.mark(camera, 1, { from: '2030-12-05', to: '2030-12-05' });
    assert.equal((none.body as { message: string }).message, 'No units are in service for these dates.');
    // Reservations never count against a withdrawal (Scenario 2), and the
    // 8 to 9 December stretch has 1 in service.
    const one = await t.mark(camera, 2, { from: '2030-12-08', to: '2030-12-09' });
    assert.equal((one.body as { message: string }).message, 'Only 1 unit is in service for these dates.');
    assert.equal((await t.mark(camera, 4, { from: '2030-12-09', to: '2030-12-09' })).status, 201, 'back-to-back days do not overlap');
  } finally {
    await t.db.close();
  }
});

test('E07-S05 retired and unknown items are refused, items under maintenance can still be marked, and an ended period cannot be returned', async () => {
  const t = await setup();
  try {
    const retired = await t.equipment('Old Camera', 4, 'retired', false);
    await assert.rejects(t.mark(retired, 1), {
      status: 409,
      message: "This equipment has been retired, so its availability can't be changed.",
    });
    await assert.rejects(t.mark(randomUUID(), 1), { status: 404, message: 'Equipment not found.' });
    const repair = await t.equipment('Repair Camera', 4, 'maintenance');
    assert.equal((await t.mark(repair, 2)).status, 201);
    // An ended period is history (only current and future ones are listed).
    const ended = (
      await t.q(
        `INSERT INTO equipment_unavailability(equipment_id,quantity,unavailable_range,reason)
        VALUES ($1,1,tstzrange(now()-interval '3 days',now()-interval '1 day','[)'),'Old repair') RETURNING id`,
        [repair],
      )
    ).rows[0].id as string;
    assert.deepEqual((await listUnavailability(t.q, repair)).map((p) => p.reason), ['Sensor repair']);
    await assert.rejects(returnToService(t.db.pool, t.tech, { unavailabilityId: ended }), {
      status: 409,
      message: 'This period has already ended.',
    });
    // A period that has started can still be returned (D49 deletes it).
    const started = (
      await t.q(
        `INSERT INTO equipment_unavailability(equipment_id,quantity,unavailable_range,reason)
        VALUES ($1,1,tstzrange(now()-interval '1 day',now()+interval '1 day','[)'),'Lens cleaning') RETURNING id`,
        [repair],
      )
    ).rows[0].id as string;
    assert.equal((await returnToService(t.db.pool, t.tech, { unavailabilityId: started })).status, 200);
    // Retiring needs no future reservations, so a period can outlive it.
    const leftover = (
      await t.q(
        `INSERT INTO equipment_unavailability(equipment_id,quantity,unavailable_range,reason)
        VALUES ($1,1,tstzrange('2030-12-01','2030-12-02','[)'),'Before retirement') RETURNING id`,
        [retired],
      )
    ).rows[0].id as string;
    await assert.rejects(returnToService(t.db.pool, t.tech, { unavailabilityId: leftover }), { status: 409 });
  } finally {
    await t.db.close();
  }
});

test('E07-S05 only Technical Support Staff mark or return and every refusal is audited with nothing changed', async () => {
  const t = await setup();
  try {
    const camera = await t.equipment('HD Camera', 4);
    const marked = await t.mark(camera, 1);
    const id = (marked.body as { unavailability: { id: string } }).unavailability.id;
    for (const caller of [
      person(t.ids.coord, 'event_coordinator'),
      person(t.ids.organiser, 'event_organiser'),
      person(t.ids.tech, 'technical_support_staff', false),
    ]) {
      await assert.rejects(t.mark(camera, 1, {}, caller), {
        status: 403,
        message: 'Access denied. Only Technical Support Staff can maintain equipment; Coordinators can view it.',
      });
      await assert.rejects(returnToService(t.db.pool, caller, { unavailabilityId: id }), { status: 403 });
    }
    const denied = (
      await t.q(
        `SELECT count(*)::int AS n FROM audit_logs WHERE action='Access Denied' AND new_value='equipment_catalogue'
        AND actor_id = ANY($1::uuid[])`,
        [[t.ids.coord, t.ids.organiser, t.ids.tech]],
      )
    ).rows[0].n;
    assert.equal(denied, 6);
    assert.deepEqual((await listUnavailability(t.q, camera)).map((p) => p.id), [id]);
  } finally {
    await t.db.close();
  }
});

test('E07-S05 two withdrawals saved at the same moment cannot take out more units than exist', async () => {
  const t = await setup();
  try {
    const camera = await t.equipment('HD Camera', 4);
    const results = await Promise.all([t.mark(camera, 3), t.mark(camera, 3)]);
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
    assert.equal(await t.free(camera), 1);
  } finally {
    await t.db.close();
  }
});

test('E07-S05 no notice is sent when the event has no assigned Coordinator or the Coordinator account changed role', async () => {
  const t = await setup();
  try {
    const camera = await t.equipment('HD Camera', 2);
    const unassigned = await t.reserved(await t.event('EVT-U6', INSIDE, null), camera, 1);
    const moved = await t.event('EVT-U7', INSIDE, t.ids.otherCoord);
    const other = await t.reserved(moved, camera, 1);
    await t.q(`UPDATE users SET role='event_organiser' WHERE id=$1`, [t.ids.otherCoord]);
    const result = await t.mark(camera, 2);
    assert.equal((result.body as { notified: number }).notified, 0);
    assert.equal(await t.flagged(unassigned), true);
    assert.equal(await t.flagged(other), true);
    assert.deepEqual(await t.notices(t.ids.otherCoord), []);
  } finally {
    await t.db.close();
  }
});
