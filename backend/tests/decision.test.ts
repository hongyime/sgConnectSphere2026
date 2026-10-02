// SCRUM-34 (E03-S03) unit tests: request-body rules and wrong-role refusals,
// which are decided before any event is read. The rules that depend on
// stored data (assignment, status, required information) are proven against
// PostgreSQL in decision.integration.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import {
  decideEventRequest,
  DECISION_MESSAGES,
  MAX_DECISION_REASON,
  parseDecision,
} from '../src/modules/eventLifecycle/decision.js';
import { AccessError } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

function refusedWith(status: number, message: string) {
  return (error: unknown) => {
    assert.ok(error instanceof AccessError);
    assert.equal(error.status, status);
    assert.equal(error.message, message);
    return true;
  };
}

// Records every statement; any attempt to open a transaction fails the test.
function recordingPool() {
  const calls: string[] = [];
  const pool = {
    async query(sql: string) { calls.push(sql); return { rows: [], rowCount: 0 }; },
    async connect() { throw new Error('no transaction should be opened'); },
  } as unknown as Pool;
  return { pool, calls };
}

test('TC_E03S03_04: a rejection with no reason, or only blank space, is refused', () => {
  for (const body of [{ decision: 'reject' }, { decision: 'reject', reason: '' }, { decision: 'reject', reason: '   \n' }, { decision: 'reject', reason: 42 }]) {
    assert.throws(() => parseDecision(body), refusedWith(400, 'Add a reason for rejecting this request.'));
  }
});

test('TC_E03S03_10: a reason of exactly 2000 characters is accepted and 2001 is refused', () => {
  assert.equal(MAX_DECISION_REASON, 2000);
  assert.deepEqual(parseDecision({ decision: 'reject', reason: 'r'.repeat(2000) }), { decision: 'reject', reason: 'r'.repeat(2000) });
  assert.throws(() => parseDecision({ decision: 'reject', reason: 'r'.repeat(2001) }),
    refusedWith(400, 'The reason must be 2000 characters or fewer.'));
});

test('SCRUM-34: the reason is trimmed, an approval ignores any reason, and an unknown decision is refused', () => {
  assert.deepEqual(parseDecision({ decision: 'reject', reason: '  Budget not confirmed  ' }), { decision: 'reject', reason: 'Budget not confirmed' });
  assert.deepEqual(parseDecision({ decision: 'approve', reason: 'ignored' }), { decision: 'approve' });
  for (const body of [undefined, null, {}, [], { decision: 'Approve' }, { decision: 'cancel' }]) {
    assert.throws(() => parseDecision(body), refusedWith(400, 'Choose whether to approve or reject this request.'));
  }
});

test('TC_E03S03_08: an Organiser deciding on a request is refused like an unassigned Coordinator; the attempt is audited, no event is read', async () => {
  const organiser: AuthenticatedUser = {
    id: '00000000-0000-4000-8000-0000000000aa', email: 'organiser@example.test', role: 'event_organiser',
    clientOrgId: '00000000-0000-4000-8000-0000000000bb', isActive: true, failedLoginCount: 0,
  };

  const deciding = recordingPool();
  await assert.rejects(decideEventRequest(deciding.pool, organiser, 'EVT-2003', { decision: 'approve' }),
    refusedWith(403, DECISION_MESSAGES.notAssigned));
  assert.equal(deciding.calls.length, 1);
  assert.match(deciding.calls[0]!, /'Access Denied'/);

  await assert.rejects(decideEventRequest(deciding.pool, undefined, 'EVT-2003', { decision: 'approve' }),
    refusedWith(401, 'Sign in to continue.'));
  assert.equal(deciding.calls.length, 1, 'a signed-out call has no actor to audit');
});
