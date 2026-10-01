// SCRUM-33 (E03-S02): real PostgreSQL proof of the clarification rules,
// TC_E03S02_01 to _12. Each test gets its own random schema with every
// migration applied (helpers/loginDatabase.ts), so the status change, the
// question and answer threads, the audit entries, the notices and their
// email-outbox rows are all checked as PostgreSQL stores them.
//
// Requires TEST_DATABASE_URL pointing at a disposable local database named
// connectsphere_notification_test, never the live Supabase project.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import {
  requestClarification,
  respondToClarification,
  withOutstandingQuestions,
} from '../src/modules/eventLifecycle/clarification.js';
import { getAssignedEvent, listAssignedEvents } from '../src/modules/eventLifecycle/coordinatorAssignment.js';
import { AccessError, getEvent, type Query } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

const QUESTION = 'Please confirm the expected number of attendees';
const SECOND_QUESTION = 'Do you need lab equipment?';

async function fixture() {
  const f = await loginDatabase();
  const ids = {
    orgA: randomUUID(), orgB: randomUUID(),
    organiserA: randomUUID(), organiserB: randomUUID(), organiserC: randomUUID(),
    coordA: randomUUID(), coordB: randomUUID(),
  };
  await f.pool.query(`INSERT INTO client_organisations (id, name) VALUES ($1, 'Client A'), ($2, 'Client B')`, [ids.orgA, ids.orgB]);
  const people: [string, string | null, string, string][] = [
    [ids.organiserA, ids.orgA, 'Organiser A', 'event_organiser'],
    [ids.organiserB, ids.orgA, 'Organiser B', 'event_organiser'],
    [ids.organiserC, ids.orgB, 'Organiser C', 'event_organiser'],
    [ids.coordA, null, 'Coordinator A', 'event_coordinator'],
    [ids.coordB, null, 'Coordinator B', 'event_coordinator'],
  ];
  for (const [id, org, name, role] of people) {
    await f.pool.query(
      `INSERT INTO users (id, client_org_id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'unused', $4, $5)`,
      [id, org, `${id}@example.test`, name, role],
    );
  }
  const user = (id: string): AuthenticatedUser => {
    const person = people.find(([personId]) => personId === id)!;
    return {
      id, email: `${id}@example.test`, role: person[3] as AuthenticatedUser['role'], clientOrgId: person[1],
      isActive: true, failedLoginCount: 0,
    };
  };
  const event = async (code: string, organiser: string, coordinator: string | null, status: string) => {
    const org = people.find(([id]) => id === organiser)![1];
    const id = randomUUID();
    await f.pool.query(
      `INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance)
       VALUES ($1, $2, $3, $4, $5, $6, $7::event_status, tstzrange('2027-03-01 09:00+00', '2027-03-01 12:00+00', '[)'), 40)`,
      [id, code, organiser, coordinator, org, `Event ${code}`, status],
    );
    return id;
  };
  const query: Query = (sql, values) => f.pool.query(sql, values);
  const status = async (eventId: string) =>
    (await f.pool.query<{ status: string }>('SELECT status FROM events WHERE id = $1', [eventId])).rows[0]!.status;
  const threads = async (eventId: string) => (await f.pool.query<{
    id: string; type: string; body: string; parent_id: string | null; resolved_at: Date | null; author_id: string;
  }>(`SELECT id, type, body, parent_id, resolved_at, author_id FROM event_threads WHERE event_id = $1 ORDER BY created_at, id`, [eventId])).rows;
  const notices = async (eventId: string) => (await f.pool.query<{
    user_id: string; title: string; message: string; delivery_id: string | null;
  }>(`SELECT n.user_id, n.title, n.message, d.id AS delivery_id
      FROM notifications n LEFT JOIN notification_deliveries d ON d.notification_id = n.id
      WHERE n.event_id = $1 ORDER BY n.created_at, n.id`, [eventId])).rows;
  const audits = async (eventId: string) => (await f.pool.query<{
    actor_id: string | null; action: string; field_changed: string | null; old_value: string | null; new_value: string | null;
  }>(`SELECT actor_id, action, field_changed, old_value, new_value FROM audit_logs WHERE event_id = $1 ORDER BY occurred_at, id`, [eventId])).rows;
  return { ...f, ids, user, event, query, status, threads, notices, audits };
}

type Fixture = Awaited<ReturnType<typeof fixture>>;

async function withFixture(work: (f: Fixture) => Promise<void>) {
  const f = await fixture();
  try { await work(f); } finally { await f.close(); }
}

async function refused(action: Promise<unknown>, status: number, message: string) {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof AccessError, `expected AccessError, got ${String(error)}`);
    assert.equal(error.status, status);
    assert.equal(error.message, message);
    return true;
  });
}

test('TC_E03S02_01: questions move an Under Review request to Awaiting Clarification and notify the Organiser once, with the question text', () => withFixture(async f => {
  const eventId = await f.event('EVT-2003', f.ids.organiserC, f.ids.coordB, 'under_review');

  const result = await requestClarification(f.pool, f.user(f.ids.coordB), 'EVT-2003', { questions: [QUESTION] });

  assert.equal(result.status, 'awaiting_clarification');
  assert.equal(await f.status(eventId), 'awaiting_clarification');
  const stored = await f.threads(eventId);
  assert.equal(stored.length, 1);
  assert.deepEqual([stored[0]!.type, stored[0]!.body, stored[0]!.author_id, stored[0]!.resolved_at], ['clarification_request', QUESTION, f.ids.coordB, null]);
  const statusAudit = (await f.audits(eventId)).filter(row => row.field_changed === 'status');
  assert.deepEqual(statusAudit, [{
    actor_id: f.ids.coordB, action: 'Status changed to awaiting_clarification', field_changed: 'status',
    old_value: 'under_review', new_value: 'awaiting_clarification',
  }]);
  const sent = await f.notices(eventId);
  assert.equal(sent.length, 1, 'one notice in total: no generic duplicate, nothing to the acting Coordinator');
  assert.equal(sent[0]!.user_id, f.ids.organiserC);
  assert.equal(sent[0]!.title, 'Clarification requested');
  assert.match(sent[0]!.message, /Coordinator B needs more information about EVT-2003 Event EVT-2003/);
  assert.ok(sent[0]!.message.includes(`1. ${QUESTION}`));
  assert.ok(sent[0]!.delivery_id, 'the notice has an email-outbox row');
}));

test('TC_E03S02_01: a failed email-outbox write stores no questions, no status change and no notice', () => withFixture(async f => {
  const eventId = await f.event('EVT-2003', f.ids.organiserC, f.ids.coordB, 'under_review');
  await f.pool.query(`CREATE FUNCTION fail_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic_outbox_failure'; END $$;
    CREATE TRIGGER fail_outbox BEFORE INSERT ON notification_deliveries FOR EACH ROW EXECUTE FUNCTION fail_outbox()`);

  await assert.rejects(requestClarification(f.pool, f.user(f.ids.coordB), eventId, { questions: [QUESTION] }), /synthetic_outbox_failure/);

  assert.equal(await f.status(eventId), 'under_review');
  assert.equal((await f.threads(eventId)).length, 0);
  assert.equal((await f.notices(eventId)).length, 0);
  assert.equal((await f.audits(eventId)).length, 0);
}));

test('TC_E03S02_02: a complete answer resolves the question, returns the request to Under Review and notifies the Coordinator once', () => withFixture(async f => {
  const eventId = await f.event('EVT-2003', f.ids.organiserC, f.ids.coordB, 'under_review');
  const asked = await requestClarification(f.pool, f.user(f.ids.coordB), eventId, { questions: [QUESTION] });
  const questionId = asked.questions[0]!.id;

  const result = await respondToClarification(f.pool, f.user(f.ids.organiserC), 'EVT-2003',
    { answers: [{ questionId, answer: 'Expected attendance is 200' }] });

  assert.equal(result.status, 'under_review');
  assert.equal(await f.status(eventId), 'under_review');
  const stored = await f.threads(eventId);
  const question = stored.find(row => row.id === questionId)!;
  const answer = stored.find(row => row.type === 'clarification_response')!;
  assert.ok(question.resolved_at, 'the question is marked resolved');
  assert.deepEqual([answer.parent_id, answer.body, answer.author_id], [questionId, 'Expected attendance is 200', f.ids.organiserC]);
  const statusAudit = (await f.audits(eventId)).filter(row => row.field_changed === 'status');
  assert.deepEqual(statusAudit.map(row => [row.actor_id, row.old_value, row.new_value]), [
    [f.ids.coordB, 'under_review', 'awaiting_clarification'],
    [f.ids.organiserC, 'awaiting_clarification', 'under_review'],
  ]);
  const answeredNotices = (await f.notices(eventId)).filter(row => row.title !== 'Clarification requested');
  assert.equal(answeredNotices.length, 1, 'one notice: no generic duplicate, nothing to the acting Organiser');
  assert.equal(answeredNotices[0]!.user_id, f.ids.coordB);
  assert.equal(answeredNotices[0]!.title, 'Clarification answered');
  assert.ok(answeredNotices[0]!.message.includes(`1. ${QUESTION}\nAnswer: Expected attendance is 200`));
  assert.ok(answeredNotices[0]!.delivery_id);
}));

test('TC_E03S02_03: both event detail reads list the outstanding questions with the date each was raised', () => withFixture(async f => {
  const eventId = await f.event('EVT-2003', f.ids.organiserC, f.ids.coordB, 'under_review');
  const asked = await requestClarification(f.pool, f.user(f.ids.coordB), eventId, { questions: [QUESTION] });
  await f.pool.query(`UPDATE event_threads SET created_at = '2026-09-08T02:00:00Z' WHERE id = $1`, [asked.questions[0]!.id]);

  const organiserView = await withOutstandingQuestions(f.query, await getEvent(f.query, f.user(f.ids.organiserC), 'EVT-2003'));
  const coordinatorView = await withOutstandingQuestions(f.query, await getAssignedEvent(f.pool, f.user(f.ids.coordB), 'EVT-2003'));
  for (const view of [organiserView, coordinatorView]) {
    assert.equal(view.outstandingQuestions.length, 1);
    const [question] = view.outstandingQuestions as { body: string; created_at: Date; author_name: string }[];
    assert.equal(question!.body, QUESTION);
    assert.equal(question!.author_name, 'Coordinator B');
    assert.equal(question!.created_at.toISOString().slice(0, 10), '2026-09-08');
    assert.equal('author_email' in question!, false, 'the Coordinator\'s email is not exposed');
  }

  await respondToClarification(f.pool, f.user(f.ids.organiserC), eventId,
    { answers: [{ questionId: asked.questions[0]!.id, answer: 'Expected attendance is 200' }] });
  const afterAnswer = await withOutstandingQuestions(f.query, await getEvent(f.query, f.user(f.ids.organiserC), eventId));
  assert.deepEqual(afterAnswer.outstandingQuestions, []);
}));

test('TC_E03S02_04: a Coordinator can filter their events to Awaiting Clarification', () => withFixture(async f => {
  const waiting = [
    await f.event('EVT-AC1', f.ids.organiserA, f.ids.coordA, 'awaiting_clarification'),
    await f.event('EVT-AC2', f.ids.organiserA, f.ids.coordA, 'awaiting_clarification'),
  ];
  await f.event('EVT-UR1', f.ids.organiserA, f.ids.coordA, 'under_review');
  await f.event('EVT-AP1', f.ids.organiserA, f.ids.coordA, 'approved');
  await f.event('EVT-PL1', f.ids.organiserA, f.ids.coordA, 'planning');
  await f.event('EVT-AC3', f.ids.organiserA, f.ids.coordB, 'awaiting_clarification');

  const filtered = await listAssignedEvents(f.pool, f.user(f.ids.coordA), 'awaiting_clarification');
  assert.deepEqual(filtered.map(row => row.id).sort(), [...waiting].sort());
  assert.equal((await listAssignedEvents(f.pool, f.user(f.ids.coordA))).length, 5);
}));

test('TC_E03S02_05: a Coordinator not assigned to the request is refused, nothing changes and the attempt is audited', () => withFixture(async f => {
  const eventId = await f.event('EVT-2003', f.ids.organiserC, f.ids.coordB, 'under_review');

  await refused(requestClarification(f.pool, f.user(f.ids.coordA), 'EVT-2003', { questions: [QUESTION] }),
    403, 'Only the assigned Coordinator can request clarification on this request.');

  assert.equal(await f.status(eventId), 'under_review');
  assert.equal((await f.threads(eventId)).length, 0);
  assert.equal((await f.notices(eventId)).length, 0);
  assert.deepEqual((await f.audits(eventId)).map(row => [row.actor_id, row.action, row.field_changed]),
    [[f.ids.coordA, 'Access Denied', 'clarification_request']]);
}));

test('TC_E03S02_06: clarification cannot be requested on a request that is not Under Review', () => withFixture(async f => {
  const eventId = await f.event('EVT-3001', f.ids.organiserA, f.ids.coordA, 'approved');

  await refused(requestClarification(f.pool, f.user(f.ids.coordA), 'EVT-3001', { questions: ['Please confirm the catering headcount'] }),
    409, 'Clarification can only be requested while the request is Under Review.');

  assert.equal(await f.status(eventId), 'approved');
  assert.equal((await f.threads(eventId)).length, 0);
  assert.equal((await f.notices(eventId)).length, 0);
}));

test('TC_E03S02_07: a request with no question, or only blank questions, is rejected', () => withFixture(async f => {
  const eventId = await f.event('EVT-2003', f.ids.organiserC, f.ids.coordB, 'under_review');

  for (const body of [{ questions: [] }, { questions: ['   '] }, {}, null]) {
    await refused(requestClarification(f.pool, f.user(f.ids.coordB), eventId, body), 400, 'Add at least one question.');
  }

  assert.equal(await f.status(eventId), 'under_review');
  assert.equal((await f.threads(eventId)).length, 0);
  assert.equal((await f.notices(eventId)).length, 0);
}));

test('TC_E03S02_08: a 2001-character question is rejected and a 2000-character question is accepted', () => withFixture(async f => {
  const eventId = await f.event('EVT-2003', f.ids.organiserC, f.ids.coordB, 'under_review');

  await refused(requestClarification(f.pool, f.user(f.ids.coordB), eventId, { questions: ['x'.repeat(2001)] }),
    400, 'Each question must be 2000 characters or fewer.');
  assert.equal(await f.status(eventId), 'under_review');
  assert.equal((await f.threads(eventId)).length, 0);

  await requestClarification(f.pool, f.user(f.ids.coordB), eventId, { questions: ['x'.repeat(2000)] });
  assert.equal(await f.status(eventId), 'awaiting_clarification');
  assert.equal((await f.threads(eventId))[0]!.body.length, 2000);
}));

test('TC_E03S02_09: a partial answer is rejected and every question stays outstanding', () => withFixture(async f => {
  const eventId = await f.event('EVT-2003', f.ids.organiserC, f.ids.coordB, 'under_review');
  const asked = await requestClarification(f.pool, f.user(f.ids.coordB), eventId, { questions: [QUESTION, SECOND_QUESTION] });
  const noticesBefore = (await f.notices(eventId)).length;

  await refused(respondToClarification(f.pool, f.user(f.ids.organiserC), eventId,
    { answers: [{ questionId: asked.questions[0]!.id, answer: 'Expected attendance is 40' }] }),
  400, 'Answer every outstanding question before resubmitting.');
  await refused(respondToClarification(f.pool, f.user(f.ids.organiserC), eventId, {
    answers: [
      { questionId: asked.questions[0]!.id, answer: 'Expected attendance is 40' },
      { questionId: asked.questions[1]!.id, answer: '   ' },
    ],
  }), 400, 'Answer every outstanding question before resubmitting.');

  assert.equal(await f.status(eventId), 'awaiting_clarification');
  const stored = await f.threads(eventId);
  assert.equal(stored.filter(row => row.type === 'clarification_response').length, 0);
  assert.ok(stored.every(row => row.resolved_at === null));
  assert.equal((await f.notices(eventId)).length, noticesBefore);
}));

test('TC_E03S02_10: another Organiser in the same organisation cannot answer, and the attempt is audited', () => withFixture(async f => {
  const eventId = await f.event('EVT-3002', f.ids.organiserB, f.ids.coordB, 'under_review');
  const asked = await requestClarification(f.pool, f.user(f.ids.coordB), eventId, { questions: [SECOND_QUESTION] });

  for (const intruder of [f.ids.organiserA, f.ids.organiserC]) {
    await refused(respondToClarification(f.pool, f.user(intruder), 'EVT-3002',
      { answers: [{ questionId: asked.questions[0]!.id, answer: 'We do not need lab equipment' }] }),
    403, 'Only the Organiser who submitted this request can answer its questions.');
  }

  assert.equal(await f.status(eventId), 'awaiting_clarification');
  assert.equal((await f.threads(eventId)).filter(row => row.resolved_at !== null).length, 0);
  assert.deepEqual((await f.audits(eventId)).filter(row => row.action === 'Access Denied').map(row => row.actor_id),
    [f.ids.organiserA, f.ids.organiserC]);
}));

test('TC_E03S02_11: answers are refused while the request is not Awaiting Clarification', () => withFixture(async f => {
  const eventId = await f.event('EVT-2003', f.ids.organiserC, f.ids.coordB, 'under_review');

  await refused(respondToClarification(f.pool, f.user(f.ids.organiserC), 'EVT-2003',
    { answers: [{ questionId: randomUUID(), answer: 'Expected attendance is 40' }] }),
  409, 'This request is not awaiting clarification.');

  assert.equal(await f.status(eventId), 'under_review');
  assert.equal((await f.threads(eventId)).length, 0);
  assert.equal((await f.notices(eventId)).length, 0);
}));

test('TC_E03S02_12: two questions are sent in one notice, both listed, and both resolved by one complete response', () => withFixture(async f => {
  const eventId = await f.event('EVT-2003', f.ids.organiserC, f.ids.coordB, 'under_review');

  const asked = await requestClarification(f.pool, f.user(f.ids.coordB), eventId, { questions: [QUESTION, SECOND_QUESTION] });
  const [organiserNotice, ...others] = await f.notices(eventId);
  assert.equal(others.length, 0);
  assert.ok(organiserNotice!.message.includes(`1. ${QUESTION}\n2. ${SECOND_QUESTION}`));

  const listed = await withOutstandingQuestions(f.query, await getEvent(f.query, f.user(f.ids.organiserC), eventId));
  assert.deepEqual((listed.outstandingQuestions as { body: string }[]).map(row => row.body), [QUESTION, SECOND_QUESTION]);

  await refused(respondToClarification(f.pool, f.user(f.ids.organiserC), eventId, {
    answers: [
      { questionId: asked.questions[0]!.id, answer: 'Expected attendance is 40' },
      { questionId: randomUUID(), answer: 'Not one of the questions' },
    ],
  }), 400, 'One of the answers does not match an outstanding question.');

  await respondToClarification(f.pool, f.user(f.ids.organiserC), eventId, {
    answers: [
      { questionId: asked.questions[1]!.id, answer: 'No lab equipment is needed' },
      { questionId: asked.questions[0]!.id, answer: 'Expected attendance is 40' },
    ],
  });
  assert.equal(await f.status(eventId), 'under_review');
  const stored = await f.threads(eventId);
  assert.ok(stored.filter(row => row.type === 'clarification_request').every(row => row.resolved_at));
  const answers = stored.filter(row => row.type === 'clarification_response');
  assert.deepEqual(answers.map(row => [row.parent_id, row.body]).sort(), [
    [asked.questions[0]!.id, 'Expected attendance is 40'],
    [asked.questions[1]!.id, 'No lab equipment is needed'],
  ].sort());
  const answered = await withOutstandingQuestions(f.query, await getEvent(f.query, f.user(f.ids.organiserC), eventId));
  assert.deepEqual(answered.outstandingQuestions, []);
}));
