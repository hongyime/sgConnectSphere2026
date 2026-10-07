// E07-S07 (SCRUM-57) against PostgreSQL: assigning a free colleague, the
// overlap check naming the clashing event, removal freeing the slot, the
// replacement going through the same check, notifications for both, the
// schedule, and two simultaneous assignments of one colleague. Needs
// TEST_DATABASE_URL pointing at a disposable local database
// (see tests/helpers/loginDatabase.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import {
  assignTechnician, getRequest, listQueue, mySchedule, removeAssignment,
} from '../src/modules/equipmentSupport/staffAssignments.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

test('TC_E07S07_01 TC_E07S07_02 TC_E07S07_03 TC_E07S07_04 TC_E07S07_05 TC_E07S07_06 technician assignments against PostgreSQL', async () => {
  const db = await loginDatabase();
  const { pool } = db;
  const q = pool.query.bind(pool);
  const org = randomUUID(), organiser = randomUUID(), coordId = randomUUID();
  const techA = randomUUID(), techB = randomUUID(), techC = randomUUID(), techOff = randomUUID();
  const as = (id: string, role: AuthenticatedUser['role'] = 'technical_support_staff'): AuthenticatedUser =>
    ({ id, email: `${id}@example.test`, role, isActive: true, failedLoginCount: 0 });
  try {
    await q(`INSERT INTO client_organisations(id,name) VALUES ($1,'Test client')`, [org]);
    const people: Array<[string, string, string, boolean]> = [
      [organiser, 'event_organiser', 'Organiser', true], [coordId, 'event_coordinator', 'Coordinator', true],
      [techA, 'technical_support_staff', 'Tech A', true], [techB, 'technical_support_staff', 'Tech B', true],
      [techC, 'technical_support_staff', 'Tech C', true], [techOff, 'technical_support_staff', 'Tech Off', false],
    ];
    for (const [id, role, fullName, active] of people) {
      await q(`INSERT INTO users(id,email,password_hash,full_name,role,client_org_id,is_active) VALUES ($1,$2,'unused',$3,$4,$5,$6)`,
        [id, `${id}@example.test`, fullName, role, org, active]);
    }
    async function eventWithRequest(code: string, title: string, status: string, range: string, required = true) {
      const eventId = randomUUID(), requestId = randomUUID();
      await q(`INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,event_range,expected_attendance,status)
        VALUES ($1,$2,$3,$4,$5,$6,$7::tstzrange,100,$8)`, [eventId, code, organiser, coordId, org, title, range, status]);
      await q(`INSERT INTO tech_support_requests(id,event_id,support_required,support_description,support_range,status,requested_by)
        VALUES ($1,$2,$3,'1 AV technician',$4::tstzrange,'open',$5)`, [requestId, eventId, required, range, coordId]);
      return { eventId, requestId };
    }
    const conference = await eventWithRequest('EVT-TC', 'Tech Conference 2026', 'planning', '[2026-11-12 09:00+08,2026-11-12 12:00+08)');
    const charity = await eventWithRequest('EVT-CR', 'Charity Run', 'approved', '[2026-11-12 10:00+08,2026-11-12 13:00+08)');
    const later = await eventWithRequest('EVT-LT', 'Later Gala', 'confirmed', '[2026-11-12 13:00+08,2026-11-12 15:00+08)');
    const dropped = await eventWithRequest('EVT-XX', 'Cancelled Fair', 'cancelled', '[2026-11-20 09:00+08,2026-11-20 12:00+08)');
    await eventWithRequest('EVT-NO', 'No Support Day', 'planning', '[2026-11-21 09:00+08,2026-11-21 12:00+08)', false);
    const assign = (requestId: string, staff: string, actor = techA) => assignTechnician(pool, as(actor), { action: 'assign', request: requestId, staff });
    const statusOf = async (requestId: string) => (await q(`SELECT status FROM tech_support_requests WHERE id=$1`, [requestId])).rows[0].status;
    const notices = async (userId: string) => (await q(`SELECT title, message FROM notifications WHERE user_id=$1 ORDER BY created_at, title`, [userId])).rows;

    // The queue shows staffable requests only: not cancelled events, not "no support needed".
    const queue = await listQueue(q, as(techA));
    assert.deepEqual(queue.requests.map(r => r.eventCode).sort(), ['EVT-CR', 'EVT-LT', 'EVT-TC']);

    // Tech B goes to the Charity Run first.
    const first = await assign(charity.requestId, techB);
    assert.equal(first.status, 201);
    assert.equal(await statusOf(charity.requestId), 'staffed');

    // TC_E07S07_03: Tech B overlaps the conference (10:00-12:00), so the assignment is blocked and names the Charity Run.
    const blocked = await assign(conference.requestId, techB);
    assert.equal(blocked.status, 409);
    assert.equal((blocked.body as { error: string }).error, 'Tech B is already assigned to EVT-CR Charity Run at an overlapping time.');
    assert.equal((await q(`SELECT * FROM tech_staff_assignments WHERE request_id=$1`, [conference.requestId])).rowCount, 0);
    const detail = await getRequest(q, as(techA), conference.requestId);
    const byName = Object.fromEntries(detail.candidates.map(c => [c.name, c]));
    assert.deepEqual(Object.keys(byName), ['Tech A', 'Tech B', 'Tech C']);
    assert.deepEqual(byName['Tech B']!.conflicts.map(c => c.title), ['Charity Run']);
    assert.deepEqual(byName['Tech C']!.conflicts, []);
    assert.equal(detail.canAssign, true);

    // TC_E07S07_01 and _02: Tech C is free, is assigned, is notified and sees it on their schedule.
    const assigned = await assign(conference.requestId, techC);
    assert.equal(assigned.status, 201);
    const assignmentId = (assigned.body as { assignment: { id: string } }).assignment.id;
    assert.equal(await statusOf(conference.requestId), 'staffed');
    const schedule = await mySchedule(q, as(techC));
    assert.deepEqual(schedule.assignments.map((a: Record<string, unknown>) => [a.eventCode, a.eventTitle]), [['EVT-TC', 'Tech Conference 2026']]);
    assert.equal(new Date(schedule.assignments[0].startsAt as string).toISOString(), '2026-11-12T01:00:00.000Z');
    // Tech C on the conference and the later gala (13:00) does not clash: the ranges only touch.
    assert.equal((await assign(later.requestId, techC)).status, 201);
    assert.equal((await mySchedule(q, as(techC))).assignments.length, 2);
    await assert.rejects(assign(conference.requestId, techC), { status: 409, message: 'Tech C is already assigned to this request.' });

    // TC_E07S07_04: removing frees the slot and the request goes back to open.
    const removed = await removeAssignment(pool, as(techA), { action: 'remove', assignment: assignmentId });
    assert.deepEqual(removed.body, { removed: true, requestStatus: 'open' });
    assert.equal(await statusOf(conference.requestId), 'open');
    assert.deepEqual((await mySchedule(q, as(techC))).assignments.map((a: Record<string, unknown>) => a.eventCode), ['EVT-LT']);
    assert.equal((await q(`SELECT status FROM tech_staff_assignments WHERE id=$1`, [assignmentId])).rows[0].status, 'released');
    await assert.rejects(removeAssignment(pool, as(techA), { action: 'remove', assignment: assignmentId }), { status: 409 });

    // TC_E07S07_06: one notice for the assignment and a separate one for the removal.
    const techCNotices = (await notices(techC)).filter(n => n.message.includes('Tech Conference 2026'));
    assert.deepEqual(techCNotices.map(n => n.title).sort(), ['Technical support assignment', 'Technical support assignment removed']);

    // TC_E07S07_05: a replacement goes through the same check. Tech B is still blocked; Tech A is free.
    assert.equal((await assign(conference.requestId, techB)).status, 409);
    const replacement = await assign(conference.requestId, techA);
    assert.equal(replacement.status, 201);

    // Two people assign Tech C to the overlapping conference and Charity Run at once:
    // one wins, the other is refused (by the check, or by the exclusion constraint).
    await removeAssignment(pool, as(techA), { action: 'remove', assignment: (await q(`SELECT id FROM tech_staff_assignments WHERE staff_id=$1 AND status='assigned'`, [techC])).rows[0].id });
    const race = await Promise.all([assign(conference.requestId, techC), assign(charity.requestId, techC, techB)]);
    assert.deepEqual(race.map(r => r.status).sort(), [201, 409]);
    assert.equal((await q(`SELECT * FROM tech_staff_assignments WHERE staff_id=$1 AND status='assigned'`, [techC])).rowCount, 1);
    assert.match((race.find(r => r.status === 409)!.body as { error: string }).error, /^Tech C is already assigned to EVT-(TC Tech Conference 2026|CR Charity Run) at an overlapping time\.$/);

    // Refusals: cancelled events, inactive colleagues, other roles.
    await assert.rejects(assign(dropped.requestId, techC), { status: 409, message: 'Technicians can only be assigned to approved, planning or confirmed events.' });
    await assert.rejects(assign(later.requestId, techOff), { status: 400, message: 'Only active Technical Support Staff can be assigned.' });
    await assert.rejects(listQueue(q, as(coordId, 'event_coordinator')), { status: 403 });
    assert.equal((await q(`SELECT * FROM audit_logs WHERE actor_id=$1 AND action='Access Denied'`, [coordId])).rowCount, 1);

    // Removal still works after the event is cancelled, so nobody's time stays blocked.
    await q(`UPDATE events SET status='cancelled' WHERE id=$1`, [conference.eventId]);
    const techAId = (await q(`SELECT id FROM tech_staff_assignments WHERE staff_id=$1 AND request_id=$2 AND status='assigned'`, [techA, conference.requestId])).rows[0].id;
    assert.equal((await removeAssignment(pool, as(techB), { action: 'remove', assignment: techAId })).status, 200);
  } finally {
    await db.close();
  }
});
