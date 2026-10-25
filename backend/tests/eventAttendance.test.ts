// E09-S06 / SCRUM-68: authorization and strict input validation; persistence in real DB suite.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { parseAttendance, requireAttendanceCoordinator } from '../src/modules/eventAttendance/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
const actor: AuthenticatedUser = { id: randomUUID(), email: 'coordinator@example.test', role: 'event_coordinator', isActive: true, failedLoginCount: 0 };
test('E09-S06 only a signed-in active unlocked Coordinator passes attendance authorization', () => {
  assert.throws(() => requireAttendanceCoordinator(undefined, 'E'), { status: 401 });
  for (const user of [{ ...actor, role: 'attendee' as const }, { ...actor, isActive: false }, { ...actor, failedLoginCount: 5 }, { ...actor, lockedUntil: new Date(Date.now()+60000) }])
    assert.throws(() => requireAttendanceCoordinator(user, 'E'), { status: 403 });
  for (const id of ['', 'x'.repeat(241)]) assert.throws(() => requireAttendanceCoordinator(actor, id), { status: 400 });
  assert.equal(requireAttendanceCoordinator(actor, 'E'), actor);
});
test('E09-S06 rejects malformed registration identifiers and non-boolean attendance', () => {
  for (const body of [undefined, null, {}, [], {registrationId: 3}, {registrationId: randomUUID(), attended: 'true'}, {registrationId:'bad', attended: true}])
    assert.throws(() => parseAttendance(body), { status: 400 });
  for (const attended of [true,false]) { const registrationId=randomUUID(); assert.deepEqual(parseAttendance({registrationId,attended}),{registrationId,attended}); }
});
