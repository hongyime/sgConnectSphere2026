import { validateEventStatusTransition } from './status.js';
import type { EventLifecycleRepository } from './repository.js';
import type { CreateEventRequest, StatusChangeRequest } from './types.js';

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

function findMissingMandatoryFields(request: CreateEventRequest): string[] {
  const missing: string[] = [];

  for (const field of MANDATORY_FIELD_LABELS) {
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

  // Invalid Date is truthy and NaN bypasses range comparisons; reject it before SQL.
  if (!(request.startAt instanceof Date) || !Number.isFinite(request.startAt.getTime())
    || !(request.endAt instanceof Date) || !Number.isFinite(request.endAt.getTime())) {
    missing.push('Preferred dates and times');
  }

  return missing;
}

export async function createEventRequest(
  repository: EventLifecycleRepository,
  request: CreateEventRequest,
) {
  if (request.status && !['draft', 'submitted'].includes(request.status)) {
    throw new EventValidationError('invalid_initial_status');
  }

  const missingFields = findMissingMandatoryFields(request);
  if (missingFields.length > 0) {
    throw new EventValidationError('missing_mandatory_fields', { missingFields });
  }

  if (request.endAt.getTime() <= request.startAt.getTime()) {
    throw new EventValidationError('invalid_event_range');
  }

  if (request.startAt.getTime() <= Date.now()) {
    throw new EventValidationError('Preferred date must be in the future');
  }

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
