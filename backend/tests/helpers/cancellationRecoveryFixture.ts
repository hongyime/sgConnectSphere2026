import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { AuthenticatedUser } from "../../src/modules/accessControl/types.js";

export async function cancellationRecoveryFixture(pool: Pool) {
  const orgId = randomUUID();
  const eventId = randomUUID();
  const venueId = randomUUID();
  const equipmentId = randomUUID();
  const code = `EVT-ROLLBACK-${eventId.slice(0, 8)}`;
  await pool.query("INSERT INTO client_organisations(id,name) VALUES($1,$2)", [
    orgId,
    `Synthetic cancellation ${code}`,
  ]);

  const createUser = async (
    role: AuthenticatedUser["role"],
    name: string,
    clientOrgId?: string,
  ): Promise<AuthenticatedUser> => {
    const id = randomUUID();
    const email = `${id}@example.test`;
    await pool.query(
      "INSERT INTO users(id,email,password_hash,full_name,role,client_org_id) VALUES($1,$2,'synthetic',$3,$4,$5)",
      [id, email, name, role, clientOrgId ?? null],
    );
    return {
      id,
      email,
      role,
      ...(clientOrgId ? { clientOrgId } : {}),
      isActive: true,
      failedLoginCount: 0,
    };
  };

  const organiser = await createUser("event_organiser", "Rollback Organiser", orgId);
  const coordinator = await createUser("event_coordinator", "Rollback Coordinator");
  const venueStaff = await createUser("venue_staff", "Rollback Venue Staff");
  const technician = await createUser("technical_support_staff", "Rollback Technician");
  const registered = await createUser("attendee", "Rollback Registered Attendee");
  const waitlisted = await createUser("attendee", "Rollback Waitlisted Attendee");

  await pool.query(
    `INSERT INTO events(id,event_code,title,organiser_id,coordinator_id,client_org_id,status,event_range,expected_attendance)
     VALUES($1,$2,'Synthetic cancellation recovery event',$3,$4,$5,'confirmed','[2027-01-15 01:00Z,2027-01-15 09:00Z)',10)`,
    [eventId, code, organiser.id, coordinator.id, orgId],
  );
  await pool.query(
    "INSERT INTO venues(id,name,location,max_capacity,opens_at,closes_at) VALUES($1,$2,'Synthetic',100,'08:00','22:00')",
    [venueId, `Rollback venue ${code}`],
  );
  await pool.query(
    "INSERT INTO venue_staff_assignments(venue_id,staff_id) VALUES($1,$2)",
    [venueId, venueStaff.id],
  );
  await pool.query(
    "INSERT INTO equipment(id,name,category,total_quantity) VALUES($1,$2,'Test',10)",
    [equipmentId, `Rollback microphone ${code}`],
  );

  const bookingIds: string[] = [];
  const reservationIds: string[] = [];
  const sessionRanges = [
    ["01:00", "03:00"],
    ["05:00", "07:00"],
  ] as const;
  for (const [start, end] of sessionRanges) {
    const sessionId = randomUUID();
    const bookingId = randomUUID();
    const requestId = randomUUID();
    const reservationId = randomUUID();
    const range = `[2027-01-15 ${start}Z,2027-01-15 ${end}Z)`;
    bookingIds.push(bookingId);
    reservationIds.push(reservationId);
    await pool.query(
      "INSERT INTO sessions(id,event_id,title,session_range,expected_attendance) VALUES($1,$2,$3,$4,10)",
      [sessionId, eventId, `Session ${start}`, range],
    );
    await pool.query(
      "INSERT INTO venue_bookings(id,event_id,session_id,venue_id,booking_range,status,requires_reconfirmation) VALUES($1,$2,$3,$4,$5,'confirmed',true)",
      [bookingId, eventId, sessionId, venueId, range],
    );
    await pool.query(
      "INSERT INTO equipment_requests(id,event_id,session_id,equipment_id,quantity_requested,requested_by) VALUES($1,$2,$3,$4,2,$5)",
      [requestId, eventId, sessionId, equipmentId, coordinator.id],
    );
    await pool.query(
      "INSERT INTO equipment_reservations(id,request_id,event_id,session_id,equipment_id,quantity_reserved,reservation_range,reserved_by,requires_reconfirmation) VALUES($1,$2,$3,$4,$5,2,$6,$7,true)",
      [
        reservationId,
        requestId,
        eventId,
        sessionId,
        equipmentId,
        range,
        technician.id,
      ],
    );
  }

  const supportId = randomUUID();
  await pool.query(
    "INSERT INTO tech_support_requests(id,event_id,support_range,requested_by) VALUES($1,$2,'[2027-01-15 01:00Z,2027-01-15 09:00Z)',$3)",
    [supportId, eventId, coordinator.id],
  );
  await pool.query(
    "INSERT INTO tech_staff_assignments(request_id,event_id,staff_id,assignment_range) VALUES($1,$2,$3,'[2027-01-15 01:00Z,2027-01-15 09:00Z)')",
    [supportId, eventId, technician.id],
  );
  await pool.query(
    "INSERT INTO event_publications(event_id,name,starts_at,ends_at,venue_name,venue_location) VALUES($1,'Public Rollback Event','2027-01-15 01:00Z','2027-01-15 09:00Z',$2,'Synthetic')",
    [eventId, `Rollback venue ${code}`],
  );
  await pool.query(
    "INSERT INTO event_registrations(event_id,attendee_id,status) VALUES($1,$2,'registered'),($1,$3,'waitlisted')",
    [eventId, registered.id, waitlisted.id],
  );
  await pool.query(
    "INSERT INTO change_requests(event_id,requested_by,description) VALUES($1,$2,'Pending timing change'),($1,$2,'Pending attendance change')",
    [eventId, organiser.id],
  );
  const pendingRequestIds = (
    await pool.query<{ id: string }>(
      "SELECT id FROM change_requests WHERE event_id=$1 ORDER BY id",
      [eventId],
    )
  ).rows.map((row) => row.id);

  return {
    eventId,
    coordinator,
    bookingIds,
    reservationIds,
    pendingRequestIds,
  };
}
