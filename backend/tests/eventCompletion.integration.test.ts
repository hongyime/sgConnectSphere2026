// Real PostgreSQL proof: locks, exact boundaries, atomic audit/outbox and T-88.
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loginDatabase } from "./helpers/loginDatabase.js";
import {
  completeEvent,
  getCompletion,
  evaluateCompletions,
} from "../src/modules/eventLifecycle/completion.js";
import type { AuthenticatedUser } from "../src/modules/accessControl/types.js";
const START = new Date("2027-01-15T01:00Z"),
  END = new Date("2027-01-15T09:00Z");
async function fixture() {
  const f = await loginDatabase();
  const q = (s: string, v?: unknown[]) => f.pool.query(s, v);
  try {
    const org = randomUUID(),
      coord = randomUUID(),
      owner = randomUUID(),
      other = randomUUID();
    await q(
      "INSERT INTO client_organisations(id,name) VALUES($1,'Completion test')",
      [org],
    );
    for (const [id, role] of [
      [coord, "event_coordinator"],
      [owner, "event_organiser"],
      [other, "event_coordinator"],
    ])
      await q(
        "INSERT INTO users(id,email,password_hash,full_name,role,client_org_id) VALUES($1,$2,'synthetic',$3,$4,$5)",
        [id, `${id}@example.test`, role, role, org],
      );
    const actor: AuthenticatedUser = {
      id: coord,
      email: `${coord}@example.test`,
      role: "event_coordinator",
      isActive: true,
      failedLoginCount: 0,
    };
    async function event(status = "confirmed", start = START, end = END) {
      const id = randomUUID();
      await q(
        "INSERT INTO events(id,event_code,title,organiser_id,coordinator_id,client_org_id,status,event_range,expected_attendance) VALUES($1,$2,'Completion test',$3,$4,$5,$6,tstzrange($7,$8,'[)'),10)",
        [id, `COMP-${id.slice(0, 8)}`, owner, coord, org, status, start, end],
      );
      return id;
    }
    return { ...f, q, org, coord, owner, other, actor, event };
  } catch (e) {
    await f.close();
    throw e;
  }
}

test("TC_E10S01_06 TC_E08S05_02 TC_E08S05_03 TC_E08S05_05 manual time gate, durable actor/audit, T-88, and idempotent retries", async () => {
  const f = await fixture();
  try {
    const id = await f.event();
    assert.equal((await getCompletion(f.pool, f.actor, id)).canComplete, false);
    const live = await f.event(
      "confirmed",
      new Date(Date.now() - 60000),
      new Date(Date.now() + 60000),
    );
    assert.equal(
      (await getCompletion(f.pool, f.actor, live)).canComplete,
      true,
    );
    await completeEvent(f.pool, f.actor, live);
    for (const status of [
      "pending",
      "pending",
      "approved",
      "declined",
      "applied",
    ])
      await f.q(
        "INSERT INTO change_requests(event_id,requested_by,description,status) VALUES($1,$2,'Change',$3)",
        [id, f.owner, status],
      );
    await assert.rejects(
      completeEvent(f.pool, f.actor, id, {
        clock: () => new Date(START.getTime() - 1),
      }),
      { status: 409 },
    );
    assert.equal(
      (
        await f.q("SELECT count(*)::int n FROM audit_logs WHERE event_id=$1", [
          id,
        ])
      ).rows[0].n,
      0,
    );
    assert.deepEqual(
      await completeEvent(f.pool, f.actor, id, { clock: () => START }),
      { status: "completed", replayed: false },
    );
    assert.equal(
      (await f.q("SELECT status FROM events WHERE id=$1", [id])).rows[0].status,
      "completed",
    );
    const log = (
      await f.q(
        "SELECT actor_id,old_value,new_value,occurred_at FROM audit_logs WHERE event_id=$1 AND entity_type='event'",
        [id],
      )
    ).rows;
    assert.equal(log.length, 1);
    assert.equal(log[0].actor_id, f.coord);
    assert.equal(log[0].old_value, "confirmed");
    assert.equal(log[0].new_value, "completed");
    assert.ok(log[0].occurred_at instanceof Date);
    assert.deepEqual(
      (
        await f.q(
          "SELECT status FROM change_requests WHERE event_id=$1 ORDER BY status::text",
          [id],
        )
      ).rows.map((r) => r.status),
      ["applied", "approved", "declined", "obsolete", "obsolete"],
    );
    assert.equal(
      (
        await f.q(
          "SELECT count(*)::int n FROM audit_logs WHERE event_id=$1 AND entity_type='change_request' AND old_value='pending' AND new_value='obsolete'",
          [id],
        )
      ).rows[0].n,
      2,
    );
    const history = (await f.q(
      `SELECT a.actor_id,a.occurred_at,c.reviewed_at,c.decision_reason
       FROM audit_logs a JOIN change_requests c ON c.id=a.entity_id
       WHERE a.event_id=$1 AND a.entity_type='change_request' AND a.new_value='obsolete'`,
      [id],
    )).rows;
    assert.equal(history.length, 2);
    for (const row of history) {
      assert.equal(row.actor_id, f.coord);
      assert.ok(row.occurred_at instanceof Date);
      assert.ok(row.reviewed_at instanceof Date);
      assert.equal(row.decision_reason, "Event completed");
    }
    const counts = await f.q(
      "SELECT (SELECT count(*) FROM notifications WHERE event_id=$1) n,(SELECT count(*) FROM notification_deliveries d JOIN notifications n ON n.id=d.notification_id WHERE n.event_id=$1) d",
      [id],
    );
    assert.equal(Number(counts.rows[0].n), 1);
    assert.equal(Number(counts.rows[0].d), 1);
    assert.deepEqual(await completeEvent(f.pool, f.actor, id), {
      status: "completed",
      replayed: true,
    });
    assert.deepEqual(
      (
        await f.q(
          "SELECT (SELECT count(*) FROM notifications WHERE event_id=$1) n,(SELECT count(*) FROM notification_deliveries d JOIN notifications n ON n.id=d.notification_id WHERE n.event_id=$1) d",
          [id],
        )
      ).rows,
      counts.rows,
    );
    assert.equal((await f.q(
      "SELECT count(*)::int n FROM audit_logs WHERE event_id=$1 AND entity_type='change_request' AND new_value='obsolete'", [id],
    )).rows[0].n, 2);
    const view = await getCompletion(f.pool, f.actor, id);
    assert.equal(view.canComplete, false);
    assert.equal(view.status, "completed");
    assert.ok(view.activity.some((r) => r.new_value === "completed"));
    const byCode = await getCompletion(
      f.pool,
      f.actor,
      (await f.q("SELECT event_code FROM events WHERE id=$1", [id])).rows[0]
        .event_code,
    );
    assert.equal(byCode.title, "Completion test");
  } finally {
    await f.close();
  }
});

test("TC_E10S01_06 TC_E08S05_01 TC_E08S05_04 TC_E08S05_06 exact-end auto evaluation excludes Cancelled and other statuses, with System audit", async () => {
  const f = await fixture();
  try {
    const id = await f.event(),
      cancelled = await f.event("cancelled");
    for (const status of [
      "planning",
      "safety_review",
      "completed",
      "draft",
      "approved",
      "rejected",
    ])
      await f.event(status);
    await f.q(
      "INSERT INTO change_requests(event_id,requested_by,description) VALUES($1,$2,'Pending auto change')",
      [id, f.owner],
    );
    assert.deepEqual(
      await evaluateCompletions(f.pool, {
        clock: () => new Date(END.getTime() - 1),
      }),
      { completed: 0 },
    );
    assert.equal(
      (await f.q("SELECT status FROM events WHERE id=$1", [id])).rows[0].status,
      "confirmed",
    );
    assert.deepEqual(await evaluateCompletions(f.pool, { clock: () => END }), {
      completed: 1,
    });
    assert.equal(
      (await f.q("SELECT status FROM events WHERE id=$1", [cancelled])).rows[0]
        .status,
      "cancelled",
    );
    const log = (
      await f.q(
        "SELECT actor_id,action,old_value,new_value FROM audit_logs WHERE event_id=$1 AND entity_type='event'",
        [id],
      )
    ).rows[0];
    assert.deepEqual(log, {
      actor_id: null,
      action: "Automatically completed event",
      old_value: "confirmed",
      new_value: "completed",
    });
    assert.equal(
      (await f.q("SELECT status FROM change_requests WHERE event_id=$1", [id]))
        .rows[0].status,
      "obsolete",
    );
    assert.equal(
      (
        await f.q("SELECT reviewed_by FROM change_requests WHERE event_id=$1", [
          id,
        ])
      ).rows[0].reviewed_by,
      null,
    );
    assert.deepEqual(await evaluateCompletions(f.pool, { clock: () => END }), {
      completed: 0,
    });
    const requestHistory = (await f.q(
      `SELECT actor_id,old_value,new_value,occurred_at FROM audit_logs
       WHERE event_id=$1 AND entity_type='change_request'`, [id],
    )).rows;
    assert.equal(requestHistory.length, 1);
    assert.equal(requestHistory[0].actor_id, null);
    assert.equal(requestHistory[0].old_value, "pending");
    assert.equal(requestHistory[0].new_value, "obsolete");
    assert.ok(requestHistory[0].occurred_at instanceof Date);
    // Runtime uses actual PostgreSQL time, never a request-supplied clock.
    await f.event(
      "confirmed",
      new Date(Date.now() - 120000),
      new Date(Date.now() - 60000),
    );
    assert.deepEqual(await evaluateCompletions(f.pool), { completed: 1 });
  } finally {
    await f.close();
  }
});

test("Completion refuses stale accounts and assignment, wrong statuses, and rolls back audit/status/request changes on outbox failure", async () => {
  const f = await fixture();
  try {
    const id = await f.event();
    for (const status of [
      "planning",
      "cancelled",
      "submitted",
      "approved",
      "safety_review",
      "rejected",
    ])
      await assert.rejects(
        completeEvent(f.pool, f.actor, await f.event(status), {
          clock: () => END,
        }),
        { status: 409 },
      );
    const draft = await f.event("draft");
    for (const action of [getCompletion, completeEvent]) {
      await assert.rejects(action(f.pool, { ...f.actor, id: f.other }, id), {
        status: 403,
      });
      await assert.rejects(action(f.pool, f.actor, "missing"), { status: 403 });
      await assert.rejects(action(f.pool, f.actor, draft), { status: 403 });
      await f.q("UPDATE users SET is_active=false WHERE id=$1", [f.coord]);
      await assert.rejects(action(f.pool, f.actor, id), { status: 403 });
      await f.q("UPDATE users SET is_active=true WHERE id=$1", [f.coord]);
    }
    for (const update of [
      "role='attendee'",
      "failed_login_count=5",
      "locked_until=now()+interval '1 hour'",
    ]) {
      await f.q(`UPDATE users SET ${update} WHERE id=$1`, [f.coord]);
      await assert.rejects(completeEvent(f.pool, f.actor, id), { status: 403 });
      await f.q(
        "UPDATE users SET role='event_coordinator',failed_login_count=0,locked_until=NULL WHERE id=$1",
        [f.coord],
      );
    }
    await f.q(
      "INSERT INTO change_requests(event_id,requested_by,description) VALUES($1,$2,'Retained on rollback')",
      [id, f.owner],
    );
    await f.q(
      "CREATE FUNCTION reject_completion_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic delivery failure'; END $$",
    );
    await f.q(
      "CREATE TRIGGER reject_completion_outbox BEFORE INSERT ON notification_deliveries FOR EACH ROW EXECUTE FUNCTION reject_completion_outbox()",
    );
    await assert.rejects(
      completeEvent(f.pool, f.actor, id, { clock: () => END }),
      /Synthetic delivery failure/,
    );
    assert.equal(
      (await f.q("SELECT status FROM events WHERE id=$1", [id])).rows[0].status,
      "confirmed",
    );
    assert.equal(
      (await f.q("SELECT status FROM change_requests WHERE event_id=$1", [id]))
        .rows[0].status,
      "pending",
    );
    assert.equal(
      (
        await f.q("SELECT count(*)::int n FROM audit_logs WHERE event_id=$1", [
          id,
        ])
      ).rows[0].n,
      0,
    );
    await assert.rejects(
      evaluateCompletions(f.pool, { clock: () => END }),
      /Synthetic delivery failure/,
    );
    await f.q(
      "DROP TRIGGER reject_completion_outbox ON notification_deliveries",
    );
    await completeEvent(f.pool, f.actor, id, { clock: () => END });
  } finally {
    await f.close();
  }
});

test("Concurrent manual/automatic evaluation yields one transition; Cancelled wins when committed before evaluation lock", async () => {
  const f = await fixture();
  try {
    const id = await f.event();
    await Promise.all([
      completeEvent(f.pool, f.actor, id, { clock: () => END }),
      evaluateCompletions(f.pool, { clock: () => END }),
    ]);
    assert.equal(
      (
        await f.q(
          "SELECT count(*)::int n FROM audit_logs WHERE event_id=$1 AND field_changed='status'",
          [id],
        )
      ).rows[0].n,
      1,
    );
    const second = await f.event();
    const lock = await f.pool.connect();
    try {
      await lock.query("BEGIN");
      await lock.query("SELECT id FROM events WHERE id=$1 FOR UPDATE", [
        second,
      ]);
      const evaluating = evaluateCompletions(f.pool, { clock: () => END });
      // Barrier: evaluator has reached the event row lock, not an arbitrary sleep.
      for (let i = 0; i < 100; i++) {
        const r = await f.q(
          "SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%WHERE (id::text=$1 OR event_code=$1)%'",
        );
        if (r.rows[0].n > 0) break;
        await new Promise((r) => setTimeout(r, 10));
      }
      await lock.query("UPDATE events SET status='cancelled' WHERE id=$1", [
        second,
      ]);
      await lock.query("COMMIT");
      assert.deepEqual(await evaluating, { completed: 0 });
    } finally {
      await lock.query("ROLLBACK");
      lock.release();
    }
    assert.equal(
      (await f.q("SELECT status FROM events WHERE id=$1", [second])).rows[0]
        .status,
      "cancelled",
    );
    const accountEvent = await f.event();
    const account = await f.pool.connect();
    try {
      await account.query("BEGIN");
      await account.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
        f.coord,
      ]);
      await assert.rejects(
        completeEvent(f.pool, f.actor, accountEvent, { clock: () => END }),
        { status: 409 },
      );
    } finally {
      await account.query("ROLLBACK");
      account.release();
    }
  } finally {
    await f.close();
  }
});

test("Evaluation tolerates an event removed after candidate selection", async () => {
  const f = await fixture();
  try {
    const id = await f.event();
    const lock = await f.pool.connect();
    try {
      await lock.query("BEGIN");
      await lock.query("SELECT id FROM events WHERE id=$1 FOR UPDATE", [id]);
      const evaluating = evaluateCompletions(f.pool, { clock: () => END });
      let waiting = false;
      for (let i = 0; i < 100; i++) {
        const r = await f.q(
          "SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%WHERE (id::text=$1 OR event_code=$1)%'",
        );
        if (r.rows[0].n > 0) {
          waiting = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 10));
      }
      assert.equal(waiting, true, "evaluator must reach row-lock barrier");
      await lock.query("DELETE FROM events WHERE id=$1", [id]);
      await lock.query("COMMIT");
      assert.deepEqual(await evaluating, { completed: 0 });
    } finally {
      await lock.query("ROLLBACK");
      lock.release();
    }
  } finally {
    await f.close();
  }
});
