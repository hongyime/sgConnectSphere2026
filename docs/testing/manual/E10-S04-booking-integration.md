# Pinned booking-decision integration method

E10-S04 / SCRUM-73 and the release-audit portion of TC_E06S04_07.
This is automated isolated integration, not human manual acceptance.
The recorded run temporarily copied the unchanged `decisions.ts` from PR #298
head `7d674fe80c219f9ecbde93bb09874ccf91d98d12` into this cancellation checkout.
No other #298 source, deployment or Jira change was made. The code was removed
afterwards. Full #298 current-head review, its conflicts and human gate remain.

To repeat: in an isolated checkout, supply that exact real decision module,
save the script below as `backend/tests/e10Combined.tmp.ts`, set
`TEST_DATABASE_URL` to a guarded disposable loopback target as required by
loginDatabase(), and run `node --import tsx --test backend/tests/e10Combined.tmp.ts`.
The fixture uses random schemas and drops them. Do not use a shared database.
Do not commit the temporary module or treat this one test as the whole #298 suite.

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loginDatabase } from "./helpers/loginDatabase.js";
import {
  cancelEvent,
  getCancellation,
} from "../src/modules/eventLifecycle/cancellation.js";
import { checkEquipmentAvailability } from "../src/modules/equipmentSupport/availability.js";
import { updateEventInformationWithNotifications } from "../src/modules/eventNotifications/informationChange.js";
import {
  getEvent,
  createEventComment,
} from "../src/modules/eventVisibility/service.js";
import { getVenueCalendar } from "../src/modules/venueBooking/calendar.js";
import { attendeeEvents } from "../src/modules/attendeeVisibility/service.js";
import type { AuthenticatedUser } from "../src/modules/accessControl/types.js";
async function fixture() {
  const db = await loginDatabase(),
    q = db.pool.query.bind(db.pool),
    org = randomUUID(),
    event = randomUUID();
  try {
    const ids = Array.from({ length: 8 }, () => randomUUID());
    const roles = [
      "event_organiser",
      "event_coordinator",
      "venue_staff",
      "technical_support_staff",
      "attendee",
      "attendee",
      "event_coordinator",
      "event_organiser",
    ] as const;
    await q(
      "INSERT INTO client_organisations(id,name) VALUES($1,'Cancellation test')",
      [org],
    );
    const users: AuthenticatedUser[] = [];
    for (let i = 0; i < ids.length; i++) {
      await q(
        "INSERT INTO users(id,email,password_hash,full_name,role,client_org_id) VALUES($1,$2,'synthetic','Cancellation user',$3,$4)",
        [ids[i], `${ids[i]}@example.test`, roles[i], org],
      );
      users.push({
        id: ids[i],
        email: `${ids[i]}@example.test`,
        role: roles[i],
        clientOrgId: org,
        isActive: true,
        failedLoginCount: 0,
      });
    }
    await q(
      "INSERT INTO events(id,event_code,title,organiser_id,coordinator_id,client_org_id,status,event_range,expected_attendance) VALUES($1,'EVT-CANCEL','Private planning title',$2,$3,$4,'planning','[2027-01-15 01:00Z,2027-01-15 09:00Z)',10)",
      [event, ids[0], ids[1], org],
    );
    const venue = randomUUID(),
      equipment = randomUUID();
    await q(
      "INSERT INTO venues(id,name,location,max_capacity,opens_at,closes_at) VALUES($1,'Cancellation hall','Test',100,'08:00','22:00')",
      [venue],
    );
    await q(
      "INSERT INTO venue_staff_assignments(venue_id,staff_id) VALUES($1,$2)",
      [venue, ids[2]],
    );
    await q(
      "INSERT INTO equipment(id,name,category,total_quantity) VALUES($1,'Cancellation microphone','Test',10)",
      [equipment],
    );
    const sessionIds = [];
    for (const [start, end] of [
      ["01:00", "03:00"],
      ["05:00", "07:00"],
    ]) {
      const session = randomUUID();
      sessionIds.push(session);
      const range = `[2027-01-15 ${start}Z,2027-01-15 ${end}Z)`;
      await q(
        "INSERT INTO sessions(id,event_id,title,session_range,expected_attendance) VALUES($1,$2,'Session',$3,10)",
        [session, event, range],
      );
      await q(
        "INSERT INTO venue_bookings(event_id,session_id,venue_id,booking_range,status) VALUES($1,$2,$3,$4,'confirmed')",
        [event, session, venue, range],
      );
      const request = randomUUID();
      await q(
        "INSERT INTO equipment_requests(id,event_id,session_id,equipment_id,quantity_requested,requested_by) VALUES($1,$2,$3,$4,2,$5)",
        [request, event, session, equipment, ids[1]],
      );
      await q(
        "INSERT INTO equipment_reservations(request_id,event_id,session_id,equipment_id,quantity_reserved,reservation_range,reserved_by) VALUES($1,$2,$3,$4,2,$5,$6)",
        [request, event, session, equipment, range, ids[3]],
      );
    }
    const support = randomUUID();
    await q(
      "INSERT INTO tech_support_requests(id,event_id,support_range,requested_by) VALUES($1,$2,'[2027-01-15 01:00Z,2027-01-15 09:00Z)',$3)",
      [support, event, ids[1]],
    );
    await q(
      "INSERT INTO tech_staff_assignments(request_id,event_id,staff_id,assignment_range) VALUES($1,$2,$3,'[2027-01-15 01:00Z,2027-01-15 09:00Z)')",
      [support, event, ids[3]],
    );
    await q(
      "INSERT INTO event_publications(event_id,name,starts_at,ends_at,venue_name,venue_location) VALUES($1,'Public name','2027-01-15 01:00Z','2027-01-15 09:00Z','Hall','Test')",
      [event],
    );
    for (const [i, status] of [
      [4, "registered"],
      [5, "waitlisted"],
    ] as const)
      await q(
        "INSERT INTO event_registrations(event_id,attendee_id,status) VALUES($1,$2,$3)",
        [event, ids[i], status],
      );
    for (const status of [
      "pending",
      "pending",
      "approved",
      "declined",
      "applied",
    ])
      await q(
        "INSERT INTO change_requests(event_id,requested_by,description,status) VALUES($1,$2,'Original request',$3)",
        [event, ids[0], status],
      );
    return { ...db, q, org, event, venue, equipment, users, sessionIds };
  } catch (error) {
    await db.close();
    throw error;
  }
}

import { decideBooking } from '../src/modules/venueBooking/decisions.js';
test('TC_E06S04_07 TC_E10S04_01 real PR298 approval then cancellation release audit',async()=>{
 const f=await fixture();try {
  await f.q("UPDATE venue_bookings SET status='pending',is_primary=false WHERE event_id=$1",[f.event]);
  const bookings=(await f.q('SELECT id FROM venue_bookings WHERE event_id=$1 ORDER BY lower(booking_range)',[f.event])).rows;
  for(const b of bookings) assert.equal((await decideBooking(f.pool,f.users[2],b.id,{decision:'approve'})).status,200);
  await cancelEvent(f.pool,f.users[1],f.event,{reason:'Cancellation requested'});
  const rows=(await f.q("SELECT actor_id,entity_id,event_id,action,occurred_at,new_value FROM audit_logs WHERE event_id=$1 AND action='Booking Released'",[f.event])).rows;
  assert.equal(rows.length,2);for(const row of rows) {assert.equal(row.actor_id,f.users[1].id);assert.equal(row.event_id,f.event);assert.equal(row.new_value,'released');assert.ok(row.occurred_at instanceof Date);assert.ok(bookings.some(b=>b.id===row.entity_id));}
  assert.equal((await f.q('SELECT count(*)::int n FROM venue_bookings WHERE event_id=$1 AND is_primary',[f.event])).rows[0].n,0);
 }finally{await f.close();}
});

```
