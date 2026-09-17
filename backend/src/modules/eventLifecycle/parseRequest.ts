import type { CreateEventRequest } from './types.js';

type CreateEventBody = {
  title?: unknown;
  description?: unknown;
  purpose?: unknown;
  status?: unknown;
  startAt?: unknown;
  endAt?: unknown;
  expectedAttendance?: unknown;
  layoutId?: unknown;
  venueRequirements?: unknown;
  accessibilityNote?: unknown;
  equipmentRequirements?: unknown;
  layoutPreference?: unknown;
  registrationSetup?: unknown;
};

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function parseDate(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseCreateEventBody(
  body: unknown,
  organiserId: string,
  clientOrgId: string,
): CreateEventRequest | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }

  const payload = body as CreateEventBody;
  const title = optionalString(payload.title) ?? '';
  const startAt = parseDate(payload.startAt);
  const endAt = parseDate(payload.endAt);
  // Preserve invalid/missing values for the service to report every field at once.
  // Number(true) and Number([]) otherwise silently accept malformed JSON input.
  const expectedAttendance = typeof payload.expectedAttendance === 'number'
    ? payload.expectedAttendance
    : Number.NaN;

  const status = payload.status === 'submitted' ? 'submitted' : 'draft';

  return {
    title,
    description: optionalString(payload.description),
    purpose: optionalString(payload.purpose),
    organiserId,
    clientOrgId,
    status,
    startAt: startAt ?? new Date(Number.NaN),
    endAt: endAt ?? new Date(Number.NaN),
    expectedAttendance,
    layoutId: optionalString(payload.layoutId),
    venueRequirements: optionalString(payload.venueRequirements),
    accessibilityNote: optionalString(payload.accessibilityNote),
    equipmentRequirements: optionalString(payload.equipmentRequirements),
    layoutPreference: optionalString(payload.layoutPreference),
    registrationSetup: optionalString(payload.registrationSetup),
  };
}
