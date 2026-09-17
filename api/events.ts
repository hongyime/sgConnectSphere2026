// Vercel maps every file under `api/` to a serverless function. `api/foo.ts` and
// `api/foo/index.ts` both target the same URL path `/api/foo`; only one wins the
// route (empirically the parent file), so the other becomes an unreachable
// lambda that still counts against the Hobby-plan 12-function cap. This handler
// serves create, browse, and (SCRUM-27) draft list/edit/delete traffic for
// /api/events from a single file so there is no collision to lose and no
// wasted slot. Method dispatch below picks the branch. See ADR-014 for the
// rule this file follows.

import { getAuthenticatedAppUser, getBearerToken } from '../backend/src/auth/supabase.js';
import { sendJson } from '../backend/src/http.js';
import { PostgresEventLifecycleRepository } from '../backend/src/modules/eventLifecycle/repository.js';
import {
  createEventRequest,
  deleteEventRequest,
  EventAccessError,
  EventNotFoundError,
  EventValidationError,
  updateEventRequest,
} from '../backend/src/modules/eventLifecycle/service.js';
import { parseCreateEventBody, parseUpdateEventBody } from '../backend/src/modules/eventLifecycle/parseRequest.js';
import { isEventStatus } from '../backend/src/modules/eventLifecycle/status.js';
import type { EventRecord } from '../backend/src/modules/eventLifecycle/types.js';
import type { AuthenticatedAppUser } from '../backend/src/auth/supabase.js';
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
  if (request.method === 'PATCH') {
    await handlePatch(request, response);
    return;
  }
  if (request.method === 'DELETE') {
    await handleDelete(request, response);
    return;
  }
  response.setHeader('allow', 'GET, POST, PATCH, DELETE');
  sendJson(response, 405, { error: 'method_not_allowed' });
}

// Full detail shape for the SCRUM-27 draft list/reopen endpoints - unlike
// the POST response below, this includes description/purpose because
// reopening a draft (Scenario 2) needs every previously entered value back.
function serializeEventDetail(event: EventRecord) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    purpose: event.purpose,
    status: event.status,
    startAt: event.startAt?.toISOString(),
    endAt: event.endAt?.toISOString(),
    expectedAttendance: event.expectedAttendance,
    venueRequirements: event.venueRequirements,
    accessibilityNote: event.accessibilityNote,
    equipmentRequirements: event.equipmentRequirements,
    layoutPreference: event.layoutPreference,
    registrationSetup: event.registrationSetup,
  };
}

// Bearer-token auth shared by POST/PATCH/DELETE and the SCRUM-27 "mine"
// GET branch below - what the frontend's getAccessToken() flow actually
// has on hand. Distinct from the cookie-session auth the pre-existing
// org-wide browse branch uses (currentUser()/requireOrganiser() from
// eventVisibility, unchanged from before this file was consolidated).
// Writes the error response itself and returns null so callers can just
// return early on a null result.
async function requireOrganiserBearer(
  request: VercelRequest,
  response: VercelResponse,
): Promise<AuthenticatedAppUser | null> {
  const bearerToken = getBearerToken(request.headers.authorization);
  const user = bearerToken ? await getAuthenticatedAppUser(bearerToken) : null;
  if (!user) {
    sendJson(response, 401, { error: 'unauthorized' });
    return null;
  }

  if (user.role !== 'event_organiser' || !user.clientOrgId) {
    sendJson(response, 403, { error: 'forbidden' });
    return null;
  }

  return user;
}

// GET /api/events - organiser browse. Preserves the request contract that shipped
// in PR #42 (SCRUM-18 hide internal planning info): id-lookup returns { event }, otherwise
// { events, notifications, organisationId }. AccessError is caught by respond().
//
// GET /api/events?mine=1[&id=<id>][&status=draft] - SCRUM-27: the requesting
// organiser's own event requests, for the "my drafts" list and for reopening
// one. See requireOrganiserBearer above for why this branch authenticates
// differently from the org-wide browse.
async function handleGet(request: VercelRequest, response: VercelResponse) {
  const params = new URL(request.url || '/', 'http://localhost').searchParams;

  if (params.get('mine') === '1') {
    await handleGetMine(request, response, params);
    return;
  }

  await respond(response, async () => {
    const user = await currentUser(request);
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

async function handleGetMine(
  request: VercelRequest,
  response: VercelResponse,
  params: URLSearchParams,
) {
  const user = await requireOrganiserBearer(request, response);
  if (!user) {
    return;
  }

  const id = params.get('id');
  if (id) {
    const event = await repository.findEventById(id);
    if (!event || event.organiserId !== user.id) {
      sendJson(response, 404, { error: 'not_found' });
      return;
    }
    sendJson(response, 200, { event: serializeEventDetail(event) });
    return;
  }

  const statusParam = params.get('status');
  const status = statusParam && isEventStatus(statusParam) ? statusParam : undefined;
  const events = await repository.listEventsByOrganiser(user.id, status);
  sendJson(response, 200, { events: events.map(serializeEventDetail) });
}

// POST /api/events - organiser create event request. Preserves the payload and
// response contract that shipped in PR #56 (SCRUM-26): the ten mandatory fields
// plus the three none-required sentinels return a 201 with the persisted event.
// SCRUM-27: also accepts status: 'draft' with the other nine fields relaxed
// (title/dates/expectedAttendance stay mandatory - see the service layer).
async function handlePost(request: VercelRequest, response: VercelResponse) {
  const user = await requireOrganiserBearer(request, response);
  if (!user) {
    return;
  }

  const createRequest = parseCreateEventBody(request.body, user.id, user.clientOrgId as string);
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

// PATCH /api/events?id=<id> - SCRUM-27 Scenario 2/4: edit a saved draft and
// re-save it as a draft, or submit it. Only the owning organiser, only while
// the event is still a draft (enforced in updateEventRequest).
async function handlePatch(request: VercelRequest, response: VercelResponse) {
  const user = await requireOrganiserBearer(request, response);
  if (!user) {
    return;
  }

  const id = new URL(request.url || '/', 'http://localhost').searchParams.get('id');
  if (!id) {
    sendJson(response, 400, { error: 'missing_id' });
    return;
  }

  const patch = parseUpdateEventBody(request.body);
  if (!patch) {
    sendJson(response, 400, { error: 'invalid_payload' });
    return;
  }

  try {
    const event = await updateEventRequest(repository, id, user.id, patch);
    sendJson(response, 200, { event: serializeEventDetail(event) });
  } catch (error) {
    if (error instanceof EventNotFoundError) {
      sendJson(response, 404, { error: 'not_found' });
      return;
    }
    if (error instanceof EventAccessError) {
      sendJson(response, 403, { error: 'forbidden' });
      return;
    }
    if (error instanceof EventValidationError) {
      sendJson(response, 400, { error: error.message, ...error.details });
      return;
    }

    throw error;
  }
}

// DELETE /api/events?id=<id> - SCRUM-27 Scenario 3: delete a draft. Only the
// owning organiser, only while the event is still a draft (enforced in
// deleteEventRequest).
async function handleDelete(request: VercelRequest, response: VercelResponse) {
  const user = await requireOrganiserBearer(request, response);
  if (!user) {
    return;
  }

  const id = new URL(request.url || '/', 'http://localhost').searchParams.get('id');
  if (!id) {
    sendJson(response, 400, { error: 'missing_id' });
    return;
  }

  try {
    await deleteEventRequest(repository, id, user.id);
    sendJson(response, 200, { deleted: true });
  } catch (error) {
    if (error instanceof EventNotFoundError) {
      sendJson(response, 404, { error: 'not_found' });
      return;
    }
    if (error instanceof EventAccessError) {
      sendJson(response, 403, { error: 'forbidden' });
      return;
    }
    if (error instanceof EventValidationError) {
      sendJson(response, 400, { error: error.message, ...error.details });
      return;
    }

    throw error;
  }
}
