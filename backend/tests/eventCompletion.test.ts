import test from "node:test";
import assert from "node:assert/strict";
import { completionEligibility } from "../src/modules/eventLifecycle/completionRules.js";
import {
  completeEvent,
  getCompletion,
} from "../src/modules/eventLifecycle/completion.js";
import { EVENT_STATUSES } from "../src/modules/eventLifecycle/status.js";
import type { Pool } from "pg";
import type { AuthenticatedUser } from "../src/modules/accessControl/types.js";
const start = new Date("2027-01-15T01:00Z"),
  end = new Date("2027-01-15T09:00Z");
const actor: AuthenticatedUser = {
  id: "coord",
  email: "synthetic@example.test",
  role: "event_coordinator",
  isActive: true,
  failedLoginCount: 0,
};

test("TC_E08S05_01 TC_E08S05_02 TC_E08S05_03 TC_E08S05_06 exact start/end boundaries use the event range", () => {
  assert.deepEqual(
    completionEligibility(
      "confirmed",
      start,
      end,
      new Date(start.getTime() - 1),
    ),
    { manual: false, automatic: false },
  );
  assert.deepEqual(completionEligibility("confirmed", start, end, start), {
    manual: true,
    automatic: false,
  });
  assert.deepEqual(
    completionEligibility("confirmed", start, end, new Date(end.getTime() - 1)),
    { manual: true, automatic: false },
  );
  assert.deepEqual(completionEligibility("confirmed", start, end, end), {
    manual: true,
    automatic: true,
  });
  assert.deepEqual(
    completionEligibility("confirmed", start, end, new Date(end.getTime() + 1)),
    { manual: true, automatic: true },
  );
});
test("TC_E08S05_04 only Confirmed is eligible, including after the end", () => {
  for (const status of EVENT_STATUSES.filter((s) => s !== "confirmed"))
    assert.deepEqual(completionEligibility(status, start, end, end), {
      manual: false,
      automatic: false,
    });
  for (const dates of [
    [new Date("bad"), end, end],
    [start, new Date("bad"), end],
    [start, end, new Date("bad")],
    [end, start, end],
    [start, start, end],
  ])
    assert.deepEqual(
      completionEligibility("confirmed", ...(dates as [Date, Date, Date])),
      { manual: false, automatic: false },
    );
});
test("Completion reads/writes refuse missing, wrong-role, locked/inactive and invalid identifiers before querying", async () => {
  const db = {} as Pool;
  for (const action of [getCompletion, completeEvent]) {
    await assert.rejects(action(db, undefined, "event"), { status: 401 });
    for (const user of [
      { ...actor, role: "event_organiser" as const },
      { ...actor, isActive: false },
      { ...actor, failedLoginCount: 5 },
      { ...actor, lockedUntil: new Date(Date.now() + 60000) },
    ])
      await assert.rejects(action(db, user, "event"), { status: 403 });
    for (const id of ["", "x".repeat(241)])
      await assert.rejects(action(db, actor, id), { status: 400 });
  }
});
