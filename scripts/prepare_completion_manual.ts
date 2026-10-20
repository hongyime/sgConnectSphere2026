// Synthetic setup only: human acceptance must still be driven and captured by hand.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
const address = new URL(process.env.TEST_DATABASE_URL || "");
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(address.hostname));
assert.match(
  address.pathname,
  /^\/connectsphere_notification_test(?:_[a-z0-9_]+)?$/,
);
const pool = new Pool({ connectionString: address.href });
try {
  const users = (
    await pool.query(
      "SELECT id,role,client_org_id FROM users WHERE email IN ('organiser_a@clienta.com','coord_a@connectsphere.com')",
    )
  ).rows;
  const organiser = users.find((u) => u.role === "event_organiser"),
    coordinator = users.find((u) => u.role === "event_coordinator");
  assert.equal(users.length, 2, "Seed the isolated test database first");
  const now = (
    await pool.query<{ now: Date }>("SELECT clock_timestamp() AS now")
  ).rows[0].now.getTime();
  await pool.query("BEGIN");
  for (const [label, status, start, end] of [
    ["MANUAL", "confirmed", now - 3600000, now + 86400000],
    [
      "PREMATURE",
      "confirmed",
      now + 7 * 86400000,
      now + 7 * 86400000 + 3600000,
    ],
    ["AUTO", "confirmed", now - 7200000, now - 3600000],
    ["CANCELLED", "cancelled", now - 7200000, now - 3600000],
  ] as const) {
    const id = randomUUID(),
      code = `E08-${label}-${id.slice(0, 8)}`;
    await pool.query(
      "INSERT INTO events(id,event_code,title,organiser_id,coordinator_id,client_org_id,status,event_range,expected_attendance) VALUES($1,$2,$3,$4,$5,$6,$7,tstzrange($8,$9,'[)'),10)",
      [
        id,
        code,
        `Completion manual ${label.toLowerCase()}`,
        organiser.id,
        coordinator.id,
        organiser.client_org_id,
        status,
        new Date(start),
        new Date(end),
      ],
    );
    await pool.query(
      "INSERT INTO change_requests(event_id,requested_by,description,status) VALUES($1,$2,'Manual pending change','pending'),($1,$2,'Previously approved change','approved')",
      [id, organiser.id],
    );
    console.log(`${label}: ${code} — /coordinator/events/${code}/complete`);
  }
  await pool.query("COMMIT");
} catch (e) {
  await pool.query("ROLLBACK");
  throw e;
} finally {
  await pool.end();
}
