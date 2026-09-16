import { sendJson } from '../../backend/src/http.js';
import { currentUser, databasePool, query, respond, respondWithResult } from '../../backend/src/modules/eventVisibility/runtime.js';
import { createVenue, getVenue, retireVenue, searchVenues, updateVenue } from '../../backend/src/modules/venueBooking/catalogue.js';
import type { VercelRequest, VercelResponse } from '../../backend/src/vercel.js';

// GET and POST share one file (create/update/retire dispatched by body.action)
// to stay within the Vercel Hobby plan's serverless function limit.
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method === 'GET') {
    await respond(response, async () => {
      const user = await currentUser(request);
      const params = new URL(request.url || '/', 'http://localhost').searchParams;
      const id = params.get('id');
      if (id) return { venue: await getVenue(query, user, id.slice(0, 240)) };
      return { venues: await searchVenues(query, user, params.get('q') || '') };
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

    return { status: 400, body: { error: 'invalid_action', errors: { action: ["Must be 'create', 'update', or 'retire'."] } } };
  });
}
