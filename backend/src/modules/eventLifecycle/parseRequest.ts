import type { CreateEventRequest, EventUpdate } from './types.js';

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
  accessibilityFeatureIds?: unknown;
  equipmentRequirements?: unknown;
  layoutPreference?: unknown;
  registrationSetup?: unknown;
};

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

// A non-array, or an array with a non-string entry, is treated as "none
// selected" rather than rejecting the whole request - the predefined
// checklist is additive to the free-text field, never mandatory on its own.
function featureIdList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const ids = value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
  return ids.length > 0 ? ids : undefined;
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
    accessibilityFeatureIds: featureIdList(payload.accessibilityFeatureIds),
    equipmentRequirements: optionalString(payload.equipmentRequirements),
    layoutPreference: optionalString(payload.layoutPreference),
    registrationSetup: optionalString(payload.registrationSetup),
  };
}

// SCRUM-27: a PATCH body only needs to carry the fields being changed. A key
// that's absent is left out of the returned patch (so the service keeps the
// draft's existing value); a key present but empty/invalid is still parsed
// through, so the service's validation can report it as missing rather than
// silently keeping a stale value.
export function parseUpdateEventBody(body: unknown): Partial<EventUpdate> | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }

  const payload = body as CreateEventBody;
  const patch: Partial<EventUpdate> = {};

  if (payload.title !== undefined) {
    patch.title = optionalString(payload.title) ?? '';
  }
  if (payload.description !== undefined) {
    patch.description = optionalString(payload.description);
  }
  if (payload.purpose !== undefined) {
    patch.purpose = optionalString(payload.purpose);
  }
  if (payload.status !== undefined) {
    patch.status = payload.status === 'submitted' ? 'submitted' : 'draft';
  }
  if (payload.startAt !== undefined) {
    patch.startAt = parseDate(payload.startAt) ?? new Date(Number.NaN);
  }
  if (payload.endAt !== undefined) {
    patch.endAt = parseDate(payload.endAt) ?? new Date(Number.NaN);
  }
  if (payload.expectedAttendance !== undefined) {
    patch.expectedAttendance = typeof payload.expectedAttendance === 'number'
      ? payload.expectedAttendance
      : Number.NaN;
  }
  if (payload.layoutId !== undefined) {
    patch.layoutId = optionalString(payload.layoutId);
  }
  if (payload.venueRequirements !== undefined) {
    patch.venueRequirements = optionalString(payload.venueRequirements);
  }
  if (payload.accessibilityNote !== undefined) {
    patch.accessibilityNote = optionalString(payload.accessibilityNote);
  }
  if (payload.accessibilityFeatureIds !== undefined) {
    // Unlike optionalString's undefined-means-unset, an explicit empty/invalid
    // array here means "clear the selection", so it can't collapse to the
    // same undefined that means "key absent, don't touch it" a few lines up.
    patch.accessibilityFeatureIds = featureIdList(payload.accessibilityFeatureIds) ?? [];
  }
  if (payload.equipmentRequirements !== undefined) {
    patch.equipmentRequirements = optionalString(payload.equipmentRequirements);
  }
  if (payload.layoutPreference !== undefined) {
    patch.layoutPreference = optionalString(payload.layoutPreference);
  }
  if (payload.registrationSetup !== undefined) {
    patch.registrationSetup = optionalString(payload.registrationSetup);
  }

  return patch;
}
