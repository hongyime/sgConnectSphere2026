// E07-S06 (SCRUM-56) Request technical support for an event.
//
// The assigned Event Coordinator records the on-site support an event needs
// (a description and the times it is needed) and Technical Support Staff are
// notified (Scenario 1). A request is accepted while the event is approved or
// being planned, before any venue is confirmed (Scenario 2). The Coordinator
// can instead declare that the event needs no technical support: nobody is
// notified and nothing waits for staff assignment (Scenario 3).
//
// Data: `tech_support_requests`. A request has `support_required = true` and
// starts `open`; E07-S07 staffs it. The "no support needed" declaration is a
// row with `support_required = false` over the event's own range, so the
// decision is recorded but never appears in the staffing queue and never
// blocks the E08-S03 readiness check (which looks only at required support).
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { inTransaction } from '../../database/pool.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { canActAsRole } from '../accessControl/service.js';
import { AccessError, type Query } from '../eventVisibility/service.js';
import { writeEventNotification } from '../eventNotifications/service.js';

export const MAX_SUPPORT_DESCRIPTION = 2000;
// Same window as E07-S02 equipment requests: arrangements change while an
// approved event is being planned.
const EDITABLE_STATUSES = ['approved', 'planning'];

type SupportEvent = { id: string; eventCode: string | null; title: string; status: string; coordinatorId: string | null };
export type SupportRequest = {
  id: string; description: string; startsAt: string; endsAt: string; status: string; requestedAt: string;
};
export type SupportRequestInput = { description: string; startsAt: string; endsAt: string };

export function validateSupportRequestInput(body: unknown): { input?: SupportRequestInput; errors?: Record<string, string[]> } {
  const data = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const errors: Record<string, string[]> = {};
  const description = typeof data.description === 'string' ? data.description.trim() : '';
  if (!description) errors.description = ['Describe the technical support the event needs.'];
  else if (description.length > MAX_SUPPORT_DESCRIPTION) {
    errors.description = [`The description must be ${MAX_SUPPORT_DESCRIPTION} characters or fewer.`];
  }
  const start = typeof data.startsAt === 'string' ? new Date(data.startsAt) : undefined;
  const end = typeof data.endsAt === 'string' ? new Date(data.endsAt) : undefined;
  if (!start || Number.isNaN(start.getTime())) errors.startsAt = ['Enter when the support starts.'];
  if (!end || Number.isNaN(end.getTime())) errors.endsAt = ['Enter when the support ends.'];
  else if (start && !Number.isNaN(start.getTime()) && end <= start) errors.endsAt = ['Support must end after it starts.'];
  if (Object.keys(errors).length) return { errors };
  return { input: { description, startsAt: start!.toISOString(), endsAt: end!.toISOString() } };
}

async function recordDenied(query: Query, user: AuthenticatedUser, target: string) {
  await query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, new_value)
    VALUES ($1, 'screen', gen_random_uuid(), 'Access Denied', $2)`, [user.id, `tech_support_requests:${target}`]);
}

async function requireRole(query: Query, user: AuthenticatedUser | undefined, write: boolean) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  const roles = write ? ['event_coordinator'] as const : ['event_coordinator', 'technical_support_staff'] as const;
  if (!canActAsRole(user, roles).allowed) {
    await recordDenied(query, user, 'screen');
    throw new AccessError(403, 'Access denied. Only the assigned Coordinator may request technical support.');
  }
  return user;
}

// Looks the event up by id or event code. A Coordinator may only reach events
// assigned to them; Technical Support Staff may read any event's requests.
async function findEvent(query: Query, user: AuthenticatedUser, identifier: string, lock = false) {
  if (!identifier || identifier.length > 160) throw new AccessError(400, 'An event id or code is required.');
  const event = (await query<SupportEvent>(`SELECT id, event_code AS "eventCode", title, status, coordinator_id AS "coordinatorId"
    FROM events WHERE id::text = $1 OR event_code = $1 ${lock ? 'FOR NO KEY UPDATE' : ''}`, [identifier])).rows[0];
  if (!event || (user.role === 'event_coordinator' && event.coordinatorId !== user.id)) {
    throw new AccessError(403, 'Access denied. This event is not assigned to you.');
  }
  return event;
}

// Records a refused event lookup outside any transaction, so the audit row
// survives the rollback of the refused change.
async function auditRefusal<T>(query: Query, user: AuthenticatedUser, identifier: string, work: () => Promise<T>) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof AccessError && error.status === 403) await recordDenied(query, user, identifier);
    throw error;
  }
}

async function readRequests(query: Query, eventId: string) {
  const rows = (await query<SupportRequest & { supportRequired: boolean }>(`SELECT id, support_required AS "supportRequired",
      coalesce(support_description, '') AS description, lower(support_range) AS "startsAt", upper(support_range) AS "endsAt",
      status, created_at AS "requestedAt"
    FROM tech_support_requests WHERE event_id = $1 AND status <> 'cancelled' ORDER BY lower(support_range), id`, [eventId])).rows;
  return {
    requests: rows.filter(row => row.supportRequired).map(({ supportRequired: _required, ...request }) => request),
    noSupportRequired: rows.some(row => !row.supportRequired),
  };
}

export async function getSupportRequests(query: Query, user: AuthenticatedUser | undefined, identifier: string) {
  const actor = await requireRole(query, user, false);
  const event = await auditRefusal(query, actor, identifier, () => findEvent(query, actor, identifier));
  const { requests, noSupportRequired } = await readRequests(query, event.id);
  return {
    event: { id: event.id, eventCode: event.eventCode, title: event.title, status: event.status },
    requests,
    noSupportRequired,
    canEdit: actor.role === 'event_coordinator' && EDITABLE_STATUSES.includes(event.status),
  };
}

// The request enters the shared Technical Support workload before anyone is
// assigned (E07-S07), so every active Technical Support Staff member is told,
// the same rule E07-S02 uses for new equipment requests.
async function notifyTechnicalSupport(client: PoolClient, event: SupportEvent, input: SupportRequestInput) {
  const staff = (await client.query<{ id: string }>(
    `SELECT id FROM users WHERE role = 'technical_support_staff' AND is_active ORDER BY id`)).rows;
  const changeId = randomUUID();
  const occurredAt = new Date();
  for (const member of staff) {
    await writeEventNotification(client, {
      eventId: event.id, changeId, userId: member.id, occurredAt,
      title: 'Technical support requested',
      message: `${event.eventCode ?? event.title} needs technical support: ${input.description}`,
    });
  }
  return staff.length;
}

async function mutate<T>(database: Pool, user: AuthenticatedUser | undefined, identifier: string,
  work: (client: PoolClient, event: SupportEvent, actor: AuthenticatedUser) => Promise<T>) {
  const query: Query = (sql, values) => database.query(sql, values);
  const actor = await requireRole(query, user, true);
  return auditRefusal(query, actor, identifier, () => inTransaction(database, async client => {
    const event = await findEvent((sql, values) => client.query(sql, values), actor, identifier, true);
    if (!EDITABLE_STATUSES.includes(event.status)) {
      throw new AccessError(409, 'Technical support can only be arranged while an approved event is being planned.');
    }
    return work(client, event, actor);
  }));
}

export async function requestSupport(database: Pool, user: AuthenticatedUser | undefined, identifier: string, body: unknown) {
  // Authorise before returning any validation detail.
  await requireRole((sql, values) => database.query(sql, values), user, true);
  const valid = validateSupportRequestInput(body);
  if (!valid.input) return { status: 400, body: { error: 'validation_failed', errors: valid.errors } };
  const input = valid.input;
  return mutate(database, user, identifier, async (client, event, actor) => {
    // A request replaces an earlier "no support needed" declaration.
    await client.query(`DELETE FROM tech_support_requests WHERE event_id = $1 AND NOT support_required`, [event.id]);
    const request = (await client.query<SupportRequest>(`INSERT INTO tech_support_requests
        (event_id, support_required, support_description, support_range, status, requested_by)
      VALUES ($1, true, $2, tstzrange($3::timestamptz, $4::timestamptz, '[)'), 'open', $5)
      RETURNING id, support_description AS description, lower(support_range) AS "startsAt",
        upper(support_range) AS "endsAt", status, created_at AS "requestedAt"`,
      [event.id, input.description, input.startsAt, input.endsAt, actor.id])).rows[0]!;
    const notified = await notifyTechnicalSupport(client, event, input);
    return { status: 201, body: { request, notified } };
  });
}

export async function declareNoSupport(database: Pool, user: AuthenticatedUser | undefined, identifier: string) {
  return mutate(database, user, identifier, async (client, event, actor) => {
    const live = (await client.query<{ id: string }>(`SELECT id FROM tech_support_requests
      WHERE event_id = $1 AND support_required AND status <> 'cancelled' LIMIT 1`, [event.id])).rows[0];
    if (live) {
      throw new AccessError(409, 'This event already has a technical support request, so it cannot be marked as needing none.');
    }
    const existing = (await client.query<{ id: string }>(`SELECT id FROM tech_support_requests
      WHERE event_id = $1 AND NOT support_required LIMIT 1`, [event.id])).rows[0];
    if (!existing) {
      await client.query(`INSERT INTO tech_support_requests (event_id, support_required, support_range, status, requested_by)
        SELECT id, false, event_range, 'open', $2 FROM events WHERE id = $1`, [event.id, actor.id]);
    }
    return { status: 200, body: { noSupportRequired: true } };
  });
}
