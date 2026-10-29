import test from 'node:test';
import assert from 'node:assert/strict';
import { AccessError } from '../src/modules/eventVisibility/service.js';
import { DecisionBlockedError, RejectedRequestError } from '../src/modules/eventLifecycle/decision.js';
import { ReadinessBlockedError } from '../src/modules/eventReadiness/submission.js';
import { DeactivationBlockedError } from '../src/modules/accessControl/deactivation.js';
import { ProfileValidationError } from '../src/modules/accessControl/profile.js';
import type { EventReadinessSnapshot } from '../src/modules/eventReadiness/types.js';

const snapshot: EventReadinessSnapshot = {
  eventId: '11111111-1111-1111-1111-111111111111',
  eventCode: 'EVT-1',
  title: 'Test event',
  status: 'planning',
  startsAt: '2026-11-01T09:00:00.000Z',
  endsAt: '2026-11-01T10:00:00.000Z',
  equipmentNoneRequired: false,
  supportNoneRequired: false,
  venueBookings: [],
  equipment: [],
  support: [],
  blockers: [],
  canSubmit: false,
};

const errors: AccessError[] = [
  new DecisionBlockedError([]),
  new RejectedRequestError(),
  new ReadinessBlockedError(snapshot),
  new DeactivationBlockedError([]),
  new ProfileValidationError({ email: ['Enter a valid email address.'] }),
];

test('every AccessError subclass is usable through the shared base', () => {
  for (const error of errors) {
    assert.ok(error instanceof AccessError, `${error.constructor.name} extends AccessError`);
    assert.equal(typeof error.status, 'number', `${error.constructor.name} has a numeric status`);
    assert.ok(error.message.length > 0, `${error.constructor.name} has a non-empty message`);
  }
});

test('each AccessError subclass carries its own type-specific field', () => {
  const [decision, rejected, readiness, deactivation, profile] = errors;
  assert.deepEqual((decision as DecisionBlockedError).missingFields, []);
  assert.equal(rejected.message, 'This request is rejected, so it can no longer be changed.');
  assert.equal((readiness as ReadinessBlockedError).readiness, snapshot);
  assert.deepEqual((deactivation as DeactivationBlockedError).events, []);
  assert.deepEqual((profile as ProfileValidationError).errors, { email: ['Enter a valid email address.'] });
});
