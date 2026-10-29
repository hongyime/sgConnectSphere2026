import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import { deleteEventSession } from '../src/modules/eventLifecycle/sessionManagement.js';

const actor: AuthenticatedUser = { id: randomUUID(), role: 'event_coordinator', email: 'coord@example.test', isActive: true, failedLoginCount: 0 };
const ownerId = randomUUID(), eventId = randomUUID(), sessionId = randomUUID(), nextSessionId = randomUUID(), venueId = randomUUID(), staffId = randomUUID();
const startsAt = new Date('2027-03-13T05:00:00Z'), endsAt = new Date('2027-03-13T08:00:00Z');

function database(options: {
  assigned?: boolean; eventFound?: boolean; organiserOwns?: boolean; role?: string; active?: boolean;
  failedLoginCount?: number; locked?: boolean; status?: string; session?: boolean; count?: number;
  sessionTitle?: string | null; used?: boolean; bookings?: boolean; next?: boolean;
} = {}) {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const notices: unknown[][] = [];
  const client = {
    async query(sql: string, values?: unknown[]) {
      calls.push({ sql, values });
      let rows: Record<string, unknown>[] = [];
      if (sql.includes('SELECT role,is_active')) rows = [{ role: options.role ?? actor.role, is_active: options.active ?? true, locked_until: options.locked ? new Date(Date.now() + 60000) : null, failed_login_count: options.failedLoginCount ?? 0 }];
      else if (sql.includes('SELECT id,status,organiser_id,coordinator_id')) rows = options.eventFound === false ? [] : [{ id: eventId, status: options.status ?? 'planning', organiser_id: options.organiserOwns ? ownerId : randomUUID(), coordinator_id: options.assigned === false ? randomUUID() : actor.id }];
      else if (sql.includes('SELECT id,title FROM sessions')) rows = options.session === false ? [] : [{ id: sessionId, title: options.sessionTitle === undefined ? 'Workshop' : options.sessionTitle }];
      else if (sql.includes('SELECT count(*)::int AS count')) rows = [{ count: options.count ?? 2 }];
      else if (sql.includes('SELECT\n      EXISTS(SELECT 1 FROM event_registration_sessions')) rows = [{ used: options.used ?? false }];
      else if (sql.includes('SELECT id,venue_id FROM venue_bookings')) rows = options.bookings === false ? [] : [{ id: randomUUID(), venue_id: venueId }];
      else if (sql.includes('SELECT s.id,lower(s.session_range)')) rows = options.next === false ? [] : [{ id: nextSessionId, start_at: startsAt, end_at: endsAt, expected_attendance: 70, layout_id: null, venue_requirements: 'Workshop room', accessibility_note: null, equipment_requirements: 'Projector', layout_preference: null, total_attendance: 70 }];
      else if (sql.includes('SELECT min(lower(session_range))')) rows = [{ start_at: startsAt, end_at: endsAt }];
      else if (sql.includes('INSERT INTO audit_logs')) rows = [{ id: randomUUID(), occurred_at: new Date('2026-10-30T00:00:00Z') }];
      else if (sql.includes('FROM events e LEFT JOIN')) rows = [{ id: eventId, title: 'Forum', public_name: 'Forum', status: 'planning', starts_at: startsAt, ends_at: endsAt, organiser_id: ownerId, coordinator_id: actor.id }];
      else if (sql.includes('SELECT id FROM users WHERE id=ANY')) rows = [{ id: staffId }];
      else if (sql.includes('INSERT INTO notifications')) { notices.push(values ?? []); rows = [{ id: randomUUID() }]; }
      else if (sql.includes('INSERT INTO notification_deliveries')) rows = [{ id: randomUUID() }];
      else if (sql.includes('SELECT d.delivery_status')) rows = [{ delivery_status: 'queued', dispatch_state: 'pending', recipient_email: null, email: 'staff@example.test', title: 'Event update', message: 'Session deleted' }];
      return { rows, rowCount: rows.length };
    },
    release() {},
  } as unknown as PoolClient;
  return { pool: { connect: async () => client } as unknown as Pool, calls, notices };
}

test('TC_E04S02_05: deleting a Session releases its booking, updates Event totals, notifies Venue Staff and records history', async () => {
  const db = database();
  const result = await deleteEventSession(db.pool, actor, eventId, sessionId, { resolveVenueStaff: async () => [staffId] });
  assert.deepEqual(result, { deletedSessionId: sessionId, releasedBookings: 1 });
  assert.ok(db.calls.some(call => call.sql.includes("SET status='released',is_primary=false")));
  assert.ok(db.calls.some(call => call.sql.includes('expected_attendance=$4') && call.values?.[3] === 70));
  assert.ok(db.calls.some(call => call.sql.includes("'Session deleted'")));
  assert.ok(db.calls.some(call => call.sql.includes('DELETE FROM sessions WHERE id=$1')));
  assert.equal(db.notices.length, 1);
  assert.ok(String(db.notices[0]?.[3]).includes('Session Workshop was deleted'));
  assert.equal(db.calls.at(-1)?.sql, 'COMMIT');

  const unnamed = database({ sessionTitle: null });
  await deleteEventSession(unnamed.pool, actor, eventId, sessionId, { resolveVenueStaff: async () => [staffId] });
  assert.ok(unnamed.calls.some(call => call.sql.includes("'Session deleted'") && call.values?.[2] === sessionId));
  assert.ok(String(unnamed.notices[0]?.[3]).includes('Session Untitled was deleted'));
});

test('Session deletion protects ownership, active status, the final Session, and linked attendee/support history', async () => {
  await assert.rejects(deleteEventSession(database().pool, undefined, eventId, sessionId), { status: 401 });
  await assert.rejects(deleteEventSession(database({ role: 'technical_support_staff' }).pool, actor, eventId, sessionId), { status: 403 });
  const supportStaff = { ...actor, role: 'technical_support_staff' as const };
  await assert.rejects(deleteEventSession(database({ role: supportStaff.role }).pool, supportStaff, eventId, sessionId), { status: 403 });
  await assert.rejects(deleteEventSession(database({ active: false }).pool, actor, eventId, sessionId), { status: 403 });
  await assert.rejects(deleteEventSession(database({ failedLoginCount: 5 }).pool, actor, eventId, sessionId), { status: 403 });
  await assert.rejects(deleteEventSession(database({ locked: true }).pool, actor, eventId, sessionId), { status: 403 });
  await assert.rejects(deleteEventSession(database({ eventFound: false }).pool, actor, eventId, sessionId), { status: 404 });
  await assert.rejects(deleteEventSession(database({ assigned: false }).pool, actor, eventId, sessionId), { status: 403 });
  const organiser = { ...actor, id: ownerId, role: 'event_organiser' as const };
  const ownerDb = database({ role: 'event_organiser', organiserOwns: true, bookings: false });
  assert.deepEqual(await deleteEventSession(ownerDb.pool, organiser, eventId, sessionId), { deletedSessionId: sessionId, releasedBookings: 0 });
  assert.equal(ownerDb.calls.some(call => call.sql.includes('UPDATE venue_bookings SET status=\'released\'')), false);
  assert.equal(ownerDb.notices.length, 0);
  await assert.rejects(deleteEventSession(database({ status: 'cancelled' }).pool, actor, eventId, sessionId), { status: 409 });
  await assert.rejects(deleteEventSession(database({ session: false }).pool, actor, eventId, sessionId), { status: 404 });
  await assert.rejects(deleteEventSession(database({ count: 1 }).pool, actor, eventId, sessionId), { status: 409 });
  await assert.rejects(deleteEventSession(database({ next: false }).pool, actor, eventId, sessionId), { status: 409 });
  const used = database({ used: true });
  await assert.rejects(deleteEventSession(used.pool, actor, eventId, sessionId), { status: 409 });
  assert.equal(used.calls.at(-1)?.sql, 'ROLLBACK');
});

test('a Session id must be a UUID before a transaction starts', async () => {
  const db = database();
  await assert.rejects(deleteEventSession(db.pool, actor, eventId, 'invalid'), { status: 400 });
  assert.equal(db.calls.length, 0);
});
