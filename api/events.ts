import { getAuthenticatedAppUser, getBearerToken } from '../backend/src/auth/supabase.js';
import { requireMethod, sendJson } from '../backend/src/http.js';
import { PostgresEventLifecycleRepository } from '../backend/src/modules/eventLifecycle/repository.js';
import {
  createEventRequest,
  EventValidationError,
} from '../backend/src/modules/eventLifecycle/service.js';
import type { CreateEventRequest } from '../backend/src/modules/eventLifecycle/types.js';
import type { VercelRequest, VercelResponse } from '../backend/src/vercel.js';

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

function parseCreateEventBody(
  body: unknown,
  organiserId: string,
  clientOrgId: string,
): CreateEventRequest | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const payload = body as CreateEventBody;
  const title = optionalString(payload.title);
  const startAt = parseDate(payload.startAt);
  const endAt = parseDate(payload.endAt);
  const expectedAttendance = Number(payload.expectedAttendance);

  if (!title || !startAt || !endAt || !Number.isFinite(expectedAttendance)) {
    return null;
  }

  const status = payload.status === 'submitted' ? 'submitted' : 'draft';

  return {
    title,
    description: optionalString(payload.description),
    purpose: optionalString(payload.purpose),
    organiserId,
    clientOrgId,
    status,
    startAt,
    endAt,
    expectedAttendance,
    layoutId: optionalString(payload.layoutId),
    venueRequirements: optionalString(payload.venueRequirements),
    accessibilityNote: optionalString(payload.accessibilityNote),
    equipmentRequirements: optionalString(payload.equipmentRequirements),
    layoutPreference: optionalString(payload.layoutPreference),
    registrationSetup: optionalString(payload.registrationSetup),
  };
}

const repository = new PostgresEventLifecycleRepository();

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (!requireMethod(request, response, 'POST')) {
    return;
  }

  const bearerToken = getBearerToken(request.headers.authorization);
  const user = bearerToken ? await getAuthenticatedAppUser(bearerToken) : null;
  if (!user) {
    sendJson(response, 401, { error: 'unauthorized' });
    return;
  }

  if (user.role !== 'event_organiser' || !user.clientOrgId) {
    sendJson(response, 403, { error: 'forbidden' });
    return;
  }

  const createRequest = parseCreateEventBody(request.body, user.id, user.clientOrgId);
  if (!createRequest) {
    sendJson(response, 400, {
      error: 'invalid_payload',
      required: ['title', 'startAt', 'endAt', 'expectedAttendance'],
    });
    return;
  }

  try {
    const event = await createEventRequest(repository, createRequest);
    sendJson(response, 201, {
      event: {
        id: event.id,
        title: event.title,
        status: event.status,
        startAt: event.startAt?.toISOString(),
        endAt: event.endAt?.toISOString(),
        expectedAttendance: event.expectedAttendance,
        venueRequirements: event.venueRequirements,
        accessibilityNote: event.accessibilityNote,
        equipmentRequirements: event.equipmentRequirements,
        layoutPreference: event.layoutPreference,
        registrationSetup: event.registrationSetup,
      },
    });
  } catch (error) {
    if (error instanceof EventValidationError) {
      sendJson(response, 400, { error: error.message, ...error.details });
      return;
    }

    throw error;
  }
}
