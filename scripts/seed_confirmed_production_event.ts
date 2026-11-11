import pg from 'pg';
import { productionDatabaseClientConfig } from '../backend/src/database/productionMigrationGuard.js';

const { Client } = pg;
const EVENT_ID = 'cdb08805-cd9d-4b27-ae8e-7e7c5f84277f';
const ATTENDEE_EMAIL = 'xy.sim.2024@smu.edu.sg';
const FACTORS = [
  'attendance_capacity', 'venue_layout', 'emergency_access', 'accessibility',
  'equipment_placement', 'crowd_movement', 'venue_restrictions',
];

type EventRow = { id: string; title: string; status: string; registration_enabled: boolean };

function approvedSafetyRecord() {
  return JSON.stringify({
    decision: 'approve',
    factors: Object.fromEntries(FACTORS.map(key => [key, { satisfactory: true, comment: 'Approved for production demonstration.' }])),
  });
}

async function main() {
  const execute = process.argv.includes('--execute');
  if (!execute) console.log('DRY RUN: pass --execute only after reviewing the printed production preflight.');
  const client = new Client({ ...productionDatabaseClientConfig(process.env.DATABASE_URL), statement_timeout: 10000, query_timeout: 12000 });
  await client.connect();
  try {
    await client.query('BEGIN');
    const event = (await client.query<EventRow>(`SELECT id, title, status::text, registration_enabled FROM events WHERE id=$1 FOR UPDATE`, [EVENT_ID])).rows[0];
    if (!event || event.title !== 'E11 notification acceptance test') throw new Error('The requested production event was not found.');
    const attendee = (await client.query<{ id: string }>(`SELECT id FROM users WHERE lower(email)=lower($1) AND role::text='attendee' AND is_active`, [ATTENDEE_EMAIL])).rows[0];
    const officer = (await client.query<{ id: string }>(`SELECT id FROM users WHERE role::text='safety_officer' AND is_active ORDER BY id LIMIT 1`)).rows[0];
    if (!attendee || !officer) throw new Error('The required active attendee or Safety Officer is unavailable.');
    const hold = await client.query(`SELECT b.id FROM venue_bookings b JOIN venues v ON v.id=b.venue_id
      WHERE b.event_id=$1 AND b.status='tentative' AND v.name='Cedar Auditorium' FOR UPDATE`, [EVENT_ID]);
    const readiness = await client.query<{ confirmed: string; sessions: string }>(`SELECT
      count(*) FILTER (WHERE status='confirmed')::text AS confirmed,
      (SELECT count(*) FROM sessions WHERE event_id=$1)::text AS sessions FROM venue_bookings WHERE event_id=$1`, [EVENT_ID]);
    console.log(JSON.stringify({ event: event.title, status: event.status, cedarTentativeHolds: hold.rowCount, confirmedBookings: readiness.rows[0], attendee: ATTENDEE_EMAIL }));
    if (!execute) { await client.query('ROLLBACK'); return; }

    if (hold.rowCount) await client.query(`UPDATE venue_bookings SET status='released', expires_at=NULL, requires_reconfirmation=false WHERE id = ANY($1::uuid[])`, [hold.rows.map(row => row.id)]);
    if (event.status === 'planning') {
      await client.query(`UPDATE events SET status='safety_review', status_changed_at=now() WHERE id=$1`, [EVENT_ID]);
      await client.query(`INSERT INTO audit_logs(actor_id, entity_type, entity_id, event_id, action, field_changed, old_value, new_value)
        VALUES($1,'event',$2,$2,'Submitted for safety review','status','planning','safety_review')`, [officer.id, EVENT_ID]);
    }
    const current = (await client.query<EventRow>(`SELECT id, title, status::text, registration_enabled FROM events WHERE id=$1 FOR UPDATE`, [EVENT_ID])).rows[0]!;
    if (current.status === 'safety_review') {
      await client.query(`UPDATE events SET status='confirmed', status_changed_at=now() WHERE id=$1`, [EVENT_ID]);
      await client.query(`INSERT INTO audit_logs(actor_id, entity_type, entity_id, event_id, action, field_changed, old_value, new_value)
        VALUES($1,'event',$2,$2,'Safety check approved','status','safety_review','confirmed'),
              ($1,'event',$2,$2,'Safety check approved','safety_check',NULL,$3)`, [officer.id, EVENT_ID, approvedSafetyRecord()]);
    }
    await client.query(`UPDATE events SET registration_enabled=true WHERE id=$1`, [EVENT_ID]);
    await client.query(`INSERT INTO event_publications(event_id,name,starts_at,ends_at,venue_name,venue_location)
      SELECT e.id,e.title,lower(e.event_range),upper(e.event_range),v.name,v.location
      FROM events e JOIN venue_bookings b ON b.event_id=e.id AND b.status='confirmed' AND b.is_primary
      JOIN venues v ON v.id=b.venue_id WHERE e.id=$1 AND e.status='confirmed'
      ON CONFLICT(event_id) DO UPDATE SET name=excluded.name, starts_at=excluded.starts_at, ends_at=excluded.ends_at,
        venue_name=excluded.venue_name, venue_location=excluded.venue_location, published_at=now()`, [EVENT_ID]);
    const verification = await client.query(`SELECT e.status::text, e.registration_enabled, p.event_id,
      count(DISTINCT s.id)::int AS sessions, e.expected_attendance,
      count(DISTINCT r.id) FILTER (WHERE r.status NOT IN ('withdrawn','rejected'))::int AS registrations,
      bool_or(ra.id IS NOT NULL) FILTER (WHERE ra.status NOT IN ('withdrawn','rejected')) AS attendee_registered
      FROM events e JOIN event_publications p ON p.event_id=e.id LEFT JOIN sessions s ON s.event_id=e.id
      LEFT JOIN event_registrations r ON r.event_id=e.id LEFT JOIN event_registrations ra ON ra.event_id=e.id AND ra.attendee_id=$2
      WHERE e.id=$1 GROUP BY e.id,p.event_id`, [EVENT_ID, attendee.id]);
    const row = verification.rows[0] as { status: string; registration_enabled: boolean; event_id: string; sessions: number; expected_attendance: number; registrations: number; attendee_registered: boolean | null } | undefined;
    if (!row || row.status !== 'confirmed' || !row.registration_enabled || row.sessions < 1
      || row.registrations >= row.expected_attendance || row.attendee_registered) {
      throw new Error('Publication is not discoverable and registerable for the attendee.');
    }
    await client.query('COMMIT');
    console.log(`PASS: ${ATTENDEE_EMAIL} can discover confirmed published event ${row.event_id} and select ${row.sessions} session(s) to register.`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch(error => { console.error(`Production seed aborted: ${error instanceof Error ? error.message : 'unknown error'}`); process.exitCode = 1; });
