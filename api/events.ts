// Vercel maps every file under `api/` to a serverless function. `api/foo.ts` and
// `api/foo/index.ts` both target the same URL path `/api/foo`; only one wins the
// route (empirically the parent file), so the other becomes an unreachable
// lambda that still counts against the Hobby-plan 12-function cap. This handler
// serves both create and browse traffic for /api/events from a single file so
// there is no collision to lose and no wasted slot. Method dispatch below picks
// the branch. See ADR-014 for the rule this file follows.

import { getAuthenticatedAppUser, getBearerToken } from '../backend/src/auth/supabase.js';
import { sendJson } from '../backend/src/http.js';
import { PostgresEventLifecycleRepository } from '../backend/src/modules/eventLifecycle/repository.js';
import {
  createEventRequest,
  EventValidationError,
} from '../backend/src/modules/eventLifecycle/service.js';
import { parseCreateEventBody } from '../backend/src/modules/eventLifecycle/parseRequest.js';
import { refusePlanning } from '../backend/src/modules/attendeeVisibility/service.js';
import { currentUser, query, respond } from '../backend/src/modules/eventVisibility/runtime.js';
import {
  getEvent,
  listEvents,
  listNotifications,
  requireOrganiser,
} from '../backend/src/modules/eventVisibility/service.js';
import type { VercelRequest, VercelResponse } from '../backend/src/vercel.js';

const repository = new PostgresEventLifecycleRepository();

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method === 'GET') {
    await handleGet(request, response);
    return;
  }
  if (request.method === 'POST') {
    await handlePost(request, response);
    return;
  }
  response.setHeader('allow', 'GET, POST');
  sendJson(response, 405, { error: 'method_not_allowed' });
}

// GET /api/events - organiser browse. Preserves the request contract that shipped
// in PR #42 (SCRUM-42): id-lookup returns { event }, otherwise
// { events, notifications, organisationId }. AccessError is caught by respond().
async function handleGet(request: VercelRequest, response: VercelResponse) {
  await respond(response, async () => {
    const user = await currentUser(request);
    const params = new URL(request.url || '/', 'http://localhost').searchParams;
    const id = params.get('id');
    if (user.role === 'attendee') await refusePlanning(query, user, id || '');
    requireOrganiser(user);
    if (id) return { event: await getEvent(query, user, id.slice(0, 240)) };
    return {
      events: await listEvents(query, user, params.get('q') || ''),
      notifications: await listNotifications(query, user),
      organisationId: user.clientOrgId,
    };
  });
}

// POST /api/events - organiser create event request. Preserves the payload and
// response contract that shipped in PR #56 (SCRUM-26): the ten mandatory fields
// plus the three none-required sentinels return a 201 with the persisted event.
async function handlePost(request: VercelRequest, response: VercelResponse) {
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
