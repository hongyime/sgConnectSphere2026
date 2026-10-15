import type { AuthenticatedUser } from '../accessControl/types.js';
import type { Query } from '../eventVisibility/service.js';
import { currentUser, query, respond } from '../eventVisibility/runtime.js';
import { sendJson } from '../../http.js';
import type { VercelRequest, VercelResponse } from '../../vercel.js';
import { listBookingRequests } from './bookingRequests.js';

export function createBookingRequestsHandler(deps: {
  authenticate: (request: VercelRequest) => Promise<AuthenticatedUser>;
  query: Query;
}) {
  return async (request: VercelRequest, response: VercelResponse) => {
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      sendJson(response, 405, { error: 'method_not_allowed' });
      return;
    }
    await respond(response, async () => {
      const user = await deps.authenticate(request);
      const identifier = new URL(request.url ?? '/', 'http://localhost').searchParams.get('event_id') ?? '';
      return listBookingRequests(deps.query, user, identifier);
    });
  };
}

export const bookingRequestsHandler = createBookingRequestsHandler({ authenticate: currentUser, query });
