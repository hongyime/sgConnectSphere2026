import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";
import { cancelEvent } from "../src/modules/eventLifecycle/cancellation.js";
import { loginDatabase } from "./helpers/loginDatabase.js";
import { cancellationRecoveryFixture } from "./helpers/cancellationRecoveryFixture.js";

const snapshotTables = [
  "events",
  "venue_bookings",
  "equipment_reservations",
  "tech_support_requests",
  "tech_staff_assignments",
  "change_requests",
  "audit_logs",
  "notifications",
  "notification_deliveries",
] as const;

const failurePoints = [
  {
    label: "Booking Released audit INSERT",
    table: "audit_logs",
    operation: "INSERT",
    condition: "NEW.action = 'Booking Released'",
  },
  {
    label: "Obsolete audit INSERT",
    table: "audit_logs",
    operation: "INSERT",
    condition: "NEW.action = 'Change request became Obsolete'",
  },
  {
    label: "notification delivery INSERT",
    table: "notification_deliveries",
    operation: "INSERT",
    condition: "true",
  },
  {
    label: "equipment reservation UPDATE",
    table: "equipment_reservations",
    operation: "UPDATE",
    condition: "true",
  },
] as const;

async function snapshot(pool: Pool) {
  const values: unknown[] = [];
  for (const table of snapshotTables) {
    const rows = await pool.query<{ row: unknown }>(
      `SELECT to_jsonb(t) AS row FROM ${table} AS t ORDER BY id`,
    );
    values.push([table, rows.rows]);
  }
  return values;
}

for (const failure of failurePoints) {
  test(
    `Confirmed cancellation rolls back all rows when ${failure.label} fails, then retry and replay are safe`,
    async () => {
      const database = await loginDatabase();
      try {
        const fixture = await cancellationRecoveryFixture(database.pool);
        const before = await snapshot(database.pool);
        await database.pool.query(`CREATE FUNCTION fail_recovery_cancellation() RETURNS trigger
          LANGUAGE plpgsql AS $$ BEGIN
            IF ${failure.condition} THEN
              RAISE EXCEPTION 'synthetic cancellation recovery failure';
            END IF;
            RETURN NEW;
          END $$`);
        await database.pool.query(
          `CREATE TRIGGER fail_recovery_cancellation BEFORE ${failure.operation} ON ${failure.table}
           FOR EACH ROW EXECUTE FUNCTION fail_recovery_cancellation()`,
        );

        await assert.rejects(
          cancelEvent(database.pool, fixture.coordinator, fixture.eventId, {
            reason: "Sponsor funding withdrawn",
          }),
          /synthetic cancellation recovery failure/,
        );
        assert.deepEqual(await snapshot(database.pool), before);

        await database.pool.query(
          `DROP TRIGGER fail_recovery_cancellation ON ${failure.table}`,
        );
        await database.pool.query(
          "DROP FUNCTION fail_recovery_cancellation()",
        );
        const retry = await cancelEvent(
          database.pool,
          fixture.coordinator,
          fixture.eventId,
          { reason: "Sponsor funding withdrawn" },
        );
        assert.equal(retry.status, "cancelled");
        assert.equal(retry.replayed, false);

        const event = await database.pool.query<{ status: string }>(
          "SELECT status FROM events WHERE id=$1",
          [fixture.eventId],
        );
        assert.equal(event.rows[0]?.status, "cancelled");
        const bookings = await database.pool.query<{
          id: string;
          status: string;
          requires_reconfirmation: boolean;
        }>(
          "SELECT id,status,requires_reconfirmation FROM venue_bookings WHERE event_id=$1",
          [fixture.eventId],
        );
        assert.equal(bookings.rows.length, fixture.bookingIds.length);
        assert.ok(
          bookings.rows.every(
            (row) =>
              row.status === "released" && !row.requires_reconfirmation,
          ),
        );
        const reservations = await database.pool.query<{
          id: string;
          status: string;
        }>(
          "SELECT id,status FROM equipment_reservations WHERE event_id=$1",
          [fixture.eventId],
        );
        assert.equal(reservations.rows.length, fixture.reservationIds.length);
        assert.ok(reservations.rows.every((row) => row.status === "released"));

        const bookingAudits = await database.pool.query<{
          actor_id: string;
          entity_id: string;
          event_id: string;
          field_changed: string | null;
          new_value: string | null;
        }>(
          "SELECT actor_id,entity_id,event_id,field_changed,new_value FROM audit_logs WHERE event_id=$1 AND action='Booking Released' ORDER BY entity_id",
          [fixture.eventId],
        );
        assert.equal(bookingAudits.rows.length, fixture.bookingIds.length);
        assert.deepEqual(
          new Set(bookingAudits.rows.map((row) => row.entity_id)),
          new Set(fixture.bookingIds),
        );
        assert.ok(
          bookingAudits.rows.every(
            (row) =>
              row.actor_id === fixture.coordinator.id &&
              row.event_id === fixture.eventId &&
              row.field_changed === "status" &&
              row.new_value === "released",
          ),
        );

        const pendingAudits = await database.pool.query<{
          actor_id: string;
          entity_id: string;
          old_value: string | null;
          new_value: string | null;
        }>(
          "SELECT actor_id,entity_id,old_value,new_value FROM audit_logs WHERE event_id=$1 AND action='Change request became Obsolete' ORDER BY entity_id",
          [fixture.eventId],
        );
        assert.equal(pendingAudits.rows.length, fixture.pendingRequestIds.length);
        assert.deepEqual(
          new Set(pendingAudits.rows.map((row) => row.entity_id)),
          new Set(fixture.pendingRequestIds),
        );
        assert.ok(
          pendingAudits.rows.every(
            (row) =>
              row.actor_id === fixture.coordinator.id &&
              row.old_value === "pending" &&
              row.new_value === "obsolete",
          ),
        );
        const obsoleteRequests = await database.pool.query<{
          id: string;
          status: string;
          reviewed_by: string | null;
        }>(
          "SELECT id,status,reviewed_by FROM change_requests WHERE event_id=$1",
          [fixture.eventId],
        );
        assert.equal(obsoleteRequests.rows.length, fixture.pendingRequestIds.length);
        assert.deepEqual(
          new Set(obsoleteRequests.rows.map((row) => row.id)),
          new Set(fixture.pendingRequestIds),
        );
        assert.ok(
          obsoleteRequests.rows.every(
            (row) =>
              row.status === "obsolete" &&
              row.reviewed_by === fixture.coordinator.id,
          ),
        );
        const deliveries = await database.pool.query<{ id: string }>(
          `SELECT d.id FROM notification_deliveries d
           JOIN notifications n ON n.id=d.notification_id WHERE n.event_id=$1`,
          [fixture.eventId],
        );
        assert.ok(deliveries.rows.length > 0);

        const committed = await snapshot(database.pool);
        assert.notDeepEqual(committed, before);
        const replay = await cancelEvent(
          database.pool,
          fixture.coordinator,
          fixture.eventId,
          { reason: "Replay after successful retry" },
        );
        assert.equal(replay.replayed, true);
        assert.deepEqual(await snapshot(database.pool), committed);
      } finally {
        await database.close();
      }
    },
  );
}
