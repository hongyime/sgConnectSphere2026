import { getAuthenticatedAppUser, getBearerToken } from '../backend/src/auth/supabase.js';
import { requireMethod, sendJson } from '../backend/src/http.js';
import { PostgresEventLifecycleRepository } from '../backend/src/modules/eventLifecycle/repository.js';
import {
  createEventRequest,
  EventValidationError,
} from '../backend/src/modules/eventLifecycle/service.js';
import { parseCreateEventBody } from '../backend/src/modules/eventLifecycle/parseRequest.js';
import type { VercelRequest, VercelResponse } from '../backend/src/vercel.js';

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
