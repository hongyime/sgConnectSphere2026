// HTTP entry for E06-S05 tentative holds (SCRUM-49):
//   GET  /api/venues?task=holds&event=<id or code>   the assigned Coordinator's holds for an event
//   GET  /api/venues?task=holds                      Venue Staff: every live hold, soonest expiry first
//   POST /api/venues  { action: 'hold', event, venue, startsAt?, endsAt?, expiresAt? }
//   POST /api/venues  { action: 'convert_hold', event, hold }
//   POST /api/venues  { action: 'release', event, hold }
//   POST /api/venues  { action: 'extend_hold', hold, expiresAt }
// The POST actions share /api/venues with the catalogue actions (and also
// answer on ?task=holds) to stay within the Vercel Hobby plan's function limit.
import type { Pool } from 'pg';
import type { AuthenticatedUser } from '../accessControl/types.js';
import type { Query } from '../eventVisibility/service.js';
import { isAllowedOrigin } from '../../config.js';
import { sendJson } from '../../http.js';
import type { VercelRequest, VercelResponse } from '../../vercel.js';
import { currentUser, databasePool, query, respondWithResult } from '../eventVisibility/runtime.js';
import { AccessError } from '../eventVisibility/service.js';
import { convertHold, extendHold, listEventHolds, listLiveHolds, placeHold, releaseHold } from './holds.js';

export const HOLD_ACTIONS = ['hold', 'convert_hold', 'release', 'extend_hold'];

export function createHoldsHandler(deps: {
  authenticate: (request: VercelRequest) => Promise<AuthenticatedUser>;
  query: Query; pool: () => Pool; allowedOrigin: typeof isAllowedOrigin;
}) {
  return async function holdsHandler(request: VercelRequest, response: VercelResponse) {
    if (!['GET', 'POST'].includes(request.method ?? '')) {
      response.setHeader('Allow', 'GET, POST');
      sendJson(response, 405, { error: 'method_not_allowed' });
      return;
    }
    await respondWithResult(response, async () => {
      const user = await deps.authenticate(request);
      if (request.method === 'GET') {
        const params = new URL(request.url ?? '/', 'http://localhost').searchParams;
        if (params.has('event')) return { status: 200, body: await listEventHolds(deps.query, user, params.get('event')) };
        return { status: 200, body: await listLiveHolds(deps.query, user) };
      }
      if (!deps.allowedOrigin(request.headers.origin)) throw new AccessError(403, 'Request origin not allowed.');
      const body = request.body as Record<string, unknown> | undefined;
      if (body?.action === 'hold') return placeHold(deps.pool(), user, body);
      if (body?.action === 'convert_hold') return convertHold(deps.pool(), user, body);
      if (body?.action === 'release') return releaseHold(deps.pool(), user, body);
      if (body?.action === 'extend_hold') return extendHold(deps.pool(), user, body);
      throw new AccessError(400, 'Choose hold, convert_hold, release or extend_hold.');
    });
  };
}

export const holdsHandler = createHoldsHandler({
  authenticate: currentUser, query, pool: databasePool, allowedOrigin: isAllowedOrigin,
});
