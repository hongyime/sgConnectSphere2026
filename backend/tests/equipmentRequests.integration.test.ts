import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import {
  getEquipmentRequests,
  saveEquipmentRequest,
  removeEquipmentRequest,
  listEquipmentRequestEvents,
} from '../src/modules/equipmentSupport/requests.js';
import { createEquipmentRequestHandler } from '../src/modules/equipmentSupport/requestHandler.js';
import type { VercelResponse } from '../src/vercel.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
test('TC_E07S02_01 TC_E07S02_02 TC_E07S02_03 TC_E07S02_04 real event equipment request persistence, notifications and guards', async () => {
  const db = await loginDatabase();
  const q = db.pool.query.bind(db.pool);
  const coord = randomUUID(),
    other = randomUUID(),
    tech = randomUUID(),
    inactive = randomUUID(),
    org = randomUUID(),
    organiser = randomUUID(),
    a = randomUUID(),
    b = randomUUID(),
    draft = randomUUID(),
    wrong = randomUUID(),
    equipment = randomUUID(),
    projector = randomUUID();
  const actor: AuthenticatedUser = {
    id: coord,
    email: 'coord@example.test',
    role: 'event_coordinator',
    isActive: true,
    failedLoginCount: 0,
  };
  try {
    await q(
      "INSERT INTO client_organisations(id,name) VALUES ($1,'Equipment request test')",
      [org],
    );
    for (const [id, role, active] of [
      [coord, 'event_coordinator', true],
      [other, 'event_coordinator', true],
      [tech, 'technical_support_staff', true],
      [inactive, 'technical_support_staff', false],
      [organiser, 'event_organiser', true],
    ])
      await q(
        `INSERT INTO users(id,email,password_hash,full_name,role,is_active,client_org_id) VALUES($1,$2,'unused','Synthetic user',$3,$4,$5)`,
        [id, `${id}@example.test`, role, active, org],
      );
    const range = `[${new Date(Date.now() + 86400000).toISOString()},${new Date(Date.now() + 90000000).toISOString()})`;
    for (const [id, code, status, owner] of [
      [a, 'EVT-A', 'planning', coord],
      [b, 'EVT-B', 'approved', coord],
      [draft, 'EVT-DRAFT', 'draft', coord],
      [wrong, 'EVT-WRONG', 'planning', other],
    ])
      await q(
        `INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,event_range,expected_attendance,status) VALUES($1,$2,$3,$4,$5,$2,$6::tstzrange,10,$7)`,
        [id, code, organiser, owner, org, range, status],
      );
    for (const [id, name, stock] of [
      [equipment, 'Wireless Microphone', 10],
      [projector, 'Projector', 2],
    ])
      await q(
        `INSERT INTO equipment(id,name,category,description,total_quantity,home_location,operational_status) VALUES($1,$2,'Audio','Synthetic',$3,'Test Storage','available')`,
        [id, name, stock],
      );
    const input = { equipmentId: equipment, quantity: 2, notes: 'Handheld' };
    const created = await saveEquipmentRequest(db.pool, actor, 'EVT-A', input);
    assert.equal(created.status, 201);
    const id = created.body.requestId!;
    assert.equal(
      (
        await saveEquipmentRequest(db.pool, actor, 'EVT-A', {
          equipmentId: projector,
          quantity: 1,
        })
      ).status,
      201,
    );
    assert.equal(
      (await getEquipmentRequests(q, actor, 'EVT-A')).requests.length,
      2,
    );
    assert.equal(
      (await getEquipmentRequests(q, actor, 'EVT-B')).requests.length,
      0,
    );
    assert.equal(
      (
        await q(
          'SELECT count(*)::int AS n FROM notifications WHERE user_id=$1',
          [tech],
        )
      ).rows[0].n,
      2,
    );
    assert.equal(
      (
        await q(
          'SELECT count(*)::int AS n FROM notifications WHERE user_id=$1',
          [inactive],
        )
      ).rows[0].n,
      0,
    );
    assert.equal(
      (await q('SELECT count(*)::int AS n FROM notification_deliveries'))
        .rows[0].n,
      2,
    );
    const excessive = await saveEquipmentRequest(
      db.pool,
      actor,
      'EVT-A',
      { ...input, quantity: 15 },
      id,
    );
    assert.equal(excessive.status, 200);
    assert.deepEqual(excessive.body.warning, {
      name: 'Wireless Microphone',
      requested: 15,
      totalStock: 10,
    });
    assert.equal(
      (await getEquipmentRequests(q, actor, 'EVT-A')).requests.find(
        (r) => r.id === id,
      )?.quantity,
      15,
    );
    const notices = (await q('SELECT count(*)::int AS n FROM notifications'))
      .rows[0].n;
    const unchanged = await saveEquipmentRequest(
      db.pool,
      actor,
      'EVT-A',
      { ...input, quantity: 15 },
      id,
    );
    assert.equal(unchanged.body.changed, false);
    assert.equal(
      (await q('SELECT count(*)::int AS n FROM notifications')).rows[0].n,
      notices,
    );
    assert.equal(
      (await saveEquipmentRequest(db.pool, actor, 'EVT-A', input)).status,
      409,
    );
    await assert.rejects(
      saveEquipmentRequest(db.pool, actor, 'EVT-B', input, id),
      { status: 404 },
    );
    await assert.rejects(
      saveEquipmentRequest(db.pool, actor, 'EVT-DRAFT', input),
      { status: 409 },
    );
    await assert.rejects(
      saveEquipmentRequest(db.pool, actor, 'EVT-WRONG', input),
      { status: 403 },
    );
    await assert.rejects(
      getEquipmentRequests(q, { ...actor, id: other }, 'EVT-A'),
      { status: 403 },
    );
    assert.equal(
      (
        await q(
          "SELECT count(*)::int AS n FROM audit_logs WHERE action='Access Denied'",
        )
      ).rows[0].n,
      2,
    );
    const changed = await saveEquipmentRequest(
      db.pool,
      actor,
      'EVT-A',
      { ...input, quantity: 3 },
      id,
    );
    assert.equal(changed.status, 200);
    await q(
      `CREATE FUNCTION reject_request_delivery() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic outbox failure'; END $$`,
    );
    await q(
      'CREATE TRIGGER reject_request_delivery BEFORE INSERT ON notification_deliveries FOR EACH ROW EXECUTE FUNCTION reject_request_delivery()',
    );
    await assert.rejects(
      saveEquipmentRequest(
        db.pool,
        actor,
        'EVT-A',
        { ...input, quantity: 4 },
        id,
      ),
      /synthetic outbox failure/,
    );
    await assert.rejects(
      removeEquipmentRequest(db.pool, actor, 'EVT-A', id),
      /synthetic outbox failure/,
    );
    assert.equal(
      (await getEquipmentRequests(q, actor, 'EVT-A')).requests.find(
        (r) => r.id === id,
      )?.quantity,
      3,
    );
    await q('DROP TRIGGER reject_request_delivery ON notification_deliveries');
    await q(
      `INSERT INTO equipment_reservations(request_id,event_id,equipment_id,quantity_reserved,reservation_range,reserved_by) VALUES($1,$2,$3,2,$4::tstzrange,$5)`,
      [id, a, equipment, range, tech],
    );
    await assert.rejects(
      saveEquipmentRequest(
        db.pool,
        actor,
        'EVT-A',
        { ...input, quantity: 4 },
        id,
      ),
      { status: 409 },
    );
    await assert.rejects(removeEquipmentRequest(db.pool, actor, 'EVT-A', id), {
      status: 409,
    });
    assert.equal(
      (await getEquipmentRequests(q, actor, 'EVT-A')).requests.find(
        (r) => r.id === id,
      )?.reserved,
      true,
    );
    const otherRequest = (
      await getEquipmentRequests(q, actor, 'EVT-A')
    ).requests.find((r) => r.equipmentId === projector)!;
    await removeEquipmentRequest(db.pool, actor, 'EVT-A', otherRequest.id);
    assert.equal(
      (await getEquipmentRequests(q, actor, 'EVT-A')).requests.length,
      1,
    );
    await saveEquipmentRequest(db.pool, actor, 'EVT-B', {
      equipmentId: projector,
      quantity: 1,
    });
    assert.equal(
      (await getEquipmentRequests(q, actor, 'EVT-A')).requests[0].quantity,
      3,
    );
    const support = await getEquipmentRequests(
      q,
      { ...actor, id: tech, role: 'technical_support_staff' },
      'EVT-A',
    );
    assert.equal(support.canEdit, false);
    assert.equal(
      (
        await listEquipmentRequestEvents(q, {
          ...actor,
          id: tech,
          role: 'technical_support_staff',
        })
      ).events.length,
      2,
    );
    await assert.rejects(
      saveEquipmentRequest(
        db.pool,
        { ...actor, id: tech, role: 'technical_support_staff' },
        'EVT-A',
        input,
      ),
      { status: 403 },
    );
    await q('UPDATE equipment SET is_active=false WHERE id=$1', [projector]);
    await assert.rejects(
      saveEquipmentRequest(db.pool, actor, 'EVT-A', {
        equipmentId: projector,
        quantity: 1,
      }),
      { status: 409 },
    );
    // Concurrent creates serialize on the event and cannot duplicate a line.
    await q('UPDATE equipment SET is_active=true WHERE id=$1', [projector]);
    const concurrent = await Promise.all([
      saveEquipmentRequest(db.pool, actor, 'EVT-A', {
        equipmentId: projector,
        quantity: 1,
      }),
      saveEquipmentRequest(db.pool, actor, 'EVT-A', {
        equipmentId: projector,
        quantity: 1,
      }),
    ]);
    assert.deepEqual(concurrent.map((x) => x.status).sort(), [201, 409]);
    // Handler dispatch also runs against PostgreSQL, not a mocked transaction.
    const handlerItem = randomUUID();
    await q(
      "INSERT INTO equipment(id,name,category,total_quantity,home_location) VALUES($1,'Handler microphone','Audio',10,'Test Storage')",
      [handlerItem],
    );
    let status = 0;
    let responseBody: unknown;
    const response = {
      setHeader() {},
      status(code: number) {
        status = code;
        return {
          json(body: unknown) {
            responseBody = body;
          },
        };
      },
    } as unknown as VercelResponse;
    const handler = createEquipmentRequestHandler({
      authenticate: async () => actor,
      query: q,
      pool: () => db.pool,
      allowedOrigin: () => true,
    });
    const url = '/api/equipment?mode=requests&event=EVT-B';
    await handler(
      {
        method: 'POST',
        url,
        headers: {},
        body: { action: 'saveRequest', equipmentId: handlerItem, quantity: 1 },
      },
      response,
    );
    assert.equal(status, 201);
    const handlerId = (responseBody as { requestId: string }).requestId;
    await handler(
      {
        method: 'POST',
        url,
        headers: {},
        body: {
          action: 'saveRequest',
          id: handlerId,
          equipmentId: handlerItem,
          quantity: 1,
        },
      },
      response,
    );
    assert.equal(status, 200);
    assert.equal((responseBody as { changed: boolean }).changed, false);
    assert.equal((responseBody as { warning: unknown }).warning, null);
    await q('UPDATE equipment_requests SET technical_notes=NULL WHERE id=$1', [
      handlerId,
    ]);
    await handler(
      {
        method: 'POST',
        url,
        headers: {},
        body: {
          action: 'saveRequest',
          id: handlerId,
          equipmentId: handlerItem,
          quantity: 1,
        },
      },
      response,
    );
    assert.equal((responseBody as { changed: boolean }).changed, false);
    await assert.rejects(
      removeEquipmentRequest(db.pool, actor, 'EVT-B', randomUUID()),
      { status: 404 },
    );
    await assert.rejects(getEquipmentRequests(q, actor, 'EVT-MISSING'), {
      status: 403,
    });
    await handler(
      {
        method: 'POST',
        url,
        headers: {},
        body: { action: 'removeRequest', id: handlerId },
      },
      response,
    );
    assert.equal(status, 200);
    assert.equal((responseBody as { removed: boolean }).removed, true);
    assert.equal(
      (await q('SELECT id FROM equipment_requests WHERE id=$1', [handlerId]))
        .rowCount,
      0,
    );
    // Legacy events without a code use the event title in staff notices.
    await q(
      "UPDATE events SET event_code=NULL,title='Legacy planning event' WHERE id=$1",
      [b],
    );
    await saveEquipmentRequest(db.pool, actor, b, {
      equipmentId: handlerItem,
      quantity: 1,
    });
    assert.equal(
      (
        await q(
          "SELECT count(*)::int AS n FROM notifications WHERE event_id=$1 AND message LIKE 'Legacy planning event:%'",
          [b],
        )
      ).rows[0].n,
      1,
    );
  } finally {
    await db.close();
  }
});

// E07-S08 (SCRUM-181): Sessions on equipment requests, on PostgreSQL.
test('TC_E07S08_01 TC_E07S08_03 a request on a two-Session Event saves with its chosen Session, one is required, and another Event Session is refused', async () => {
  const db = await loginDatabase();
  const q = db.pool.query.bind(db.pool);
  const org = randomUUID(),
    coord = randomUUID(),
    tech = randomUUID(),
    organiser = randomUUID(),
    mic = randomUUID(),
    projector = randomUUID();
  const person = (id: string, role: AuthenticatedUser['role']): AuthenticatedUser => ({
    id, email: `${id}@example.test`, role, isActive: true, failedLoginCount: 0,
  });
  const actor = person(coord, 'event_coordinator');
  try {
    await q("INSERT INTO client_organisations(id,name) VALUES ($1,'E07-S08 request test')", [org]);
    for (const [id, role] of [[coord, 'event_coordinator'], [tech, 'technical_support_staff'], [organiser, 'event_organiser']])
      await q(`INSERT INTO users(id,email,password_hash,full_name,role,client_org_id) VALUES($1,$2,'unused','Synthetic user',$3,$4)`,
        [id, `${id}@example.test`, role, org]);
    for (const [id, name] of [[mic, 'Wireless Microphone'], [projector, 'Projector']])
      await q(`INSERT INTO equipment(id,name,category,description,total_quantity,home_location,operational_status)
        VALUES($1,$2,'Audio','Synthetic',10,'Store','available')`, [id, name]);
    // 1 Feb 2027, 9:00 am to 5:00 pm Singapore time; Session A 9 to 11, B 1 to 3 pm.
    const event = async (code: string) => (await q(
      `INSERT INTO events(event_code,organiser_id,coordinator_id,client_org_id,title,event_range,expected_attendance,status)
       VALUES($1,$2,$3,$4,$1,'[2027-02-01T01:00Z,2027-02-01T09:00Z)',10,'planning') RETURNING id`,
      [code, organiser, coord, org])).rows[0].id as string;
    const e1 = await event('EVT-S8A'), e2 = await event('EVT-S8B'), solo = await event('EVT-S8SOLO');
    const sessionA = (await q(`UPDATE sessions SET title='A',session_range='[2027-02-01T01:00Z,2027-02-01T03:00Z)'
      WHERE event_id=$1 RETURNING id`, [e1])).rows[0].id as string;
    const sessionB = (await q(`INSERT INTO sessions(event_id,title,session_range,expected_attendance)
      VALUES($1,'B','[2027-02-01T05:00Z,2027-02-01T07:00Z)',10) RETURNING id`, [e1])).rows[0].id as string;
    const sessionC = (await q('SELECT id FROM sessions WHERE event_id=$1', [e2])).rows[0].id as string;
    const stored = async (eventId: string) => (await q(
      'SELECT equipment_id,quantity_requested AS quantity,session_id FROM equipment_requests WHERE event_id=$1 ORDER BY created_at,id',
      [eventId])).rows;

    // D122: with two Sessions one must be chosen; TC_03: never another Event's or an unknown one.
    for (const [sessionId, message] of [
      [undefined, 'Choose a Session for this equipment request.'],
      [sessionC, 'Choose a Session of this event.'],
      [randomUUID(), 'Choose a Session of this event.'],
    ] as const)
      assert.deepEqual(await saveEquipmentRequest(db.pool, actor, 'EVT-S8A', { equipmentId: mic, quantity: 2, sessionId }), {
        status: 400, body: { error: 'validation_failed', errors: { sessionId: [message] } },
      });
    assert.deepEqual(await stored(e1), [], 'nothing is saved');
    // The database refuses a cross-Event link too (0014's composite key).
    await assert.rejects(q(`INSERT INTO equipment_requests(event_id,equipment_id,quantity_requested,requested_by,session_id)
      VALUES($1,$2,1,$3,$4)`, [e1, mic, coord, sessionC]), /equipment_requests_session_event_fk/);

    // TC_01: two microphones for Session B belong to the Event and Session B.
    const forB = await saveEquipmentRequest(db.pool, actor, 'EVT-S8A', { equipmentId: mic, quantity: 2, sessionId: sessionB });
    assert.equal(forB.status, 201);
    const forA = await saveEquipmentRequest(db.pool, actor, 'EVT-S8A', { equipmentId: mic, quantity: 1, sessionId: sessionA });
    assert.equal(forA.status, 201, 'the same item can be requested for another Session');
    assert.deepEqual(await stored(e1), [
      { equipment_id: mic, quantity: 2, session_id: sessionB },
      { equipment_id: mic, quantity: 1, session_id: sessionA },
    ]);
    assert.deepEqual(await stored(e2), [], 'other Events are unchanged');
    const again = await saveEquipmentRequest(db.pool, actor, 'EVT-S8A', { equipmentId: mic, quantity: 4, sessionId: sessionB });
    assert.equal(again.status, 409);
    assert.equal((again.body as { message: string }).message,
      'This equipment is already requested for this Session. Edit its existing request.');
    // D131: Technical Support's notice names the Session and its dates.
    const notices = (await q('SELECT message FROM notifications WHERE user_id=$1 ORDER BY created_at,id', [tech])).rows;
    assert.equal(notices[0].message,
      'EVT-S8A, Session "B", 1 Feb 2027, 1:00 pm – 3:00 pm: Wireless Microphone × 2 requested. Review the event\'s equipment requests.');

    // The read lists the Event's Sessions in order and each request's Session.
    const read = await getEquipmentRequests(q, actor, 'EVT-S8A');
    assert.deepEqual(read.sessions.map((s) => [s.id, s.title, s.number]), [[sessionA, 'A', 1], [sessionB, 'B', 2]]);
    assert.deepEqual(read.requests.map((r) => r.sessionId).sort(), [sessionA, sessionB].sort());

    // An edit that leaves the Session out keeps it; D123: one that names
    // another moves it while nothing is reserved.
    const bId = forB.body.requestId as string;
    assert.equal((await saveEquipmentRequest(db.pool, actor, 'EVT-S8A', { equipmentId: mic, quantity: 3 }, bId)).status, 200);
    const pId = (await saveEquipmentRequest(db.pool, actor, 'EVT-S8A', { equipmentId: projector, quantity: 1, sessionId: sessionA })).body.requestId as string;
    const unchanged = await saveEquipmentRequest(db.pool, actor, 'EVT-S8A', { equipmentId: projector, quantity: 1, sessionId: sessionA }, pId);
    assert.equal(unchanged.body.changed, false);
    const moved = await saveEquipmentRequest(db.pool, actor, 'EVT-S8A', { equipmentId: projector, quantity: 1, sessionId: sessionB }, pId);
    assert.equal(moved.body.changed, true);
    assert.equal((await q('SELECT session_id FROM equipment_requests WHERE id=$1', [pId])).rows[0].session_id, sessionB);
    await q(`INSERT INTO equipment_reservations(request_id,event_id,equipment_id,quantity_reserved,reservation_range,status,session_id)
      SELECT id,event_id,equipment_id,1,'[2027-02-01T05:00Z,2027-02-01T07:00Z)','reserved',session_id FROM equipment_requests WHERE id=$1`, [pId]);
    await assert.rejects(saveEquipmentRequest(db.pool, actor, 'EVT-S8A', { equipmentId: projector, quantity: 1, sessionId: sessionA }, pId),
      { status: 409, message: 'This request has been reserved and cannot be amended or removed here.' });

    // D132: once its Session is deleted (its reservation released first), the
    // request has no Session and can be given one again.
    const sessionZ = (await q(`INSERT INTO sessions(event_id,title,session_range,expected_attendance)
      VALUES($1,'Z','[2027-02-01T07:00Z,2027-02-01T09:00Z)',10) RETURNING id`, [e1])).rows[0].id as string;
    const zId = (await saveEquipmentRequest(db.pool, actor, 'EVT-S8A', { equipmentId: projector, quantity: 2, sessionId: sessionZ })).body.requestId as string;
    await q(`INSERT INTO equipment_reservations(request_id,event_id,equipment_id,quantity_reserved,reservation_range,status,session_id)
      VALUES($1,$2,$3,2,'[2027-02-01T07:00Z,2027-02-01T09:00Z)','released',$4)`, [zId, e1, projector, sessionZ]);
    await q('DELETE FROM sessions WHERE id=$1', [sessionZ]);
    assert.equal((await q('SELECT session_id FROM equipment_requests WHERE id=$1', [zId])).rows[0].session_id, null);
    const staffRead = await getEquipmentRequests(q, person(tech, 'technical_support_staff'), 'EVT-S8A');
    const orphan = staffRead.requests.find((r) => r.id === zId)!;
    assert.deepEqual([orphan.sessionId, orphan.reserved, orphan.freeQuantity], [null, true, null]);
    assert.equal(staffRead.requests.find((r) => r.id === bId)!.freeQuantity, 10, 'other lines show their Session free quantity');
    assert.deepEqual((await saveEquipmentRequest(db.pool, actor, 'EVT-S8A', { equipmentId: projector, quantity: 2 }, zId)).body,
      { error: 'validation_failed', errors: { sessionId: ['Choose a Session for this equipment request.'] } });
    assert.equal((await saveEquipmentRequest(db.pool, actor, 'EVT-S8A', { equipmentId: projector, quantity: 2, sessionId: sessionA }, zId)).status, 200);
    assert.equal((await q('SELECT session_id FROM equipment_requests WHERE id=$1', [zId])).rows[0].session_id, sessionA);

    // Removing a request names its Session on a multi-Session Event.
    assert.equal((await removeEquipmentRequest(db.pool, actor, 'EVT-S8A', bId)).status, 200);
    assert.match((await q('SELECT message FROM notifications WHERE user_id=$1 ORDER BY created_at DESC,id LIMIT 1', [tech])).rows[0].message,
      /^EVT-S8A, Session "B", 1 Feb 2027, 1:00 pm – 3:00 pm: Wireless Microphone removed\./);

    // D122: a single-Session Event needs no choice, and its notice is as before.
    const single = await saveEquipmentRequest(db.pool, actor, 'EVT-S8SOLO', { equipmentId: mic, quantity: 1 });
    assert.equal(single.status, 201);
    assert.equal((await stored(solo))[0].session_id, (await q('SELECT id FROM sessions WHERE event_id=$1', [solo])).rows[0].id);
    assert.equal((await q('SELECT message FROM notifications WHERE user_id=$1 ORDER BY created_at DESC,id LIMIT 1', [tech])).rows[0].message,
      'EVT-S8SOLO: Wireless Microphone × 1 requested. Review the event\'s equipment requests.');
    // An Event without a code is named by its title, as before.
    const uncoded = (await q(`INSERT INTO events(organiser_id,coordinator_id,client_org_id,title,event_range,expected_attendance,status)
      VALUES($1,$2,$3,'Uncoded Gala','[2027-02-01T01:00Z,2027-02-01T09:00Z)',10,'planning') RETURNING id`, [organiser, coord, org])).rows[0].id as string;
    assert.equal((await saveEquipmentRequest(db.pool, actor, uncoded, { equipmentId: mic, quantity: 1 })).status, 201);
    assert.match((await q('SELECT message FROM notifications WHERE user_id=$1 ORDER BY created_at DESC,id LIMIT 1', [tech])).rows[0].message,
      /^Uncoded Gala: Wireless Microphone × 1 requested\./);
  } finally {
    await db.close();
  }
});
