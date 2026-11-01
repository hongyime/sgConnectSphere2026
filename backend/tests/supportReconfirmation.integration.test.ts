// E10-S02 follow-up (SCRUM-244, T-104) against PostgreSQL: a date change flags
// staffed Technical Support with the time it moves to, readiness holds a
// reverted event out of Safety Review, and Technical Support Staff reconfirm
// the request: it and its assignments move, the flag clears, the Activity log
// and the Coordinator record it, and the event re-enters Safety Review. A
// colleague busy at the new time refuses it. Each test owns a fresh schema
// (loginDatabase), with every migration applied.
//
// Traceability: story E10-S02 / SCRUM-71, subtask SCRUM-244; cases
// TC_E10S02_05, _08, _10 to _13 in docs/testing/cases/E10.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import { assessArrangementImpact, loadArrangementSnapshot } from '../src/modules/changeManagement/arrangementImpact.js';
import { applyArrangementImpact } from '../src/modules/changeManagement/eventChange.js';
import { updateEventInformationWithNotifications } from '../src/modules/eventNotifications/informationChange.js';
import { loadReadiness } from '../src/modules/eventReadiness/readiness.js';
import { enterSafetyReviewIfReady } from '../src/modules/eventReadiness/autoSafetyReview.js';
import { listEventActivity } from '../src/modules/eventVisibility/service.js';
import {
  NOTHING_TO_RECONFIRM, NOT_RECONFIRMABLE, listSupportToReconfirm, reconfirmSupport,
} from '../src/modules/equipmentSupport/supportReconfirmation.js';

const range = (day: string, from: string, to: string) => `[${day} ${from}+08,${day} ${to}+08)`;
const iso = (day: string, time: string) => new Date(`${day}T${time}:00+08:00`).toISOString();

// "Charity Run" 5 Dec 07:00-12:00 (Singapore), was Confirmed and is back in
// Planning, with a Confirmed venue booking, no equipment, and a staffed
// support request 06:00-12:00 with Tech A on it.
async function fixture() {
  const db = await loginDatabase();
  const q = (sql: string, values: unknown[] = []) => db.pool.query(sql, values);
  try {
    const org = randomUUID();
    await q("INSERT INTO client_organisations(id,name) VALUES($1,'T-104 test')", [org]);
    const user = async (role: string, fullName: string): Promise<AuthenticatedUser> => {
      const id = randomUUID();
      await q('INSERT INTO users(id,email,password_hash,full_name,role,client_org_id) VALUES($1,$2,\'synthetic\',$3,$4,$5)',
        [id, `${id}@example.test`, fullName, role, org]);
      return { id, email: `${id}@example.test`, role: role as AuthenticatedUser['role'], clientOrgId: org, isActive: true, failedLoginCount: 0 };
    };
    const organiser = await user('event_organiser', 'Organiser A');
    const coordinator = await user('event_coordinator', 'Coordinator A');
    const techA = await user('technical_support_staff', 'Tech A');
    const techB = await user('technical_support_staff', 'Tech B');
    await user('safety_officer', 'Safety Officer A');
    const event = randomUUID();
    await q(`INSERT INTO events(id,event_code,title,organiser_id,coordinator_id,client_org_id,status,event_range,expected_attendance,equipment_requirements)
      VALUES($1,'EVT-1082','Charity Run',$2,$3,$4,'planning',$5,150,'None required')`,
    [event, organiser.id, coordinator.id, org, range('2026-12-05', '07:00', '12:00')]);
    await q(`INSERT INTO audit_logs(actor_id,entity_type,entity_id,event_id,action,field_changed,old_value,new_value)
      VALUES($1,'event',$2,$2,'Status changed to confirmed','status','safety_review','confirmed')`, [coordinator.id, event]);
    const session = (await q('SELECT id FROM sessions WHERE event_id=$1', [event])).rows[0].id as string;
    const venue = randomUUID();
    await q("INSERT INTO venues(id,name,location,max_capacity,opens_at,closes_at) VALUES($1,'Garden Hall','Test',300,'00:00','23:59')", [venue]);
    const booking = (await q("INSERT INTO venue_bookings(event_id,session_id,venue_id,booking_range,status) VALUES($1,$2,$3,$4,'confirmed') RETURNING id",
      [event, session, venue, range('2026-12-05', '07:00', '12:00')])).rows[0].id as string;
    const support = randomUUID();
    await q(`INSERT INTO tech_support_requests(id,event_id,support_required,support_description,support_range,status,requested_by)
      VALUES($1,$2,true,'Sound desk',$3,'staffed',$4)`, [support, event, range('2026-12-05', '06:00', '12:00'), coordinator.id]);
    await q('INSERT INTO tech_staff_assignments(request_id,event_id,staff_id,assignment_range) VALUES($1,$2,$3,$4)',
      [support, event, techA.id, range('2026-12-05', '06:00', '12:00')]);
    const row = async () => (await q(`SELECT requires_reconfirmation AS flagged, lower(support_range) AS starts, upper(support_range) AS ends,
        lower(reconfirm_range) AS to_start, upper(reconfirm_range) AS to_end FROM tech_support_requests WHERE id=$1`, [support])).rows[0];
    const assignment = async () => (await q(`SELECT lower(assignment_range) AS starts, upper(assignment_range) AS ends
      FROM tech_staff_assignments WHERE request_id=$1 AND status='assigned'`, [support])).rows.map(r => [r.starts.toISOString(), r.ends.toISOString()]);
    const readiness = async () => {
      const e = (await q(`SELECT id, event_code, title, status::text AS status, lower(event_range) AS starts_at, upper(event_range) AS ends_at,
        equipment_requirements FROM events WHERE id=$1`, [event])).rows[0];
      return loadReadiness(q, e);
    };
    // Precondition for TC_12: Venue Staff already reconfirmed the booking at the new time.
    const venueReconfirmed = async (day: string) => q(`UPDATE venue_bookings SET requires_reconfirmation=false, booking_range=$2 WHERE id=$1`,
      [booking, range(day, '07:00', '12:00')]);
    const moveTo = (day: string) => updateEventInformationWithNotifications(db.pool, coordinator,
      event, { startAt: iso(day, '07:00'), endAt: iso(day, '12:00') });
    return { db, q, event, org, organiser, coordinator, techA, techB, support, booking, row, assignment, readiness, venueReconfirmed, moveTo };
  } catch (error) { await db.close(); throw error; }
}

test('TC_E10S02_11 and TC_E10S02_12: a date change flags the staffed request; reconfirming it moves it and re-enters Safety Review', async () => {
  const f = await fixture();
  try {
    const saved = await f.moveTo('2026-12-12');
    assert.deepEqual(saved.impact.supports.map(s => [s.id, s.shiftMs]), [[f.support, 7 * 24 * 60 * 60 * 1000]]);
    const flagged = await f.row();
    assert.equal(flagged.flagged, true);
    assert.deepEqual([flagged.starts.toISOString(), flagged.to_start.toISOString(), flagged.to_end.toISOString()],
      [iso('2026-12-05', '06:00'), iso('2026-12-12', '06:00'), iso('2026-12-12', '12:00')], 'kept time: a week later, same length');
    const logged = (await f.q(`SELECT action FROM audit_logs WHERE entity_type='tech_support_request' AND entity_id=$1`, [f.support])).rows;
    assert.deepEqual(logged.map(r => r.action), ['Reconfirmation required: date or time changed']);
    assert.equal((await f.q(`SELECT count(*)::int AS n FROM notifications WHERE user_id=$1 AND message LIKE '%need reconfirmation%'`, [f.techA.id])).rows[0].n, 1);

    // TC_11: with the venue already reconfirmed, the support request alone keeps it out of Safety Review.
    await f.venueReconfirmed('2026-12-12');
    const blocked = await f.readiness();
    assert.deepEqual(blocked.blockers.map(b => b.kind), ['support-needs-review']);
    const client = await f.db.pool.connect();
    try { assert.equal(await enterSafetyReviewIfReady(client, f.event, f.coordinator.id), false); } finally { client.release(); }
    assert.equal((await f.q('SELECT status FROM events WHERE id=$1', [f.event])).rows[0].status, 'planning');

    // The list Technical Support Staff work from.
    const listed = await listSupportToReconfirm(f.q, f.techB);
    assert.deepEqual(listed.requests.map(r => [r.id, r.eventCode, r.assignees.map(a => a.name)]), [[f.support, 'EVT-1082', ['Tech A']]]);
    assert.deepEqual([new Date(listed.requests[0]!.startsAt).toISOString(), new Date(listed.requests[0]!.reconfirmFor.startsAt).toISOString()],
      [iso('2026-12-05', '06:00'), iso('2026-12-12', '06:00')]);

    // TC_12: Tech B reconfirms.
    const result = await reconfirmSupport(f.db.pool, f.techB, { action: 'reconfirm', request: f.support });
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { request: { id: f.support, startsAt: iso('2026-12-12', '06:00'), endsAt: iso('2026-12-12', '12:00') },
      coordinatorNotified: true, enteredSafetyReview: true });
    const after = await f.row();
    assert.deepEqual([after.flagged, after.starts.toISOString(), after.ends.toISOString(), after.to_start],
      [false, iso('2026-12-12', '06:00'), iso('2026-12-12', '12:00'), null]);
    assert.deepEqual(await f.assignment(), [[iso('2026-12-12', '06:00'), iso('2026-12-12', '12:00')]], 'Tech A moves with it');
    const entry = (await f.q(`SELECT actor_id, action, field_changed, old_value, new_value FROM audit_logs
      WHERE entity_id=$1 AND action='Support Reconfirmed'`, [f.support])).rows;
    assert.deepEqual(entry, [{ actor_id: f.techB.id, action: 'Support Reconfirmed', field_changed: 'support_range',
      old_value: `${iso('2026-12-05', '06:00')} to ${iso('2026-12-05', '12:00')}`, new_value: `${iso('2026-12-12', '06:00')} to ${iso('2026-12-12', '12:00')}` }]);
    // The Coordinator's Activity log shows it; the Organiser's does not, as for booking decisions.
    const staffLog = (await listEventActivity(f.q, f.event, { includeBookings: true })).rows;
    assert.deepEqual(staffLog.filter(r => r.entity_type === 'tech_support_request').map(r => [r.action, r.actor_name]), [['Support Reconfirmed', 'Tech B']],
      'the reconfirmation, not the flag row');
    assert.ok(!(await listEventActivity(f.q, f.event)).rows.some(r => r.entity_type === 'tech_support_request'));
    const told = async (userId: string) => (await f.q('SELECT title, message FROM notifications WHERE user_id=$1 ORDER BY created_at, title', [userId])).rows;
    const coordinatorNotice = (await told(f.coordinator.id)).find(n => n.title === 'Technical support reconfirmed');
    assert.match(coordinatorNotice?.message ?? '', /^Tech B reconfirmed technical support for EVT-1082 Charity Run \(.*12 Dec.*\): Sound desk\. It no longer needs reconfirmation\.$/);
    assert.ok((await told(f.coordinator.id)).some(n => n.title === 'Back in Safety Review'));
    assert.match((await told(f.techA.id)).find(n => n.title === 'Technical support assignment moved')?.message ?? '', /^Your assignment to EVT-1082 Charity Run is now .*12 Dec/);
    assert.ok(!(await told(f.techB.id)).some(n => n.title === 'Technical support assignment moved'), 'the actor is not told about their own action');
    assert.equal((await f.q('SELECT status FROM events WHERE id=$1', [f.event])).rows[0].status, 'safety_review');
    assert.ok((await f.q(`SELECT 1 FROM notifications n JOIN users u ON u.id=n.user_id WHERE u.role='safety_officer' AND n.event_id=$1`, [f.event])).rowCount);
    assert.deepEqual((await listSupportToReconfirm(f.q, f.techB)).requests, [], 'gone from the list');

    // Reconfirming again finds nothing to do.
    await assert.rejects(reconfirmSupport(f.db.pool, f.techB, { request: f.support }), (e: { status?: number; message?: string }) =>
      e.status === 409 && e.message === NOT_RECONFIRMABLE, 'the event is in Safety Review now');
  } finally { await f.db.close(); }
});

test('TC_E10S02_13: a technician busy at the new time refuses the reconfirmation; nothing moves and the flag stays', async () => {
  const f = await fixture();
  try {
    const other = randomUUID(), otherRequest = randomUUID();
    await f.q(`INSERT INTO events(id,event_code,title,organiser_id,coordinator_id,client_org_id,status,event_range,expected_attendance)
      VALUES($1,'EVT-2001','Year-end Gala',$2,$3,$4,'planning',$5,100)`, [other, f.organiser.id, f.coordinator.id, f.org, range('2026-12-12', '10:00', '14:00')]);
    await f.q(`INSERT INTO tech_support_requests(id,event_id,support_required,support_description,support_range,status,requested_by)
      VALUES($1,$2,true,'Lighting',$3,'staffed',$4)`, [otherRequest, other, range('2026-12-12', '10:00', '14:00'), f.coordinator.id]);
    await f.q('INSERT INTO tech_staff_assignments(request_id,event_id,staff_id,assignment_range) VALUES($1,$2,$3,$4)',
      [otherRequest, other, f.techA.id, range('2026-12-12', '10:00', '14:00')]);
    await f.moveTo('2026-12-12');
    const result = await reconfirmSupport(f.db.pool, f.techB, { request: f.support });
    assert.equal(result.status, 409);
    assert.equal((result.body as { error: string }).error, 'Tech A is already assigned to EVT-2001 Year-end Gala at an overlapping time (12 Dec 2026, 10:00 am – 2:00 pm).');
    const row = await f.row();
    assert.deepEqual([row.flagged, row.starts.toISOString(), row.to_start.toISOString()], [true, iso('2026-12-05', '06:00'), iso('2026-12-12', '06:00')]);
    assert.deepEqual(await f.assignment(), [[iso('2026-12-05', '06:00'), iso('2026-12-05', '12:00')]]);
    assert.equal((await f.q(`SELECT count(*)::int AS n FROM audit_logs WHERE action='Support Reconfirmed'`)).rows[0].n, 0);
  } finally { await f.db.close(); }
});

test('T-104: moved again before reconfirming, the request moves on from its kept time; unflagged requests cannot be reconfirmed', async () => {
  const f = await fixture();
  try {
    await assert.rejects(reconfirmSupport(f.db.pool, f.techA, { request: f.support }), (e: { status?: number; message?: string }) =>
      e.status === 409 && e.message === NOTHING_TO_RECONFIRM);
    await f.moveTo('2026-12-12');
    await f.moveTo('2026-12-13');
    const row = await f.row();
    assert.deepEqual([row.starts.toISOString(), row.to_start.toISOString(), row.to_end.toISOString()],
      [iso('2026-12-05', '06:00'), iso('2026-12-13', '06:00'), iso('2026-12-13', '12:00')], 'eight days on, not one');
  } finally { await f.db.close(); }
});

test('T-104 (#399 review): a Session moved twice before reconfirming is matched against the kept time, so the request moves on with it', async () => {
  const f = await fixture();
  try {
    // An earlier Briefing keeps the Event start fixed, so only Session A moves.
    await f.q(`UPDATE events SET event_range=$2 WHERE id=$1`, [f.event, `[2026-12-04 09:00+08,2026-12-14 17:00+08)`]);
    const sessionA = (await f.q('SELECT id FROM sessions WHERE event_id=$1', [f.event])).rows[0].id as string;
    await f.q(`UPDATE sessions SET session_range=$2 WHERE id=$1`, [sessionA, range('2026-12-05', '07:00', '12:00')]);
    await f.q(`INSERT INTO sessions(id,event_id,title,session_range,expected_attendance) VALUES(gen_random_uuid(),$1,'Briefing',$2,20)`,
      [f.event, range('2026-12-04', '09:00', '10:00')]);
    const moveSessionA = async (day: string) => {
      const client = await f.db.pool.connect();
      try {
        await client.query('BEGIN');
        const query = (sql: string, values?: unknown[]) => client.query(sql, values);
        const before = await loadArrangementSnapshot(query, f.event);
        await client.query('UPDATE sessions SET session_range=$2 WHERE id=$1', [sessionA, range(day, '07:00', '12:00')]);
        const impact = assessArrangementImpact(before, await loadArrangementSnapshot(query, f.event));
        await applyArrangementImpact(query, f.coordinator.id, f.event, impact);
        await client.query('COMMIT');
        return impact;
      } finally { client.release(); }
    };
    assert.deepEqual((await moveSessionA('2026-12-12')).supports.map(s => [s.id, s.shiftMs]), [[f.support, 7 * 24 * 60 * 60 * 1000]]);
    const second = await moveSessionA('2026-12-13');
    assert.deepEqual(second.supports.map(s => [s.id, s.startsAt, s.shiftMs]), [[f.support, iso('2026-12-12', '06:00'), 24 * 60 * 60 * 1000]],
      'the 12 Dec Session overlaps the request waiting on 12 Dec, not its staffed 5 Dec time');
    const row = await f.row();
    assert.deepEqual([row.flagged, row.starts.toISOString(), row.to_start.toISOString(), row.to_end.toISOString()],
      [true, iso('2026-12-05', '06:00'), iso('2026-12-13', '06:00'), iso('2026-12-13', '12:00')], 'reconfirming moves it to 13 Dec');
  } finally { await f.db.close(); }
});

test('TC_E10S02_05 and TC_E10S02_10: a Session change flags only overlapping staffed support, moved as far as that Session (SQL Session change)', async () => {
  const f = await fixture();
  try {
    // A second Session in the afternoon, with its own staffed request; and an open one, already outstanding.
    await f.q(`UPDATE events SET event_range=$2 WHERE id=$1`, [f.event, range('2026-12-05', '07:00', '17:00')]);
    const sessionA = (await f.q('SELECT id FROM sessions WHERE event_id=$1', [f.event])).rows[0].id as string;
    await f.q(`UPDATE sessions SET session_range=$2 WHERE id=$1`, [sessionA, range('2026-12-05', '07:00', '12:00')]);
    await f.q(`INSERT INTO sessions(id,event_id,title,session_range,expected_attendance) VALUES(gen_random_uuid(),$1,'Afternoon',$2,100)`,
      [f.event, range('2026-12-05', '14:00', '17:00')]);
    const afternoon = randomUUID(), open = randomUUID();
    await f.q(`INSERT INTO tech_support_requests(id,event_id,support_required,support_description,support_range,status,requested_by)
      VALUES($1,$2,true,'Lighting',$3,'staffed',$4), ($5,$2,true,'Stage crew',$6,'open',$4)`,
    [afternoon, f.event, range('2026-12-05', '13:00', '17:00'), f.coordinator.id, open, range('2026-12-05', '06:00', '12:00')]);
    const client = await f.db.pool.connect();
    try {
      await client.query('BEGIN');
      const query = (sql: string, values?: unknown[]) => client.query(sql, values);
      const before = await loadArrangementSnapshot(query, f.event);
      await client.query('UPDATE sessions SET session_range=$2 WHERE id=$1', [sessionA, range('2026-12-05', '09:00', '14:00')]);
      const impact = assessArrangementImpact(before, await loadArrangementSnapshot(query, f.event));
      await applyArrangementImpact(query, f.coordinator.id, f.event, impact);
      await client.query('COMMIT');
      assert.deepEqual(impact.supports.map(s => s.id), [f.support], 'not the afternoon request, not the open one');
    } finally { client.release(); }
    const flags = (await f.q(`SELECT id, requires_reconfirmation AS flagged, lower(reconfirm_range) AS to_start FROM tech_support_requests WHERE event_id=$1`, [f.event])).rows;
    const byId = Object.fromEntries(flags.map(r => [r.id, [r.flagged, r.to_start?.toISOString() ?? null]]));
    assert.deepEqual(byId, { [f.support]: [true, iso('2026-12-05', '08:00')], [afternoon]: [false, null], [open]: [false, null] },
      'moved two hours, as far as Session A');
  } finally { await f.db.close(); }
});
