import { isDeepStrictEqual } from 'node:util';
import type { Pool, PoolClient } from 'pg';
import { inTransaction } from '../../database/pool.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { writeEventNotification } from '../eventNotifications/service.js';
import { AccessError, requireOrganiser } from '../eventVisibility/service.js';
import { recordEventDenial, requireCoordinator } from '../eventLifecycle/coordinatorAssignment.js';

// This allowlist is also the SQL identifier boundary. New fields require an
// explicit schema/validation contract; never interpolate a client field name.
const columns = {
  title: 'title', description: 'description', purpose: 'purpose',
  expectedAttendance: 'expected_attendance', venueRequirements: 'venue_requirements',
  equipmentRequirements: 'equipment_requirements', accessibilityNote: 'accessibility_note',
  layoutPreference: 'layout_preference', registrationSetup: 'registration_setup',
  startAt: 'starts_at', endAt: 'ends_at',
  layoutId: 'layout_id', accessibilityFeatureIds: 'accessibility_feature_ids',
  registrationEnabled: 'registration_enabled', waitlistEnabled: 'waitlist_enabled',
  registrationDates: 'registration_dates', withdrawalDeadline: 'withdrawal_deadline',
} as const;
type Field = keyof typeof columns;
type RegistrationDates = { opensAt: string | null; closesAt: string | null };
type Value = string | number | boolean | null | string[] | RegistrationDates;
type Values = Partial<Record<Field, Value>>;
const safeFields = new Set<Field>(['title', 'description', 'purpose']);
export const WAITING_FOR_ARRANGEMENTS = 'Approved — waiting for the arrangement check';

type Event = {
  id: string; event_code: string; organiser_id: string; client_org_id: string;
  coordinator_id: string | null; status: string;
  registration_opens_at: Date | null; registration_closes_at: Date | null;
} & Record<(typeof columns)[Field], Value | Date>;
type Request = {
  id: string; event_id: string; requested_by: string; description: string;
  requested_changes: { fields: Values; before: Values; action?: string };
  status: string; reviewed_by: string | null; decision_reason: string | null;
};

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AccessError(400, 'Expected an object.');
  return value as Record<string, unknown>;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function dateValue(value: unknown, nullable = false): string | null {
  if (nullable && value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value)
    || !Number.isFinite(Date.parse(value))) throw new AccessError(400, 'Use a valid date and time with a timezone.');
  return new Date(value).toISOString();
}

export function parseChangeRequest(body: unknown) {
  const input = object(body);
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  if (!description || description.length > 4000) throw new AccessError(400, 'Describe the change in 1–4000 characters.');
  const raw = object(input.changes);
  const fields: Values = {};
  if (!Object.keys(raw).length) throw new AccessError(400, 'Specify at least one changed field.');
  for (const [key, value] of Object.entries(raw)) {
    if (!Object.hasOwn(columns, key)) throw new AccessError(400, `Unsupported change field: ${key}`);
    const field = key as Field;
    if (field === 'layoutId') {
      if (value !== null && (typeof value !== 'string' || !uuid.test(value))) throw new AccessError(400, 'Select a valid layout.');
      fields[field] = typeof value === 'string' ? value.toLowerCase() : null;
    } else if (field === 'accessibilityFeatureIds') {
      if (!Array.isArray(value) || value.some(id => typeof id !== 'string' || !uuid.test(id))) {
        throw new AccessError(400, 'Select valid accessibility features.');
      }
      fields[field] = [...new Set((value as string[]).map(id => id.toLowerCase()))].sort();
    } else if (field === 'registrationEnabled' || field === 'waitlistEnabled') {
      if (typeof value !== 'boolean') throw new AccessError(400, `${field} must be true or false.`);
      fields[field] = value;
    } else if (field === 'registrationDates') {
      const dates = object(value);
      if (Object.keys(dates).some(key => !['opensAt', 'closesAt'].includes(key))
        || !Object.hasOwn(dates, 'opensAt') || !Object.hasOwn(dates, 'closesAt')) {
        throw new AccessError(400, 'Specify both registration window boundaries.');
      }
      const opensAt = dateValue(dates.opensAt, true), closesAt = dateValue(dates.closesAt, true);
      if (opensAt && closesAt && opensAt >= closesAt) throw new AccessError(400, 'Registration closing must be after opening.');
      fields[field] = { opensAt, closesAt };
    } else if (field === 'withdrawalDeadline') {
      fields[field] = dateValue(value, true);
    } else if (field === 'expectedAttendance') {
      if (!Number.isSafeInteger(value) || (value as number) <= 0 || (value as number) > 2147483647) {
        throw new AccessError(400, 'Expected attendance must be a positive integer.');
      }
      fields[field] = value as number;
    } else if (field === 'startAt' || field === 'endAt') {
      fields[field] = dateValue(value);
    } else {
      const max = field === 'title' ? 240 : 4000;
      if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
        throw new AccessError(400, `${field} must contain 1–${max} characters.`);
      }
      fields[field] = value.trim();
    }
  }
  return { description, fields };
}

function snapshot(event: Event, fields: Values): Values {
  return Object.fromEntries(Object.keys(fields).map(key => {
    if (key === 'registrationDates') return [key, {
      opensAt: event.registration_opens_at?.toISOString() ?? null,
      closesAt: event.registration_closes_at?.toISOString() ?? null,
    }];
    const value = event[columns[key as Field]];
    return [key, value instanceof Date ? value.toISOString() : value];
  }));
}

function active(event: Event) {
  if (!['approved', 'planning', 'safety_review', 'confirmed'].includes(event.status)) {
    throw new AccessError(409, 'Changes require an approved or confirmed, non-terminal Event.');
  }
}

async function loadEvent(client: PoolClient, identifier: string, lock = true) {
  const event = (await client.query<Event>(`SELECT e.*, lower(e.event_range) AS starts_at,
    upper(e.event_range) AS ends_at,
    ARRAY(SELECT feature_id::text FROM event_accessibility_needs WHERE event_id=e.id ORDER BY feature_id) AS accessibility_feature_ids
    FROM events e WHERE e.id::text=$1 OR e.event_code=$1 ${lock ? 'FOR UPDATE OF e' : ''}`, [identifier])).rows[0];
  if (!event) throw new AccessError(404, 'Event not found.');
  return event;
}

async function validateReferences(client: PoolClient, fields: Values) {
  if (fields.layoutId !== undefined && fields.layoutId !== null) {
    if (!(await client.query('SELECT id FROM room_layouts WHERE id=$1 FOR KEY SHARE', [fields.layoutId])).rowCount) {
      throw new AccessError(400, 'The selected layout no longer exists.');
    }
  }
  if (Array.isArray(fields.accessibilityFeatureIds) && fields.accessibilityFeatureIds.length) {
    const result = await client.query('SELECT id FROM accessibility_features WHERE id=ANY($1::uuid[]) FOR KEY SHARE', [fields.accessibilityFeatureIds]);
    if (result.rowCount !== fields.accessibilityFeatureIds.length) throw new AccessError(400, 'A selected accessibility feature no longer exists.');
  }
}

async function activeActor(client: PoolClient, user: AuthenticatedUser) {
  let actor: { is_active: boolean; client_org_id: string | null; role: string } | undefined;
  try {
    actor = (await client.query<{ is_active: boolean; client_org_id: string | null; role: string }>(
      'SELECT is_active,client_org_id,role FROM users WHERE id=$1 FOR SHARE NOWAIT', [user.id])).rows[0];
  } catch (error) {
    // Account maintenance may take user -> Event locks. Never wait for that
    // user lock while holding Event -> user, which could form a deadlock.
    if ((error as { code?: string }).code === '55P03') throw new AccessError(409, 'Account update in progress. Refresh and retry.');
    throw error;
  }
  if (!actor?.is_active || actor.role !== user.role || actor.client_org_id !== (user.clientOrgId ?? null)) {
    throw new AccessError(403, 'Account access changed. Sign in again.');
  }
}

async function requestTransaction<T>(pool: Pool, user: AuthenticatedUser, identifier: string,
  work: (client: PoolClient) => Promise<T>) {
  try { return await inTransaction(pool, work); }
  catch (error) {
    // Access denials survive rollback, matching the existing E14-S02 policy.
    if (error instanceof AccessError && error.status === 403) {
      await recordEventDenial(pool, user, identifier, 'change_request');
    }
    throw error;
  }
}

async function audit(client: PoolClient, event: Event, actorId: string, request: Request, action: string, before: string | null) {
  return (await client.query<{ id: string; occurred_at: Date }>(`INSERT INTO audit_logs
    (actor_id,entity_type,entity_id,event_id,action,field_changed,old_value,new_value)
    VALUES ($1,'change_request',$2,$3,$4,'status',$5,$6) RETURNING id,occurred_at`,
  [actorId, request.id, event.id, action, before, request.status])).rows[0]!;
}

async function notice(client: PoolClient, event: Event, actorId: string, recipient: string,
  request: Request, action: string, previous: string | null) {
  const change = await audit(client, event, actorId, request, action, previous);
  if (actorId !== recipient) await writeEventNotification(client, {
    eventId: event.id, changeId: change.id, occurredAt: change.occurred_at, userId: recipient,
    title: action, message: `${event.event_code}: ${request.description}. Status: ${request.status}.`
      + (request.status === 'approved' ? ` ${WAITING_FOR_ARRANGEMENTS}.` : '')
      + (request.decision_reason ? ` Reason: ${request.decision_reason}` : ''),
  });
}

export async function submitChangeRequest(pool: Pool, user: AuthenticatedUser | undefined, identifier: string, body: unknown) {
  const org = await requireOrganiser((sql, values) => pool.query(sql, values), user, 'change_request_submit');
  const parsed = parseChangeRequest(body);
  return requestTransaction(pool, user!, identifier, async client => {
    const event = await loadEvent(client, identifier);
    await activeActor(client, user!);
    if (event.organiser_id !== user!.id || event.client_org_id !== org) throw new AccessError(403, 'Change request access denied.');
    active(event);
    if (!event.coordinator_id) throw new AccessError(409, 'An assigned Coordinator is required.');
    await validateReferences(client, parsed.fields);
    const before = snapshot(event, parsed.fields);
    const fields = Object.fromEntries(Object.entries(parsed.fields).filter(([key, value]) => !isDeepStrictEqual(value, before[key as Field])));
    if (!Object.keys(fields).length) throw new AccessError(400, 'The requested values are unchanged.');
    const start = fields.startAt ?? event.starts_at;
    const end = fields.endAt ?? event.ends_at;
    if (new Date(start as string | Date).getTime() >= new Date(end as string | Date).getTime()) throw new AccessError(400, 'End must be after start.');
    const request = (await client.query<Request>(`INSERT INTO change_requests
      (event_id,requested_by,description,requested_changes) VALUES ($1,$2,$3,$4::jsonb) RETURNING *`,
    [event.id, user!.id, parsed.description, JSON.stringify({ fields, before: snapshot(event, fields) })])).rows[0]!;
    await notice(client, event, user!.id, event.coordinator_id, request, 'Change requested', null);
    return request;
  });
}

// Lock order is always Event -> request, shared with cancellation/completion.
// The event identifier is mandatory, so no unlocked request lookup is needed.
export async function decideChangeRequest(pool: Pool, user: AuthenticatedUser | undefined,
  identifier: string, requestId: string, body: unknown) {
  const coordinator = await requireCoordinator(pool, user, 'change_request_decide');
  const input = object(body);
  if (!['approve', 'decline', 'apply'].includes(String(input.decision))) throw new AccessError(400, 'Choose approve, decline or apply.');
  const reason = input.reason === undefined ? null : input.reason;
  if (reason !== null && (typeof reason !== 'string' || reason.trim().length > 4000)) throw new AccessError(400, 'Invalid decision reason.');
  return requestTransaction(pool, coordinator, identifier, async client => {
    const event = await loadEvent(client, identifier);
    await activeActor(client, coordinator);
    if (event.coordinator_id !== coordinator.id) throw new AccessError(403, 'Only the assigned Coordinator may decide this request.');
    active(event);
    const request = (await client.query<Request>(`SELECT * FROM change_requests
      WHERE event_id=$1 AND id::text=$2 AND requested_changes->>'action' IS DISTINCT FROM 'cancel' FOR UPDATE`,
    [event.id, requestId])).rows[0];
    if (!request) throw new AccessError(404, 'Change request not found.');
    const previous = request.status;
    if (input.decision === 'apply' ? previous !== 'approved' : previous !== 'pending') {
      throw new AccessError(409, 'The request has already changed. Refresh before deciding.');
    }
    const stored = request.requested_changes;
    if (input.decision !== 'decline') {
      // Validate persisted data too: old or differently-shaped requests must
      // never bypass the field allowlist or stale protection.
      parseChangeRequest({ description: request.description, changes: stored.fields });
      await validateReferences(client, stored.fields);
      if (!stored.before || !isDeepStrictEqual(snapshot(event, stored.fields), stored.before)) {
        throw new AccessError(409, 'The Event changed since submission. Submit a fresh request or re-review it.');
      }
    }
    const safe = input.decision !== 'decline' && Object.keys(stored.fields).every(key => safeFields.has(key as Field));
    if (input.decision === 'apply' && !safe) throw new AccessError(409, WAITING_FOR_ARRANGEMENTS);
    if (safe) {
      const entries = Object.entries(stored.fields);
      await client.query(`UPDATE events SET ${entries.map(([key], index) => `${columns[key as Field]}=$${index + 2}`).join(',')}
        WHERE id=$1`, [event.id, ...entries.map(([, value]) => value)]);
      // Only an already-published name follows an applied title change. Never
      // publish an Event as a side effect or copy private purpose/description.
      if (stored.fields.title !== undefined) await client.query(
        'UPDATE event_publications SET name=$2 WHERE event_id=$1', [event.id, stored.fields.title]);
      // Field-level history, distinct from the request's status transition.
      for (const [key, value] of entries) await client.query(`INSERT INTO audit_logs
        (actor_id,entity_type,entity_id,event_id,action,field_changed,old_value,new_value)
        VALUES ($1,'event',$2,$2,'Approved Change Applied',$3,$4,$5)`,
      [coordinator.id, event.id, key, String(stored.before[key as Field] ?? ''), String(value)]);
    }
    const status = input.decision === 'decline' ? 'declined' : safe ? 'applied' : 'approved';
    const updated = (await client.query<Request>(`UPDATE change_requests SET status=$2::change_status,
      reviewed_by=$3,decision_reason=$4,reviewed_at=clock_timestamp() WHERE id=$1 RETURNING *`,
    [request.id, status, coordinator.id, typeof reason === 'string' ? reason.trim() : null])).rows[0]!;
    await notice(client, event, coordinator.id, request.requested_by, updated,
      status === 'applied' ? 'Change applied' : status === 'declined' ? 'Change declined' : 'Change approved', previous);
    return updated;
  });
}

export async function listChangeRequests(pool: Pool, user: AuthenticatedUser | undefined, identifier: string) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  const organiser = user.role === 'event_organiser';
  const org = organiser ? await requireOrganiser((sql, values) => pool.query(sql, values), user, 'change_request_read') : null;
  if (!organiser) await requireCoordinator(pool, user, 'change_request_read');
  return requestTransaction(pool, user, identifier, async client => {
    const event = await loadEvent(client, identifier, false);
    await activeActor(client, user);
    if (organiser ? event.organiser_id !== user.id || event.client_org_id !== org : event.coordinator_id !== user.id) {
      throw new AccessError(403, 'Change request access denied.');
    }
    const requests = (await client.query<Request>(`SELECT * FROM change_requests WHERE event_id=$1
      AND requested_changes->>'action' IS DISTINCT FROM 'cancel' ORDER BY created_at DESC,id`, [event.id])).rows;
    const layouts = (await client.query<{ id: string; label: string }>('SELECT id,label FROM room_layouts ORDER BY label,id')).rows;
    const accessibility = (await client.query<{ id: string; label: string }>('SELECT id,label FROM accessibility_features ORDER BY label,id')).rows;
    return { event: { id: event.id, eventCode: event.event_code, status: event.status },
      permissions: { canSubmit: organiser && !!event.coordinator_id, canDecide: !organiser },
      references: { layouts, accessibility },
      current: snapshot(event, Object.fromEntries(Object.keys(columns).map(key => [key, null]))), requests };
  });
}
