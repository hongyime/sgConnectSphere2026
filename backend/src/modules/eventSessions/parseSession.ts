import type { SessionInput } from './types.js';

const MAX_TEXT = 2000;
const MAX_TITLE = 240;

function text(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new Error('invalid_session_text');
  const trimmed = value.trim();
  if (trimmed.length > MAX_TEXT) throw new Error('session_text_too_long');
  return trimmed.length ? trimmed : undefined;
}

function date(value: unknown): Date {
  if (typeof value !== 'string' && !(value instanceof Date)) throw new Error('invalid_session_date');
  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error('invalid_session_date');
  return parsed;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_NEEDS = 50;

// Absent means "leave as is"; an empty array clears the Session's needs.
function ids(value: unknown, error: string): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.length > MAX_NEEDS || value.some(id => typeof id !== 'string' || !UUID.test(id))) {
    throw new Error(error);
  }
  return [...new Set(value.map(id => (id as string).toLowerCase()))].sort();
}

// Rejects the whole body rather than dropping fields, so an Organiser never
// saves a Session whose date or attendance silently became different.
export function parseSessionBody(body: unknown): SessionInput {
  if (!body || typeof body !== 'object') throw new Error('invalid_session_payload');
  const fields = body as Record<string, unknown>;

  const startAt = date(fields.startAt);
  const endAt = date(fields.endAt);
  if (endAt.getTime() <= startAt.getTime()) throw new Error('invalid_session_range');

  const attendance = fields.expectedAttendance;
  if (!Number.isInteger(attendance) || (attendance as number) <= 0) {
    throw new Error('invalid_session_attendance');
  }

  const title = text(fields.title);
  if (title && title.length > MAX_TITLE) throw new Error('session_title_too_long');

  const layoutId = fields.layoutId;
  if (layoutId !== undefined && layoutId !== null && typeof layoutId !== 'string') {
    throw new Error('invalid_session_layout');
  }

  return {
    title,
    startAt,
    endAt,
    expectedAttendance: attendance as number,
    layoutId: typeof layoutId === 'string' && layoutId.trim() ? layoutId.trim() : undefined,
    venueRequirements: text(fields.venueRequirements),
    accessibilityNote: text(fields.accessibilityNote),
    equipmentRequirements: text(fields.equipmentRequirements),
    layoutPreference: text(fields.layoutPreference),
    accessibilityFeatureIds: ids(fields.accessibilityFeatureIds, 'invalid_session_accessibility'),
    facilityIds: ids(fields.facilityIds, 'invalid_session_facilities'),
  };
}
