// SCRUM-33 (E03-S02) unit tests: request-body rules and wrong-role refusals,
// which are decided before any event is read. The rules that depend on
// stored data (assignment, status, outstanding questions) are proven against
// PostgreSQL in clarification.integration.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import {
  MAX_CLARIFICATION_TEXT,
  parseAnswers,
  parseQuestions,
  requestClarification,
  respondToClarification,
} from '../src/modules/eventLifecycle/clarification.js';
import { AccessError } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

const questionId = '00000000-0000-4000-8000-0000000000c1';

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

test('TC_E03S02_07: no questions, a missing list or only blank questions are rejected', () => {
  for (const body of [undefined, null, {}, { questions: 'Why?' }, { questions: [] }, { questions: ['   ', '\n'] }, { questions: [42] }]) {
    assert.throws(() => parseQuestions(body), refusedWith(400, 'Add at least one question.'));
  }
});

test('TC_E03S02_07: blank extra entries are dropped and questions are trimmed', () => {
  assert.deepEqual(parseQuestions({ questions: ['  First?  ', '', '   ', 'Second?'] }), ['First?', 'Second?']);
});

test('TC_E03S02_08: a question of exactly 2000 characters is accepted and 2001 is rejected', () => {
  assert.equal(MAX_CLARIFICATION_TEXT, 2000);
  assert.deepEqual(parseQuestions({ questions: ['q'.repeat(2000)] }), ['q'.repeat(2000)]);
  assert.throws(() => parseQuestions({ questions: ['q'.repeat(2001)] }),
    refusedWith(400, 'Each question must be 2000 characters or fewer.'));
});

test('SCRUM-33: at most 20 questions can be sent at once', () => {
  assert.equal(parseQuestions({ questions: Array(20).fill('Why?') }).length, 20);
  assert.throws(() => parseQuestions({ questions: Array(21).fill('Why?') }),
    refusedWith(400, 'Send at most 20 questions at a time.'));
});

test('TC_E03S02_09: a missing answer list or a blank answer is refused', () => {
  for (const body of [undefined, {}, { answers: 'yes' }]) {
    assert.throws(() => parseAnswers(body), refusedWith(400, 'Answer every outstanding question before resubmitting.'));
  }
  assert.throws(() => parseAnswers({ answers: [{ questionId, answer: '   ' }] }),
    refusedWith(400, 'Answer every outstanding question before resubmitting.'));
});

test('SCRUM-33: answers must name a question once, and are limited to 2000 characters', () => {
  assert.throws(() => parseAnswers({ answers: [{ questionId: 'not-a-uuid', answer: 'Yes' }] }),
    refusedWith(400, 'One of the answers does not match an outstanding question.'));
  assert.throws(() => parseAnswers({ answers: [{ questionId, answer: 'Yes' }, { questionId: questionId.toUpperCase(), answer: 'No' }] }),
    refusedWith(400, 'Each question can only be answered once.'));
  assert.throws(() => parseAnswers({ answers: [{ questionId, answer: 'a'.repeat(2001) }] }),
    refusedWith(400, 'Each answer must be 2000 characters or fewer.'));
  assert.deepEqual([...parseAnswers({ answers: [{ questionId, answer: ' Forty ' }] })], [[questionId, 'Forty']]);
});

test('SCRUM-33: only Event Coordinators can ask and only Event Organisers can answer; refusals are audited, no event is read', async () => {
  const organiser: AuthenticatedUser = {
    id: '00000000-0000-4000-8000-0000000000aa', email: 'organiser@example.test', role: 'event_organiser',
    clientOrgId: '00000000-0000-4000-8000-0000000000bb', isActive: true, failedLoginCount: 0,
  };
  const coordinator: AuthenticatedUser = { ...organiser, role: 'event_coordinator', clientOrgId: null };

  const asking = recordingPool();
  await assert.rejects(requestClarification(asking.pool, organiser, 'EVT-2003', { questions: ['Why?'] }),
    refusedWith(403, 'Access denied. This action is for Event Coordinators.'));
  assert.equal(asking.calls.length, 1);
  assert.match(asking.calls[0]!, /'Access Denied'/);

  const answering = recordingPool();
  await assert.rejects(respondToClarification(answering.pool, coordinator, 'EVT-2003', { answers: [] }),
    refusedWith(403, 'Access denied. Contact your administrator about your organisation access.'));
  assert.equal(answering.calls.length, 1);
  assert.match(answering.calls[0]!, /'Access Denied'/);

  await assert.rejects(requestClarification(asking.pool, undefined, 'EVT-2003', {}), refusedWith(401, 'Sign in to continue.'));
});
