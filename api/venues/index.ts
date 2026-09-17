import { sendJson } from '../../backend/src/http.js';
import { AccessError } from '../../backend/src/modules/eventVisibility/service.js';
import { currentUser, databasePool, query, respond, respondWithResult } from '../../backend/src/modules/eventVisibility/runtime.js';
import {
  addVenueLayout, createVenue, getVenue, removeVenueLayout, retireVenue,
  searchVenues, updateVenue, updateVenueLayout,
} from '../../backend/src/modules/venueBooking/catalogue.js';
import type { VercelRequest, VercelResponse } from '../../backend/src/vercel.js';

// GET and POST share one file (create/update/retire/layout mutations all
// dispatched by body.action) to stay within the Vercel Hobby plan's
// serverless function limit.
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method === 'GET') {
    await respond(response, async () => {
      const user = await currentUser(request);
      const params = new URL(request.url || '/', 'http://localhost').searchParams;
      const id = params.get('id');
      if (id) return { venue: await getVenue(query, user, id.slice(0, 240)) };

      const layout = params.get('layout') || undefined;
      const attendanceParam = params.get('attendance');
      let attendance: number | undefined;
      if (attendanceParam !== null) {
        attendance = Number(attendanceParam);
        if (!Number.isInteger(attendance) || attendance <= 0) {
          throw new AccessError(400, 'Attendance must be a whole number greater than 0.');
        }
      }
      return { venues: await searchVenues(query, user, params.get('q') || '', layout, attendance) };
    });
    return;
  }

  if (request.method !== 'POST') {
    response.setHeader('allow', 'GET, POST');
    sendJson(response, 405, { error: 'method_not_allowed' });
    return;
  }

  await respondWithResult(response, async () => {
    const user = await currentUser(request);
    const body = request.body as Record<string, unknown> | undefined;
    const { action, ...fields } = body ?? {};

    if (action === 'create') return createVenue(databasePool(), user, fields);

    if (action === 'update' || action === 'retire') {
      const { id, ...rest } = fields;
      if (typeof id !== 'string' || !id) {
        return { status: 400, body: { error: 'validation_failed', errors: { id: ['A venue id is required.'] } } };
      }
      return action === 'update' ? updateVenue(databasePool(), user, id, rest) : retireVenue(databasePool(), user, id);
    }

    if (action === 'add_layout' || action === 'update_layout' || action === 'remove_layout') {
      const { id, label, ...rest } = fields;
      if (typeof id !== 'string' || !id) {
        return { status: 400, body: { error: 'validation_failed', errors: { id: ['A venue id is required.'] } } };
      }
      if (action === 'add_layout') return addVenueLayout(databasePool(), user, id, { label, ...rest });
      if (typeof label !== 'string' || !label) {
        return { status: 400, body: { error: 'validation_failed', errors: { label: ['A layout label is required.'] } } };
      }
      return action === 'update_layout'
        ? updateVenueLayout(databasePool(), user, id, label, rest)
        : removeVenueLayout(databasePool(), user, id, label);
    }

    return { status: 400, body: {
      error: 'invalid_action',
      errors: { action: ["Must be 'create', 'update', 'retire', 'add_layout', 'update_layout', or 'remove_layout'."] },
    } };
  });
}
