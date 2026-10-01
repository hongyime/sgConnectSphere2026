// E03-S02 "Request clarification from the Event Organiser" (SCRUM-33).
//
// - Scenario 1: the assigned Coordinator records one or more questions on an
//   Under Review request. It becomes Awaiting Clarification and the Organiser
//   is notified with the questions.
// - Scenario 2: the owning Organiser answers every outstanding question (D8)
//   and resubmits. The questions are resolved, the request returns to Under
//   Review and the Coordinator is notified. Answers are text only (D9); field
//   changes go through the existing pre-approval edit.
// - Scenario 3: outstanding questions, with the date each was raised, are
//   added to both event detail reads.
//
// Questions and answers are event_threads rows (clarification_request and
// clarification_response, linked by parent_id). They commit in the same
// transaction as the status change, through applyEventStatusChange(), so the
// request is never Awaiting Clarification without its questions. The
// targeted notice reuses the status change's audit ID (BDR T-64), so each
// recipient gets one notice, not an extra generic "status changed" one.
// Refusals are audited on their own connection, as in SCRUM-32 (E14-S02).

import type { Pool, PoolClient } from 'pg';
import { inTransaction } from '../../database/pool.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { writeEventNotification } from '../eventNotifications/service.js';
import { AccessError, requireOrganiser, type Query } from '../eventVisibility/service.js';
import { eventLabel, recordEventDenial, requireCoordinator } from './coordinatorAssignment.js';
import { applyEventStatusChange } from './repository.js';

// Same cap as event comments (createEventComment).
export const MAX_CLARIFICATION_TEXT = 2000;
export const MAX_QUESTIONS_PER_REQUEST = 20;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type LockedEvent = {
  id: string; event_code: string | null; title: string; status: string;
  organiser_id: string; client_org_id: string; coordinator_id: string | null;
};

async function lockEvent(client: PoolClient, identifier: string) {
  const result = await client.query<LockedEvent>(
    `SELECT id, event_code, title, status, organiser_id, client_org_id, coordinator_id FROM events
     WHERE id::text = $1 OR event_code = $1 FOR UPDATE`,
    [identifier],
  );
  return result.rows[0];
}

async function fullName(client: PoolClient, userId: string, fallback: string) {
  const result = await client.query<{ full_name: string }>('SELECT full_name FROM users WHERE id = $1', [userId]);
  return result.rows[0]?.full_name ?? fallback;
}

function bodyField(body: unknown, field: string): unknown {
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>)[field] : undefined;
}

// Blank entries are dropped (an empty extra field on the form is not a
// question); at least one real question must remain.
export function parseQuestions(body: unknown): string[] {
  const raw = bodyField(body, 'questions');
  const questions = Array.isArray(raw)
    ? raw.map(item => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
    : [];
  if (!questions.length) throw new AccessError(400, 'Add at least one question.');
  if (questions.length > MAX_QUESTIONS_PER_REQUEST) {
    throw new AccessError(400, `Send at most ${MAX_QUESTIONS_PER_REQUEST} questions at a time.`);
  }
  if (questions.some(question => question.length > MAX_CLARIFICATION_TEXT)) {
    throw new AccessError(400, `Each question must be ${MAX_CLARIFICATION_TEXT} characters or fewer.`);
  }
  return questions;
}

// Shape and length only. Whether every outstanding question is answered (D8)
// is checked against the stored questions, under the row lock.
export function parseAnswers(body: unknown): Map<string, string> {
  const raw = bodyField(body, 'answers');
  if (!Array.isArray(raw)) throw new AccessError(400, 'Answer every outstanding question before resubmitting.');
  const answers = new Map<string, string>();
  for (const item of raw) {
    const questionId = bodyField(item, 'questionId');
    const answer = bodyField(item, 'answer');
    if (typeof questionId !== 'string' || !UUID_PATTERN.test(questionId)) {
      throw new AccessError(400, 'One of the answers does not match an outstanding question.');
    }
    const text = typeof answer === 'string' ? answer.trim() : '';
    if (!text) throw new AccessError(400, 'Answer every outstanding question before resubmitting.');
    if (text.length > MAX_CLARIFICATION_TEXT) {
      throw new AccessError(400, `Each answer must be ${MAX_CLARIFICATION_TEXT} characters or fewer.`);
    }
    if (answers.has(questionId.toLowerCase())) throw new AccessError(400, 'Each question can only be answered once.');
    answers.set(questionId.toLowerCase(), text);
  }
  return answers;
}

const numbered = (items: string[]) => items.map((item, index) => `${index + 1}. ${item}`).join('\n');

// Scenario 1, TC_E03S02_01/_05 to _08/_12.
//   POST /api/events?clarification=request&id=<event id or code>  { questions: string[] }
export async function requestClarification(
  database: Pool,
  user: AuthenticatedUser | undefined,
  identifier: string,
  body: unknown,
) {
  const coordinator = await requireCoordinator(database, user, 'coordinator_clarification');
  const questions = parseQuestions(body);

  const outcome = await inTransaction(database, async client => {
    const event = await lockEvent(client, identifier);
    if (!event || event.coordinator_id !== coordinator.id) return { denied: true as const };
    if (event.status !== 'under_review') {
      throw new AccessError(409, 'Clarification can only be requested while the request is Under Review.');
    }

    // clock_timestamp(), not the column default now(): now() is fixed for the
    // whole transaction, so questions sent together would tie on created_at
    // and be listed in random id order instead of the order they were asked.
    const saved: { id: string; body: string; created_at: Date }[] = [];
    for (const question of questions) {
      const inserted = await client.query<{ id: string; body: string; created_at: Date }>(
        `INSERT INTO event_threads (event_id, author_id, type, body, created_at)
         VALUES ($1, $2, 'clarification_request', $3, clock_timestamp()) RETURNING id, body, created_at`,
        [event.id, coordinator.id, question],
      );
      saved.push(inserted.rows[0]!);
    }

    const coordinatorName = await fullName(client, coordinator.id, coordinator.email);
    const { event: updated } = await applyEventStatusChange(client, event.id, 'awaiting_clarification', coordinator.id, {
      beforeNotify: async change => {
        await writeEventNotification(client, {
          eventId: event.id,
          changeId: change.auditId,
          occurredAt: change.occurredAt,
          userId: event.organiser_id,
          title: 'Clarification requested',
          message: `${coordinatorName} needs more information about ${eventLabel(event)} before the review can continue. `
            + `The request is now Awaiting Clarification.\n\nQuestions:\n${numbered(questions)}`,
        });
      },
    });

    return {
      denied: false as const,
      result: {
        eventId: event.id,
        eventCode: event.event_code,
        status: updated.status,
        statusChangedAt: updated.statusChangedAt,
        questions: saved.map(row => ({ id: row.id, body: row.body, createdAt: row.created_at })),
      },
    };
  });

  if (outcome.denied) {
    await recordEventDenial(database, coordinator, identifier, 'clarification_request');
    throw new AccessError(403, 'Only the assigned Coordinator can request clarification on this request.');
  }
  return outcome.result;
}

// Scenario 2, TC_E03S02_02/_09 to _12.
//   POST /api/events?clarification=response&id=<event id or code>
//     { answers: [{ questionId, answer }] }
export async function respondToClarification(
  database: Pool,
  user: AuthenticatedUser | undefined,
  identifier: string,
  body: unknown,
) {
  const query: Query = (sql, values) => database.query(sql, values);
  const org = await requireOrganiser(query, user, 'clarification_response');
  const organiser = user!;
  const answers = parseAnswers(body);

  const outcome = await inTransaction(database, async client => {
    const event = await lockEvent(client, identifier);
    if (!event || event.client_org_id !== org || event.organiser_id !== organiser.id) return { denied: true as const };
    if (event.status !== 'awaiting_clarification') {
      throw new AccessError(409, 'This request is not awaiting clarification.');
    }

    const outstanding = (await client.query<{ id: string; body: string }>(
      `SELECT id, body FROM event_threads
       WHERE event_id = $1 AND type = 'clarification_request' AND resolved_at IS NULL
       ORDER BY created_at, id FOR UPDATE`,
      [event.id],
    )).rows;
    const outstandingIds = new Set(outstanding.map(question => question.id.toLowerCase()));
    if ([...answers.keys()].some(questionId => !outstandingIds.has(questionId))) {
      throw new AccessError(400, 'One of the answers does not match an outstanding question.');
    }
    if (outstanding.some(question => !answers.has(question.id.toLowerCase()))) {
      throw new AccessError(400, 'Answer every outstanding question before resubmitting.');
    }

    const answered: { questionId: string; answerId: string }[] = [];
    for (const question of outstanding) {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO event_threads (event_id, author_id, type, body, parent_id, created_at)
         VALUES ($1, $2, 'clarification_response', $3, $4, clock_timestamp()) RETURNING id`,
        [event.id, organiser.id, answers.get(question.id.toLowerCase()), question.id],
      );
      answered.push({ questionId: question.id, answerId: inserted.rows[0]!.id });
    }
    await client.query(
      `UPDATE event_threads SET resolved_at = now() WHERE id = ANY($1::uuid[])`,
      [outstanding.map(question => question.id)],
    );

    const organiserName = await fullName(client, organiser.id, organiser.email);
    const coordinatorId = event.coordinator_id;
    const { event: updated } = await applyEventStatusChange(client, event.id, 'under_review', organiser.id, {
      beforeNotify: async change => {
        if (!coordinatorId) return;
        const summary = outstanding
          .map((question, index) => `${index + 1}. ${question.body}\nAnswer: ${answers.get(question.id.toLowerCase())}`)
          .join('\n');
        await writeEventNotification(client, {
          eventId: event.id,
          changeId: change.auditId,
          occurredAt: change.occurredAt,
          userId: coordinatorId,
          title: 'Clarification answered',
          message: `${organiserName} answered your questions about ${eventLabel(event)}. `
            + `The request is back Under Review.\n\n${summary}`,
        });
      },
    });

    return {
      denied: false as const,
      result: {
        eventId: event.id,
        eventCode: event.event_code,
        status: updated.status,
        statusChangedAt: updated.statusChangedAt,
        answered,
      },
    };
  });

  if (outcome.denied) {
    await recordEventDenial(database, organiser, identifier, 'clarification_response');
    throw new AccessError(403, 'Only the Organiser who submitted this request can answer its questions.');
  }
  return outcome.result;
}

// Scenario 3, TC_E03S02_03: unresolved questions and when each was raised.
// Author name only; the Coordinator's email is not exposed to the Organiser.
export async function listOutstandingQuestions(query: Query, eventId: string) {
  return (await query(`SELECT t.id, t.body, t.created_at, u.full_name AS author_name
    FROM event_threads t JOIN users u ON u.id = t.author_id
    WHERE t.event_id = $1 AND t.type = 'clarification_request' AND t.resolved_at IS NULL
    ORDER BY t.created_at ASC, t.id ASC`, [eventId])).rows;
}

// Adds the outstanding questions to an event detail read that has already
// passed its own access check (getEvent for the Organiser, getAssignedEvent
// for the Coordinator).
export async function withOutstandingQuestions<T extends { id: string }>(query: Query, event: T) {
  return { ...event, outstandingQuestions: await listOutstandingQuestions(query, event.id) };
}
