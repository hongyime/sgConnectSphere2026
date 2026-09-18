import { validateEventStatusTransition } from './status.js';
import type { EventLifecycleRepository } from './repository.js';
import type { CreateEventRequest, EventUpdate, StatusChangeRequest } from './types.js';

// Sentinel stored in the optional-but-mandatory fields to mean "the organiser
// explicitly said this event doesn't need it" (E02-S01 Scenario 4), as
// distinct from the field simply being left blank.
export const NONE_REQUIRED = 'none_required';

export class EventValidationError extends Error {
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'EventValidationError';
    this.details = details;
  }
}

export class EventNotFoundError extends Error {
  constructor(eventId: string) {
    super(`Event not found: ${eventId}`);
    this.name = 'EventNotFoundError';
  }
}

// A draft belongs to the organiser who created it; nobody else may view,
// edit or delete it through these entry points (E02-S02 Scenario 1).
export class EventAccessError extends Error {
  constructor() {
    super('This request belongs to another organiser.');
    this.name = 'EventAccessError';
  }
}

// SCRUM-27: a draft may omit any field except title, dates and expected
// attendance (Option B — see the SCRUM-27 task list for why the other DB
// columns are the ones already nullable, so no migration was needed). These
// three stay mandatory for both a draft and a submission.
const ALWAYS_MANDATORY_KEYS: ReadonlySet<keyof CreateEventRequest> = new Set(['title', 'expectedAttendance']);

const MANDATORY_FIELD_LABELS: { key: keyof CreateEventRequest; label: string; noneRequiredAllowed?: boolean }[] = [
  { key: 'title', label: 'Event name' },
  { key: 'description', label: 'Description' },
  { key: 'purpose', label: 'Purpose' },
  { key: 'expectedAttendance', label: 'Expected attendance' },
  { key: 'venueRequirements', label: 'Venue requirements' },
  { key: 'accessibilityNote', label: 'Accessibility needs' },
  { key: 'equipmentRequirements', label: 'Equipment requirements', noneRequiredAllowed: true },
  { key: 'layoutPreference', label: 'Layout preference', noneRequiredAllowed: true },
  { key: 'registrationSetup', label: 'Registration setup', noneRequiredAllowed: true },
];

function isBlank(value: unknown) {
  return typeof value !== 'string' || value.trim().length === 0;
}

// `requireAll` is false only for a draft (Option B): fields other than
// title/expectedAttendance/dates are skipped rather than reported missing.
function findMissingMandatoryFields(request: CreateEventRequest, requireAll: boolean): string[] {
  const missing: string[] = [];

  for (const field of MANDATORY_FIELD_LABELS) {
    if (!requireAll && !ALWAYS_MANDATORY_KEYS.has(field.key)) {
      continue;
    }

    if (field.key === 'expectedAttendance') {
      if (!Number.isInteger(request.expectedAttendance) || request.expectedAttendance <= 0) {
        missing.push(field.label);
      }
      continue;
    }

    const value = request[field.key] as string | undefined;
    const satisfiedByNoneRequired = field.noneRequiredAllowed && value === NONE_REQUIRED;

    if (!satisfiedByNoneRequired && isBlank(value)) {
      missing.push(field.label);
    }
  }

  // Dates are always mandatory, draft or not. Invalid Date is truthy and NaN
  // bypasses range comparisons; reject it before SQL.
  if (!(request.startAt instanceof Date) || !Number.isFinite(request.startAt.getTime())
    || !(request.endAt instanceof Date) || !Number.isFinite(request.endAt.getTime())) {
    missing.push('Preferred dates and times');
  }

  return missing;
}

// Shared by create and update: dates/attendance are validated the same way
// regardless of status once findMissingMandatoryFields has confirmed they're
// present, so both entry points reuse this instead of duplicating it.
function assertValidRangeAndFuture(request: Pick<CreateEventRequest, 'startAt' | 'endAt'>) {
  if (request.endAt.getTime() <= request.startAt.getTime()) {
    throw new EventValidationError('invalid_event_range');
  }

  if (request.startAt.getTime() <= Date.now()) {
    throw new EventValidationError('Preferred date must be in the future');
  }
}

export async function createEventRequest(
  repository: EventLifecycleRepository,
  request: CreateEventRequest,
) {
  if (request.status && !['draft', 'submitted'].includes(request.status)) {
    throw new EventValidationError('invalid_initial_status');
  }

  const missingFields = findMissingMandatoryFields(request, request.status !== 'draft');
  if (missingFields.length > 0) {
    throw new EventValidationError('missing_mandatory_fields', { missingFields });
  }

  assertValidRangeAndFuture(request);

  return repository.createEvent({
    ...request,
    title: request.title.trim(),
    description: request.description?.trim() || undefined,
    purpose: request.purpose?.trim() || undefined,
    venueRequirements: request.venueRequirements?.trim() || undefined,
    accessibilityNote: request.accessibilityNote?.trim() || undefined,
    equipmentRequirements: request.equipmentRequirements?.trim() || undefined,
    layoutPreference: request.layoutPreference?.trim() || undefined,
    registrationSetup: request.registrationSetup?.trim() || undefined,
  });
}

export async function changeEventStatus(
  repository: EventLifecycleRepository,
  request: StatusChangeRequest,
) {
  const event = await repository.findEventById(request.eventId);
  if (!event) {
    throw new Error(`Event not found: ${request.eventId}`);
  }

  const transition = validateEventStatusTransition(event.status, request.toStatus);
  if (!transition.allowed) {
    throw new Error(`Illegal event status transition: ${event.status} -> ${request.toStatus}`);
  }

  return repository.updateEventStatus(request.eventId, request.toStatus, request.reason);
}

// SCRUM-27: edit a saved draft, optionally re-saving it as a draft again or
// submitting it (Scenario 2 and 4). Only the owning organiser may edit it,
// and only while it is still a draft — once submitted, changes go through
// the E02-S01/E03 review flow instead, not this endpoint.
export async function updateEventRequest(
  repository: EventLifecycleRepository,
  eventId: string,
  requesterId: string,
  patch: Partial<EventUpdate>,
) {
  const event = await repository.findEventById(eventId);
  if (!event) {
    throw new EventNotFoundError(eventId);
  }

  if (event.organiserId !== requesterId) {
    throw new EventAccessError();
  }

  if (event.status !== 'draft') {
    throw new EventValidationError('not_editable', { status: event.status });
  }

  if (patch.status && !['draft', 'submitted'].includes(patch.status)) {
    throw new EventValidationError('invalid_initial_status');
  }

  const merged: EventUpdate = {
    title: patch.title ?? event.title,
    description: patch.description ?? event.description,
    purpose: patch.purpose ?? event.purpose,
    status: patch.status ?? event.status,
    startAt: patch.startAt ?? event.startAt ?? new Date(Number.NaN),
    endAt: patch.endAt ?? event.endAt ?? new Date(Number.NaN),
    expectedAttendance: patch.expectedAttendance ?? event.expectedAttendance ?? Number.NaN,
    layoutId: patch.layoutId ?? event.layoutId,
    venueRequirements: patch.venueRequirements ?? event.venueRequirements,
    accessibilityNote: patch.accessibilityNote ?? event.accessibilityNote,
    equipmentRequirements: patch.equipmentRequirements ?? event.equipmentRequirements,
    layoutPreference: patch.layoutPreference ?? event.layoutPreference,
    registrationSetup: patch.registrationSetup ?? event.registrationSetup,
  };

  const missingFields = findMissingMandatoryFields(
    { ...merged, organiserId: event.organiserId, clientOrgId: event.clientOrgId },
    merged.status !== 'draft',
  );
  if (missingFields.length > 0) {
    throw new EventValidationError('missing_mandatory_fields', { missingFields });
  }

  assertValidRangeAndFuture(merged);

  return repository.updateEvent(eventId, {
    ...merged,
    title: merged.title.trim(),
    description: merged.description?.trim() || undefined,
    purpose: merged.purpose?.trim() || undefined,
    venueRequirements: merged.venueRequirements?.trim() || undefined,
    accessibilityNote: merged.accessibilityNote?.trim() || undefined,
    equipmentRequirements: merged.equipmentRequirements?.trim() || undefined,
    layoutPreference: merged.layoutPreference?.trim() || undefined,
    registrationSetup: merged.registrationSetup?.trim() || undefined,
  });
}

// SCRUM-27 Scenario 3: delete a draft. Only the owning organiser, and only
// while it is still a draft — the repository's WHERE clause enforces the
// latter again as defense in depth.
export async function deleteEventRequest(
  repository: EventLifecycleRepository,
  eventId: string,
  requesterId: string,
) {
  const event = await repository.findEventById(eventId);
  if (!event) {
    throw new EventNotFoundError(eventId);
  }

  if (event.organiserId !== requesterId) {
    throw new EventAccessError();
  }

  if (event.status !== 'draft') {
    throw new EventValidationError('not_deletable', { status: event.status });
  }

  await repository.deleteEvent(eventId);
}
