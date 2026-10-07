import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import { checkEquipmentAvailability } from '../src/modules/equipmentSupport/availability.js';

test('TC_E07S03_01 TC_E07S03_02 TC_E07S03_03 real PostgreSQL availability, damaged stock, location and independent periods', async () => {
  const db = await loginDatabase();
  const q = db.pool.query.bind(db.pool);
  const user = {
    id: randomUUID(),
    email: 'support@example.test',
    role: 'technical_support_staff' as const,
    isActive: true,
    failedLoginCount: 0,
  };
  const org = randomUUID(),
    organiser = randomUUID(),
    coord = randomUUID(),
    event = randomUUID(),
    item = randomUUID(),
    projector = randomUUID(),
    maint = randomUUID(),
    retired = randomUUID(),
    request = randomUUID();
  async function check(start: string, end: string, id = item) {
    return (
      await checkEquipmentAvailability(
        q,
        user,
        new URLSearchParams({ start, end, id }),
      )
    ).equipment[0];
  }
  try {
    await q(
      "INSERT INTO client_organisations(id,name) VALUES($1,'Availability test')",
      [org],
    );
    for (const [id, role] of [
      [user.id, 'technical_support_staff'],
      [organiser, 'event_organiser'],
      [coord, 'event_coordinator'],
    ])
      await q(
        "INSERT INTO users(id,email,password_hash,full_name,role,client_org_id) VALUES($1,$2,'synthetic','Test user',$3,$4)",
        [id, `${id}@example.test`, role, org],
      );
    await q(
      "INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,event_range,expected_attendance,status) VALUES($1,'EVT-AVAIL',$2,$3,$4,'Availability test','[2026-11-15 09:00+08,2026-11-15 12:00+08)',10,'planning')",
      [event, organiser, coord, org],
    );
    for (const [id, name, status, active] of [
      [item, 'Microphone', 'available', true],
      [projector, 'Projector', 'available', true],
      [maint, 'Maintenance item', 'maintenance', true],
      [retired, 'Retired item', 'retired', false],
    ])
      await q(
        "INSERT INTO equipment(id,name,category,total_quantity,home_location,operational_status,is_active) VALUES($1,$2,'Test',10,'Grand Ballroom',$3,$4)",
        [id, name, status, active],
      );
    await q(
      'INSERT INTO equipment_requests(id,event_id,equipment_id,quantity_requested,requested_by) VALUES($1,$2,$3,3,$4)',
      [request, event, item, coord],
    );
    await q(
      "INSERT INTO equipment_reservations(request_id,event_id,equipment_id,quantity_reserved,reservation_range,reserved_by) VALUES($1,$2,$3,3,'[2026-11-15 09:00+08,2026-11-15 12:00+08)',$4)",
      [request, event, item, user.id],
    );
    await q(
      "INSERT INTO equipment_unavailability(equipment_id,quantity,unavailable_range,reason) VALUES($1,2,'[2026-11-15 09:00+08,2026-11-15 12:00+08)','Damaged')",
      [item],
    );
    const morning = await check(
      '2026-11-15T09:00:00+08:00',
      '2026-11-15T12:00:00+08:00',
    );
    assert.equal(morning.freeQuantity, 5);
    assert.equal(morning.reservedQuantity, 3);
    assert.equal(morning.unavailableQuantity, 2);
    const other = await check(
      '2026-11-15T09:00:00+08:00',
      '2026-11-15T12:00:00+08:00',
      projector,
    );
    assert.equal(other.freeQuantity, 10);
    assert.equal(other.location, 'Grand Ballroom');
    assert.equal(
      (await check('2026-11-15T12:00:00+08:00', '2026-11-15T14:00:00+08:00'))
        .freeQuantity,
      10,
    );
    assert.equal(
      (await check('2026-11-15T14:00:00+08:00', '2026-11-15T17:00:00+08:00'))
        .freeQuantity,
      10,
    );
    assert.equal(
      (
        await check(
          '2026-11-15T09:00:00+08:00',
          '2026-11-15T12:00:00+08:00',
          maint,
        )
      ).freeQuantity,
      0,
    );
    await assert.rejects(
      check('2026-11-15T09:00:00+08:00', '2026-11-15T12:00:00+08:00', retired),
      { status: 404 },
    );
    await q("UPDATE equipment_reservations SET status='released'");
    assert.equal(
      (await check('2026-11-15T09:00:00+08:00', '2026-11-15T12:00:00+08:00'))
        .freeQuantity,
      8,
    );
    await q('DELETE FROM equipment_unavailability');
    // A reservation at 09:00-12:00 cannot consume capacity at the adjacent 12:00 start.
    await q(
      "UPDATE equipment_reservations SET status='partial',quantity_reserved=10",
    );
    assert.equal(
      (await check('2026-11-15T09:00:00+08:00', '2026-11-15T12:00:00+08:00'))
        .freeQuantity,
      0,
    );
    assert.equal(
      (await check('2026-11-15T12:00:00+08:00', '2026-11-15T13:00:00+08:00'))
        .freeQuantity,
      10,
    );
    await q(
      "INSERT INTO equipment_reservations(request_id,event_id,equipment_id,quantity_reserved,reservation_range,status) VALUES($1,$2,$3,10,'[2026-11-15 12:00+08,2026-11-15 13:00+08)','reserved')",
      [request, event, item],
    );
    assert.equal(
      (await check('2026-11-15T09:00:00+08:00', '2026-11-15T13:00:00+08:00'))
        .freeQuantity,
      0,
    );
  } finally {
    await db.close();
  }
});
