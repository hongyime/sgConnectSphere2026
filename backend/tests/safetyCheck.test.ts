import test from 'node:test';
import assert from 'node:assert/strict';
import { AccessError } from '../src/modules/eventVisibility/service.js';
import { SAFETY_FACTORS, parseSafetyDecision, type SafetyDecisionInput } from '../src/modules/eventReadiness/safetyCheck.js';
import { decideSafetyReview } from '../src/modules/eventReadiness/submission.js';
import type { Pool } from 'pg';

function factors(satisfactory = true) {
  return Object.fromEntries(SAFETY_FACTORS.map(key => [key, { satisfactory, comment: `${key} checked` }]));
}

test('E08-S06 accepts one completed assessment for every safety factor', () => {
  const input: SafetyDecisionInput = { decision: 'approve', factors: factors() };
  assert.deepEqual(parseSafetyDecision(input), { decision: 'approve', factors: input.factors, reason: undefined });
});

test('E08-S06 refuses approval when a factor is missing or unsatisfactory', () => {
  const values = factors();
  delete values[SAFETY_FACTORS[0]];
  assert.throws(() => parseSafetyDecision({ decision: 'approve', factors: values }),
    (error: unknown) => error instanceof AccessError && error.status === 400 && /every safety factor/.test(error.message));

  const unsatisfactory = factors();
  unsatisfactory[SAFETY_FACTORS[0]] = { satisfactory: false, comment: 'Exit is blocked' };
  assert.throws(() => parseSafetyDecision({ decision: 'approve', factors: unsatisfactory }),
    (error: unknown) => error instanceof AccessError && error.status === 409 && /unsatisfactory/.test(error.message));
});

test('E08-S06 requires a reason for rejection or requested changes', () => {
  for (const decision of ['reject', 'request_changes'] as const) {
    assert.throws(() => parseSafetyDecision({ decision, factors: factors(), reason: '   ' }),
      (error: unknown) => error instanceof AccessError && error.status === 400 && /reason is required/.test(error.message));
  }
});

test('E08-S06 rejects malformed factors and overlong comments', () => {
  assert.throws(() => parseSafetyDecision({ decision: 'approve', factors: {} }), { status: 400 });
  const invalid = factors();
  invalid[SAFETY_FACTORS[0]] = { satisfactory: true, comment: 'x'.repeat(2001) };
  assert.throws(() => parseSafetyDecision({ decision: 'approve', factors: invalid }), { status: 400 });
});

test('E08-S06 refuses a decision from a non-Safety Officer before opening a transaction', async () => {
  const calls: string[] = [];
  const database = { query: async (sql: string) => { calls.push(sql); return { rows: [], rowCount: 0 }; } } as unknown as Pool;
  await assert.rejects(decideSafetyReview(database, {
    id: 'coord-1', email: 'coord@example.test', role: 'event_coordinator', isActive: true, failedLoginCount: 0,
  }, 'event-1', { decision: 'approve', factors: factors() }),
  (error: unknown) => error instanceof AccessError && error.status === 403);
  assert.equal(calls.length, 1);
  assert.match(calls[0]!, /Access Denied/);
});
