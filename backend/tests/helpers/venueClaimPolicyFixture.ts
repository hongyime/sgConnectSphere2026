import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../../src/modules/accessControl/types.js';
import { loginDatabase } from './loginDatabase.js';
import { submitBooking } from '../../src/modules/venueBooking/bookingSubmission.js';
import { convertHold, placeHold } from '../../src/modules/venueBooking/holds.js';
import { withdrawBooking } from '../../src/modules/venueBooking/bookingWithdrawal.js';
import { updateVenue } from '../../src/modules/venueBooking/catalogue.js';

export type BookingPeriod = Readonly<{ starts_at: string; ends_at: string }>;

export async function venueClaimPolicyFixture() {
  const database = await loginDatabase();
  const ids = {
    org: randomUUID(),
    organiser: randomUUID(),
    coordinator: randomUUID(),
    otherCoordinator: randomUUID(),
    staff: randomUUID(),
    venueA: randomUUID(),
    venueB: randomUUID(),
  };
  await database.pool.query("INSERT INTO client_organisations(id,name) VALUES($1,'Synthetic claim policy org')", [ids.org]);
  for (const [id, role, clientOrg, name] of [
    [ids.organiser, 'event_organiser', ids.org, 'Synthetic Organiser'],
    [ids.coordinator, 'event_coordinator', null, 'Synthetic Coordinator'],
    [ids.otherCoordinator, 'event_coordinator', null, 'Synthetic Other Coordinator'],
    [ids.staff, 'venue_staff', null, 'Synthetic Venue Staff'],
  ] as const) {
    await database.pool.query(`INSERT INTO users(id,client_org_id,email,password_hash,full_name,role)
      VALUES($1,$2,$3,'unused',$4,$5)`, [id, clientOrg, `${id}@example.test`, name, role]);
  }
  for (const [id, name] of [[ids.venueA, 'Synthetic Hall A'], [ids.venueB, 'Synthetic Hall B']]) {
    await database.pool.query(`INSERT INTO venues(id,name,location,max_capacity,opens_at,closes_at,setup_time_minutes,turnaround_time_minutes)
      VALUES($1,$2,'Synthetic Campus',200,'08:00','22:00',0,0)`, [id, name]);
  }
  await database.pool.query('INSERT INTO venue_staff_assignments(venue_id,staff_id) VALUES($1,$3),($2,$3)', [ids.venueA, ids.venueB, ids.staff]);

  const coordinator: AuthenticatedUser = {
    id: ids.coordinator, role: 'event_coordinator', email: `${ids.coordinator}@example.test`,
    isActive: true, failedLoginCount: 0,
  };
  const otherCoordinator: AuthenticatedUser = {
    id: ids.otherCoordinator, role: 'event_coordinator', email: `${ids.otherCoordinator}@example.test`,
    isActive: true, failedLoginCount: 0,
  };
  const staff: AuthenticatedUser = {
    id: ids.staff, role: 'venue_staff', email: `${ids.staff}@example.test`,
    isActive: true, failedLoginCount: 0,
  };

  async function createEvent(eventCoordinator: AuthenticatedUser = coordinator, title = 'Synthetic Claim Policy Event') {
    const id = randomUUID();
    const code = `EVT-${id.slice(0, 8)}`;
    await database.pool.query(`INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,status,event_range,expected_attendance)
      VALUES($1,$2,$3,$4,$5,$6,'approved','[2027-01-01T00:00:00+08:00,2028-01-01T00:00:00+08:00)',50)`,
    [id, code, ids.organiser, eventCoordinator.id, ids.org, title]);
    return id;
  }

  function period(day: string, start: string, end: string): BookingPeriod {
    return { starts_at: `${day}T${start}:00+08:00`, ends_at: `${day}T${end}:00+08:00` };
  }

  function requestFor(actor: AuthenticatedUser) {
    return (eventId: string, venueId: string, period: BookingPeriod) =>
      submitBooking(database.pool, actor, {
        event_id: eventId, venue_id: venueId, ...period,
      }, randomUUID());
  }
  const request = requestFor(coordinator);
  const requestAsOtherCoordinator = requestFor(otherCoordinator);

  function hold(eventId: string, venueId: string, period: BookingPeriod) {
    return placeHold(database.pool, coordinator, {
      event_id: eventId, venue_id: venueId, ...period,
    });
  }

  function convert(bookingId: string) {
    return convertHold(database.pool, coordinator, { booking_id: bookingId });
  }

  function withdraw(bookingId: string) {
    return withdrawBooking(database.pool, coordinator, { booking_id: bookingId });
  }

  // Raw buffer write: skips the C-109 flagging that a Venue Staff edit runs.
  // Use editBuffers when a case reads buffer_conflict afterwards.
  async function setBuffers(venueId: string, setupMinutes: number, turnaroundMinutes: number) {
    await database.pool.query('UPDATE venues SET setup_time_minutes=$2,turnaround_time_minutes=$3 WHERE id=$1',
      [venueId, setupMinutes, turnaroundMinutes]);
  }

  // The real Venue Staff edit, which retains and flags C-109 conflicts. The
  // seeded venues are bare rows, so the edit also supplies the details a
  // Venue Staff save requires.
  async function editBuffers(venueId: string, setupMinutes: number, turnaroundMinutes: number) {
    const result = await updateVenue(database.pool, staff, venueId, {
      opens_at: '08:00', closes_at: '22:00',
      facilities: ['Stage'], accessibility_features: ['Wheelchair Access'],
      supported_layouts: [{ label: 'Theatre', capacity: 200 }],
      setup_time_minutes: setupMinutes, turnaround_time_minutes: turnaroundMinutes,
    });
    if (result.status !== 200) throw new Error(`Venue edit refused: ${JSON.stringify(result.body)}`);
    return result;
  }

  async function bookingRows(eventIds: readonly string[]) {
    const rows = await database.pool.query<{ event_id: string; status: string; buffer_conflict: boolean }>(
      'SELECT event_id,status::text AS status,buffer_conflict FROM venue_bookings WHERE event_id=ANY($1::uuid[])', [eventIds]);
    return eventIds.flatMap(eventId => rows.rows.filter(row => row.event_id === eventId)
      .map(({ status, buffer_conflict }) => ({ status, buffer_conflict })));
  }

  async function effectSnapshot() {
    const [bookings, events, audits, notifications, deliveries] = await Promise.all([
      database.pool.query<{ id: string; status: string }>('SELECT id,status FROM venue_bookings ORDER BY id'),
      database.pool.query<{ id: string; status: string }>('SELECT id,status FROM events ORDER BY id'),
      database.pool.query<{ count: number }>('SELECT count(*)::int AS count FROM audit_logs'),
      database.pool.query<{ count: number }>('SELECT count(*)::int AS count FROM notifications'),
      database.pool.query<{ count: number }>('SELECT count(*)::int AS count FROM notification_deliveries'),
    ]);
    return {
      bookings: bookings.rows,
      events: events.rows,
      auditCount: audits.rows[0]?.count,
      notificationCount: notifications.rows[0]?.count,
      deliveryCount: deliveries.rows[0]?.count,
    };
  }

  return {
    ...database, ids, coordinator, otherCoordinator, staff, createEvent, period, request,
    requestAsOtherCoordinator, hold, convert, withdraw, setBuffers, editBuffers, bookingRows, effectSnapshot,
  };
}
