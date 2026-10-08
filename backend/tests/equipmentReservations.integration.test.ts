// E07-S04 (SCRUM-54) on a real PostgreSQL database: reservations, the shared
// availability calculation, locking, notices and Activity log entries.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import {
  changeReservation,
  releaseReservation,
  reserveEquipment,
} from '../src/modules/equipmentSupport/reservations.js';
import {
  getEquipmentRequests,
  saveEquipmentRequest,
} from '../src/modules/equipmentSupport/requests.js';
import { checkEquipmentAvailability } from '../src/modules/equipmentSupport/availability.js';
import { saveEquipment } from '../src/modules/equipmentSupport/catalogue.js';
import { getEvent } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

type Role = AuthenticatedUser['role'];
const person = (id: string, role: Role, isActive = true): AuthenticatedUser => ({
  id,
  email: `${id}@example.test`,
  role,
  isActive,
  failedLoginCount: 0,
});
// 15 Nov 2026 9:00 am to 5:00 pm Singapore time, and a later, separate day.
const PERIOD = ['2026-11-15T01:00:00.000Z', '2026-11-15T09:00:00.000Z'] as const;
const LATER = ['2026-11-20T01:00:00.000Z', '2026-11-20T09:00:00.000Z'] as const;

async function setup() {
  const db = await loginDatabase();
  const q = db.pool.query.bind(db.pool);
  const org = randomUUID();
  const ids = {
    tech: randomUUID(),
    otherTech: randomUUID(),
    inactiveTech: randomUUID(),
    coord: randomUUID(),
    otherCoord: randomUUID(),
    organiser: randomUUID(),
  };
  await q("INSERT INTO client_organisations(id,name) VALUES ($1,'Reservation test')", [org]);
  for (const [id, role, active, name] of [
    [ids.tech, 'technical_support_staff', true, 'Tech A'],
    [ids.otherTech, 'technical_support_staff', true, 'Tech B'],
    [ids.inactiveTech, 'technical_support_staff', false, 'Tech C'],
    [ids.coord, 'event_coordinator', true, 'Coordinator A'],
    [ids.otherCoord, 'event_coordinator', true, 'Coordinator B'],
    [ids.organiser, 'event_organiser', true, 'Organiser A'],
  ] as const)
    await q(
      `INSERT INTO users(id,email,password_hash,full_name,role,is_active,client_org_id) VALUES($1,$2,'unused',$3,$4,$5,$6)`,
      [id, `${id}@example.test`, name, role, active, org],
    );
  const event = async (code: string, status: string, range = PERIOD, coordinator: string | null = ids.coord) => {
    const id = randomUUID();
    await q(
      `INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,event_range,expected_attendance,status)
      VALUES($1,$2,$3,$4,$5,$6,tstzrange($7,$8,'[)'),10,$9)`,
      [id, code, ids.organiser, coordinator, org, `${code} Tech Conference`, range[0], range[1], status],
    );
    return id;
  };
  const equipment = async (name: string, stock: number, status = 'available', active = true) => {
    const id = randomUUID();
    await q(
      `INSERT INTO equipment(id,name,category,description,total_quantity,home_location,operational_status,is_active)
      VALUES($1,$2,'Audio','Synthetic',$3,'Store',$4,$5)`,
      [id, name, stock, status, active],
    );
    return id;
  };
  const request = async (eventId: string, equipmentId: string, quantity: number) =>
    (
      await q(
        `INSERT INTO equipment_requests(event_id,equipment_id,quantity_requested,requested_by) VALUES($1,$2,$3,$4) RETURNING id`,
        [eventId, equipmentId, quantity, ids.coord],
      )
    ).rows[0].id as string;
  // Reservations held by other events, written directly (as #229's tests do).
  const held = async (eventId: string, equipmentId: string, quantity: number, range = PERIOD) => {
    const requestId = await request(eventId, equipmentId, quantity);
    await q(
      `INSERT INTO equipment_reservations(request_id,event_id,equipment_id,quantity_reserved,reservation_range,status)
      VALUES($1,$2,$3,$4,tstzrange($5,$6,'[)'),'reserved')`,
      [requestId, eventId, equipmentId, quantity, range[0], range[1]],
    );
  };
  const free = async (equipmentId: string, range = PERIOD) => {
    const result = await checkEquipmentAvailability(
      q,
      person(ids.tech, 'technical_support_staff'),
      new URLSearchParams({ start: range[0], end: range[1], id: equipmentId }),
    );
    return result.equipment[0]!.freeQuantity;
  };
  const notices = async (userId: string) =>
    (
      await q(
        `SELECT n.title,n.message,(SELECT count(*)::int FROM notification_deliveries d WHERE d.notification_id=n.id) AS deliveries
        FROM notifications n WHERE n.user_id=$1 ORDER BY n.created_at,n.id`,
        [userId],
      )
    ).rows as { title: string; message: string; deliveries: number }[];
  const activity = async (eventId: string) =>
    (
      await q(
        `SELECT actor_id,action,old_value,new_value FROM audit_logs
        WHERE event_id=$1 AND entity_type='event' ORDER BY occurred_at,id`,
        [eventId],
      )
    ).rows as { actor_id: string; action: string; old_value: string | null; new_value: string }[];
  return {
    db,
    q,
    ids,
    org,
    tech: person(ids.tech, 'technical_support_staff'),
    coord: person(ids.coord, 'event_coordinator'),
    event,
    equipment,
    request,
    held,
    free,
    notices,
    activity,
  };
}

test('TC_E07S04_01 reserving the requested quantity records the reservation against the event and notifies the Coordinator with event date time item and quantity', async () => {
  const t = await setup();
  try {
    const eventId = await t.event('EVT-R1', 'approved');
    const mic = await t.equipment('Wireless Microphone', 5);
    const line = await t.request(eventId, mic, 2);
    const result = await reserveEquipment(t.db.pool, t.tech, 'EVT-R1', { requestId: line, quantity: 2 });
    assert.equal(result.status, 201);
    assert.deepEqual(
      { ...(result.body.reservation as object), id: undefined },
      { id: undefined, requestId: line, name: 'Wireless Microphone', status: 'reserved', quantityReserved: 2, quantityRequested: 2, outstanding: 0 },
    );
    assert.equal(result.body.notified, 1);
    const [stored] = (
      await t.q(
        `SELECT status,quantity_reserved,reserved_by,lower(reservation_range) AS s,upper(reservation_range) AS e
        FROM equipment_reservations WHERE request_id=$1`,
        [line],
      )
    ).rows;
    assert.equal(stored.status, 'reserved');
    assert.equal(stored.reserved_by, t.ids.tech);
    // D39: the reservation covers the event's own dates.
    assert.deepEqual([stored.s.toISOString(), stored.e.toISOString()], [...PERIOD]);
    const [notice] = await t.notices(t.ids.coord);
    assert.deepEqual(notice, {
      title: 'Equipment reserved',
      message: 'EVT-R1 Tech Conference, 15 Nov 2026, 9:00 am – 5:00 pm: Wireless Microphone × 2 reserved.',
      deliveries: 1,
    });
    assert.equal((await t.notices(t.ids.tech)).length, 0, 'the actor gets no notice');
    assert.deepEqual(await t.activity(eventId), [
      { actor_id: t.ids.tech, action: 'Equipment reserved', old_value: null, new_value: 'Wireless Microphone × 2' },
    ]);
    // AC 7: the Coordinator's read shows the line's reservation state.
    const read = await getEquipmentRequests(t.q, t.coord, 'EVT-R1');
    assert.equal(read.requests[0]!.reservation?.status, 'reserved');
    assert.equal(read.requests[0]!.reservation?.quantityReserved, 2);
    assert.equal(read.requests[0]!.freeQuantity, undefined, 'Coordinators are not shown free quantities');
    assert.equal(read.canReserve, false);
    // Technical Support sees what the line could still use: its own 2 plus 3.
    const staffRead = await getEquipmentRequests(t.q, t.tech, 'EVT-R1');
    assert.equal(staffRead.requests[0]!.freeQuantity, 5);
    assert.equal(staffRead.canReserve, true);
    assert.equal(staffRead.canRelease, true);
    // D43: the entry appears in the event Activity log, which the event's
    // organisation reads on /events/* (Coordinators read it once E14-S02 lands).
    const organiser = { ...person(t.ids.organiser, 'event_organiser'), clientOrgId: t.org };
    const detail = (await getEvent(t.q, organiser, 'EVT-R1')) as { activityLog: { action: string; actor_name: string; new_value: string }[] };
    assert.ok(detail.activityLog.some((entry) => entry.action === 'Equipment reserved' && entry.actor_name === 'Tech A' && entry.new_value === 'Wireless Microphone × 2'));
  } finally {
    await t.db.close();
  }
});

test('TC_E07S04_02 TC_E07S04_07 a partial reservation records Partial and notifies the Coordinator of the shortfall and outstanding quantity', async () => {
  const t = await setup();
  try {
    const eventId = await t.event('EVT-R2', 'planning');
    const other = await t.event('EVT-OTHER', 'planning');
    const projector = await t.equipment('Projector-HD', 10);
    await t.held(other, projector, 6);
    const line = await t.request(eventId, projector, 5);
    // Checklist: more than is free is refused, with the free quantity named.
    const tooMany = await reserveEquipment(t.db.pool, t.tech, 'EVT-R2', { requestId: line, quantity: 5 });
    assert.equal(tooMany.status, 409);
    assert.equal(tooMany.body.message, "Only 4 are free for this event's dates.");
    assert.deepEqual(tooMany.body.errors, { quantity: ["Only 4 are free for this event's dates."] });
    assert.equal(tooMany.body.freeQuantity, 4);
    assert.equal((await t.q('SELECT count(*)::int AS n FROM equipment_reservations WHERE request_id=$1', [line])).rows[0].n, 0);
    assert.equal((await t.notices(t.ids.coord)).length, 0);
    const partial = await reserveEquipment(t.db.pool, t.tech, 'EVT-R2', { requestId: line, quantity: 4 });
    assert.equal(partial.status, 201);
    const reservation = partial.body.reservation as { status: string; outstanding: number };
    assert.equal(reservation.status, 'partial');
    assert.equal(reservation.outstanding, 1);
    assert.deepEqual(await t.notices(t.ids.coord), [
      {
        title: 'Equipment partly reserved',
        message: 'EVT-R2 Tech Conference, 15 Nov 2026, 9:00 am – 5:00 pm: Projector-HD × 4 of 5 reserved; 1 outstanding.',
        deliveries: 1,
      },
    ]);
    assert.equal((await t.activity(eventId))[0]!.new_value, 'Projector-HD × 4 of 5');
    assert.equal(await t.free(projector), 0);
  } finally {
    await t.db.close();
  }
});

test('TC_E07S04_03 once every unit is reserved for a period the availability check shows no free quantity', async () => {
  const t = await setup();
  try {
    const first = await t.event('EVT-R3A', 'approved');
    const second = await t.event('EVT-R3B', 'approved');
    const later = await t.event('EVT-R3C', 'approved', LATER);
    const stage = await t.equipment('Portable Stage', 2);
    const line = await t.request(first, stage, 2);
    assert.equal((await reserveEquipment(t.db.pool, t.tech, 'EVT-R3A', { requestId: line, quantity: 2 })).status, 201);
    assert.equal(await t.free(stage), 0);
    const blocked = await reserveEquipment(t.db.pool, t.tech, 'EVT-R3B', { requestId: await t.request(second, stage, 1), quantity: 1 });
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.message, "None are free for this event's dates.");
    // A separate day is unaffected.
    assert.equal(await t.free(stage, LATER), 2);
    assert.equal((await reserveEquipment(t.db.pool, t.tech, 'EVT-R3C', { requestId: await t.request(later, stage, 2), quantity: 2 })).status, 201);
  } finally {
    await t.db.close();
  }
});

test('TC_E07S04_04 releasing a reservation returns its units to the pool keeps the history and lets the line be reserved again', async () => {
  const t = await setup();
  try {
    const eventId = await t.event('EVT-R4', 'planning');
    const mic = await t.equipment('Wireless Microphone', 5);
    const line = await t.request(eventId, mic, 2);
    const reserved = await reserveEquipment(t.db.pool, t.tech, 'EVT-R4', { requestId: line, quantity: 2 });
    const reservationId = (reserved.body.reservation as { id: string }).id;
    assert.equal(await t.free(mic), 3);
    const noticesBefore = (await t.notices(t.ids.coord)).length;
    const released = await releaseReservation(t.db.pool, t.tech, 'EVT-R4', { reservationId });
    assert.equal(released.status, 200);
    assert.equal((released.body.reservation as { status: string }).status, 'released');
    assert.equal(await t.free(mic), 5, 'the 2 units are back in the pool');
    // D42: no notice on release; D43: an Activity log entry.
    assert.equal((await t.notices(t.ids.coord)).length, noticesBefore);
    assert.deepEqual((await t.activity(eventId)).at(-1), {
      actor_id: t.ids.tech,
      action: 'Equipment reservation released',
      old_value: 'Wireless Microphone × 2',
      new_value: 'Wireless Microphone × 2 returned to the available pool',
    });
    const twice = await releaseReservation(t.db.pool, t.tech, 'EVT-R4', { reservationId }).catch((error) => error);
    assert.equal(twice.status, 409);
    assert.equal(twice.message, 'This reservation has already been released.');
    // #216's rule: a line that has been reserved stays protected from edits.
    const edit = await saveEquipmentRequest(t.db.pool, t.coord, 'EVT-R4', { equipmentId: mic, quantity: 3 }, line).catch((error) => error);
    assert.equal(edit.status, 409);
    const read = await getEquipmentRequests(t.q, t.coord, 'EVT-R4');
    assert.equal(read.requests[0]!.reservation?.status, 'released');
    // Reserved afresh: a new row; the released one stays as history.
    const again = await reserveEquipment(t.db.pool, t.tech, 'EVT-R4', { requestId: line, quantity: 2 });
    assert.equal(again.status, 201);
    assert.deepEqual(
      (await t.q('SELECT status FROM equipment_reservations WHERE request_id=$1 ORDER BY created_at,id', [line])).rows.map((r) => r.status).sort(),
      ['released', 'reserved'],
    );
    assert.equal((await getEquipmentRequests(t.q, t.coord, 'EVT-R4')).requests[0]!.reservation?.status, 'reserved');
    // Scenario 4: "an event is cancelled". Release still works on a cancelled
    // event; reserving does not.
    await t.q("UPDATE events SET status='cancelled' WHERE id=$1", [eventId]);
    const cancelledRead = await getEquipmentRequests(t.q, t.tech, 'EVT-R4');
    assert.deepEqual([cancelledRead.canReserve, cancelledRead.canRelease], [false, true]);
    const onCancelled = await releaseReservation(t.db.pool, t.tech, 'EVT-R4', { reservationId: (again.body.reservation as { id: string }).id });
    assert.equal(onCancelled.status, 200);
    assert.equal(await t.free(mic), 5);
    const reserveCancelled = await reserveEquipment(t.db.pool, t.tech, 'EVT-R4', { requestId: line, quantity: 1 }).catch((error) => error);
    assert.equal(reserveCancelled.status, 409);
    assert.equal(reserveCancelled.message, 'Equipment can only be reserved while the event is approved or planning.');
  } finally {
    await t.db.close();
  }
});

test('TC_E07S04_05 TC_E07S04_06 reserving one fewer than free leaves one free and reserving exactly the free quantity leaves none with no shortfall notice', async () => {
  const t = await setup();
  try {
    const projector = await t.equipment('Projector-HD', 10);
    await t.held(await t.event('EVT-HELD', 'planning'), projector, 6);
    const below = await t.event('EVT-1003', 'planning');
    const at = await t.event('EVT-1004', 'planning');
    // TC_05: 4 free, 3 requested and reserved.
    const belowLine = await t.request(below, projector, 3);
    const first = await reserveEquipment(t.db.pool, t.tech, 'EVT-1003', { requestId: belowLine, quantity: 3 });
    assert.equal((first.body.reservation as { status: string }).status, 'reserved');
    assert.equal(await t.free(projector), 1);
    await releaseReservation(t.db.pool, t.tech, 'EVT-1003', { reservationId: (first.body.reservation as { id: string }).id });
    // TC_06: 4 free, 4 requested and reserved.
    const atLine = await t.request(at, projector, 4);
    const exact = await reserveEquipment(t.db.pool, t.tech, 'EVT-1004', { requestId: atLine, quantity: 4 });
    assert.equal(exact.status, 201);
    assert.equal((exact.body.reservation as { status: string }).status, 'reserved');
    assert.equal(await t.free(projector), 0);
    assert.deepEqual((await t.notices(t.ids.coord)).map((n) => n.title), ['Equipment reserved', 'Equipment reserved']);
  } finally {
    await t.db.close();
  }
});

test('E07-S04 D37 D45 changing a reservation tops it up to Reserved or reduces it and clears needs review counting its own units as free', async () => {
  const t = await setup();
  try {
    const eventId = await t.event('EVT-R6', 'approved');
    const other = await t.event('EVT-R6B', 'approved');
    const stage = await t.equipment('Portable Stage', 3);
    const line = await t.request(eventId, stage, 3);
    const otherLine = await t.request(other, stage, 1);
    const otherReservation = (await reserveEquipment(t.db.pool, t.tech, 'EVT-R6B', { requestId: otherLine, quantity: 1 })).body.reservation as { id: string };
    const partial = await reserveEquipment(t.db.pool, t.tech, 'EVT-R6', { requestId: line, quantity: 2 });
    const reservationId = (partial.body.reservation as { id: string }).id;
    // A second reservation on the same line is refused.
    const duplicate = await reserveEquipment(t.db.pool, t.tech, 'EVT-R6', { requestId: line, quantity: 1 }).catch((error) => error);
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.message, 'This request is already reserved. Change the reservation instead.');
    // Its own 2 count as free to it; the other event's 1 does not.
    const short = await changeReservation(t.db.pool, t.tech, 'EVT-R6', { reservationId, quantity: 3 });
    assert.equal(short.status, 409);
    assert.equal(short.body.message, "Only 2 are free for this event's dates.");
    const over = await changeReservation(t.db.pool, t.tech, 'EVT-R6', { reservationId, quantity: 4 });
    assert.equal(over.status, 400);
    assert.equal(over.body.message, 'You can reserve at most the 3 requested.');
    await releaseReservation(t.db.pool, t.tech, 'EVT-R6B', { reservationId: otherReservation.id });
    const topUp = await changeReservation(t.db.pool, t.tech, 'EVT-R6', { reservationId, quantity: 3 });
    assert.equal(topUp.status, 200);
    assert.equal((topUp.body.reservation as { status: string }).status, 'reserved');
    assert.equal(
      (await t.q('SELECT count(*)::int AS n FROM equipment_reservations WHERE request_id=$1', [line])).rows[0].n,
      1,
      'a top-up updates the same row',
    );
    assert.deepEqual((await t.notices(t.ids.coord)).at(-1), {
      title: 'Equipment reservation changed',
      message: 'EVT-R6 Tech Conference, 15 Nov 2026, 9:00 am – 5:00 pm: Portable Stage × 3 reserved.',
      deliveries: 1,
    });
    assert.deepEqual((await t.activity(eventId)).at(-1), {
      actor_id: t.ids.tech,
      action: 'Equipment reservation changed',
      old_value: 'Portable Stage × 2 of 3',
      new_value: 'Portable Stage × 3',
    });
    // Unchanged and not flagged: nothing is saved or sent.
    const entries = (await t.activity(eventId)).length;
    const sent = (await t.notices(t.ids.coord)).length;
    const same = await changeReservation(t.db.pool, t.tech, 'EVT-R6', { reservationId, quantity: 3 });
    assert.equal(same.body.changed, false);
    assert.equal((await t.activity(eventId)).length, entries);
    assert.equal((await t.notices(t.ids.coord)).length, sent);
    // D45: flagged by a stock change (E07-S01); keeping the same quantity clears it.
    await saveEquipment(t.db.pool, t.tech, { name: 'Portable Stage', category: 'Audio', description: 'Synthetic', total_quantity: 2, home_location: 'Store', operational_status: 'available' }, stage);
    assert.equal((await getEquipmentRequests(t.q, t.tech, 'EVT-R6')).requests[0]!.reservation?.requiresReconfirmation, true);
    const tooManyNow = await changeReservation(t.db.pool, t.tech, 'EVT-R6', { reservationId, quantity: 3 });
    assert.equal(tooManyNow.body.message, "Only 2 are free for this event's dates.");
    const reduced = await changeReservation(t.db.pool, t.tech, 'EVT-R6', { reservationId, quantity: 2 });
    assert.equal(reduced.status, 200);
    assert.equal((reduced.body.reservation as { status: string }).status, 'partial');
    const [row] = (await t.q('SELECT status,quantity_reserved,requires_reconfirmation FROM equipment_reservations WHERE id=$1', [reservationId])).rows;
    assert.deepEqual(row, { status: 'partial', quantity_reserved: 2, requires_reconfirmation: false });
    await t.q('UPDATE equipment_reservations SET requires_reconfirmation=true WHERE id=$1', [reservationId]);
    const keep = await changeReservation(t.db.pool, t.tech, 'EVT-R6', { reservationId, quantity: 2 });
    assert.equal(keep.body.changed, true);
    assert.equal((await t.q('SELECT requires_reconfirmation FROM equipment_reservations WHERE id=$1', [reservationId])).rows[0].requires_reconfirmation, false);
  } finally {
    await t.db.close();
  }
});

test('E07-S04 D40 D41 confirmed events refuse every change and other statuses retired equipment and unknown records are refused', async () => {
  const t = await setup();
  try {
    const confirmed = await t.event('EVT-CONF', 'confirmed');
    const submitted = await t.event('EVT-SUB', 'submitted');
    const open = await t.event('EVT-OPEN', 'planning');
    const mic = await t.equipment('Wireless Microphone', 5);
    const retired = await t.equipment('Old Mixer', 5, 'retired', false);
    const maintenance = await t.equipment('Spare Speaker', 5, 'maintenance');
    const refusal = (promise: Promise<unknown>) => promise.then(() => assert.fail('expected a refusal'), (error) => error);
    const confirmedLine = await t.request(confirmed, mic, 1);
    const confirmedError = await refusal(reserveEquipment(t.db.pool, t.tech, 'EVT-CONF', { requestId: confirmedLine, quantity: 1 }));
    assert.equal(confirmedError.status, 409);
    assert.equal(confirmedError.message, "This event is confirmed, so its equipment reservations can't be changed here.");
    await t.q(
      `INSERT INTO equipment_reservations(request_id,event_id,equipment_id,quantity_reserved,reservation_range,status)
      VALUES($1,$2,$3,1,tstzrange($4,$5,'[)'),'reserved')`,
      [confirmedLine, confirmed, mic, PERIOD[0], PERIOD[1]],
    );
    const confirmedReservation = (await t.q('SELECT id FROM equipment_reservations WHERE request_id=$1', [confirmedLine])).rows[0].id;
    for (const attempt of [
      () => releaseReservation(t.db.pool, t.tech, 'EVT-CONF', { reservationId: confirmedReservation }),
      () => changeReservation(t.db.pool, t.tech, 'EVT-CONF', { reservationId: confirmedReservation, quantity: 1 }),
    ])
      assert.equal((await refusal(attempt())).message, "This event is confirmed, so its equipment reservations can't be changed here.");
    const confirmedRead = await getEquipmentRequests(t.q, t.tech, 'EVT-CONF');
    assert.deepEqual([confirmedRead.canReserve, confirmedRead.canRelease], [false, false]);
    assert.equal((await refusal(reserveEquipment(t.db.pool, t.tech, 'EVT-SUB', { requestId: await t.request(submitted, mic, 1), quantity: 1 }))).message,
      'Equipment can only be reserved while the event is approved or planning.');
    assert.equal((await refusal(releaseReservation(t.db.pool, t.tech, 'EVT-SUB', { reservationId: randomUUID() }))).message,
      'Reservations can only be released while the event is approved, planning or cancelled.');
    assert.equal((await refusal(reserveEquipment(t.db.pool, t.tech, 'EVT-OPEN', { requestId: await t.request(open, retired, 1), quantity: 1 }))).message,
      "This equipment has been retired, so it can't be reserved.");
    const underMaintenance = await reserveEquipment(t.db.pool, t.tech, 'EVT-OPEN', { requestId: await t.request(open, maintenance, 1), quantity: 1 });
    assert.equal(underMaintenance.status, 409);
    assert.equal(underMaintenance.body.message, 'Spare Speaker is not available for use, so none can be reserved.');
    const staffRead = await getEquipmentRequests(t.q, t.tech, 'EVT-OPEN');
    assert.deepEqual(
      staffRead.requests.map((line) => [line.name, line.freeQuantity]),
      [['Old Mixer', null], ['Spare Speaker', 0]],
    );
    // Unknown or mismatched records.
    assert.equal((await refusal(reserveEquipment(t.db.pool, t.tech, 'EVT-NONE', { requestId: randomUUID(), quantity: 1 }))).status, 404);
    assert.equal((await refusal(reserveEquipment(t.db.pool, t.tech, 'EVT-OPEN', { requestId: confirmedLine, quantity: 1 }))).message,
      'Equipment request not found for this event.');
    assert.equal((await refusal(changeReservation(t.db.pool, t.tech, 'EVT-OPEN', { reservationId: confirmedReservation, quantity: 1 }))).message,
      'Reservation not found for this event.');
    assert.equal((await refusal(reserveEquipment(t.db.pool, t.tech, '', { requestId: randomUUID(), quantity: 1 }))).status, 400);
    // A released reservation can only be reserved again, not changed.
    const openLine = await t.request(open, mic, 2);
    const openReservation = (await reserveEquipment(t.db.pool, t.tech, 'EVT-OPEN', { requestId: openLine, quantity: 2 })).body.reservation as { id: string };
    await releaseReservation(t.db.pool, t.tech, 'EVT-OPEN', { reservationId: openReservation.id });
    assert.equal((await refusal(changeReservation(t.db.pool, t.tech, 'EVT-OPEN', { reservationId: openReservation.id, quantity: 1 }))).message,
      'This reservation has been released. Reserve the request again instead.');
    // Retiring is blocked while reservations are active (E07-S01), so this
    // only guards a direct database change.
    const mixer = await t.equipment('Spare Mixer', 2);
    const mixerReservation = (await reserveEquipment(t.db.pool, t.tech, 'EVT-OPEN', { requestId: await t.request(open, mixer, 2), quantity: 1 })).body.reservation as { id: string };
    await t.q('UPDATE equipment SET is_active=false WHERE id=$1', [mixer]);
    assert.equal((await refusal(changeReservation(t.db.pool, t.tech, 'EVT-OPEN', { reservationId: mixerReservation.id, quantity: 2 }))).message,
      "This equipment has been retired, so it can't be reserved.");
    // Validation, after authorisation.
    const invalid = await reserveEquipment(t.db.pool, t.tech, 'EVT-OPEN', { requestId: openLine, quantity: 0 });
    assert.deepEqual(invalid, { status: 400, body: { error: 'validation_failed', errors: { quantity: ['Enter a whole number greater than 0.'] } } });
  } finally {
    await t.db.close();
  }
});

test('E07-S04 only Technical Support Staff reserve change or release and every refusal is audited with nothing changed', async () => {
  const t = await setup();
  try {
    const eventId = await t.event('EVT-ROLE', 'planning');
    const mic = await t.equipment('Wireless Microphone', 5);
    const line = await t.request(eventId, mic, 2);
    const reservationId = ((await reserveEquipment(t.db.pool, t.tech, 'EVT-ROLE', { requestId: line, quantity: 1 })).body.reservation as { id: string }).id;
    const refused = [
      person(t.ids.coord, 'event_coordinator'),
      person(t.ids.organiser, 'event_organiser'),
      person(t.ids.inactiveTech, 'technical_support_staff', false),
    ];
    for (const user of refused) {
      for (const attempt of [
        () => reserveEquipment(t.db.pool, user, 'EVT-ROLE', { requestId: line, quantity: 2 }),
        () => changeReservation(t.db.pool, user, 'EVT-ROLE', { reservationId, quantity: 2 }),
        () => releaseReservation(t.db.pool, user, 'EVT-ROLE', { reservationId }),
      ]) {
        const error = await attempt().then(() => assert.fail('expected 403'), (e) => e);
        assert.equal(error.status, 403);
        assert.equal(error.message, 'Access denied. Only Technical Support Staff can reserve equipment.');
      }
      assert.equal(
        (await t.q(`SELECT count(*)::int AS n FROM audit_logs WHERE actor_id=$1 AND action='Access Denied' AND new_value='equipment_reservations:EVT-ROLE'`, [user.id])).rows[0].n,
        3,
      );
    }
    assert.equal((await reserveEquipment(t.db.pool, undefined, 'EVT-ROLE', { requestId: line, quantity: 2 }).catch((e) => e)).status, 401);
    const [row] = (await t.q('SELECT status,quantity_reserved FROM equipment_reservations WHERE id=$1', [reservationId])).rows;
    assert.deepEqual(row, { status: 'partial', quantity_reserved: 1 });
    // A second technician may act on a colleague's reservation.
    const other = person(t.ids.otherTech, 'technical_support_staff');
    assert.equal((await changeReservation(t.db.pool, other, 'EVT-ROLE', { reservationId, quantity: 2 })).status, 200);
  } finally {
    await t.db.close();
  }
});

test('E07-S04 two reservations made at the same moment cannot commit more units than exist', async () => {
  const t = await setup();
  try {
    const stage = await t.equipment('Portable Stage', 2);
    const a = await t.event('EVT-RACE-A', 'planning');
    const b = await t.event('EVT-RACE-B', 'planning');
    const lineA = await t.request(a, stage, 2);
    const lineB = await t.request(b, stage, 2);
    const results = await Promise.all([
      reserveEquipment(t.db.pool, t.tech, 'EVT-RACE-A', { requestId: lineA, quantity: 2 }),
      reserveEquipment(t.db.pool, t.tech, 'EVT-RACE-B', { requestId: lineB, quantity: 2 }),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
    assert.equal(
      (await t.q("SELECT coalesce(sum(quantity_reserved),0)::int AS n FROM equipment_reservations WHERE equipment_id=$1 AND status IN ('reserved','partial')", [stage])).rows[0].n,
      2,
    );
    assert.equal(await t.free(stage), 0);
  } finally {
    await t.db.close();
  }
});

test('E07-S04 no Coordinator notice is sent when the event has no active assigned Coordinator', async () => {
  const t = await setup();
  try {
    const mic = await t.equipment('Wireless Microphone', 5);
    const unassigned = await t.event('EVT-NOCOORD', 'approved', PERIOD, null);
    const inactive = await t.event('EVT-INACTIVE', 'approved');
    await t.q('UPDATE users SET is_active=false WHERE id=$1', [t.ids.coord]);
    for (const [code, eventId] of [['EVT-NOCOORD', unassigned], ['EVT-INACTIVE', inactive]] as const) {
      const result = await reserveEquipment(t.db.pool, t.tech, code, { requestId: await t.request(eventId, mic, 1), quantity: 1 });
      assert.equal(result.status, 201);
      assert.equal(result.body.notified, 0);
      assert.equal((await t.activity(eventId)).length, 1, 'the Activity log entry is still written');
    }
    assert.equal((await t.q('SELECT count(*)::int AS n FROM notifications')).rows[0].n, 0);
  } finally {
    await t.db.close();
  }
});
