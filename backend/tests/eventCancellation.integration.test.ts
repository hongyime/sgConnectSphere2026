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
test("TC_E10S04_01 TC_E10S04_03 TC_E10S04_04 TC_E10S04_05 TC_E10S04_06 all Sessions released, notices, request/history and read-only metadata", async () => {
  const f = await fixture();
  try {
    const [
      org,
      coord,
      venueStaff,
      tech,
      registered,
      waitlisted,
      other,
      otherOrg,
    ] = f.users;
    for (const user of [other, otherOrg]) {
      await assert.rejects(
        cancelEvent(f.pool, user, f.event, { reason: "x" }),
        { status: 403 },
      );
      await assert.rejects(getCancellation(f.pool, user, f.event), {
        status: 403,
      });
    }
    await assert.rejects(cancelEvent(f.pool, coord, f.event, { reason: "" }), {
      status: 400,
    });
    const requested = await cancelEvent(f.pool, org, f.event, {
      reason: "Sponsor withdrew",
    });
    assert.equal(requested.status, "requested");
    assert.equal(
      (await cancelEvent(f.pool, org, f.event, { reason: "retry" })).replayed,
      true,
    );
    assert.equal(
      (await f.q("SELECT status FROM events WHERE id=$1", [f.event])).rows[0]
        .status,
      "planning",
    );
    assert.equal(
      (await getCancellation(f.pool, coord, f.event)).requests.length,
      1,
    );
    await cancelEvent(f.pool, coord, f.event, {
      reason: "Insufficient sponsor funding",
    });
    const state = await getCancellation(f.pool, coord, f.event);
    assert.equal(state.status, "cancelled");
    assert.equal(state.reason, "Insufficient sponsor funding");
    assert.ok(state.cancelledAt);
    assert.equal(state.canCancel, false);
    assert.equal(state.obsoleteRequests.length, 3);
    for (const table of ["venue_bookings", "equipment_reservations"]) {
      const rows = (
        await f.q(`SELECT status,session_id FROM ${table} WHERE event_id=$1`, [
          f.event,
        ])
      ).rows;
      assert.equal(rows.length, 2);
      assert.deepEqual(
        new Set(rows.map((r) => r.session_id)),
        new Set(f.sessionIds),
      );
      assert.ok(rows.every((r) => r.status === "released"));
    }
    assert.equal(
      (
        await f.q(
          "SELECT count(*)::int n FROM change_requests WHERE event_id=$1 AND status='obsolete'",
          [f.event],
        )
      ).rows[0].n,
      3,
    );
    assert.equal(
      (
        await f.q(
          "SELECT count(*)::int n FROM audit_logs WHERE event_id=$1 AND entity_type='change_request' AND old_value='pending' AND new_value='obsolete'",
          [f.event],
        )
      ).rows[0].n,
      3,
    );
    assert.equal(
      (
        await f.q(
          "SELECT count(*)::int n FROM change_requests WHERE event_id=$1 AND status IN ('approved','declined','applied')",
          [f.event],
        )
      ).rows[0].n,
      3,
    );
    assert.equal(
      (
        await f.q(
          "SELECT count(*)::int n FROM audit_logs WHERE event_id=$1 AND action='Booking Released'",
          [f.event],
        )
      ).rows[0].n,
      2,
    );
    const notices = (
      await f.q(
        "SELECT user_id,message FROM notifications WHERE event_id=$1 AND title='Event update'",
        [f.event],
      )
    ).rows;
    assert.deepEqual(
      new Set(notices.map((n) => n.user_id)),
      new Set([org.id, venueStaff.id, tech.id, registered.id, waitlisted.id]),
    );
    assert.ok(
      notices
        .filter((n) => [registered.id, waitlisted.id].includes(n.user_id))
        .every(
          (n) =>
            n.message.startsWith("Public name:") &&
            !n.message.includes("Private planning"),
        ),
    );
    const count = (
      await f.q("SELECT count(*)::int n FROM notification_deliveries")
    ).rows[0].n;
    assert.equal(
      (await cancelEvent(f.pool, coord, f.event, {})).replayed,
      true,
    );
    assert.equal(
      (await f.q("SELECT count(*)::int n FROM notification_deliveries")).rows[0]
        .n,
      count,
    );
    for (const user of [org, venueStaff, tech, registered, waitlisted])
      assert.equal(
        (await getCancellation(f.pool, user, f.event)).reason,
        state.reason,
      );
    const view = await getEvent(f.q, org, f.event);
    assert.equal(view.canEdit, false);
    assert.equal(view.canPostComment, false);
    assert.equal(view.cancellation_reason, state.reason);
    assert.equal(
      (await attendeeEvents(f.q, registered, f.event))[0].cancellation_reason,
      state.reason,
    );
    await assert.rejects(
      updateEventInformationWithNotifications(f.pool, org, f.event, {
        title: "Changed",
      }),
      { status: 409 },
    );
    await assert.rejects(createEventComment(f.q, org, f.event, "New comment"), {
      status: 409,
    });
    const available = await checkEquipmentAvailability(
      f.q,
      tech,
      new URLSearchParams({
        start: "2027-01-15T01:00:00Z",
        end: "2027-01-15T09:00:00Z",
        id: f.equipment,
      }),
    );
    assert.equal(available.equipment[0].freeQuantity, 10);
    const calendar = await getVenueCalendar(
      f.q,
      coord,
      f.venue,
      "2027-01-15",
      "2027-01-15",
    );
    assert.ok(calendar.entries.some((e) => e.kind === "free"));
    assert.ok(calendar.entries.every((e) => e.kind !== "booking"));
    assert.equal(
      (
        await f.q(
          "SELECT count(*)::int n FROM venue_bookings WHERE event_id=$1 AND status='confirmed'",
          [f.event],
        )
      ).rows[0].n,
      0,
    );
  } finally {
    await f.close();
  }
});
test("TC_E10S04_01 cancellation rolls back all writes when notification delivery fails", async () => {
  const f = await fixture();
  try {
    await f.q(
      "CREATE FUNCTION fail_delivery() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic outbox failure'; END $$",
    );
    await f.q(
      "CREATE TRIGGER fail_delivery BEFORE INSERT ON notification_deliveries FOR EACH ROW EXECUTE FUNCTION fail_delivery()",
    );
    await assert.rejects(
      cancelEvent(f.pool, f.users[1], f.event, { reason: "Cancelled" }),
      /synthetic outbox failure/,
    );
    assert.equal(
      (await f.q("SELECT status FROM events WHERE id=$1", [f.event])).rows[0]
        .status,
      "planning",
    );
    assert.equal(
      (
        await f.q(
          "SELECT count(*)::int n FROM venue_bookings WHERE status='confirmed'",
        )
      ).rows[0].n,
      2,
    );
    assert.equal(
      (
        await f.q(
          "SELECT count(*)::int n FROM equipment_reservations WHERE status='reserved'",
        )
      ).rows[0].n,
      2,
    );
    assert.equal(
      (await f.q("SELECT count(*)::int n FROM audit_logs")).rows[0].n,
      0,
    );
    assert.equal(
      (await f.q("SELECT count(*)::int n FROM notifications")).rows[0].n,
      0,
    );
  } finally {
    await f.close();
  }
});

test("TC_E10S04_01 cancellation races serialize and account lock contention refuses without effects", async () => {
  const f = await fixture();
  try {
    const client = await f.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
        f.users[1].id,
      ]);
      await assert.rejects(
        cancelEvent(f.pool, f.users[1], f.event, { reason: "Cancel" }),
        { status: 409 },
      );
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
    const outcomes = await Promise.all([
      cancelEvent(f.pool, f.users[1], f.event, { reason: "Reason one" }),
      cancelEvent(f.pool, f.users[1], f.event, { reason: "Reason two" }),
    ]);
    assert.equal(outcomes.filter((x) => x.replayed).length, 1);
    assert.equal(
      (
        await f.q(
          "SELECT count(*)::int n FROM audit_logs WHERE entity_type='event' AND new_value='cancelled'",
        )
      ).rows[0].n,
      1,
    );
    assert.equal(
      (
        await f.q(
          "SELECT count(*)::int n FROM notifications WHERE title='Event update'",
        )
      ).rows[0].n,
      5,
    );
  } finally {
    await f.close();
  }
});
test("TC_E10S04_03 notices without publication never leak private title; request/terminal/account boundaries", async () => {
  const f = await fixture();
  try {
    await f.q("DELETE FROM event_publications WHERE event_id=$1", [f.event]);
    await assert.rejects(
      cancelEvent(f.pool, f.users[1], "UNKNOWN", { reason: "Cancel" }),
      { status: 403 },
    );
    await assert.rejects(getCancellation(f.pool, f.users[1], "UNKNOWN"), {
      status: 403,
    });
    await f.q("UPDATE users SET is_active=false WHERE id=$1", [f.users[1].id]);
    await assert.rejects(
      cancelEvent(f.pool, f.users[1], f.event, { reason: "Cancel" }),
      { status: 403 },
    );
    await f.q("UPDATE users SET is_active=true WHERE id=$1", [f.users[1].id]);
    await f.q("UPDATE events SET coordinator_id=NULL WHERE id=$1", [f.event]);
    await assert.rejects(
      cancelEvent(f.pool, f.users[0], f.event, { reason: "Cancel" }),
      { status: 409 },
    );
    await f.q(
      "UPDATE events SET coordinator_id=$2,status='completed' WHERE id=$1",
      [f.event, f.users[1].id],
    );
    await assert.rejects(
      cancelEvent(f.pool, f.users[1], f.event, { reason: "Cancel" }),
      { status: 409 },
    );
    await f.q("UPDATE events SET status='confirmed' WHERE id=$1", [f.event]);
    await f.q("UPDATE users SET client_org_id=NULL WHERE id=$1", [
      f.users[1].id,
    ]);
    f.users[1].clientOrgId = undefined;
    await cancelEvent(f.pool, f.users[1], f.event, { reason: "Cancel" });
    const attendeeNotices = (
      await f.q(
        "SELECT message FROM notifications WHERE user_id=ANY($1::uuid[])",
        [[f.users[4].id, f.users[5].id]],
      )
    ).rows;
    assert.equal(attendeeNotices.length, 2);
    assert.ok(
      attendeeNotices.every(
        (n) =>
          n.message.startsWith("Your event:") &&
          !n.message.includes("Private planning"),
      ),
    );
    await assert.rejects(
      cancelEvent(f.pool, f.users[0], f.event, { reason: "Again" }),
      { status: 409 },
    );
  } finally {
    await f.close();
  }
});
