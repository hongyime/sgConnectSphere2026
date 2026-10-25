import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";
import {
  cancellationReason,
  cancelEvent,
  getCancellation,
} from "../src/modules/eventLifecycle/cancellation.js";
import type { AuthenticatedUser } from "../src/modules/accessControl/types.js";
const database = {
  query: () => {
    throw new Error("must not query before authorization");
  },
} as unknown as Pool;
const user: AuthenticatedUser = {
  id: "test",
  email: "test@example.test",
  role: "attendee",
  isActive: true,
  failedLoginCount: 0,
};
test("TC_E10S04_01 reason is required, bounded and trimmed", () => {
  for (const x of [
    null,
    [],
    {},
    { reason: 1 },
    { reason: " " },
    { reason: "x".repeat(2001) },
  ])
    assert.throws(() => cancellationReason(x), { status: 400 });
  assert.equal(
    cancellationReason({ reason: " Sponsor withdrew " }),
    "Sponsor withdrew",
  );
  assert.equal(cancellationReason({ reason: "x".repeat(2000) }).length, 2000);
});
test("TC_E10S04_04 unauthenticated, inactive, locked and wrong-role callers cannot mutate", async () => {
  await assert.rejects(cancelEvent(database, undefined, "EVT", {}), {
    status: 401,
  });
  await assert.rejects(getCancellation(database, undefined, "EVT"), {
    status: 401,
  });
  for (const u of [
    { ...user, isActive: false },
    { ...user, failedLoginCount: 5 },
    { ...user, lockedUntil: new Date(Date.now() + 60000) },
  ])
    await assert.rejects(cancelEvent(database, u, "EVT", {}), { status: 403 });
  await assert.rejects(cancelEvent(database, user, "EVT", {}), { status: 403 });
  for (const ref of ["", "x".repeat(241)])
    await assert.rejects(getCancellation(database, user, ref), { status: 400 });
});
